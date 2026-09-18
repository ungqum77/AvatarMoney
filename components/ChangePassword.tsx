"use client";

import { useState } from "react";
import Icon from "@/components/Icon";

export default function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  function reset() {
    setCurrent("");
    setNext("");
    setError("");
    setDone(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (next.length < 6) return setError("새 비밀번호는 6자 이상이어야 합니다.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "변경에 실패했습니다.");
        setLoading(false);
        return;
      }
      setDone(true);
      setCurrent("");
      setNext("");
      setLoading(false);
    } catch {
      setError("네트워크 오류입니다. 잠시 후 다시 시도해주세요.");
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="w-full min-h-[56px] rounded-2xl bg-surface-container text-on-surface text-body-lg-bold font-body-lg-bold flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        <Icon name="shield" size={22} />
        비밀번호 바꾸기
      </button>
    );
  }

  if (done) {
    return (
      <div className="w-full rounded-2xl bg-secondary-container p-space-md flex items-center gap-3">
        <Icon name="check_circle" size={28} className="text-on-secondary-container" />
        <span className="flex-1 text-body-lg-bold font-body-lg-bold text-on-secondary-container">
          비밀번호가 바뀌었어요 ✓
        </span>
        <button
          onClick={() => setOpen(false)}
          className="min-h-[44px] px-4 rounded-xl bg-surface-container-lowest text-on-surface font-bold"
        >
          닫기
        </button>
      </div>
    );
  }

  const INPUT =
    "w-full h-16 px-4 text-[22px] font-bold text-on-surface bg-surface-container-lowest border-2 border-outline-variant rounded-2xl placeholder:text-outline placeholder:font-normal focus:border-primary focus:outline-none";

  return (
    <form onSubmit={submit} className="w-full rounded-2xl bg-surface-container-lowest p-space-md shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-headline-sm font-headline-sm text-on-surface font-bold">비밀번호 바꾸기</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="닫기"
          className="w-11 h-11 flex items-center justify-center rounded-xl"
        >
          <Icon name="close" size={24} />
        </button>
      </div>

      <label htmlFor="cur" className="text-[20px] font-bold text-on-surface mb-2">
        지금 쓰시는 비밀번호
      </label>
      <input
        id="cur"
        type={showPw ? "text" : "password"}
        autoComplete="current-password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        className={INPUT}
      />

      <label htmlFor="new" className="text-[20px] font-bold text-on-surface mb-2 mt-4">
        새 비밀번호
      </label>
      <div className="relative">
        <input
          id="new"
          type={showPw ? "text" : "password"}
          autoComplete="new-password"
          placeholder="6자 이상"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className={`${INPUT} pr-24`}
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-surface-container rounded-xl text-on-surface text-base font-bold"
        >
          {showPw ? "숨기기" : "보기"}
        </button>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-error-container rounded-xl flex items-center gap-2">
          <Icon name="error" size={22} className="text-on-error-container" />
          <span className="text-body-lg-bold font-body-lg-bold text-on-error-container">{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full h-16 bg-primary-container text-on-primary rounded-2xl text-headline-md font-headline-md shadow-md active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? "바꾸는 중..." : "바꾸기"}
      </button>
    </form>
  );
}
