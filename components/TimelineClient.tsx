"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { won, shortKRW, multiple, bigWon } from "@/lib/format";
import {
  planSummary,
  roundDetail,
  PLAN_META,
  type PlanType,
} from "@/lib/points";
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

  // planSummary 가 이미 18회차까지만 내놓는다. 수당이 0인 회차만 걸러낸다.
  const rows = useMemo(
    () => (summary ? summary.inflow.filter((r) => r.net > 0) : []),
    [summary]
  );
  const maxNet = useMemo(() => rows.reduce((m, r) => Math.max(m, r.net), 0), [rows]);
  // 수당이 0인 회차를 걸러낸 뒤 그 안에서 피크를 고른다.
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
  const lastRound = summary ? summary.inflow.length : 0;

  /**
   * 대표 숫자(18회차까지 모든 아바타 합)가 무엇으로 이뤄졌는지 나눈다.
   *  - 1회차 아바타 하나가 18번 다 받는 몫
   *  - 나머지 아바타들(2회차부터)의 몫
   * 늦게 만든 아바타일수록 18회차 안에서 받는 횟수가 적다.
   */
  const breakdown = useMemo(() => {
    if (!plan || !summary) return null;
    const firstGoal = plan.rounds[0] || 0;
    const oneAvatar = summary.perAvatarNet[0] ?? 0;
    return {
      firstGoal,
      oneAvatar,
      others: summary.totalNet - oneAvatar,
      otherCount: plan.rounds.slice(1).filter((g) => g > 0).length,
      total: summary.totalNet,
    };
  }, [plan, summary]);

  // 엑셀처럼 한눈에 훑는 표를 기본으로 보여준다.
  // 글씨가 작아 보기 힘들면 '간단히' 로 바꿀 수 있다.
  const [tableView, setTableView] = useState(true);
  const tableRows = useMemo(() => {
    if (!plan || !summary) return [];
    const cap = PLAN_META[plan.planType].cap;
    return rows.map((r) => {
      const d = roundDetail(plan.rounds, cap, r.round);
      return {
        round: r.round,
        newGoal: r.round <= plan.rounds.length ? plan.rounds[r.round - 1] || 0 : 0,
        sales: d.sales,
        net: d.net,
        cumSales: d.cumulativeSales,
        cumNet: d.cumulativeNet,
        diff: d.netMinusSales,
      };
    });
  }, [plan, summary, rows]);

  return (
    <div className="flex flex-col w-full">
      <header className="sticky top-0 z-40 bg-surface shadow-[0_1px_8px_rgba(0,0,0,0.03)] pt-safe">
        <div className="h-16 px-margin-mobile flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
            <Icon name="timeline" size={20} className="text-on-primary" />
          </div>
          <h1 className="text-headline-sm font-headline-sm text-on-surface font-bold">회차수당표</h1>
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

              {/* 무엇을 더한 값인지 나눠서 보여준다 */}
              {breakdown && (
                <div className="mt-4 pt-3 border-t-2 border-surface-container flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[17px] font-bold text-on-surface leading-tight">
                        아바타 1개가 18회 동안
                      </div>
                      <div className="text-[15px] font-semibold text-on-surface-variant leading-tight">
                        1회차 아바타({shortKRW(breakdown.firstGoal)}원) 하나가 받는 전부
                      </div>
                    </div>
                    <span className="text-[19px] font-extrabold text-on-surface num-font shrink-0">
                      {bigWon(breakdown.oneAvatar)}원
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[17px] font-bold text-on-surface leading-tight">
                        나머지 아바타 {breakdown.otherCount}개
                      </div>
                      <div className="text-[15px] font-semibold text-on-surface-variant leading-tight">
                        늦게 만들수록 18회차 안에서 받는 횟수가 적습니다
                      </div>
                    </div>
                    <span className="text-[19px] font-extrabold text-on-surface num-font shrink-0">
                      {bigWon(breakdown.others)}원
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2 pt-2.5 border-t border-surface-container">
                    <div className="text-[17px] font-extrabold text-on-surface leading-tight">
                      18회차까지 받는 전부
                    </div>
                    <span className="text-[19px] font-extrabold text-secondary num-font shrink-0">
                      {bigWon(breakdown.total)}원
                    </span>
                  </div>
                </div>
              )}
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

            {/* 상세 — 간단히 보기 / 표로 보기 */}
            <section className="rounded-2xl bg-surface-container-lowest shadow-md overflow-hidden">
              <div className="px-space-md py-2.5 flex items-center justify-between gap-2 bg-surface-container-low">
                <span className="text-[18px] font-bold text-on-surface">회차별 내역</span>
                <div className="flex items-center gap-1 shrink-0">
                  {([false, true] as const).map((v) => (
                    <button
                      key={String(v)}
                      onClick={() => setTableView(v)}
                      className={`min-h-[44px] px-3 rounded-lg text-[16px] font-bold ${
                        tableView === v
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-lowest text-on-surface-variant"
                      }`}
                    >
                      {v ? "표로 보기" : "간단히"}
                    </button>
                  ))}
                </div>
              </div>

              {tableView ? (
                <>
                  {/* 가로로 넓은 표. 회차 칸은 스크롤해도 붙어 있어야 자리를 안 잃는다. */}
                  <div className="overflow-x-auto">
                    <table className="border-collapse text-[16px] whitespace-nowrap">
                      <thead>
                        <tr className="bg-surface-container">
                          {["회차", "신규 아바타", "총매출", "이 회차 수당", "누적매출", "누적수당", "누적수당−누적매출"].map(
                            (h, i) => (
                              <th
                                key={h}
                                className={`px-3 py-2.5 font-bold text-on-surface text-right ${
                                  i === 0
                                    ? "sticky left-0 z-10 bg-surface-container text-left"
                                    : ""
                                }`}
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.map((t) => (
                          <tr
                            key={t.round}
                            onClick={() => setOpenRound(t.round)}
                            className={`border-t border-surface-container cursor-pointer active:bg-surface-container ${
                              t.round === peakRound ? "bg-secondary/5" : ""
                            }`}
                          >
                            <td
                              className={`sticky left-0 z-10 px-3 py-2.5 font-bold text-on-surface text-left ${
                                t.round === peakRound ? "bg-[#eef7f2]" : "bg-surface-container-lowest"
                              }`}
                            >
                              {t.round}회
                            </td>
                            <td className="px-3 py-2.5 text-right text-on-surface-variant">
                              {t.newGoal > 0 ? `${shortKRW(t.newGoal)}` : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right text-on-surface">{shortKRW(t.sales)}</td>
                            <td className="px-3 py-2.5 text-right font-bold text-secondary">
                              {shortKRW(t.net)}
                            </td>
                            <td className="px-3 py-2.5 text-right text-on-surface-variant">
                              {shortKRW(t.cumSales)}
                            </td>
                            <td className="px-3 py-2.5 text-right text-on-surface">{shortKRW(t.cumNet)}</td>
                            <td
                              className={`px-3 py-2.5 text-right font-bold ${
                                t.diff < 0 ? "text-tertiary" : "text-secondary"
                              }`}
                            >
                              {t.diff < 0 ? "−" : "+"}
                              {shortKRW(Math.abs(t.diff))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="px-space-md py-2.5 text-[15px] text-on-surface-variant font-semibold border-t border-surface-container">
                    옆으로 밀어서 보세요 · 금액은 억·만 단위로 줄였습니다 · 줄을 누르면 정확한 금액과 계산식이 나옵니다
                  </p>
                </>
              ) : (
                rows.map((r) => {
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
                })
              )}
            </section>

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
