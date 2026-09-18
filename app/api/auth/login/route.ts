import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { normalizePhone } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = normalizePhone(String(body.phone ?? ""));
    const password = String(body.password ?? "");

    // 실패 메시지는 통일 (아이디/비번 구분 노출 안 함)
    const fail = () =>
      NextResponse.json({ error: "휴대폰 번호 또는 비밀번호가 맞지 않습니다." }, { status: 401 });

    if (phone.length < 10 || password.length < 1) return fail();

    const db = getDb();
    const rows = await db
      .select({ id: users.id, name: users.name, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);
    const user = rows[0];
    if (!user) return fail();

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return fail();

    await createSession(user.id);
    return NextResponse.json({ ok: true, name: user.name });
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json({ error: "로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
