import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";

const COOKIE = "am_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30일

export interface SessionUser {
  id: number;
  name: string;
  phone: string;
}

/** 로그인 성공 시 세션 발급 + 쿠키 설정 */
export async function createSession(userId: number): Promise<void> {
  const db = getDb();
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  await db.insert(sessions).values({
    id: token,
    userId,
    createdAt: now,
    expiresAt: now + MAX_AGE_SEC * 1000,
  });
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

/** 현재 세션 사용자 조회(없으면 null) */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, token))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt < Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, token));
    return null;
  }
  return { id: row.id, name: row.name, phone: row.phone };
}

/** 로그아웃: 세션 삭제 + 쿠키 제거 */
export async function destroySession(): Promise<void> {
  const token = cookies().get(COOKIE)?.value;
  if (token) {
    try {
      await getDb().delete(sessions).where(eq(sessions.id, token));
    } catch {
      /* ignore */
    }
  }
  cookies().delete(COOKIE);
}
