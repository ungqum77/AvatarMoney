import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getPlansForUser, createPlan } from "@/lib/plans";
import { PLAN_META, PLAN_HORIZON, type PlanType } from "@/lib/points";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * @param allowZero 0(그 회차엔 아바타 안 만들기)을 허용할지.
 *   허용하면 0 은 그대로 두고, 아니면 최저 금액으로 올린다.
 */
function sanitizeRounds(rounds: unknown, planType: PlanType, allowZero: boolean): number[] {
  const meta = PLAN_META[planType];
  if (!Array.isArray(rounds)) return [meta.min];
  // 18회차가 기준이므로 그 이상은 받지 않는다
  const out = rounds.slice(0, PLAN_HORIZON).map((n, i) => {
    let v = Math.round(Number(n) || 0);
    // 1회차(본코드)는 반드시 만들어야 하므로 0으로 못 잡는다
    if (v <= 0) return allowZero && i > 0 ? 0 : meta.min;
    if (v < meta.min) v = meta.min;
    // 단위(step) 맞춤
    const rem = (v - meta.min) % meta.step;
    if (rem !== 0) v -= rem;
    return v;
  });
  return out.length ? out : [meta.min];
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const plans = await getPlansForUser(user.id);
  return NextResponse.json({ plans });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  try {
    const body = await req.json();
    const planType: PlanType = body.planType === "won11" ? "won11" : "won33";
    const name = String(body.name ?? "새 플랜").slice(0, 60) || "새 플랜";
    const allowZero = body.allowZero === true;
    const rounds = sanitizeRounds(body.rounds, planType, allowZero);
    const plan = await createPlan(user.id, { name, planType, rounds, allowZero });
    return NextResponse.json({ plan });
  } catch (e) {
    console.error("create plan error", e);
    return NextResponse.json({ error: "플랜 저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}
