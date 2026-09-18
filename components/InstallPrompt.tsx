"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

// 홈 화면 설치 안내. 안드로이드/데스크톱은 beforeinstallprompt, iOS 사파리는 안내 배너.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 이미 설치(스탠드얼론)면 표시 안 함
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS
      window.navigator.standalone === true;
    if (standalone) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari = isIos && /safari/.test(ua) && !/crios|fxios/.test(ua);
    if (isSafari) setShowIos(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (dismissed) return null;

  if (deferred) {
    return (
      <div className="mx-margin-mobile mb-space-md rounded-2xl bg-primary text-on-primary p-space-md flex items-center justify-between gap-2 shadow-md">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="install_mobile" size={26} />
          <span className="text-body-lg-bold font-body-lg-bold">홈 화면에 앱으로 추가하기</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={async () => {
              deferred.prompt();
              await deferred.userChoice;
              setDeferred(null);
            }}
            className="min-h-[44px] px-4 rounded-xl bg-on-primary text-primary font-bold"
          >
            추가
          </button>
          <button onClick={() => setDismissed(true)} aria-label="닫기" className="w-10 h-10 flex items-center justify-center">
            <Icon name="close" size={24} />
          </button>
        </div>
      </div>
    );
  }

  if (showIos) {
    return (
      <div className="mx-margin-mobile mb-space-md rounded-2xl bg-surface-container-high p-space-md flex items-start gap-2 shadow-sm">
        <Icon name="ios_share" size={24} className="text-primary" />
        <p className="flex-1 text-body-md font-body-md text-on-surface">
          <b>홈 화면에 추가</b>: 하단의 <b>공유</b> 버튼을 누른 뒤 <b>&ldquo;홈 화면에 추가&rdquo;</b>를 선택하세요.
        </p>
        <button onClick={() => setDismissed(true)} aria-label="닫기" className="w-8 h-8 flex items-center justify-center shrink-0">
          <Icon name="close" size={24} className="text-on-surface-variant" />
        </button>
      </div>
    );
  }

  return null;
}
