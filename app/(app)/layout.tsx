import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import BottomNav from "@/components/BottomNav";
import SwRegister from "@/components/SwRegister";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser().catch(() => null);
  if (!user) redirect("/login");

  return (
    <div className="w-full max-w-[480px] mx-auto min-h-screen flex flex-col bg-surface relative">
      <div className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">{children}</div>
      <BottomNav />
      <SwRegister />
    </div>
  );
}
