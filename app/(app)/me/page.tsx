import { getSessionUser } from "@/lib/auth/session";
import { formatPhone } from "@/lib/format";
import LogoutButton from "@/components/LogoutButton";
import ChangePassword from "@/components/ChangePassword";
import InstallPrompt from "@/components/InstallPrompt";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await getSessionUser();

  return (
    <div className="flex flex-col w-full">
      <header className="sticky top-0 z-40 bg-surface shadow-[0_1px_8px_rgba(0,0,0,0.03)] pt-safe">
        <div className="h-16 px-margin-mobile flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
            <Icon name="account_circle" size={20} className="text-on-primary" />
          </div>
          <h1 className="text-headline-sm font-headline-sm text-on-surface font-bold">내정보</h1>
        </div>
      </header>

      <main className="px-margin-mobile flex flex-col gap-space-lg pt-space-md">
        <section className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-md flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
            <Icon name="person" size={36} className="text-on-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-headline-md font-headline-md text-on-surface font-bold">{user?.name}님</span>
            <span className="text-body-lg font-body-lg text-on-surface-variant">
              {user ? formatPhone(user.phone) : ""}
            </span>
          </div>
        </section>

        <section className="rounded-2xl bg-surface-container-high p-space-md flex items-start gap-3">
          <Icon name="shield" size={24} className="text-primary" />
          <p className="text-body-md font-body-md text-on-surface">
            내 플랜은 안전하게 저장되어 어느 기기에서 로그인해도 그대로 볼 수 있습니다.
          </p>
        </section>

        {/* 홈에서 배너를 닫았어도 여기서는 언제든 설치 방법을 다시 볼 수 있다 */}
        <InstallPrompt persistent />

        <ChangePassword />

        <LogoutButton />
      </main>
    </div>
  );
}
