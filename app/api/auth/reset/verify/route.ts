import { NextResponse } from "next/server";
import { verifyIdentity } from "@/lib/auth/reset";
import { normalizePhone } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 1단계: 이름 + 휴대폰번호로 본인 확인 → 재설정 토큰 발급 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = normalizePhone(String(body.phone ?? ""));
    const name = String(body.name ?? "").trim();

    if (phone.length < 10)
      return NextResponse.json({ error: "휴대폰 번호를 정확히 입력해주세요." }, { status: 400 });
    if (!name)
      return NextResponse.json({ error: "가입하실 때 넣으신 성함을 입력해주세요." }, { status: 400 });

    const result = await verifyIdentity(phone, name);
    if (!result.ok)
      return NextResponse.json({ error: result.error }, { status: result.locked ? 429 : 401 });

    return NextResponse.json({ ok: true, token: result.token, name: result.name });
  } catch (e) {
    console.error("reset verify error", e);
    return NextResponse.json(
      { error: "확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
