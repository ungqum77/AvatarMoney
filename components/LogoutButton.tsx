"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/Icon";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    // 서비스워커가 캐시해 둔 내 플랜 화면을 지운다.
    // 안 지우면 오프라인에서 다음 사람에게 이전 화면이 보인다.
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* 캐시를 못 지워도 로그아웃은 진행한다 */
    }
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      disabled={busy}
      className="w-full min-h-[56px] rounded-2xl bg-surface-container text-on-surface text-body-lg-bold font-body-lg-bold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
    >
      <Icon name="logout" size={22} />
      {busy ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
}
