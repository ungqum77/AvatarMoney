"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

/** 한 번 닫으면 다시 안 띄운다. 내정보의 '앱으로 설치하기' 로 언제든 다시 볼 수 있다. */
const DISMISS_KEY = "am_install_dismissed_v1";

/**
 * 어떤 브라우저에서 보고 있는지.
 *  - "android"  : beforeinstallprompt 를 받아서 버튼 한 번으로 설치할 수 있다
 *  - "ios"      : 아이폰/아이패드. 공유 → 홈 화면에 추가 를 손으로 해야 한다
 *  - "inapp"    : 카톡·네이버 같은 앱 안의 브라우저. 여기선 설치 자체가 불가능하다
 *  - "none"     : 이미 설치했거나 안내할 게 없다
 */
type Mode = "android" | "ios" | "inapp" | "none";

/**
 * 앱 안에 들어있는 브라우저(인앱브라우저) 목록.
 * 카톡으로 링크를 받아서 열면 여기로 들어오는데, 이 브라우저에는
 * '홈 화면에 추가' 메뉴가 아예 없다. 한국에서 제일 흔한 실패 경로라
 * 따로 잡아서 "사파리로 여세요" 를 안내한다.
 */
const IN_APP = /kakaotalk|naver|whale|daumapps|line\/|instagram|fbav|fban|band\/|everytimeapp|trill|snapchat/;

export default function InstallPrompt({
  /** 내정보처럼 항상 보여야 하는 자리. 닫기 버튼도 없고 닫은 기록도 무시한다. */
  persistent = false,
}: {
  persistent?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("none");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 이미 홈 화면에서 앱으로 켠 상태면 안내할 게 없다
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    if (!persistent) {
      try {
        if (localStorage.getItem(DISMISS_KEY)) setDismissed(true);
      } catch {
        /* 사파리 시크릿 모드에선 localStorage 가 막힌다. 그냥 띄운다. */
      }
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const isIos =
      /iphone|ipad|ipod/.test(ua) ||
      // 아이패드는 iPadOS 13부터 UA 에 'Macintosh' 로 나온다. 터치가 되면 아이패드다.
      (/macintosh/.test(ua) && navigator.maxTouchPoints > 1);

    if (IN_APP.test(ua)) {
      setMode("inapp");
      return;
    }
    if (isIos) {
      // 아이폰은 beforeinstallprompt 가 영영 안 온다. 바로 손안내로 간다.
      setMode("ios");
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [persistent]);

  const close = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* 저장 못 해도 이번 화면에선 닫힌다 */
    }
  }, []);

  /** 인앱브라우저 탈출. 카톡은 전용 주소가 있고, 나머지는 주소 복사로 넘긴다. */
  function openOutside() {
    const url = window.location.href;
    const ua = window.navigator.userAgent.toLowerCase();
    if (/kakaotalk/.test(ua)) {
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
      return;
    }
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      })
      .catch(() => setCopied(false));
  }

  if (mode === "none") return null;
  if (dismissed && !persistent) return null;

  const CloseButton = persistent ? null : (
    <button
      onClick={close}
      aria-label="닫기"
      className="w-11 h-11 flex items-center justify-center shrink-0 -mr-1.5 -mt-1.5"
    >
      <Icon name="close" size={24} />
    </button>
  );

  // ── 안드로이드·데스크톱 크롬: 버튼 한 번으로 끝난다 ───────────────
  if (mode === "android") {
    return (
      <section className="rounded-2xl bg-primary text-on-primary p-space-md shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon name="install_mobile" size={26} />
            <span className="text-[19px] font-extrabold leading-tight">
              홈 화면에 앱으로 추가하기
            </span>
          </div>
          {CloseButton}
        </div>
        <p className="text-[16px] font-semibold text-on-primary/85 mt-1 leading-snug">
          주소창 없이 앱처럼 열립니다
        </p>
        <button
          onClick={async () => {
            if (!deferred) return;
            deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
            setMode("none");
          }}
          className="w-full min-h-[56px] mt-3 rounded-xl bg-on-primary text-primary text-[19px] font-extrabold active:scale-[0.98]"
        >
          지금 설치하기
        </button>
      </section>
    );
  }

  // ── 카톡·네이버 인앱브라우저: 여기선 설치가 안 된다 ──────────────
  if (mode === "inapp") {
    const isKakao = typeof window !== "undefined" && /kakaotalk/i.test(navigator.userAgent);
    return (
      <section className="rounded-2xl bg-tertiary-fixed p-space-md shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon name="error" size={24} className="text-on-tertiary-fixed shrink-0" />
            <span className="text-[19px] font-extrabold text-on-tertiary-fixed leading-tight">
              앱으로 설치하려면 브라우저에서 열어주세요
            </span>
          </div>
          {CloseButton && (
            <button
              onClick={close}
              aria-label="닫기"
              className="w-11 h-11 flex items-center justify-center shrink-0 -mr-1.5 -mt-1.5 text-on-tertiary-fixed"
            >
              <Icon name="close" size={24} />
            </button>
          )}
        </div>
        <p className="text-[17px] font-semibold text-on-tertiary-fixed/85 mt-1.5 leading-snug">
          지금은 다른 앱 안에서 보고 있어서 홈 화면에 추가할 수 없습니다.
          {isKakao ? "" : " 화면 오른쪽 아래 ⋯ 메뉴에서 「다른 브라우저로 열기」를 누르세요."}
        </p>
        <button
          onClick={openOutside}
          className="w-full min-h-[56px] mt-3 rounded-xl bg-on-tertiary-fixed text-tertiary-fixed text-[18px] font-extrabold active:scale-[0.98]"
        >
          {isKakao ? "브라우저로 열기" : copied ? "주소를 복사했습니다 ✓" : "주소 복사하기"}
        </button>
        {copied && !isKakao && (
          <p className="text-[16px] font-semibold text-on-tertiary-fixed/85 mt-2 leading-snug">
            사파리(또는 크롬)를 열고 주소창에 붙여넣기 하세요.
          </p>
        )}
      </section>
    );
  }

  // ── 아이폰·아이패드: 애플이 자동 설치를 막아놔서 손으로 안내한다 ──
  return (
    <section className="rounded-2xl bg-surface-container-high p-space-md shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="install_mobile" size={26} className="text-primary shrink-0" />
          <span className="text-[19px] font-extrabold text-on-surface leading-tight">
            아이폰 홈 화면에 추가하기
          </span>
        </div>
        {CloseButton && (
          <button
            onClick={close}
            aria-label="닫기"
            className="w-11 h-11 flex items-center justify-center shrink-0 -mr-1.5 -mt-1.5 text-on-surface-variant"
          >
            <Icon name="close" size={24} />
          </button>
        )}
      </div>

      <ol className="mt-3 flex flex-col gap-2.5">
        {[
          <>
            <b>사파리</b>로 이 화면을 엽니다
          </>,
          <>
            화면 <b>아래 가운데 공유 버튼</b>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container-lowest align-middle mx-1">
              <Icon name="ios_share" size={20} className="text-primary" />
            </span>
            을 누릅니다
          </>,
          <>
            목록을 내려서 <b>&ldquo;홈 화면에 추가&rdquo;</b>를 누릅니다
          </>,
        ].map((step, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="w-8 h-8 shrink-0 rounded-full bg-primary text-on-primary text-[17px] font-extrabold flex items-center justify-center">
              {i + 1}
            </span>
            <span className="flex-1 text-[18px] font-semibold text-on-surface leading-snug pt-0.5">
              {step}
            </span>
          </li>
        ))}
      </ol>

      <p className="text-[16px] font-semibold text-on-surface-variant mt-3 leading-snug">
        아이폰은 자동 설치 버튼을 제공하지 않아 이 세 단계가 필요합니다.
      </p>
    </section>
  );
}
