import { NextResponse } from "next/server";
import { consumeResetToken } from "@/lib/auth/reset";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 2단계: 토큰으로 새 비밀번호 설정 → 바로 로그인 상태로 만들어 준다 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body.token ?? "");
    const password = String(body.password ?? "");

    if (!token)
      return NextResponse.json({ error: "처음부터 다시 해주세요." }, { status: 400 });
    if (password.length < 6)
      return NextResponse.json({ error: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });

    const result = await consumeResetToken(token, password);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    // 다시 로그인시키지 않고 바로 들여보낸다(60대 기준: 단계를 줄인다).
    await createSession(result.userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("reset confirm error", e);
    return NextResponse.json(
      { error: "변경 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
