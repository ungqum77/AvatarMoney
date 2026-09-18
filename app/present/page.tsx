import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getPlansForUser } from "@/lib/plans";
import { PLAN_META } from "@/lib/points";
import PresentClient, { type PresentPlan } from "@/components/PresentClient";

export const dynamic = "force-dynamic";

export default async function PresentPage({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const plans = await getPlansForUser(user.id);
  if (plans.length === 0) redirect("/plans");

  const list: PresentPlan[] = plans.map((p) => ({
    id: p.id,
    name: p.name,
    planType: p.planType,
    capLabel: PLAN_META[p.planType].capLabel,
    rounds: p.rounds,
  }));
  const selectedId = searchParams.plan ? Number(searchParams.plan) : list[0].id;

  return <PresentClient plans={list} selectedId={selectedId} />;
}
