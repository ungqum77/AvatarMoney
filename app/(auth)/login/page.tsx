"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPhone } from "@/lib/format";
import Icon from "@/components/Icon";

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
    // 한 화면에 다 들어가도록: 100dvh 안에서 세로 가운데 정렬.
    // 입력칸 64px·버튼 64px 은 60대 기준이라 줄이지 않고, 장식 요소를 덜어냈다.
    <div className="w-full max-w-md mx-auto min-h-[100dvh] bg-[#F8FAFC] flex flex-col justify-center px-5 py-6">
      <header className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
          <Icon name="savings" size={26} className="text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-[24px] font-extrabold text-slate-900 leading-tight">Avatar Money</h1>
          <p className="text-[18px] text-slate-500 font-semibold leading-tight">내 수당 플래너</p>
        </div>
      </header>

      <form className="flex flex-col" onSubmit={submit}>
        <label htmlFor="phone" className="text-[20px] font-bold text-slate-900 mb-2">
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
          className="w-full h-16 px-4 text-[22px] font-bold text-slate-900 bg-white border-2 border-slate-300 rounded-2xl placeholder:text-slate-400 placeholder:font-normal focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 focus:outline-none shadow-sm"
        />

        <label htmlFor="pw" className="text-[20px] font-bold text-slate-900 mb-2 mt-4">
          비밀번호 <span className="text-rose-500 font-extrabold">*</span>
        </label>
        <div className="relative">
          <input
            id="pw"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
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

        {error && (
          <div className="mt-4 p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-start gap-3">
            <Icon name="error" size={24} className="text-rose-600" />
            <h4 className="text-[19px] font-bold text-rose-900 leading-snug">{error}</h4>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full h-16 bg-indigo-600 active:bg-indigo-700 text-white text-[22px] font-extrabold rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center active:scale-[0.99] disabled:opacity-60"
        >
          {loading ? "로그인 중..." : "로그인 하기"}
        </button>
      </form>

      <div className="mt-3 flex items-stretch gap-2">
        <Link
          href="/reset"
          className="flex-1 min-h-[56px] flex items-center justify-center rounded-xl bg-white border-2 border-slate-200 text-[19px] font-bold text-slate-700 active:bg-slate-100"
        >
          비밀번호 찾기
        </Link>
        <Link
          href="/signup"
          className="flex-1 min-h-[56px] flex items-center justify-center rounded-xl bg-white border-2 border-indigo-200 text-[19px] font-bold text-indigo-700 active:bg-indigo-50"
        >
          회원가입
        </Link>
      </div>
    </div>
  );
}
