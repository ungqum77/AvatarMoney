"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPhone } from "@/lib/format";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "로그인에 실패했습니다.");
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
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#F8FAFC] flex flex-col px-5 pt-8 pb-10">
      {/* 환영 카드 */}
      <header className="w-full mb-6">
        <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200/50">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-lg text-sm font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            안심 보안 접속
          </div>
          <h1 className="text-[28px] font-extrabold leading-tight mb-2">
            Avatar Money
            <br />
            <span className="text-emerald-300">내 수당 플래너</span> 로그인
          </h1>
          <p className="text-[19px] text-indigo-100 font-medium">등록하신 휴대폰 번호로 빠르게 시작하세요.</p>
        </div>
      </header>

      <main className="flex-1">
        <form className="space-y-6" onSubmit={submit}>
          {/* 휴대폰 */}
          <div className="space-y-2.5">
            <label htmlFor="phone" className="text-[21px] font-bold text-slate-900">
              1. 휴대폰 번호 <span className="text-rose-500 font-extrabold">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              placeholder="010-1234-5678"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              className="w-full h-16 px-4 text-[22px] font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-2xl placeholder:text-slate-400 placeholder:font-normal focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 focus:outline-none shadow-sm"
            />
          </div>

          {/* 비밀번호 */}
          <div className="space-y-2.5">
            <label htmlFor="pw" className="text-[21px] font-bold text-slate-900">
              2. 비밀번호 <span className="text-rose-500 font-extrabold">*</span>
            </label>
            <div className="relative">
              <input
                id="pw"
                type={showPw ? "text" : "password"}
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-16 pl-4 pr-24 text-[22px] font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-2xl placeholder:text-slate-400 placeholder:font-normal focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 focus:outline-none shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-base font-bold"
              >
                {showPw ? "숨기기" : "보기"}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-start gap-3">
              <span className="material-symbols-outlined text-rose-600">error</span>
              <div>
                <h4 className="text-[19px] font-bold text-rose-900 leading-snug">{error}</h4>
                <p className="text-[16px] text-rose-700 font-medium mt-1">입력하신 정보를 다시 확인해 주세요.</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-16 bg-indigo-600 active:bg-indigo-700 text-white text-[22px] font-extrabold rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-60"
          >
            <span>{loading ? "로그인 중..." : "로그인 하기"}</span>
          </button>
        </form>
      </main>

      <footer className="mt-8 pt-4 border-t border-slate-200">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-[18px] text-slate-600 font-medium mb-3">아직 회원이 아니신가요?</p>
          <Link href="/signup" className="inline-flex items-center justify-center w-full h-14 bg-slate-100 active:bg-slate-200 text-indigo-700 text-[20px] font-bold rounded-xl border border-indigo-100">
            새로 간편 회원가입하기
          </Link>
        </div>
      </footer>
    </div>
  );
}
