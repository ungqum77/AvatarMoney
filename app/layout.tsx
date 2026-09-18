import type { Metadata, Viewport } from "next";
import Script from "next/script";
import SwRegister from "@/components/SwRegister";
import "./globals.css";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export const metadata: Metadata = {
  title: "Avatar Money — 내 수당 플래너",
  description: "회차별 목표금액을 넣으면 예상 수당과 타임라인을 보여주는 수당 플래너",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Avatar Money",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#4F46E5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      {/* eslint-disable @next/next/no-page-custom-font -- App Router 의 루트 layout 이라 모든 페이지에 적용된다 */}
      <head>
        {/* 본문 폰트. 아이콘은 components/Icon.tsx 에 SVG 로 내장되어 있어 폰트가 필요 없다. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+KR:wght@400;500;700;900&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
        />
      </head>
      <body>
        {ADSENSE_CLIENT ? (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        ) : null}
        {/* 로그인 전에도 앱으로 설치할 수 있어야 하므로 루트에서 등록한다.
            (app) 그룹에만 두면 로그인 화면에서는 서비스워커가 안 뜬다. */}
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
