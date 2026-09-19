"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "@/components/Icon";

const TABS: { href: string; icon: IconName; label: string }[] = [
  { href: "/plans", icon: "home", label: "홈" },
  { href: "/simulator", icon: "calculate", label: "플랜설정" },
  { href: "/timeline", icon: "timeline", label: "회차정보" },
  { href: "/me", icon: "account_circle", label: "내정보" },
];

export default function BottomNav() {
  const pathname = usePathname();
  function active(href: string) {
    if (href === "/plans") return pathname === "/plans" || pathname.startsWith("/plans/");
    return pathname.startsWith(href);
  }
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 pb-safe bg-surface shadow-[0_-4px_16px_0_rgba(15,23,42,0.06)]">
      <div className="h-16 flex items-center justify-around px-space-xs">
        {TABS.map((t) => {
          const on = active(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex-1 flex flex-col items-center justify-center min-h-[52px] py-1 ${
                on ? "text-primary" : "text-on-surface-variant"
              }`}
            >
              <Icon name={t.icon} size={26} strokeWidth={on ? 2.75 : 2} />
              <span className={`text-label-sm mt-0.5 ${on ? "font-bold" : "font-medium"}`}>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
