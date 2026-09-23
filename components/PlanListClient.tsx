"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { manwon, multiple, bigWon } from "@/lib/format";
import type { PlanType } from "@/lib/points";
import { PLAN_META, PLAN_HORIZON } from "@/lib/points";
import InstallPrompt from "@/components/InstallPrompt";
import AdBanner from "@/components/AdBanner";
import Icon from "@/components/Icon";

export interface PlanCardData {
  id: number;
  name: string;
  planType: PlanType;
  capLabel: string;
  rounds: number;
  goals?: number[];
  totalInvest: number;
  totalNet: number;
  roi: number;
  /** 지금 내가 몇 회차인지. 0 = 아직 안 정함 */
  currentRound: number;
  /** currentRound 회차까지 받은 실지급 (0이면 미설정) */
  received: number;
  /** 그 다음 회차부터 18회차까지 받을 실지급 */
  remaining: number;
}

export default function PlanListClient({
  userName,
  initialCards,
}: {
  userName: string;
  initialCards: PlanCardData[];
}) {
  const router = useRouter();
  const [cards, setCards] = useState<PlanCardData[]>(initialCards);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);

  const grandTotal = cards.reduce((a, c) => a + c.totalNet, 0);

  async function createPlan(name: string, planType: PlanType) {
    setBusy(true);
    const meta = PLAN_META[planType];
    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, planType, rounds: [meta.min] }),
    });
    const data = await res.json();
    setBusy(false);
    setShowNew(false);
    if (res.ok && data.plan) router.push(`/plans/${data.plan.id}`);
  }

  async function duplicate(card: PlanCardData) {
    setBusy(true);
    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${card.name} (복사본)`,
        planType: card.planType,
        rounds: card.goals && card.goals.length ? card.goals : [PLAN_META[card.planType].min],
        // 같은 사람의 같은 회차다. 복사본에도 내 회차를 그대로 가져간다.
        currentRound: card.currentRound,
      }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  async function remove(id: number) {
    if (!confirm("이 플랜을 삭제할까요?")) return;
    setCards((cs) => cs.filter((c) => c.id !== id));
    await fetch(`/api/plans/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col w-full">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-surface shadow-[0_1px_8px_rgba(0,0,0,0.03)] pt-safe">
        <div className="h-16 px-margin-mobile flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
              <Icon name="savings" size={20} className="text-on-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-label-sm text-on-surface-variant leading-none">Avatar Money</span>
              <h1 className="text-headline-sm font-headline-sm text-on-surface font-bold leading-tight">홈</h1>
            </div>
          </div>
          <Link href="/me" className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Icon name="person" size={20} className="text-on-primary" />
          </Link>
        </div>
      </header>

      <main className="px-margin-mobile flex flex-col gap-space-lg pt-space-md">
        <InstallPrompt />

        {/* 인사 + 요약 */}
        <section className="flex flex-col gap-space-xs">
          <h2 className="text-headline-lg font-headline-lg text-on-surface">
            {userName ? `${userName}님, ` : ""}내 플랜
          </h2>
          <p className="text-body-md font-body-md text-on-surface-variant">설계한 수당 플랜을 한눈에 확인하세요</p>
        </section>

        <section className="rounded-2xl bg-surface-container-lowest p-space-md shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-label-md font-semibold text-on-surface">전체 플랜 예상 수당 합계</span>
            <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-primary text-label-sm font-semibold">
              활성 플랜 {cards.length}개
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-display-currency-mobile font-display-currency-mobile text-secondary font-extrabold">
              {manwon(grandTotal)}
            </span>
            <span className="text-headline-md font-headline-md text-secondary font-bold">만 원</span>
          </div>
          <p className="text-label-sm text-on-surface-variant mt-1">
            실지급(세후 3.3% 제외) · 플랜마다 1~{PLAN_HORIZON}회차 정산을 모두 합한 금액
          </p>
        </section>

        {/* 새 플랜 */}
        <button
          onClick={() => setShowNew(true)}
          className="w-full min-h-[60px] rounded-2xl bg-primary text-on-primary flex items-center justify-center gap-2 text-headline-sm font-headline-sm font-bold shadow-lg shadow-primary/20 active:scale-[0.98]"
        >
          <Icon name="add_circle" size={28} />새 플랜 만들기
        </button>

        {/* 카드 목록 */}
        {cards.length === 0 ? (
          <div className="flex flex-col items-center text-center py-12 px-4 rounded-2xl bg-surface-container-lowest">
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-primary mb-3">
              <Icon name="folder_open" size={32} />
            </div>
            <h4 className="text-headline-sm font-headline-sm text-on-surface font-bold">저장된 플랜이 없습니다</h4>
            <p className="text-body-md font-body-md text-on-surface-variant mt-1">
              위 &lsquo;새 플랜 만들기&rsquo;로 첫 계획을 시작해보세요.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-space-md">
            {cards.map((c) => (
              <article key={c.id} className="rounded-2xl bg-surface-container-lowest p-space-md shadow-sm flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant text-label-sm font-bold">
                    {PLAN_META[c.planType].label}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface text-label-sm font-semibold">
                    극점 {c.capLabel}
                  </span>
                  {/* 이 플랜에서 내가 지금 몇 회차인지 */}
                  {c.currentRound > 0 ? (
                    <span className="px-2.5 py-1 rounded-full bg-primary text-on-primary text-label-sm font-bold">
                      내 {c.currentRound}회차
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-label-sm font-semibold">
                      회차 미설정
                    </span>
                  )}
                </div>
                <h3 className="text-headline-sm font-headline-sm text-on-surface font-bold mt-2 leading-snug">{c.name}</h3>

                <div className="my-space-md p-3 rounded-xl bg-surface-container-low grid grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <span className="text-label-sm text-on-surface-variant">총 투입 (아바타 {c.rounds}개)</span>
                    <span className="text-body-lg-bold font-body-lg-bold text-on-surface mt-0.5">{bigWon(c.totalInvest)}원</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-label-sm text-on-surface-variant">넣은 돈의</span>
                    <span className="text-body-lg-bold font-body-lg-bold text-secondary font-bold mt-0.5">
                      {multiple(c.totalInvest, c.totalNet)}
                    </span>
                  </div>
                  <div className="col-span-2 pt-2 flex flex-col border-t border-surface-container">
                    <span className="text-label-sm text-on-surface-variant">
                      총 예상 수당(실지급) · 1~{PLAN_HORIZON}회차 합계
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-display-currency-mobile font-display-currency-mobile text-primary font-extrabold">
                        {bigWon(c.totalNet)}
                      </span>
                      <span className="text-headline-md font-headline-md text-primary font-bold">원</span>
                    </div>
                  </div>

                  {/* 내 회차를 정해뒀으면 그 중 얼마가 이미 받은 돈인지 */}
                  {c.currentRound > 0 && (
                    <div className="col-span-2 pt-2 flex items-center justify-between gap-2 border-t border-surface-container">
                      <div className="min-w-0">
                        <span className="text-label-sm text-on-surface-variant block">
                          내 {c.currentRound}회차까지 받음
                        </span>
                        <span className="text-body-lg-bold font-body-lg-bold text-on-surface">
                          {bigWon(c.received)}원
                        </span>
                      </div>
                      <div className="min-w-0 text-right">
                        <span className="text-label-sm text-on-surface-variant block">
                          앞으로 {PLAN_HORIZON - c.currentRound}회차 더
                        </span>
                        <span className="text-body-lg-bold font-body-lg-bold text-secondary">
                          {bigWon(c.remaining)}원
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/plans/${c.id}`}
                    className="flex-1 min-h-[52px] rounded-xl bg-primary text-on-primary text-label-md font-bold flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Icon name="tune" size={20} />열기
                  </Link>
                  <Link
                    href={`/present?plan=${c.id}`}
                    className="min-h-[52px] px-3.5 rounded-xl bg-secondary text-on-secondary text-label-md font-bold flex items-center justify-center gap-1 active:scale-95"
                  >
                    <Icon name="present_to_all" size={20} />핵심요약
                  </Link>
                  <button
                    onClick={() => duplicate(c)}
                    disabled={busy}
                    aria-label="복제"
                    className="w-12 h-12 rounded-xl bg-surface-container-high text-on-surface flex items-center justify-center active:scale-95"
                  >
                    <Icon name="content_copy" size={20} />
                  </button>
                  <button
                    onClick={() => remove(c.id)}
                    aria-label="삭제"
                    className="w-12 h-12 rounded-xl bg-error-container text-on-error-container flex items-center justify-center active:scale-95"
                  >
                    <Icon name="delete" size={20} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* 광고 (목록 하단만) */}
        <AdBanner />
      </main>

      {/* 새 플랜 모달 */}
      {showNew && <NewPlanModal busy={busy} onClose={() => setShowNew(false)} onCreate={createPlan} />}
    </div>
  );
}

function NewPlanModal({
  busy,
  onClose,
  onCreate,
}: {
  busy: boolean;
  onClose: () => void;
  onCreate: (name: string, type: PlanType) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<PlanType>("won33");
  return (
    // z-[60]: 하단 탭바(z-50)보다 위에 와야 한다.
    // 같은 z-50 이면 레이아웃에서 나중에 그려지는 탭바가 이겨서
    // 시트 아래쪽의 '만들고 입력하러 가기' 버튼이 가려진다.
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-[480px] max-h-[88dvh] overflow-y-auto bg-surface rounded-t-3xl p-margin-mobile pb-safe flex flex-col gap-space-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-headline-md font-headline-md text-on-surface font-bold">새 플랜 만들기</h3>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center" aria-label="닫기">
            <Icon name="close" size={24} />
          </button>
        </div>

        <div className="flex flex-col gap-space-xs">
          <label className="text-body-lg-bold font-body-lg-bold text-on-surface">플랜 이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 2025 상반기 플랜"
            className="w-full h-[56px] px-4 text-body-lg font-body-lg text-on-surface bg-surface-container-lowest rounded-xl shadow-sm focus:outline-none focus:bg-surface-container-high"
          />
        </div>

        <div className="flex flex-col gap-space-xs">
          <label className="text-body-lg-bold font-body-lg-bold text-on-surface">플랜 유형 (극점)</label>
          <div className="grid grid-cols-2 gap-2">
            {(["won33", "won11"] as PlanType[]).map((t) => {
              const m = PLAN_META[t];
              const on = type === t;
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`min-h-[56px] rounded-xl px-3 flex flex-col items-center justify-center border-2 ${
                    on ? "border-primary bg-primary-fixed text-on-primary-fixed" : "border-surface-container bg-surface-container-lowest text-on-surface"
                  }`}
                >
                  <span className="text-body-lg-bold font-body-lg-bold font-bold">{m.label}</span>
                  <span className="text-label-sm">극점 {m.capLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => onCreate(name.trim() || "새 플랜", type)}
          disabled={busy}
          className="w-full min-h-[60px] rounded-2xl bg-primary text-on-primary text-headline-sm font-headline-sm font-bold shadow-lg active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? "만드는 중..." : "만들고 입력하러 가기"}
        </button>
      </div>
    </div>
  );
}
