"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { won, shortKRW } from "@/lib/format";
import { planSummary, PLAN_META, type PlanType } from "@/lib/points";
import Icon from "@/components/Icon";

export interface PresentPlan {
  id: number;
  name: string;
  planType: PlanType;
  capLabel: string;
  rounds: number[];
}

export default function PresentClient({
  plans,
  selectedId,
}: {
  plans: PresentPlan[];
  selectedId: number;
}) {
  const router = useRouter();
  const [sel, setSel] = useState<number>(selectedId);
  const plan = plans.find((p) => p.id === sel) ?? plans[0];
  const summary = useMemo(() => planSummary(plan.rounds, PLAN_META[plan.planType].cap), [plan]);

  const firstRound = summary.inflow.find((r) => r.net > 0)?.round ?? 1;
  const breakeven = summary.inflow.find((r) => r.cumulative >= summary.totalInvest)?.round ?? null;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col relative overflow-x-hidden">
      {/* 앰비언트 글로우 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[420px] h-[420px] bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[380px] h-[380px] bg-emerald-500/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto min-h-screen flex flex-col justify-between p-5">
        {/* 상단 */}
        <header className="flex items-center justify-between pt-2 pb-3 border-b border-slate-800/70">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-bold tracking-wider text-emerald-400 uppercase bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-1 rounded-full">
              VISION
            </span>
          </div>
          <button
            onClick={() => router.push("/plans")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-800/90 text-slate-200 text-base font-bold border border-slate-700 active:scale-95"
          >
            <Icon name="close" size={20} />닫기
          </button>
        </header>

        <main className="flex-1 flex flex-col justify-center py-4 space-y-6">
          {/* 플랜 스위처 */}
          {plans.length > 1 && (
            <div className="flex items-center justify-center">
              <div className="inline-flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 max-w-full overflow-x-auto">
                {plans.map((p) => {
                  const on = p.id === plan.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSel(p.id)}
                      className={`px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap ${
                        on ? "bg-indigo-600 text-white shadow" : "text-slate-400"
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 핵심 히어로 */}
          <section className="bg-gradient-to-b from-slate-900/95 to-slate-900/80 rounded-3xl p-6 border-2 border-indigo-500/40 shadow-2xl text-center">
            <p className="text-slate-400 text-base font-semibold mb-2">{plan.name}</p>

            <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800/80">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">총 투입 자금</span>
              <div className="text-3xl font-extrabold text-slate-200 num-font">
                {won(summary.totalInvest)} <span className="text-xl font-bold text-slate-400">원</span>
              </div>
            </div>

            <div className="my-3.5 flex flex-col items-center">
              <div className="w-11 h-11 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300 animate-bounce">
                <Icon name="south" size={24} />
              </div>
              <span className="mt-1 text-xs font-bold text-indigo-300 tracking-wider">예상 수익률 +{summary.roi.toFixed(1)}%</span>
            </div>

            <div className="bg-gradient-to-b from-emerald-950/70 to-slate-950/80 rounded-2xl p-5 border-2 border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.25)]">
              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-sm font-extrabold text-emerald-400 tracking-wide uppercase">총 예상 누적 수당(실지급)</span>
              </div>
              <div className="text-[42px] leading-tight font-black text-emerald-400 num-font drop-shadow-md">
                {won(summary.totalNet)} <span className="text-2xl font-bold text-emerald-300">원</span>
              </div>
              <p className="mt-2 text-sm font-bold text-slate-300 bg-slate-900/80 py-1.5 px-3 rounded-lg inline-block border border-slate-800">
                순수익 <span className="text-emerald-400 font-extrabold">+{won(summary.totalNet - summary.totalInvest)}원</span>
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-indigo-950 text-indigo-300 text-xs font-bold border border-indigo-800">정산 시작</span>
              <span className="text-lg font-black text-white">
                언제부터:{" "}
                <span className="text-emerald-400 underline decoration-2 decoration-emerald-500 underline-offset-4">
                  {firstRound}회차부터 수령
                </span>
              </span>
            </div>
          </section>

          {/* 마일스톤 */}
          <section className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800/90">
            <div className="grid grid-cols-2 gap-3 text-center">
              <Milestone label="첫 수령" value={`${firstRound}회차`} sub="즉시 시작" />
              <Milestone label="원금 회수" value={breakeven ? `${breakeven}회차` : "—"} sub="누적 = 투입" accent />
              <Milestone label="최고 정산 회차" value={`${summary.peakRound}회차`} sub={`${shortKRW(Math.max(...summary.inflow.map((r) => r.net)))}원`} />
              <Milestone label="총 회차 수" value={`${plan.rounds.length}회`} sub={`${PLAN_META[plan.planType].label}`} />
            </div>
          </section>
        </main>

        <footer className="pt-2 pb-4">
          <button
            onClick={() => router.push("/plans")}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 text-white font-extrabold text-lg flex items-center justify-center gap-2 border border-slate-600 active:scale-[0.98]"
          >
            <Icon name="arrow_back" size={24} />프레젠테이션 종료
          </button>
          <p className="text-center text-[12px] text-slate-500 font-medium mt-2.5">
            폰을 들어 상대방에게 직접 보여주는 전용 화면입니다.
          </p>
        </footer>
      </div>
    </div>
  );
}

function Milestone({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-3 border ${accent ? "bg-emerald-950/50 border-emerald-500/60" : "bg-slate-950/90 border-slate-800"}`}>
      <span className="text-xs font-bold text-slate-400 block">{label}</span>
      <div className={`text-xl font-black num-font mt-1 ${accent ? "text-emerald-400" : "text-white"}`}>{value}</div>
      <span className="text-[11px] text-slate-400">{sub}</span>
    </div>
  );
}
