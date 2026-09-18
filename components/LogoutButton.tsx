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
