import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { normalizePhone } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = normalizePhone(String(body.phone ?? ""));
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim();

    if (phone.length < 10)
      return NextResponse.json({ error: "휴대폰 번호를 정확히 입력해주세요." }, { status: 400 });
    if (password.length < 6)
      return NextResponse.json({ error: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });
    if (!name)
      return NextResponse.json({ error: "성함을 입력해주세요." }, { status: 400 });

    const db = getDb();
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
    if (existing[0])
      return NextResponse.json({ error: "이미 가입된 휴대폰 번호입니다. 로그인해주세요." }, { status: 409 });

    const passwordHash = await hashPassword(password);
    const inserted = await db
      .insert(users)
      .values({ phone, passwordHash, name, createdAt: Date.now() })
      .returning({ id: users.id });

    await createSession(inserted[0].id);
    return NextResponse.json({ ok: true, name });
  } catch (e) {
    console.error("signup error", e);
    return NextResponse.json({ error: "가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
