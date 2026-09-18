"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPhone } from "@/lib/format";
import Icon from "@/components/Icon";

export default function SignupPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const pwLenOk = password.length >= 6;
  const pwCombOk = /[A-Za-z]/.test(password) && /[0-9]/.test(password);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!agree) return setError("서비스 이용 및 개인정보 처리에 동의해주세요.");
    if (phone.replace(/[^0-9]/g, "").length < 10) return setError("휴대폰 번호를 정확히 입력해주세요.");
    if (!pwLenOk) return setError("비밀번호는 6자 이상이어야 합니다.");
    if (!name.trim()) return setError("성함을 입력해주세요.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "가입에 실패했습니다.");
        setLoading(false);
        return;
      }
      router.push("/plans");
      router.refresh();
    } catch {
      setError("네트워크 오류입니다. 잠시 후 다시 시도해주세요.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[480px] mx-auto min-h-screen flex flex-col bg-surface">
      {/* 헤더 */}
      <header className="px-margin-mobile pt-safe">
        <div className="h-16 flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
            <Icon name="savings" size={20} className="text-on-primary" />
          </div>
          <h1 className="text-headline-md font-headline-md text-on-surface font-bold">회원가입</h1>
        </div>
      </header>

      <main className="flex-1 px-margin-mobile pb-safe">
        {/* 환영 배너 */}
        <div className="w-full bg-surface-container-high rounded-xl p-space-md shadow-sm mb-space-lg flex items-start gap-space-sm">
          <div className="w-14 h-14 rounded-full bg-primary shrink-0 flex items-center justify-center shadow-md">
            <Icon name="sentiment_satisfied" size={32} className="text-on-primary" />
          </div>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1 mb-1">
              <span className="bg-secondary text-on-secondary text-label-md font-bold px-2 py-0.5 rounded-full">1분 완성</span>
              <span className="text-body-lg-bold font-body-lg-bold text-primary">간편 회원가입</span>
            </div>
            <p className="text-body-lg-bold font-body-lg-bold text-on-surface leading-tight">
              복잡한 절차 없이 누구나 쉽고
              <br />
              안전하게 가입하실 수 있습니다.
            </p>
          </div>
        </div>

        <form className="w-full flex flex-col gap-space-lg" onSubmit={submit}>
          {/* 휴대폰 */}
          <div className="flex flex-col">
            <label htmlFor="phone" className="text-headline-sm font-headline-sm text-on-surface font-extrabold mb-space-xs">
              1. 휴대폰 번호 <span className="text-error">*</span>
            </label>
            <p className="text-body-md font-body-md text-on-surface-variant mb-space-xs font-semibold">
              본인 휴대폰 번호를 숫자만 눌러주세요.
            </p>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="010-1234-5678"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              className="w-full h-[64px] px-space-md text-headline-md font-headline-md text-on-surface bg-surface-container-lowest rounded-xl shadow-sm focus:outline-none focus:bg-surface-container-high placeholder:text-outline"
            />
          </div>

          {/* 비밀번호 */}
          <div className="flex flex-col">
            <label htmlFor="pw" className="text-headline-sm font-headline-sm text-on-surface font-extrabold mb-space-xs">
              2. 비밀번호 <span className="text-error">*</span>
            </label>
            <p className="text-body-md font-body-md text-on-surface-variant mb-space-xs font-semibold">
              잊지 않도록 쉬운 영문과 숫자를 함께 적어주세요. (6자 이상)
            </p>
            <div className="relative w-full">
              <input
                id="pw"
                type={showPw ? "text" : "password"}
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[64px] pl-space-md pr-16 text-headline-md font-headline-md text-on-surface bg-surface-container-lowest rounded-xl shadow-sm focus:outline-none focus:bg-surface-container-high placeholder:text-outline"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[56px] min-h-[56px] flex flex-col items-center justify-center rounded-xl active:scale-95"
                aria-label="비밀번호 보기 전환"
              >
                <Icon name={showPw ? "visibility_off" : "visibility"} size={30} className="text-primary" />
                <span className="text-[11px] leading-none text-on-surface font-bold mt-0.5">
                  {showPw ? "숨기기" : "보기"}
                </span>
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-md font-semibold ${pwLenOk ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container text-on-surface-variant"}`}>
                <Icon name="check" size={16} />6자리 이상
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-md font-semibold ${pwCombOk ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container text-on-surface-variant"}`}>
                <Icon name="check" size={16} />영문·숫자
              </span>
            </div>
          </div>

          {/* 이름 */}
          <div className="flex flex-col">
            <label htmlFor="name" className="text-headline-sm font-headline-sm text-on-surface font-extrabold mb-space-xs">
              3. 성함 (이름) <span className="text-error">*</span>
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="예: 홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-[64px] px-space-md text-headline-md font-headline-md text-on-surface bg-surface-container-lowest rounded-xl shadow-sm focus:outline-none focus:bg-surface-container-high placeholder:text-outline"
            />
          </div>

          {/* 약관 */}
          <label className="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center gap-space-sm min-h-[56px] cursor-pointer">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="w-7 h-7 rounded accent-primary"
            />
            <div className="flex flex-col">
              <span className="text-body-lg-bold font-body-lg-bold text-on-surface">[필수] 서비스 이용 및 개인정보 처리 동의</span>
              <span className="text-label-md font-semibold text-secondary">자산 정보를 안전하게 보호합니다</span>
            </div>
          </label>

          {error && (
            <div className="p-4 bg-error-container rounded-xl flex items-center gap-2">
              <Icon name="error" size={24} className="text-on-error-container" />
              <span className="text-body-lg-bold font-body-lg-bold text-on-error-container">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[64px] h-[68px] bg-primary-container text-on-primary rounded-2xl text-headline-md font-headline-md shadow-md active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span>{loading ? "가입 중..." : "가입 완료하기"}</span>
            {!loading && <Icon name="arrow_forward" size={28} />}
          </button>

          <div className="w-full py-space-sm flex flex-col items-center text-center">
            <p className="text-body-lg font-body-lg text-on-surface-variant mb-1">이미 계정이 있으신가요?</p>
            <Link href="/login" className="inline-flex items-center gap-1 min-h-[56px] px-space-md text-body-lg-bold font-body-lg-bold text-primary underline underline-offset-4">
              기존 아이디로 로그인하기
              <Icon name="login" size={22} />
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
