import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getPlansForUser } from "@/lib/plans";

export const dynamic = "force-dynamic";

// '플랜설정' 탭: 가장 최근에 고친 플랜으로 이동. 없으면 목록으로.
export default async function SimulatorTab() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const plans = await getPlansForUser(user.id);
  if (plans.length === 0) redirect("/plans");
  redirect(`/plans/${plans[0].id}`);
}
