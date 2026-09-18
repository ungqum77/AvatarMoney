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
      {/* 하단 탭바 높이는 64px + pb-safe(1.25rem) = 84px.
          80px 만 비우면 맨 아래 버튼이 4px 잘리므로 6rem 으로 여유를 둔다. */}
      <div className="flex-1 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">{children}</div>
      <BottomNav />
      <SwRegister />
    </div>
  );
}
