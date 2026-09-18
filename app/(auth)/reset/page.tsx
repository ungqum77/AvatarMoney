"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPhone } from "@/lib/format";
import Icon from "@/components/Icon";

const INPUT =
  "w-full h-16 px-4 text-[22px] font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-2xl placeholder:text-slate-400 placeholder:font-normal focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 focus:outline-none shadow-sm";
const LABEL = "text-[20px] font-bold text-slate-900 mb-2";
const PRIMARY =
  "w-full h-16 bg-indigo-600 active:bg-indigo-700 text-white text-[22px] font-extrabold rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center active:scale-[0.99] disabled:opacity-60";

export default function ResetPage() {
  const router = useRouter();

  // 1단계: 본인 확인 / 2단계: 새 비밀번호
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const pwLenOk = password.length >= 6;

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (phone.replace(/[^0-9]/g, "").length < 10)
      return setError("휴대폰 번호를 정확히 입력해주세요.");
    if (!name.trim()) return setError("가입하실 때 넣으신 성함을 입력해주세요.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "확인에 실패했습니다.");
        setLoading(false);
        return;
      }
      setToken(data.token);
      setName(data.name);
      setStep(2);
      setLoading(false);
    } catch {
      setError("네트워크 오류입니다. 잠시 후 다시 시도해주세요.");
      setLoading(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!pwLenOk) return setError("비밀번호는 6자 이상이어야 합니다.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "변경에 실패했습니다.");
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
    <div className="w-full max-w-md mx-auto min-h-[100dvh] bg-[#F8FAFC] flex flex-col justify-center px-5 py-6">
      <header className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
          <Icon name="shield" size={26} className="text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-[24px] font-extrabold text-slate-900 leading-tight">비밀번호 찾기</h1>
          <p className="text-[18px] text-slate-500 font-semibold leading-tight">
            {step === 1 ? "본인 확인을 먼저 합니다" : "새 비밀번호를 정해주세요"}
          </p>
        </div>
      </header>

      {step === 1 ? (
        <form className="flex flex-col" onSubmit={verify}>
          <label htmlFor="phone" className={LABEL}>
            휴대폰 번호 <span className="text-rose-500 font-extrabold">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="010-1234-5678"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            className={INPUT}
          />

          <label htmlFor="name" className={`${LABEL} mt-4`}>
            성함 (이름) <span className="text-rose-500 font-extrabold">*</span>
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="예: 홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={INPUT}
          />

          {error && <ErrorBox text={error} />}

          <button type="submit" disabled={loading} className={`${PRIMARY} mt-5`}>
            {loading ? "확인 중..." : "본인 확인하기"}
          </button>

          <Link
            href="/login"
            className="mt-3 w-full min-h-[56px] flex items-center justify-center rounded-xl bg-white border-2 border-slate-200 text-[19px] font-bold text-slate-700 active:bg-slate-100"
          >
            로그인으로 돌아가기
          </Link>
        </form>
      ) : (
        <form className="flex flex-col" onSubmit={confirm}>
          <div className="mb-4 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl flex items-center gap-3">
            <Icon name="check_circle" size={26} className="text-emerald-600" />
            <p className="text-[19px] font-bold text-emerald-900 leading-snug">
              {name}님 확인됐습니다
            </p>
          </div>

          <label htmlFor="pw" className={LABEL}>
            새 비밀번호 <span className="text-rose-500 font-extrabold">*</span>
          </label>
          <div className="relative">
            <input
              id="pw"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="6자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${INPUT} pr-24`}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-base font-bold"
            >
              {showPw ? "숨기기" : "보기"}
            </button>
          </div>
          <p className="mt-2 text-[18px] text-slate-500 font-semibold">
            잊지 않도록 쉬운 영문과 숫자를 함께 적어주세요.
          </p>

          {error && <ErrorBox text={error} />}

          <button type="submit" disabled={loading} className={`${PRIMARY} mt-5`}>
            {loading ? "바꾸는 중..." : "비밀번호 바꾸기"}
          </button>
        </form>
      )}
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="mt-4 p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-start gap-3">
      <Icon name="error" size={24} className="text-rose-600" />
      <h4 className="text-[19px] font-bold text-rose-900 leading-snug">{text}</h4>
    </div>
  );
}
