import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getPlan, getPlansForUser } from "@/lib/plans";
import SimulatorClient from "@/components/SimulatorClient";

export const dynamic = "force-dynamic";

export default async function SimulatorPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const plan = await getPlan(user.id, Number(params.id));
  if (!plan) redirect("/plans");
  const all = await getPlansForUser(user.id);
  const otherPlans = all.filter((p) => p.id !== plan.id).map((p) => ({ id: p.id, name: p.name }));

  return (
    <SimulatorClient
      id={plan.id}
      initialName={plan.name}
      initialType={plan.planType}
      initialRounds={plan.rounds}
      initialAllowZero={plan.allowZero}
      initialCurrentRound={plan.currentRound}
      otherPlans={otherPlans}
    />
  );
}
