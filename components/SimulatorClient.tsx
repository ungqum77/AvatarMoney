"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { won, shortKRW, multiple, bigWon } from "@/lib/format";
import {
  planSummary,
  avatarNetInPlan,
  splitByCurrentRound,
  PLAN_META,
  PLAN_TEMPLATES,
  PLAN_HORIZON,
  MAX_AGE,
  type PlanType,
  type PlanTemplate,
} from "@/lib/points";
import Icon from "@/components/Icon";
import RoundDetailSheet from "@/components/RoundDetailSheet";

/** 11,000,000 → "1,100만" */
function manLabel(v: number): string {
  return `${Math.round(v / 10_000).toLocaleString("ko-KR")}만`;
}

/**
 * 플랜은 무조건 18회차다. '몇 회차까지' 를 고르게 하면 헷갈리기만 하고,
 * 어차피 아바타는 18회차까지 사니까 회차 수는 붙박이로 둔다.
 * 저장된 회차가 모자라면 마지막 값을 이어서 18개까지 채운다.
 */
function toFullRounds(rs: number[], type: PlanType): number[] {
  const out = rs.slice(0, MAX_AGE);
  if (!out.length) out.push(PLAN_META[type].min);
  while (out.length < MAX_AGE) out.push(out[out.length - 1]);
  return out;
}

export default function SimulatorClient({
  id,
  initialName,
  initialType,
  initialRounds,
  initialAllowZero,
  initialCurrentRound,
  otherPlans,
}: {
  id: number;
  initialName: string;
  initialType: PlanType;
  initialRounds: number[];
  initialAllowZero: boolean;
  /** 지금 내가 몇 회차인지. 0 = 아직 안 정함 */
  initialCurrentRound: number;
  /** 같은 회원의 다른 플랜들. 헤더에서 갈아타기용 */
  otherPlans: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<PlanType>(initialType);
  // 아바타를 0으로(그 회차엔 안 만들기) 잡을 수 있는지
  const [allowZero, setAllowZero] = useState(initialAllowZero);
  const [rounds, setRounds] = useState<number[]>(() => toFullRounds(initialRounds, initialType));
  // 지금 내가 몇 회차인지. 0 = 아직 안 정함.
  // 대표 숫자가 '어디까지 받는 돈'인지 가르고, 회차수당표에서 내 자리를 짚는 데 쓴다.
  const [currentRound, setCurrentRound] = useState(initialCurrentRound);
  // 2회차부터 직접 넣는 금액(만원). 11 단위로만 받는다. 11 → 11만원, 110 → 110만원.
  const [customMan, setCustomMan] = useState("");
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [openRound, setOpenRound] = useState<number | null>(null);
  // 빠른 채우기 직전 상태. 잘못 눌렀을 때 한 번 되돌릴 수 있게.
  const [undoRounds, setUndoRounds] = useState<number[] | null>(null);
  // 마지막으로 저장된 내용. 저장할 게 있는지 표시하는 데 쓴다.
  const [saved, setSaved] = useState(() => ({
    name: initialName,
    type: initialType,
    allowZero: initialAllowZero,
    currentRound: initialCurrentRound,
    rounds: toFullRounds(initialRounds, initialType).join(","),
  }));

  const meta = PLAN_META[type];
  const presets =
    type === "won33" ? [330000, 440000, 550000, 660000] : [110000, 220000, 330000, 440000];
  // 2회차부터 한 번에 채울 때 자주 쓰는 금액. 1회차 프리셋과는 쓰임이 다르다.
  // 유형 최저보다 작은 금액은 눌러도 최저로 올라가버려 거짓말이 되므로 아예 감춘다.
  // (33만원형에서 11만은 안 보이고, 11만원형에서는 11만부터 보인다)
  const fillPresets = [
    110_000, 330_000, 550_000, 1_100_000, 1_650_000, 3_300_000, 5_500_000, 11_000_000,
  ].filter((v) => v >= meta.min);

  const summary = useMemo(() => planSummary(rounds, meta.cap), [rounds, meta.cap]);
  // 내 회차를 정했을 때만: 총 수당을 '이미 받은 것 / 앞으로 받을 것'으로 가른다
  const split = useMemo(() => splitByCurrentRound(summary, currentRound), [summary, currentRound]);

  const dirty =
    name !== saved.name ||
    type !== saved.type ||
    allowZero !== saved.allowZero ||
    currentRound !== saved.currentRound ||
    rounds.join(",") !== saved.rounds;

  /** 1회차(본코드)는 반드시 만들어야 하므로 0으로 못 잡는다 */
  function canZero(i: number): boolean {
    return allowZero && i > 0;
  }

  function clamp(i: number, v: number): number {
    if (v <= 0) return canZero(i) ? 0 : meta.min;
    if (v < meta.min) return meta.min;
    const rem = (v - meta.min) % meta.step;
    if (rem !== 0) v -= rem;
    return v;
  }
  function setRound(i: number, v: number) {
    setRounds((rs) => rs.map((x, idx) => (idx === i ? clamp(i, v) : x)));
  }

  // ± 는 0 과 최저 금액 사이를 오갈 수 있어야 한다.
  // 최저에서 − 를 누르면 0(안 만들기), 0 에서 + 를 누르면 최저로 돌아온다.
  function step(i: number, dir: 1 | -1) {
    const v = rounds[i] ?? meta.min;
    if (dir < 0) {
      setRound(i, v <= meta.min ? 0 : v - meta.step);
    } else {
      setRound(i, v <= 0 ? meta.min : v + meta.step);
    }
  }

  /** 옵션을 끄면 0으로 둔 회차를 최저 금액으로 올린다 */
  function changeAllowZero(on: boolean) {
    setAllowZero(on);
    if (!on) setRounds((rs) => rs.map((v) => (v <= 0 ? meta.min : v)));
  }
  function changeType(t: PlanType) {
    setType(t);
    // 0으로 비워둔 회차는 유형을 바꿔도 그대로 둔다. 1회차는 반드시 만든다.
    setRounds((rs) =>
      rs.map((v, i) => (v <= 0 && allowZero && i > 0 ? 0 : Math.max(v, PLAN_META[t].min)))
    );
  }

  // ── 빠른 채우기 ──────────────────────────────────────────────
  // 18회차를 하나씩 손으로 넣는 건 너무 번거롭다.
  // 1회차(본코드)만 정하면 나머지는 한 번에 채운다.

  function bulk(next: number[], message: string) {
    setUndoRounds(rounds);
    setRounds(next);
    setToast(message);
    setTimeout(() => setToast(""), 4000);
  }

  /** 2회차부터 지정한 금액으로. 1회차(본코드)는 건드리지 않는다. */
  function fillRest(v: number) {
    const first = rounds[0] ?? meta.min;
    const rest = v <= 0 && allowZero ? 0 : clamp(1, v);
    bulk(
      rounds.map((_, i) => (i === 0 ? first : rest)),
      rest <= 0
        ? "2회차부터 아바타를 안 만듭니다"
        : `2회차부터 ${won(rest)}원으로 채웠습니다`
    );
  }

  // 직접 입력은 만원 단위로 받되 11만원 단위(11·22·…·110·1100)만 허용한다.
  // 33만원형은 최소가 33만원이라 11만·22만은 받지 않는다.
  const customNum = Number(customMan);
  const customWon = customNum * 10_000;
  const customOk =
    /^\d+$/.test(customMan.trim()) && customNum > 0 && customNum % 11 === 0 && customWon >= meta.min;

  function fillCustom() {
    if (!customOk) return;
    fillRest(customWon);
    setCustomMan("");
  }

  /** 템플릿: 1회차와 2회차부터의 금액을 한 번에 */
  function applyTemplate(tpl: PlanTemplate) {
    const first = clamp(0, tpl.first);
    const rest = clamp(1, tpl.rest);
    bulk(
      Array.from({ length: MAX_AGE }, (_, i) => (i === 0 ? first : rest)),
      `${tpl.label} 으로 채웠습니다`
    );
  }

  function undoBulk() {
    if (!undoRounds) return;
    setRounds(undoRounds);
    setUndoRounds(null);
    setToast("되돌렸습니다");
    setTimeout(() => setToast(""), 2200);
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/plans/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || "새 플랜",
        planType: type,
        rounds,
        allowZero,
        currentRound,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved({
        name: name.trim() || "새 플랜",
        type,
        allowZero,
        currentRound,
        rounds: rounds.join(","),
      });
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
      <header className="sticky top-0 z-40 bg-surface shadow-[0_1px_8px_rgba(0,0,0,0.03)] pt-safe">
        <div className="h-16 px-margin-mobile flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/plans" className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface active:bg-surface-container">
              <Icon name="arrow_back" size={26} />
            </Link>
            {/* 어떤 플랜을 고치고 있는지가 헤더에서 제일 크게 보여야 한다.
                '플랜 설정' 이 큰 글씨면 정작 플랜 이름이 뒤로 밀린다. */}
            <div className="min-w-0">
              <h1 className="text-[21px] font-extrabold text-on-surface leading-tight truncate">
                {name || "새 플랜"}
              </h1>
              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                <span className="px-1.5 py-0.5 rounded-md bg-primary-fixed text-on-primary-fixed text-[13px] font-bold leading-none">
                  {meta.label}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[13px] font-bold leading-none ${
                    currentRound > 0
                      ? "bg-secondary-container text-on-secondary-container"
                      : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {currentRound > 0
                    ? `현재 나의 회차 : ${currentRound}회차`
                    : "현재회차 설정 안함"}
                </span>
              </div>
            </div>
          </div>
          <Link
            href={`/present?plan=${id}`}
            className="min-h-[44px] px-3 rounded-xl bg-secondary text-on-secondary text-label-md font-bold flex items-center gap-1"
          >
            <Icon name="present_to_all" size={20} />핵심요약
          </Link>
        </div>
      </header>

      <main className="px-margin-mobile flex flex-col pt-space-md">
        {/* 플랜 이름 + 유형 */}
        {/* 다른 플랜으로 갈아타기. 플랜이 하나면 굳이 안 보여준다. */}
        {otherPlans.length > 0 && (
          <div className="mb-space-md">
            <p className="text-[16px] font-semibold text-on-surface-variant mb-1.5">
              지금 고치는 플랜
            </p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="min-h-[48px] px-4 rounded-full bg-primary text-on-primary text-[17px] font-bold flex items-center whitespace-nowrap shrink-0">
                {name || "새 플랜"}
              </span>
              {otherPlans.map((p) => (
                <Link
                  key={p.id}
                  href={`/plans/${p.id}`}
                  className="min-h-[48px] px-4 rounded-full bg-surface-container text-on-surface text-[17px] font-semibold flex items-center whitespace-nowrap shrink-0"
                >
                  {p.name}
                </Link>
              ))}
            </div>
          </div>
        )}

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

          {/* 플랜 옵션 */}
          <label className="flex items-start gap-3 rounded-xl bg-surface-container-low px-3 py-3 cursor-pointer min-h-[56px]">
            <input
              type="checkbox"
              checked={allowZero}
              onChange={(e) => changeAllowZero(e.target.checked)}
              className="w-7 h-7 rounded accent-primary shrink-0 mt-0.5"
            />
            <div className="min-w-0">
              <span className="block text-[19px] font-bold text-on-surface leading-tight">
                아바타를 0으로 잡을 수 있게
              </span>
              <span className="block text-[16px] font-semibold text-on-surface-variant leading-snug mt-0.5">
                {allowZero
                  ? "2회차부터 − 를 끝까지 누르면 그 회차는 아바타를 안 만듭니다 (1회차 본코드는 필수)"
                  : "모든 회차에 아바타를 하나씩 만듭니다"}
              </span>
            </div>
          </label>

          {/* 지금 내가 몇 회차인지. 정해두면 대표 숫자(총 예상 수당)를
              '이미 받은 돈 / 앞으로 받을 돈' 으로 갈라 보여주고,
              회차수당표에서 내 줄을 짚어준다. 0 = 아직 안 정함. */}
          <div className="rounded-xl bg-surface-container-low px-3 py-3">
            <span className="block text-[19px] font-bold text-on-surface leading-tight">
              현재 나의 회차는?
            </span>
            <span className="block text-[16px] font-semibold text-on-surface-variant leading-snug mt-0.5">
              {currentRound > 0
                ? `지금 ${currentRound}회차입니다 · 회차수당표에서 이 줄을 짚어드립니다`
                : "정해두면 위 총 예상 수당 가운데 지금까지 받은 돈이 얼마인지, 앞으로 받을 돈이 얼마인지 나눠서 알려드립니다"}
            </span>
            <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setCurrentRound(0)}
                className={`min-h-[48px] px-3.5 rounded-xl text-[17px] font-bold whitespace-nowrap shrink-0 ${
                  currentRound === 0
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-surface-container-lowest text-on-surface-variant"
                }`}
              >
                안 정함
              </button>
              {Array.from({ length: PLAN_HORIZON }, (_, i) => i + 1).map((r) => (
                <button
                  key={r}
                  onClick={() => setCurrentRound(r)}
                  aria-label={`현재 ${r}회차`}
                  className={`min-w-[48px] h-12 rounded-xl text-[18px] font-bold shrink-0 ${
                    currentRound === r
                      ? "bg-primary text-on-primary shadow-sm"
                      : "bg-surface-container-lowest text-on-surface"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 요약 (sticky) */}
        <div className="sticky top-16 z-30 mb-space-lg">
          <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-md">
            {/* 스크롤을 내려도 어느 플랜의 숫자인지 붙어 있어야 한다 */}
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <Icon name="tune" size={16} className="text-primary" />
              <span className="text-[15px] font-bold text-on-surface truncate">
                {name || "새 플랜"}
              </span>
              <span className="text-[14px] font-semibold text-on-surface-variant shrink-0">
                · {meta.label}
              </span>
            </div>
            <div className="flex items-center justify-between bg-surface-container-low/60 rounded-xl px-3.5 py-2.5 mb-3">
              <span className="text-label-md font-semibold text-on-surface-variant">
                총 매출 누적 <span className="text-[14px]">(1~{PLAN_HORIZON}회차)</span>
              </span>
              <span className="text-headline-md font-headline-md text-on-surface font-bold">{bigWon(summary.totalInvest)}원</span>
            </div>
            <div className="px-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-label-md font-semibold text-on-surface-variant">총 예상 수당(실지급)</span>
                {/* 수익률이 22,000% 씩 나오면 가로로 넘치고 와닿지도 않는다. 몇 배인지로 적는다. */}
                <span className="inline-flex items-center gap-1 bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full text-[16px] font-bold shrink-0">
                  <Icon name="trending_up" size={16} />
                  넣은 돈의 {multiple(summary.totalInvest, summary.totalNet)}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-display-currency-mobile font-display-currency-mobile text-secondary font-extrabold num-font">
                  {bigWon(summary.totalNet)}
                </span>
                <span className="text-body-lg-bold font-body-lg-bold text-secondary">원</span>
              </div>
              {/* 이 숫자가 '언제까지' 받는 돈인지 밝힌다. 회차를 안 적으면
                  34억이 당장 손에 들어오는 돈처럼 읽힌다. */}
              <p className="text-[15px] font-bold text-on-surface-variant leading-snug mt-0.5">
                1~{PLAN_HORIZON}회차 정산을 모두 합한 금액입니다
              </p>
            </div>

            {/* 내 회차를 정했으면 여기까지 받은 돈과 앞으로 받을 돈을 가른다 */}
            {split && (
              <div className="mt-2.5 rounded-xl bg-surface-container-low px-3 py-2.5 flex items-center justify-between gap-2">
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
          </div>
        </div>

        {/* ★ 실제로 주머니에서 꺼내는 돈.
            '총 매출 누계'는 매 회차 다시 채워 넣는 금액을 전부 더한 값이라
            내가 준비해야 할 돈처럼 읽힌다. 하지만 2회차부터는 받은 수당으로
            상당 부분을 되넣으므로, 진짜 필요한 내 돈은 훨씬 적다.
            어르신이 가장 먼저 묻는 "그래서 내 돈 얼마 드는데?" 의 답이다. */}
        <div className="rounded-2xl bg-surface-container-lowest shadow-md p-space-md mb-space-md border-t-4 border-tertiary">
          <div className="flex items-center gap-1.5">
            <Icon name="savings" size={20} className="text-tertiary" />
            <span className="text-[18px] font-extrabold text-on-surface">
              내 돈은 총 얼마 드나요?
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-display-currency-mobile font-display-currency-mobile text-tertiary font-extrabold num-font">
              {bigWon(summary.funding.totalPocket)}
            </span>
            <span className="text-body-lg-bold font-body-lg-bold text-tertiary">원</span>
          </div>
          {summary.funding.lastPocketRound ? (
            <p className="text-[16px] font-bold text-on-surface leading-snug mt-1">
              1회차부터 {summary.funding.lastPocketRound}회차까지 넣는 내 돈 전부입니다
            </p>
          ) : (
            <p className="text-[16px] font-bold text-on-surface leading-snug mt-1">
              아직 넣을 금액이 없습니다
            </p>
          )}
          {summary.funding.selfSustainRound && (
            <p className="text-[16px] font-bold text-secondary leading-snug mt-0.5">
              {summary.funding.selfSustainRound}회차부터는 받은 수당만으로 채워집니다 · 내 돈 0원
            </p>
          )}
          <p className="text-[15px] font-semibold text-on-surface-variant leading-snug mt-2 pt-2 border-t border-surface-container">
            총 매출 누적 {bigWon(summary.totalInvest)}원 중 {bigWon(summary.totalInvest - summary.funding.totalPocket)}원은
            받은 수당으로 다시 넣습니다
          </p>
        </div>

        {/* 언제부터 남는 장사가 되는지 — sticky 밖에 둔다.
            sticky 카드가 화면의 절반을 넘게 덮으면 아래 내용이 안 보인다. */}
        <div className="grid grid-cols-2 gap-2 mb-space-lg">
          <div className="rounded-xl bg-tertiary-fixed px-3 py-2.5">
            <div className="text-[15px] font-bold text-on-tertiary-fixed leading-tight">
              손익분기회차
            </div>
            <div className="text-[22px] font-extrabold text-on-tertiary-fixed num-font leading-tight mt-0.5">
              {summary.breakEvenRound ? `${summary.breakEvenRound}회차` : "없음"}
            </div>
            <div className="text-[14px] font-semibold text-on-tertiary-fixed/80 leading-tight">
              받은 돈 ≥ 넣은 돈
            </div>
          </div>
          {/* selfFundRound 는 '그 회차 수당으로 다음 회차를 낼 수 있게 된' 회차다.
              내 돈이 0이 되는 것은 그 다음 회차부터이므로 자립 회차를 적는다. */}
          <div className="rounded-xl bg-secondary-container px-3 py-2.5">
            <div className="text-[15px] font-bold text-on-secondary-container leading-tight">
              추가금액 X
            </div>
            <div className="text-[22px] font-extrabold text-on-secondary-container num-font leading-tight mt-0.5">
              {summary.funding.selfSustainRound
                ? `${summary.funding.selfSustainRound}회차`
                : "없음"}
            </div>
            <div className="text-[14px] font-semibold text-on-secondary-container/80 leading-tight">
              이때부터 수당으로 충당
            </div>
          </div>
        </div>

        {/* 채우는 길은 셋이다. 한 카드에 몰아넣으면 어디까지가 한 덩어리인지
            안 보여서, 번호를 달고 카드를 나눠 경계를 준다.
            ① 템플릿 한 방 → ② 1회차 금액 → ③ 2회차부터
            템플릿이 가장 빠른 길이므로 맨 위에 둔다. */}
        <p className="text-[17px] text-on-surface-variant font-semibold mb-space-sm">
          모든 플랜은 18회차 기준입니다 · 아래 ①만 눌러도 18회차가 다 채워집니다
        </p>

        {/* ① 템플릿 — 자주 쓰는 조합을 1회차부터 18회차까지 한 번에 */}
        <section className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm mb-space-md border-t-4 border-primary">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary text-on-primary text-[17px] font-extrabold flex items-center justify-center shrink-0">
              1
            </span>
            <h2 className="text-[21px] font-extrabold text-on-surface">템플릿으로 한 번에</h2>
          </div>
          <p className="text-[17px] text-on-surface-variant font-semibold mt-1 mb-2.5">
            1회차와 2회차부터를 한꺼번에 정합니다 · 이것만 눌러도 끝납니다
          </p>
          {/* 2열 격자. 한 줄에 다 넣으면 글자가 세로로 쪼개진다. */}
          <div className="grid grid-cols-2 gap-2">
            {PLAN_TEMPLATES.map((tpl) => (
              <button
                key={tpl.label}
                onClick={() => applyTemplate(tpl)}
                className="min-h-[76px] rounded-xl border-2 border-primary/30 bg-primary-fixed/50 px-3 py-2.5 text-left active:scale-[0.97]"
              >
                <span className="block text-[20px] font-extrabold text-on-primary-fixed leading-tight whitespace-nowrap">
                  {tpl.label}
                </span>
                <span className="block text-[15px] font-semibold text-on-primary-fixed/80 leading-tight mt-1 whitespace-nowrap">
                  1회차 {manLabel(tpl.first)}
                </span>
                <span className="block text-[15px] font-semibold text-on-primary-fixed/80 leading-tight whitespace-nowrap">
                  2회차부터 {manLabel(tpl.rest)}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ② 1회차(본코드) 금액.
            전에는 화면 한참 아래에 있어서 '1회차만 정하면 나머지가 채워진다' 는
            말이 어디를 가리키는지 알 수 없었다. 채우기 바로 위로 올린다. */}
        <section className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm mb-space-md border-t-4 border-secondary">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-secondary text-on-secondary text-[17px] font-extrabold flex items-center justify-center shrink-0">
              2
            </span>
            <h2 className="text-[21px] font-extrabold text-on-surface">1회차(본코드) 금액</h2>
          </div>
          <p className="text-[17px] text-on-surface-variant font-semibold mt-1 mb-2.5">
            모든 계산이 여기서 시작합니다 · {meta.step / 10000}만원 단위 · 최소{" "}
            {meta.min / 10000}만원
          </p>

          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[17px] font-bold text-on-surface-variant">
              지금 1회차 금액
              {currentRound === 1 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-primary text-on-primary text-[13px] font-extrabold">
                  내 회차
                </span>
              )}
            </span>
            <span className="text-[17px] font-bold text-secondary shrink-0">
              18회차까지 +{shortKRW(avatarNetInPlan(rounds[0] ?? meta.min, meta.cap, 1))}원
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => step(0, -1)}
              aria-label="1회차 금액 감소"
              className="w-14 h-14 rounded-xl bg-surface-container text-primary flex items-center justify-center shadow-sm active:scale-90 shrink-0"
            >
              <Icon name="remove" size={28} />
            </button>
            {/* 1회차는 0으로 못 잡으므로 '안 만듦' 이 나올 일이 없다 */}
            <div className="flex-1 text-center min-w-0">
              <span className="text-[26px] font-extrabold text-on-surface num-font">
                {won(rounds[0] ?? meta.min)}
              </span>
              <span className="text-[19px] font-bold text-on-surface ml-0.5">원</span>
            </div>
            <button
              onClick={() => step(0, 1)}
              aria-label="1회차 금액 증가"
              className="w-14 h-14 rounded-xl bg-surface-container text-primary flex items-center justify-center shadow-sm active:scale-90 shrink-0"
            >
              <Icon name="add" size={28} />
            </button>
          </div>

          <div className="mt-2 flex items-center gap-1.5 overflow-x-auto">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setRound(0, p)}
                className={`min-h-[48px] px-3.5 rounded-xl text-[17px] font-bold whitespace-nowrap ${
                  (rounds[0] ?? meta.min) === p
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-surface-container text-on-surface"
                }`}
              >
                {p / 10000}만
              </button>
            ))}
            <button
              onClick={() => setOpenRound(1)}
              className="min-h-[48px] px-3.5 rounded-xl bg-surface-container text-primary text-[17px] font-bold whitespace-nowrap"
            >
              회차별 계산식
            </button>
          </div>
        </section>

        {/* ③ 2회차부터 채우기 — 1회차는 건드리지 않는다 */}
        <section className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm mb-space-lg border-t-4 border-tertiary-fixed">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[17px] font-extrabold flex items-center justify-center shrink-0">
              3
            </span>
            <h2 className="text-[21px] font-extrabold text-on-surface">2회차부터 채우기</h2>
          </div>
          <p className="text-[17px] text-on-surface-variant font-semibold mt-1 mb-2.5">
            1회차는 그대로 두고 2~18회차만 한 번에 바꿉니다
          </p>

          {/* 금액은 4칸 격자로 줄을 맞춘다. 일곱 개가 wrap 으로 흩어지면
              어디까지가 금액 버튼인지 한눈에 안 들어온다. */}
          <div className="grid grid-cols-4 gap-2">
            {fillPresets.map((p) => (
              <button
                key={p}
                onClick={() => fillRest(p)}
                className="min-h-[56px] rounded-xl bg-surface-container text-on-surface text-[18px] font-bold active:scale-95"
              >
                {p / 10000}만
              </button>
            ))}
          </div>
          {/* '1회차와 같게' 는 금액이 아니라 동작이다. 금액 칸에 섞어두면
              고를 금액이 하나 더 있는 것처럼 보여서 줄을 나눈다.
              어떤 금액으로 채워지는지 버튼에 적어둔다. */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => fillRest(rounds[0] ?? meta.min)}
              className="flex-1 min-w-0 min-h-[56px] px-4 rounded-xl bg-primary text-on-primary text-[18px] font-bold flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Icon name="content_copy" size={20} />
              <span className="truncate">1회차와 같게 ({manLabel(rounds[0] ?? meta.min)})</span>
            </button>
            {allowZero && (
              <button
                onClick={() => fillRest(0)}
                className="min-h-[56px] px-4 rounded-xl bg-surface-container text-on-surface-variant text-[18px] font-bold shrink-0 active:scale-95"
              >
                안 만들기
              </button>
            )}
          </div>

          {/* 직접 입력 — 프리셋에 없는 금액을 2~18회차에 한 번에 */}
          <div className="mt-3 rounded-xl bg-surface-container-low px-3 py-3">
            <p className="text-[17px] font-bold text-on-surface mb-2">직접 넣기 · 11만원 단위</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 flex items-center gap-1.5 bg-surface-container-lowest rounded-xl px-3 min-h-[56px]">
                <input
                  value={customMan}
                  onChange={(e) => setCustomMan(e.target.value.replace(/[^\d]/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") fillCustom();
                  }}
                  inputMode="numeric"
                  placeholder="예: 110"
                  aria-label="2회차부터 채울 금액(만원)"
                  className="flex-1 min-w-0 bg-transparent text-[22px] font-extrabold text-on-surface num-font text-right focus:outline-none"
                />
                <span className="text-[19px] font-bold text-on-surface-variant shrink-0">만원</span>
              </div>
              <button
                onClick={fillCustom}
                disabled={!customOk}
                className={`min-h-[56px] px-4 rounded-xl text-[18px] font-bold shrink-0 active:scale-95 ${
                  customOk
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container text-on-surface-variant/50"
                }`}
              >
                채우기
              </button>
            </div>
            <p className="text-[16px] font-semibold text-on-surface-variant mt-1.5 leading-snug">
              {customMan === ""
                ? `11 · 22 · 110 · 330 처럼 11의 배수로 적으세요 (최소 ${meta.min / 10000}만원)`
                : customOk
                  ? `2~18회차를 ${won(customWon)}원으로 채웁니다`
                  : customNum % 11 !== 0
                    ? `${customMan}만원은 11만원 단위가 아닙니다`
                    : `${meta.label}은 최소 ${meta.min / 10000}만원부터입니다`}
            </p>
          </div>
        </section>

        {/* 회차별 계산식 보기 */}
        <button
          onClick={() => setOpenRound(1)}
          className="attention-blink w-full min-h-[60px] rounded-2xl bg-secondary text-on-secondary text-[20px] font-extrabold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] mb-space-lg"
        >
          <Icon name="timeline" size={24} />
          회차별 계산식 보기
        </button>

        {/* 회차별 목표매출 — 1회차는 위 ②에서 정하므로 여기는 2회차부터다 */}
        <div className="mb-space-sm">
          <h2 className="text-[21px] font-extrabold text-on-surface">2회차부터 회차별 목표매출</h2>
          <p className="text-[17px] text-on-surface-variant font-semibold mt-0.5">
            {meta.step / 10000}만원 단위 · 최소 {meta.min / 10000}만원 · 1회차는 위 ②에서 정합니다
          </p>
        </div>

        {/* 2회차부터는 한 줄로. 18개가 큰 카드로 늘어서면 화면이 어수선해진다. */}
        {rounds.length > 1 && (
          <div className="flex flex-col gap-2 mb-space-md">
            {rounds.slice(1).map((goal, idx) => {
              const i = idx + 1;
              // 내가 지금 몇 회차인지 정해뒀다면 그 줄을 짚어준다
              const mine = currentRound === i + 1;
              return (
                <div
                  key={i}
                  className={`rounded-xl pl-3 pr-1.5 py-2 shadow-sm flex items-center gap-1.5 ${
                    mine
                      ? "bg-primary-fixed ring-2 ring-primary"
                      : "bg-surface-container-lowest"
                  }`}
                >
                  <span className="w-[52px] shrink-0 text-[17px] font-bold text-on-surface-variant">
                    {i + 1}회차
                    {mine && (
                      <span className="block text-[13px] font-extrabold text-primary leading-none">
                        내 회차
                      </span>
                    )}
                  </span>
                  {/* 금액과 평생수당은 줄바꿈되지 않게 한 칸에 묶는다 */}
                  <button
                    onClick={() => setOpenRound(i + 1)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div
                      className={`text-[19px] font-extrabold num-font leading-tight truncate ${
                        goal <= 0 ? "text-on-surface-variant" : "text-on-surface"
                      }`}
                    >
                      {goal <= 0 ? "아바타 안 만듦" : `${won(goal)}원`}
                    </div>
                    <div className="text-[14px] font-bold text-secondary leading-tight truncate">
                      {goal <= 0 ? "수당 없음" : `18회차까지 +${shortKRW(avatarNetInPlan(goal, meta.cap, i + 1))}`}
                    </div>
                  </button>
                  <button
                    onClick={() => step(i, -1)}
                    aria-label={`${i + 1}회차 감소`}
                    className="w-11 h-11 rounded-lg bg-surface-container text-primary flex items-center justify-center active:scale-90 shrink-0"
                  >
                    <Icon name="remove" size={22} />
                  </button>
                  <button
                    onClick={() => step(i, 1)}
                    aria-label={`${i + 1}회차 증가`}
                    className="w-11 h-11 rounded-lg bg-surface-container text-primary flex items-center justify-center active:scale-90 shrink-0"
                  >
                    <Icon name="add" size={22} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 mb-space-lg">
          <Link
            href={`/timeline?plan=${id}`}
            className="flex-1 min-h-[56px] rounded-xl bg-surface-container text-on-surface text-[18px] font-bold flex items-center justify-center gap-1.5"
          >
            <Icon name="timeline" size={22} />회차수당표
          </Link>
        </div>

        {/* 플로팅 저장 버튼이 맨 아래 내용을 가리지 않도록 */}
        <div className="h-16" />
      </main>

      {/* 저장은 플로팅으로. 회차가 많으면 맨 아래 버튼까지 내려가기 번거롭다.
          하단 탭바(z-50) 위, 회차 상세 시트(z-60) 아래. */}
      <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] z-[55] pointer-events-none flex justify-end pr-4">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className={`pointer-events-auto min-h-[60px] px-5 rounded-2xl shadow-xl flex items-center gap-2 text-[19px] font-extrabold active:scale-95 transition-colors ${
            dirty
              ? "bg-primary text-on-primary attention-blink"
              : "bg-secondary-container text-on-secondary-container"
          }`}
        >
          <Icon name={dirty ? "save" : "check_circle"} size={24} />
          {saving ? "저장 중..." : dirty ? "저장하기" : "저장됨"}
        </button>
      </div>

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] bg-inverse-surface text-inverse-on-surface px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 z-[70]">
          <Icon name="check_circle" size={22} className="text-secondary-container" />
          <span className="flex-1 text-[18px] font-semibold">{toast}</span>
          {undoRounds && (
            <button
              onClick={undoBulk}
              className="min-h-[44px] px-3 rounded-lg bg-inverse-on-surface/15 text-inverse-on-surface text-[17px] font-bold shrink-0"
            >
              되돌리기
            </button>
          )}
        </div>
      )}

      {openRound !== null && (
        <RoundDetailSheet
          goals={rounds}
          cap={meta.cap}
          capLabel={meta.capLabel}
          round={openRound}
          lastRound={summary.inflow.length}
          currentRound={currentRound}
          onRound={setOpenRound}
          onClose={() => setOpenRound(null)}
        />
      )}
    </div>
  );
}
