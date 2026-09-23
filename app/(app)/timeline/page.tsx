import { getSessionUser } from "@/lib/auth/session";
import { getPlansForUser } from "@/lib/plans";
import { PLAN_META } from "@/lib/points";
import TimelineClient, { type TimelinePlan } from "@/components/TimelineClient";

export const dynamic = "force-dynamic";

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  const user = await getSessionUser();
  const plans = user ? await getPlansForUser(user.id) : [];
  const list: TimelinePlan[] = plans.map((p) => ({
    id: p.id,
    name: p.name,
    planType: p.planType,
    capLabel: PLAN_META[p.planType].capLabel,
    rounds: p.rounds,
    currentRound: p.currentRound,
  }));
  const selectedId = searchParams.plan ? Number(searchParams.plan) : list[0]?.id ?? null;
  return <TimelineClient plans={list} selectedId={selectedId} />;
}
