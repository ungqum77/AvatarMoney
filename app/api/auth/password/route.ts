import { NextResponse } from "next/server";
import { eq, and, ne } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users, sessions } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getSessionUser, currentSessionToken } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 로그인 상태에서 비밀번호 변경 (현재 비밀번호 확인 필요) */
export async function POST(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const body = await req.json();
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");

    if (newPassword.length < 6)
      return NextResponse.json({ error: "새 비밀번호는 6자 이상이어야 합니다." }, { status: 400 });

    const db = getDb();
    const rows = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, me.id))
      .limit(1);
    if (!rows[0])
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const ok = await verifyPassword(currentPassword, rows[0].passwordHash);
    if (!ok)
      return NextResponse.json({ error: "지금 쓰시는 비밀번호가 맞지 않습니다." }, { status: 401 });

    await db
      .update(users)
      .set({ passwordHash: await hashPassword(newPassword) })
      .where(eq(users.id, me.id));

    // 지금 쓰는 기기만 남기고 다른 기기의 로그인은 끊는다.
    const token = currentSessionToken();
    if (token) {
      await db.delete(sessions).where(and(eq(sessions.userId, me.id), ne(sessions.id, token)));
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("change password error", e);
    return NextResponse.json(
      { error: "변경 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
