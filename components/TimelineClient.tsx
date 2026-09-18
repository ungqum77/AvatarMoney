"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { won, shortKRW, multiple, bigWon } from "@/lib/format";
import { planSummary, PLAN_META, MAX_AGE, type PlanType } from "@/lib/points";
import AdBanner from "@/components/AdBanner";
import Icon from "@/components/Icon";
import RoundDetailSheet from "@/components/RoundDetailSheet";

export interface TimelinePlan {
  id: number;
  name: string;
  planType: PlanType;
  capLabel: string;
  rounds: number[];
}

export default function TimelineClient({
  plans,
  selectedId,
}: {
  plans: TimelinePlan[];
  selectedId: number | null;
}) {
  const [sel, setSel] = useState<number | null>(selectedId);
  const plan = plans.find((p) => p.id === sel) ?? plans[0] ?? null;
  const summary = useMemo(
    () => (plan ? planSummary(plan.rounds, PLAN_META[plan.planType].cap) : null),
    [plan]
  );

  // 18회차까지만 본다. 그 뒤로도 수당은 나오지만 회원이 보는 단위는 18회차다.
  const rows = useMemo(
    () => (summary ? summary.inflow.filter((r) => r.net > 0 && r.round <= MAX_AGE) : []),
    [summary]
  );
  const maxNet = useMemo(() => rows.reduce((m, r) => Math.max(m, r.net), 0), [rows]);
  // 18회차까지만 보여주므로 피크도 그 안에서 고른다.
  // 전체 피크(peakRound)는 18회차 밖일 수 있어 화면과 어긋난다.
  const peakRound = useMemo(() => {
    let best = 0;
    let bestNet = -1;
    for (const r of rows) {
      if (r.net > bestNet) {
        bestNet = r.net;
        best = r.round;
      }
    }
    return best;
  }, [rows]);

  // 회차별 자세히 보기
  const [openRound, setOpenRound] = useState<number | null>(null);
  const lastRound = summary ? Math.min(MAX_AGE, summary.inflow.length) : 0;

  return (
    <div className="flex flex-col w-full">
      <header className="sticky top-0 z-40 bg-surface shadow-[0_1px_8px_rgba(0,0,0,0.03)] pt-safe">
        <div className="h-16 px-margin-mobile flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
            <Icon name="timeline" size={20} className="text-on-primary" />
          </div>
          <h1 className="text-headline-sm font-headline-sm text-on-surface font-bold">수당 타임라인</h1>
        </div>
      </header>

      <main className="px-margin-mobile flex flex-col gap-space-lg pt-space-md">
        {plans.length === 0 || !plan || !summary ? (
          <div className="flex flex-col items-center text-center py-16 px-4 rounded-2xl bg-surface-container-lowest">
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-primary mb-3">
              <Icon name="timeline" size={32} />
            </div>
            <h4 className="text-headline-sm font-headline-sm text-on-surface font-bold">플랜이 없습니다</h4>
            <p className="text-body-md font-body-md text-on-surface-variant mt-1">먼저 홈에서 플랜을 만들어주세요.</p>
            <Link href="/plans" className="mt-4 min-h-[52px] px-6 rounded-xl bg-primary text-on-primary font-bold flex items-center">
              홈으로
            </Link>
          </div>
        ) : (
          <>
            {/* 플랜 선택 */}
            {plans.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {plans.map((p) => {
                  const on = p.id === plan.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSel(p.id)}
                      className={`min-h-[48px] px-4 rounded-full text-label-md font-semibold whitespace-nowrap ${
                        on ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface"
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 대표 지표 */}
            <section className="p-space-lg rounded-2xl bg-surface-container-lowest shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-label-md font-semibold text-on-surface-variant flex items-center gap-1.5">
                  <Icon name="trending_up" size={20} className="text-primary" />총 예상 수당(실지급)
                </span>
                <span className="px-2.5 py-1 rounded-full bg-secondary-container/60 text-on-secondary-container text-label-sm font-bold">
                  넣은 돈의 {multiple(summary.totalInvest, summary.totalNet)}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-display-currency-mobile font-display-currency-mobile text-on-surface font-extrabold num-font">
                  {bigWon(summary.totalNet)}
                </span>
                <span className="text-headline-md font-headline-md text-on-surface font-bold">원</span>
              </div>
              <p className="text-body-md font-body-md text-secondary mt-2 font-semibold">
                원금 대비 {bigWon(summary.totalNet - summary.totalInvest)}원 순수익 예상
              </p>
            </section>

            <div className="grid grid-cols-2 gap-space-md">
              <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-sm">
                <span className="text-label-md font-semibold text-on-surface-variant">총 투입금</span>
                <div className="mt-2 text-headline-md font-headline-md text-on-surface font-extrabold num-font">{bigWon(summary.totalInvest)}</div>
                <span className="text-label-sm text-on-surface-variant">원 · 아바타 {plan.rounds.length}개</span>
              </div>
              <div className="p-space-md rounded-2xl bg-primary-fixed/40 shadow-sm">
                <span className="text-label-md font-semibold text-primary">최고 정산 회차</span>
                <div className="mt-2 text-headline-md font-headline-md text-primary font-extrabold num-font">{peakRound}회차</div>
                <span className="text-label-sm text-on-surface-variant">피크 수당 {shortKRW(maxNet)}원</span>
              </div>
            </div>

            {/* 바 차트 */}
            <section className="p-space-lg rounded-2xl bg-surface-container-lowest shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-headline-sm font-headline-sm text-on-surface font-bold">회차별 수당 유입</h2>
                <span className="text-label-sm text-on-surface-variant">유입 회차 {rows.length}개</span>
              </div>
              <div className="overflow-x-auto pb-2">
                {/* 막대가 좁으면 '14억 2,400만' 같은 라벨이 옆 막대와 겹친다 */}
                <div className="flex items-end gap-2 h-48 min-w-full" style={{ width: `max(100%, ${rows.length * 72}px)` }}>
                  {rows.map((r) => {
                    const h = maxNet > 0 ? Math.max(6, (r.net / maxNet) * 100) : 6;
                    const peak = r.round === peakRound;
                    return (
                      <button
                        key={r.round}
                        onClick={() => setOpenRound(r.round)}
                        aria-label={`${r.round}회차 자세히 보기`}
                        className="flex-1 min-w-[64px] flex flex-col items-center justify-end h-full active:opacity-70"
                      >
                        <span className={`text-label-sm font-bold mb-1 ${peak ? "text-secondary" : "text-on-surface-variant"}`}>
                          {shortKRW(r.net)}
                        </span>
                        <div
                          className={`w-full rounded-t-lg ${peak ? "bg-secondary" : "bg-primary/80"}`}
                          style={{ height: `${h}%` }}
                        />
                        <span className="text-label-sm text-on-surface-variant mt-1">{r.round}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-label-sm text-on-surface-variant mt-2">
                아바타가 회차를 거듭하며 성장(달성 보너스)해 후반 회차 수당이 크게 늘어납니다.
              </p>

              <button
                onClick={() => setOpenRound(1)}
                className="mt-4 w-full min-h-[60px] rounded-2xl bg-primary text-on-primary text-[20px] font-extrabold flex items-center justify-center gap-2 shadow-md active:scale-[0.98]"
              >
                <Icon name="tune" size={24} />
                회차별 자세히 보기
              </button>
              <p className="text-[16px] text-on-surface-variant font-semibold mt-2 text-center">
                회차마다 어떤 아바타가 얼마를 주는지, 계산식까지 봅니다
              </p>
            </section>

            {/* 상세 표 */}
            <section className="rounded-2xl bg-surface-container-lowest shadow-md overflow-hidden">
              <div className="px-space-md py-3 flex items-center justify-between bg-surface-container-low">
                <span className="text-label-md font-bold text-on-surface">회차</span>
                <span className="text-label-md font-bold text-on-surface">그 회차 수당</span>
                <span className="text-label-md font-bold text-on-surface">누적</span>
              </div>
              {rows.map((r) => {
                const peak = r.round === peakRound;
                return (
                  <button
                    key={r.round}
                    onClick={() => setOpenRound(r.round)}
                    className={`w-full min-h-[56px] px-space-md py-3 flex items-center justify-between gap-2 border-t border-surface-container text-left active:bg-surface-container ${
                      peak ? "bg-secondary/5" : ""
                    }`}
                  >
                    <span className="text-body-lg font-body-lg text-on-surface font-bold w-14 shrink-0">{r.round}회</span>
                    <span className={`flex-1 text-body-lg-bold font-body-lg-bold ${peak ? "text-secondary" : "text-on-surface"}`}>
                      {won(r.net)}원
                    </span>
                    <span className="text-body-md font-body-md text-on-surface-variant">{shortKRW(r.cumulative)}</span>
                    <Icon name="arrow_forward" size={20} className="text-outline" />
                  </button>
                );
              })}
            </section>

            <Link
              href={`/plans/${plan.id}`}
              className="w-full min-h-[52px] rounded-2xl bg-surface-container-low text-primary font-body-lg-bold text-body-lg-bold flex items-center justify-center gap-2"
            >
              <Icon name="tune" size={22} />이 플랜 수정하기
            </Link>

            <AdBanner />
          </>
        )}
      </main>

      {openRound !== null && plan && (
        <RoundDetailSheet
          goals={plan.rounds}
          cap={PLAN_META[plan.planType].cap}
          capLabel={PLAN_META[plan.planType].capLabel}
          round={openRound}
          lastRound={lastRound}
          onRound={setOpenRound}
          onClose={() => setOpenRound(null)}
        />
      )}
    </div>
  );
}
