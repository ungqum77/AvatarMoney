import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getPlansForUser, createPlan } from "@/lib/plans";
import { PLAN_META, type PlanType } from "@/lib/points";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeRounds(rounds: unknown, planType: PlanType): number[] {
  const meta = PLAN_META[planType];
  if (!Array.isArray(rounds)) return [meta.min];
  const out = rounds
    .slice(0, 60)
    .map((n) => {
      let v = Math.round(Number(n) || 0);
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
    const rounds = sanitizeRounds(body.rounds, planType);
    const plan = await createPlan(user.id, { name, planType, rounds });
    return NextResponse.json({ plan });
  } catch (e) {
    console.error("create plan error", e);
    return NextResponse.json({ error: "플랜 저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}
