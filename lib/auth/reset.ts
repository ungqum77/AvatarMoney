import "server-only";
import { randomBytes } from "crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { authAttempts, passwordResets, sessions, users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10분
const WINDOW_MS = 60 * 60 * 1000; // 1시간
// 1시간에 10번. 자동화된 대량 시도를 막기엔 충분하고,
// 어르신이 이름을 몇 번 헷갈려 넣어도 본인이 잠기지 않을 만큼의 여유를 둔다.
const MAX_FAILS = 10;

/** 이름 비교용 정규화: 공백 제거 ("홍 길동" = "홍길동") */
function normalizeName(raw: string): string {
  return (raw || "").replace(/\s+/g, "");
}

/** 최근 1시간 실패 횟수 */
async function recentFailCount(phone: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ n: sql<number>`count(*)` })
    .from(authAttempts)
    .where(
      and(
        eq(authAttempts.phone, phone),
        eq(authAttempts.kind, "reset"),
        eq(authAttempts.ok, 0),
        gte(authAttempts.at, Date.now() - WINDOW_MS)
      )
    );
  return Number(rows[0]?.n ?? 0);
}

async function record(phone: string, ok: boolean): Promise<void> {
  await getDb()
    .insert(authAttempts)
    .values({ phone, kind: "reset", ok: ok ? 1 : 0, at: Date.now() });
}

export type VerifyResult =
  | { ok: true; token: string; name: string }
  | { ok: false; error: string; locked?: boolean };

/**
 * 이름 + 휴대폰번호로 본인 확인. 성공하면 10분짜리 1회용 토큰을 준다.
 * 이름+번호는 주변 사람이 알 수 있는 정보라 확인 강도가 약하다.
 * 그래서 자동화된 대량 시도만이라도 막도록 횟수를 제한한다.
 */
export async function verifyIdentity(phoneRaw: string, nameRaw: string): Promise<VerifyResult> {
  const db = getDb();
  const phone = phoneRaw;
  const name = normalizeName(nameRaw);

  if (await recentFailCount(phone) >= MAX_FAILS) {
    return {
      ok: false,
      locked: true,
      error: "확인 시도가 너무 많았습니다. 1시간 뒤에 다시 해주세요.",
    };
  }

  const rows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);
  const user = rows[0];

  // 가입 여부와 이름 불일치를 구분해서 알려주지 않는다
  // (어떤 번호가 가입돼 있는지 알아내는 데 쓰일 수 있다).
  if (!user || normalizeName(user.name) !== name) {
    await record(phone, false);
    return {
      ok: false,
      error: "가입하실 때 넣으신 휴대폰 번호와 성함이 맞지 않습니다.",
    };
  }

  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  await db.insert(passwordResets).values({
    token,
    userId: user.id,
    expiresAt: now + TOKEN_TTL_MS,
    createdAt: now,
  });
  await record(phone, true);
  return { ok: true, token, name: user.name };
}

export type ConsumeResult = { ok: true; userId: number } | { ok: false; error: string };

/** 토큰을 써서 새 비밀번호로 바꾼다. 다른 기기의 로그인은 모두 끊는다. */
export async function consumeResetToken(
  token: string,
  newPassword: string
): Promise<ConsumeResult> {
  const db = getDb();
  const rows = await db
    .select()
    .from(passwordResets)
    .where(eq(passwordResets.token, token))
    .limit(1);
  const row = rows[0];

  const expired = "확인 후 시간이 너무 지났습니다. 처음부터 다시 해주세요.";
  if (!row) return { ok: false, error: expired };
  if (row.usedAt) return { ok: false, error: expired };
  if (row.expiresAt < Date.now()) return { ok: false, error: expired };

  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash }).where(eq(users.id, row.userId));
  await db.update(passwordResets).set({ usedAt: Date.now() }).where(eq(passwordResets.token, token));

  // 비밀번호가 바뀌었으니 기존 로그인은 모두 끊는다.
  await db.delete(sessions).where(eq(sessions.userId, row.userId));

  return { ok: true, userId: row.userId };
}
