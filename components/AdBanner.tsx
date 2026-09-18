"use client";

import { useEffect, useRef } from "react";

// 애드센스 배너. 플랜 목록·타임라인 화면 하단에만 사용.
// 로그인/회원가입/시뮬레이터/프레젠테이션에는 넣지 않는다.
export default function AdBanner() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT;
  const pushed = useRef(false);

  useEffect(() => {
    if (!client || !slot || pushed.current) return;
    try {
      // @ts-expect-error adsbygoogle 전역
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      /* ignore */
    }
  }, [client, slot]);

  // 애드센스 미설정 시 아무것도 렌더하지 않음(개발 중 깔끔)
  if (!client || !slot) return null;

  return (
    <div className="mt-space-lg border-t border-surface-container pt-space-md">
      <p className="text-center text-label-sm text-on-surface-variant mb-1">광고</p>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
