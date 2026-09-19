import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getPlan, updatePlan, deletePlan } from "@/lib/plans";
import { PLAN_META, PLAN_HORIZON, type PlanType } from "@/lib/points";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** @param allowZero 0(그 회차엔 아바타 안 만들기)을 허용할지 */
function sanitizeRounds(rounds: unknown, planType: PlanType, allowZero: boolean): number[] {
  const meta = PLAN_META[planType];
  if (!Array.isArray(rounds)) return [meta.min];
  // 18회차가 기준이므로 그 이상은 받지 않는다
  const out = rounds.slice(0, PLAN_HORIZON).map((n, i) => {
    let v = Math.round(Number(n) || 0);
    // 1회차(본코드)는 반드시 만들어야 하므로 0으로 못 잡는다
    if (v <= 0) return allowZero && i > 0 ? 0 : meta.min;
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
    const patch: {
      name?: string;
      planType?: PlanType;
      rounds?: number[];
      allowZero?: boolean;
    } = {};
    let planType: PlanType | undefined;
    if (body.planType !== undefined) {
      planType = body.planType === "won11" ? "won11" : "won33";
      patch.planType = planType;
    }
    if (body.name !== undefined) patch.name = String(body.name).slice(0, 60);
    if (body.allowZero !== undefined) patch.allowZero = body.allowZero === true;
    if (body.rounds !== undefined) {
      // 유형이 바뀌면 새 유형 기준으로, 아니면 기존 조회 필요 → 기본 won33 기준 보정
      const effType = planType ?? "won33";
      // 옵션을 함께 보내지 않았다면 저장된 값을 따른다.
      const allowZero =
        patch.allowZero ??
        (await getPlan(user.id, Number(params.id)))?.allowZero ??
        false;
      patch.rounds = sanitizeRounds(body.rounds, effType, allowZero);
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
