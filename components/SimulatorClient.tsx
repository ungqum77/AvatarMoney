"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { won } from "@/lib/format";
import { planSummary, avatarNetLifetime, PLAN_META, type PlanType } from "@/lib/points";

export default function SimulatorClient({
  id,
  initialName,
  initialType,
  initialRounds,
}: {
  id: number;
  initialName: string;
  initialType: PlanType;
  initialRounds: number[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<PlanType>(initialType);
  const [rounds, setRounds] = useState<number[]>(
    initialRounds.length ? initialRounds : [PLAN_META[initialType].min]
  );
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  const meta = PLAN_META[type];
  const presets =
    type === "won33" ? [330000, 440000, 550000, 660000] : [110000, 220000, 330000, 440000];

  const summary = useMemo(() => planSummary(rounds, meta.cap), [rounds, meta.cap]);

  function clamp(v: number): number {
    if (v < meta.min) v = meta.min;
    const rem = (v - meta.min) % meta.step;
    if (rem !== 0) v -= rem;
    return v;
  }
  function setRound(i: number, v: number) {
    setRounds((rs) => rs.map((x, idx) => (idx === i ? clamp(v) : x)));
  }
  function addRound() {
    setRounds((rs) => [...rs, rs.length ? rs[rs.length - 1] : meta.min]);
  }
  function removeRound(i: number) {
    setRounds((rs) => (rs.length <= 1 ? rs : rs.filter((_, idx) => idx !== i)));
  }
  function changeType(t: PlanType) {
    setType(t);
    setRounds((rs) => rs.map((v) => Math.max(v, PLAN_META[t].min)));
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/plans/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || "새 플랜", planType: type, rounds }),
    });
    setSaving(false);
    if (res.ok) {
      setToast("플랜이 저장되었습니다 ✓");
      setTimeout(() => setToast(""), 2200);
      router.refresh();
    } else {
      setToast("저장에 실패했습니다");
      setTimeout(() => setToast(""), 2200);
    }
  }

  return (
    <div className="flex flex-col w-full">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)] pt-safe">
        <div className="h-16 px-margin-mobile flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/plans" className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface active:bg-surface-container">
              <span className="material-symbols-outlined text-[26px]">arrow_back</span>
            </Link>
            <h1 className="text-headline-sm font-headline-sm text-on-surface font-bold">시뮬레이터</h1>
          </div>
          <Link
            href={`/present?plan=${id}`}
            className="min-h-[44px] px-3 rounded-xl bg-secondary text-on-secondary text-label-md font-bold flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[20px]">present_to_all</span>보여주기
          </Link>
        </div>
      </header>

      <main className="px-margin-mobile flex flex-col pt-space-md">
        {/* 플랜 이름 + 유형 */}
        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm mb-space-md flex flex-col gap-3">
          <div>
            <span className="text-label-sm text-on-surface-variant block mb-1">플랜 이름</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent text-headline-sm font-headline-sm text-on-surface font-bold focus:outline-none focus:bg-surface-container-low px-1.5 py-1 rounded"
            />
          </div>
          <div className="flex items-center gap-2">
            {(["won33", "won11"] as PlanType[]).map((t) => {
              const on = type === t;
              return (
                <button
                  key={t}
                  onClick={() => changeType(t)}
                  className={`flex-1 min-h-[48px] rounded-xl text-label-md font-bold border-2 ${
                    on ? "border-primary bg-primary-fixed text-on-primary-fixed" : "border-surface-container text-on-surface-variant"
                  }`}
                >
                  {PLAN_META[t].label} · 극점 {PLAN_META[t].capLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* 요약 (sticky) */}
        <div className="sticky top-16 z-30 mb-space-lg">
          <div className="bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl p-space-md shadow-md">
            <div className="flex items-center justify-between bg-surface-container-low/60 rounded-xl px-3.5 py-2.5 mb-3">
              <span className="text-label-md font-semibold text-on-surface-variant">총 투입 누적</span>
              <span className="text-headline-md font-headline-md text-on-surface font-bold">{won(summary.totalInvest)}원</span>
            </div>
            <div className="flex items-end justify-between px-1">
              <div className="flex flex-col">
                <span className="text-label-md font-semibold text-on-surface-variant">총 예상 수당(실지급)</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-display-currency-mobile font-display-currency-mobile text-secondary font-extrabold num-font">
                    {won(summary.totalNet)}
                  </span>
                  <span className="text-body-lg-bold font-body-lg-bold text-secondary">원</span>
                </div>
              </div>
              <div className="inline-flex items-center gap-1 bg-secondary-container text-on-secondary-container px-3 py-1.5 rounded-full text-body-lg-bold font-body-lg-bold font-bold">
                <span className="material-symbols-outlined text-[18px]">trending_up</span>+{summary.roi.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* 회차 목록 헤더 */}
        <div className="flex items-center justify-between mb-space-sm">
          <div className="flex items-center gap-2">
            <h2 className="text-headline-sm font-headline-sm text-on-surface font-bold">회차별 목표금액</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-label-sm font-bold">
              {rounds.length}회차
            </span>
          </div>
          <button
            onClick={addRound}
            className="min-h-[48px] px-3.5 rounded-xl bg-surface-container text-primary text-label-md font-semibold flex items-center gap-1 active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>회차 추가
          </button>
        </div>

        {/* 회차 카드들 */}
        <div className="flex flex-col gap-space-md mb-space-lg">
          {rounds.map((goal, i) => {
            const lifetime = avatarNetLifetime(goal, meta.cap);
            return (
              <div key={i} className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-surface-container text-primary text-label-md font-bold">
                    {i + 1}회차
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-body-lg-bold font-body-lg-bold text-secondary font-bold">
                      평생 +{won(lifetime)}원
                    </span>
                    {rounds.length > 1 && (
                      <button
                        onClick={() => removeRound(i)}
                        aria-label="이 회차 삭제"
                        className="w-11 h-11 rounded-lg bg-error-container text-on-error-container flex items-center justify-center active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-label-md font-semibold text-on-surface-variant">
                      목표금액 (단위 {meta.step / 10000}만원)
                    </span>
                    <span className="text-label-sm text-outline">최소 {meta.min / 10000}만원</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => setRound(i, goal - meta.step)}
                      aria-label="감소"
                      className="w-14 h-14 rounded-xl bg-surface-container-lowest text-primary flex items-center justify-center shadow-sm active:scale-90"
                    >
                      <span className="material-symbols-outlined text-[28px]">remove</span>
                    </button>
                    <div className="flex-1 text-center min-w-0">
                      <span className="text-headline-md font-headline-md text-on-surface font-extrabold num-font">{won(goal)}</span>
                      <span className="text-body-lg font-body-lg text-on-surface font-bold ml-0.5">원</span>
                    </div>
                    <button
                      onClick={() => setRound(i, goal + meta.step)}
                      aria-label="증가"
                      className="w-14 h-14 rounded-xl bg-surface-container-lowest text-primary flex items-center justify-center shadow-sm active:scale-90"
                    >
                      <span className="material-symbols-outlined text-[28px]">add</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {presets.map((p) => {
                      const on = goal === p;
                      return (
                        <button
                          key={p}
                          onClick={() => setRound(i, p)}
                          className={`min-h-[48px] px-3.5 rounded-xl text-label-md font-semibold whitespace-nowrap ${
                            on ? "bg-primary text-on-primary font-bold shadow-sm" : "bg-surface-container-lowest text-on-surface"
                          }`}
                        >
                          {p / 10000}만
                        </button>
                      );
                    })}
                    {i > 0 && (
                      <button
                        onClick={() => setRound(i, rounds[i - 1])}
                        className="min-h-[48px] px-3.5 rounded-xl bg-surface-container-lowest text-on-surface-variant text-label-md font-semibold flex items-center gap-1 whitespace-nowrap"
                      >
                        <span className="material-symbols-outlined text-[16px]">history</span>직전값
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 저장 */}
        <div className="flex flex-col gap-3 mb-space-lg">
          <button
            onClick={save}
            disabled={saving}
            className="w-full h-14 bg-primary text-on-primary rounded-xl text-body-lg-bold font-body-lg-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-[0.98] disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[24px]">save</span>
            {saving ? "저장 중..." : "플랜 저장"}
          </button>
          <Link
            href={`/timeline?plan=${id}`}
            className="w-full min-h-[48px] text-on-surface-variant text-body-md font-body-md flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">timeline</span>타임라인으로 보기
          </Link>
        </div>
      </main>

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] bg-inverse-surface text-inverse-on-surface px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 z-50">
          <span className="material-symbols-outlined text-secondary-container text-[22px]">check_circle</span>
          <span className="text-body-md font-body-md">{toast}</span>
        </div>
      )}
    </div>
  );
}
