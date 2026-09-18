import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getPlan, updatePlan, deletePlan } from "@/lib/plans";
import { PLAN_META, type PlanType } from "@/lib/points";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeRounds(rounds: unknown, planType: PlanType): number[] {
  const meta = PLAN_META[planType];
  if (!Array.isArray(rounds)) return [meta.min];
  const out = rounds.slice(0, 60).map((n) => {
    let v = Math.round(Number(n) || 0);
    if (v < meta.min) v = meta.min;
    const rem = (v - meta.min) % meta.step;
    if (rem !== 0) v -= rem;
    return v;
  });
  return out.length ? out : [meta.min];
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const plan = await getPlan(user.id, Number(params.id));
  if (!plan) return NextResponse.json({ error: "플랜을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ plan });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  try {
    const body = await req.json();
    const patch: { name?: string; planType?: PlanType; rounds?: number[] } = {};
    let planType: PlanType | undefined;
    if (body.planType !== undefined) {
      planType = body.planType === "won11" ? "won11" : "won33";
      patch.planType = planType;
    }
    if (body.name !== undefined) patch.name = String(body.name).slice(0, 60);
    if (body.rounds !== undefined) {
      // 유형이 바뀌면 새 유형 기준으로, 아니면 기존 조회 필요 → 기본 won33 기준 보정
      const effType = planType ?? "won33";
      patch.rounds = sanitizeRounds(body.rounds, effType);
    }
    const plan = await updatePlan(user.id, Number(params.id), patch);
    if (!plan) return NextResponse.json({ error: "플랜을 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ plan });
  } catch (e) {
    console.error("update plan error", e);
    return NextResponse.json({ error: "플랜 저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const ok = await deletePlan(user.id, Number(params.id));
  if (!ok) return NextResponse.json({ error: "플랜을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
