import { getSessionUser } from "@/lib/auth/session";
import { getPlansForUser } from "@/lib/plans";
import { planSummary, splitByCurrentRound, PLAN_META } from "@/lib/points";
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
      currentRound: p.currentRound,
      received: split ? split.received : 0,
      remaining: split ? split.remaining : 0,
    };
  });

  return <PlanListClient userName={user?.name ?? ""} initialCards={cards} />;
}
