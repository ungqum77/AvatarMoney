import { getSessionUser } from "@/lib/auth/session";
import { getPlansForUser } from "@/lib/plans";
import { planSummary, PLAN_META } from "@/lib/points";
import PlanListClient, { type PlanCardData } from "@/components/PlanListClient";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const user = await getSessionUser();
  const plans = user ? await getPlansForUser(user.id) : [];

  const cards: PlanCardData[] = plans.map((p) => {
    const meta = PLAN_META[p.planType];
    const s = planSummary(p.rounds, meta.cap);
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
    };
  });

  return <PlanListClient userName={user?.name ?? ""} initialCards={cards} />;
}
