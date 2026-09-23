"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { won, shortKRW, multiple, bigWon } from "@/lib/format";
import {
  planSummary,
  roundDetail,
  splitByCurrentRound,
  PLAN_META,
  PLAN_HORIZON,
  type PlanType,
} from "@/lib/points";
import { taxSummary, BASIC_DEDUCTION } from "@/lib/tax";
import { downloadXlsx, safeFileName } from "@/lib/xlsx";
import AdBanner from "@/components/AdBanner";
import Icon from "@/components/Icon";
import RoundDetailSheet from "@/components/RoundDetailSheet";

export interface TimelinePlan {
  id: number;
  name: string;
  planType: PlanType;
  capLabel: string;
  rounds: number[];
  /** 지금 내가 몇 회차인지. 0 = 아직 안 정함 */
  currentRound: number;
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

  // 종합소득세 어림셈. 1회차를 1년으로 보고 회차마다 따로 매긴다.
  // 세금은 세전 수입(산출 포인트)에 붙으므로 net 이 아니라 gross 를 넘긴다.
  const tax = useMemo(
    () => (summary ? taxSummary(summary.inflow.map((r) => r.gross)) : null),
    [summary]
  );
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

  // 지금 내 회차. 표에서 내 줄을 짚고, 총액을 받은 것/남은 것으로 가른다.
  const myRound = plan?.currentRound ?? 0;
  const split = useMemo(
    () => (summary ? splitByCurrentRound(summary, myRound) : null),
    [summary, myRound]
  );

  // 회차별 계산식 보기
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
        // 다음 회차에 채울 매출을 이번 수당으로 덮을 수 있는지.
        // 양수면 더 꺼내야 할 준비금, 음수면 쓰고 남는 잉여금.
        nextPrep: d.nextPrep,
        // 1회차 = 1년. 그 해에 낼 세금과, 세금까지 다 뺀 실수령.
        yearTax: tax ? tax.years[r.round - 1] : null,
      };
    });
  }, [plan, summary, rows, tax]);

  // 간단히 보기에서도 준비금을 보여주려고 회차로 찾을 수 있게 해둔다
  const prepByRound = useMemo(
    () => new Map(tableRows.map((t) => [t.round, t.nextPrep])),
    [tableRows]
  );

  const [downloaded, setDownloaded] = useState(false);

  /** 화면의 표를 그대로 엑셀 파일로 뽑는다 */
  function exportXlsx() {
    if (!plan || !summary) return;
    const meta = PLAN_META[plan.planType];
    const d = new Date();
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

    // 어느 플랜의 표인지 위에 적어둔다. 나중에 파일만 봐도 알 수 있게.
    const head = [
      ["회차수당표"],
      ["플랜", plan.name],
      ["유형", `${meta.label} · 극점 ${meta.capLabel}`],
      ["내 현재 회차", myRound > 0 ? `${myRound}회차` : "안 정함"],
      [`총 매출 누적 (1~${PLAN_HORIZON}회차)`, summary.totalInvest],
      [`총 예상 수당 (실지급, 1~${PLAN_HORIZON}회차)`, summary.totalNet],
      ["넣은 돈의", multiple(summary.totalInvest, summary.totalNet)],
      ["뽑은 날짜", ymd],
      ["금액 단위", "원 · 실지급은 세후(원천징수 3.3% 제외)"],
      [
        "종합소득세",
        `어림셈 · 이 플랜 수당에만 매긴 세금입니다(다른 소득이 있으면 합산되어 더 나옴) · 1회차를 1년으로 보고 회차마다 따로 매김 · 필요경비 0원 · 본인 기본공제 ${
          BASIC_DEDUCTION / 10_000
        }만원만 · 실제 신고는 세무사와 확인하세요`,
      ],
      ["다음 회차 준비금", "다음 회차 총매출 − 이 회차 수당. 양수면 더 넣어야 할 돈, 음수면 쓰고 남는 돈"],
      [],
    ];
    const header = [
      "회차",
      "내 회차",
      "신규 아바타 목표매출",
      "총매출",
      "이 회차 수당",
      "종합소득세(추정)",
      "세금 뗀 실수령",
      "다음 회차 준비금",
      "준비/잉여",
      "누적매출",
      "누적수당",
      "누적수당 − 누적매출",
    ];
    const body = tableRows.map((t) => [
      t.round,
      t.round === myRound ? "내 회차" : "",
      t.newGoal || 0,
      t.sales,
      t.net,
      t.yearTax ? t.yearTax.totalTax : "",
      t.yearTax ? t.yearTax.takeHome : "",
      t.nextPrep === null ? "" : t.nextPrep,
      t.nextPrep === null
        ? "마지막 회차"
        : t.nextPrep > 0
          ? "준비금 필요"
          : t.nextPrep < 0
            ? "잉여금"
            : "딱 맞음",
      t.cumSales,
      t.cumNet,
      t.diff,
    ]);

    downloadXlsx(`회차수당표_${safeFileName(plan.name)}_${ymd}`, {
      name: "회차수당표",
      rows: [...head, header, ...body],
      cols: [7, 10, 20, 14, 14, 16, 16, 18, 13, 14, 14, 20],
      boldRows: [0, head.length],
    });

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 4000);
  }

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
                      <span className="ml-1 text-[15px] font-bold opacity-80">
                        {p.currentRound > 0
                          ? `· 현재 나의 회차 : ${p.currentRound}회차`
                          : "· 현재회차 설정 안함"}
                      </span>
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
              {/* 이 숫자가 몇 회차까지 받는 돈인지 밝힌다 */}
              <p className="text-[15px] font-bold text-on-surface-variant leading-snug mt-0.5">
                1~{PLAN_HORIZON}회차 정산을 모두 합한 금액입니다
              </p>
              <p className="text-body-md font-body-md text-secondary mt-2 font-semibold">
                원금 대비 {bigWon(summary.totalNet - summary.totalInvest)}원 순수익 예상
              </p>

              {/* 내 회차를 정해뒀으면 여기까지 받은 돈과 앞으로 받을 돈을 가른다 */}
              {split && (
                <div className="mt-3 rounded-xl bg-surface-container-low px-3 py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold text-on-surface-variant leading-tight">
                      내 {split.round}회차까지 받음
                    </div>
                    <div className="text-[20px] font-extrabold text-on-surface num-font leading-tight">
                      {bigWon(split.received)}원
                    </div>
                  </div>
                  <Icon name="arrow_forward" size={20} className="text-outline shrink-0" />
                  <div className="min-w-0 text-right">
                    <div className="text-[15px] font-bold text-secondary leading-tight">
                      앞으로 {split.roundsLeft}회차 더
                    </div>
                    <div className="text-[20px] font-extrabold text-secondary num-font leading-tight">
                      {bigWon(split.remaining)}원
                    </div>
                  </div>
                </div>
              )}

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
                          {[
                            "회차",
                            "신규 아바타",
                            "총매출",
                            "이 회차 수당",
                            "종합소득세(추정)",
                            "세금 뗀 실수령",
                            "다음 회차 준비금",
                            "누적매출",
                            "누적수당",
                            "누적수당−누적매출",
                          ].map(
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
                        {tableRows.map((t) => {
                          const mine = t.round === myRound;
                          return (
                          <tr
                            key={t.round}
                            onClick={() => setOpenRound(t.round)}
                            className={`border-t border-surface-container cursor-pointer active:bg-surface-container ${
                              mine
                                ? "bg-primary-fixed/70 outline outline-2 outline-offset-[-2px] outline-primary"
                                : t.round === peakRound
                                  ? "bg-secondary/5"
                                  : ""
                            }`}
                          >
                            {/* 회차 칸은 가로로 밀어도 붙어 있으므로 배경이 불투명해야 한다 */}
                            <td
                              className={`sticky left-0 z-10 px-3 py-2.5 font-bold text-on-surface text-left ${
                                mine
                                  ? "bg-primary-fixed"
                                  : t.round === peakRound
                                    ? "bg-[#eef7f2]"
                                    : "bg-surface-container-lowest"
                              }`}
                            >
                              {t.round}회
                              {mine && (
                                <span className="block text-[13px] font-extrabold text-primary leading-none mt-0.5">
                                  내 회차
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right text-on-surface-variant">
                              {t.newGoal > 0 ? `${shortKRW(t.newGoal)}` : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right text-on-surface">{shortKRW(t.sales)}</td>
                            <td className="px-3 py-2.5 text-right font-bold text-secondary">
                              {shortKRW(t.net)}
                            </td>
                            {/* 1회차 = 1년으로 본 그 해 세금과, 세금까지 뺀 실수령 */}
                            <td className="px-3 py-2.5 text-right font-bold text-tertiary">
                              {t.yearTax ? `−${shortKRW(t.yearTax.totalTax)}` : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-on-surface">
                              {t.yearTax ? shortKRW(t.yearTax.takeHome) : "—"}
                            </td>
                            {/* 다음 회차에 더 넣어야 하는지(주황), 쓰고 남는지(초록) */}
                            <td className="px-3 py-2.5 text-right font-bold">
                              {t.nextPrep === null ? (
                                <span className="text-on-surface-variant">—</span>
                              ) : t.nextPrep > 0 ? (
                                <span className="text-tertiary">준비 {shortKRW(t.nextPrep)}</span>
                              ) : t.nextPrep < 0 ? (
                                <span className="text-secondary">남음 {shortKRW(-t.nextPrep)}</span>
                              ) : (
                                <span className="text-secondary">딱 맞음</span>
                              )}
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-space-md py-2.5 border-t border-surface-container">
                    <p className="text-[15px] text-on-surface-variant font-semibold">
                      옆으로 밀어서 보세요 · 금액은 억·만 단위로 줄였습니다 · 줄을 누르면 정확한 금액과 계산식이 나옵니다
                      {myRound > 0 && ` · 짙게 칠한 줄이 지금 내 ${myRound}회차입니다`}
                    </p>
                    {/* '준비금' 칸이 뭘 뜻하는지. 색만 봐도 알게 한다. */}
                    <div className="mt-2 rounded-xl bg-surface-container-low px-3 py-2.5">
                      <p className="text-[16px] font-bold text-on-surface leading-snug">
                        다음 회차 준비금 = 다음 회차 총매출 − 이 회차 수당
                      </p>
                      <div className="mt-1.5 flex flex-col gap-1">
                        <span className="text-[15px] font-semibold text-on-surface-variant leading-snug">
                          <span className="font-extrabold text-tertiary">준비 ○○</span> — 수당만으론
                          모자라 그만큼 주머니에서 더 꺼내야 합니다
                        </span>
                        <span className="text-[15px] font-semibold text-on-surface-variant leading-snug">
                          <span className="font-extrabold text-secondary">남음 ○○</span> — 수당으로 다
                          채우고 그만큼 남습니다(잉여금)
                        </span>
                      </div>
                    </div>

                    {/* 큰 카드를 뺀 대신, 세금 칸이 무엇을 가정한 값인지
                        여기서 밝힌다. 가정 없이 숫자만 두면 안 된다. */}
                    <div className="mt-2 rounded-xl bg-surface-container-low px-3 py-2.5">
                      <p className="text-[16px] font-bold text-on-surface leading-snug">
                        종합소득세(추정) · 세금 뗀 실수령
                      </p>
                      <p className="text-[15px] font-semibold text-on-surface-variant leading-snug mt-1">
                        떼고 받는 3.3% 는 세금을 다 낸 것이 아닙니다. 다음 해 5월에 종합소득세로
                        정산하면서 더 냅니다.
                      </p>
                      <p className="text-[15px] font-semibold text-on-surface-variant leading-snug mt-1">
                        <span className="font-extrabold text-on-surface">
                          이 플랜 수당에만 매긴 어림셈입니다.
                        </span>{" "}
                        1회차를 1년으로 보고 해마다 따로 매겼고, 필요경비 0원 · 본인 기본공제{" "}
                        {BASIC_DEDUCTION / 10_000}만원만 넣었습니다. 월급 같은 다른 소득이 있으면
                        합쳐져서 세금은 이보다 늘어납니다.
                      </p>
                      <p className="text-[15px] font-bold text-tertiary leading-snug mt-1">
                        실제 신고는 사람마다 다릅니다. 신고는 세무사와 확인하세요.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                rows.map((r) => {
                  const peak = r.round === peakRound;
                  const mine = r.round === myRound;
                  return (
                    <button
                      key={r.round}
                      onClick={() => setOpenRound(r.round)}
                      className={`w-full min-h-[56px] px-space-md py-3 flex items-center justify-between gap-2 border-t border-surface-container text-left active:bg-surface-container ${
                        mine ? "bg-primary-fixed/70" : peak ? "bg-secondary/5" : ""
                      }`}
                    >
                      <span className="text-body-lg font-body-lg text-on-surface font-bold w-14 shrink-0">
                        {r.round}회
                        {mine && (
                          <span className="block text-[13px] font-extrabold text-primary leading-none">
                            내 회차
                          </span>
                        )}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span
                          className={`block text-body-lg-bold font-body-lg-bold ${
                            peak ? "text-secondary" : "text-on-surface"
                          }`}
                        >
                          {won(r.net)}원
                        </span>
                        {(() => {
                          const prep = prepByRound.get(r.round);
                          if (prep === null || prep === undefined) return null;
                          return (
                            <span
                              className={`block text-[14px] font-bold leading-tight ${
                                prep > 0 ? "text-tertiary" : "text-secondary"
                              }`}
                            >
                              {prep > 0
                                ? `다음 회차 준비 ${shortKRW(prep)}`
                                : prep < 0
                                  ? `다음 회차 채우고 ${shortKRW(-prep)} 남음`
                                  : "다음 회차 딱 맞음"}
                            </span>
                          );
                        })()}
                      </span>
                      <span className="text-body-md font-body-md text-on-surface-variant">{shortKRW(r.cumulative)}</span>
                      <Icon name="arrow_forward" size={20} className="text-outline" />
                    </button>
                  );
                })
              )}
            </section>

            {/* 엑셀로 뽑기 — 표를 그대로 파일 하나로 */}
            <div>
              <button
                onClick={exportXlsx}
                className="w-full min-h-[60px] rounded-2xl bg-surface-container-lowest border-2 border-primary text-primary text-[19px] font-extrabold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
              >
                <Icon name="download" size={24} />
                엑셀로 내려받기
              </button>
              <p className="text-[15px] font-semibold text-on-surface-variant mt-1.5 text-center leading-snug">
                {downloaded
                  ? "내려받았습니다 ✓ 휴대폰은 '파일' 앱에 저장됩니다"
                  : "위 표를 엑셀 파일(.xlsx)로 저장합니다 · 금액은 줄이지 않고 원 단위 그대로"}
              </p>
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
                    const mine = r.round === myRound;
                    return (
                      <button
                        key={r.round}
                        onClick={() => setOpenRound(r.round)}
                        aria-label={`${r.round}회차 계산식 보기`}
                        className="flex-1 min-w-[64px] flex flex-col items-center justify-end h-full active:opacity-70"
                      >
                        <span className={`text-label-sm font-bold mb-1 ${peak ? "text-secondary" : "text-on-surface-variant"}`}>
                          {shortKRW(r.net)}
                        </span>
                        <div
                          className={`w-full rounded-t-lg ${
                            mine ? "bg-primary" : peak ? "bg-secondary" : "bg-primary/80"
                          }`}
                          style={{ height: `${h}%` }}
                        />
                        <span
                          className={`text-label-sm mt-1 ${
                            mine ? "text-primary font-extrabold" : "text-on-surface-variant"
                          }`}
                        >
                          {mine ? `${r.round} 내` : r.round}
                        </span>
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
                회차별 계산식 보기
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
          currentRound={myRound}
          onRound={setOpenRound}
          onClose={() => setOpenRound(null)}
        />
      )}
    </div>
  );
}
