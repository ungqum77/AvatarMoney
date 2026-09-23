import { getSessionUser } from "@/lib/auth/session";
import { getPlansForUser } from "@/lib/plans";
import { planSummary, splitByCurrentRound, PLAN_META } from "@/lib/points";
import { taxSummary } from "@/lib/tax";
import PlanListClient, { type PlanCardData } from "@/components/PlanListClient";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const user = await getSessionUser();
  const plans = user ? await getPlansForUser(user.id) : [];

  const cards: PlanCardData[] = plans.map((p) => {
    const meta = PLAN_META[p.planType];
    const s = planSummary(p.rounds, meta.cap);
    // 내 회차를 정해둔 플랜은 '여기까지 받음 / 앞으로 받을 돈' 까지 카드에 적는다
    const split = splitByCurrentRound(s, p.currentRound);
    // 3.3% 로 끝나는 게 아니라는 것을 카드에서도 귀띔한다.
    // 세금은 세전 수입에 붙으므로 net 이 아니라 gross 를 넘긴다.
    const tax = taxSummary(s.inflow.map((r) => r.gross));
    return {
      id: p.id,
      name: p.name,
      planType: p.planType,
      capLabel: meta.capLabel,
      rounds: p.rounds.length,
      goals: p.rounds,
      totalInvest: s.totalInvest,
      totalNet: s.totalNet,
      roi: s.roi,
      createdAt: p.createdAt,
      currentRound: p.currentRound,
      received: split ? split.received : 0,
      remaining: split ? split.remaining : 0,
      taxTotal: tax.totalTax,
    };
  });

  return <PlanListClient userName={user?.name ?? ""} initialCards={cards} />;
}
