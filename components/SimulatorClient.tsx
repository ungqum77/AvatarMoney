"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { won, shortKRW, multiple } from "@/lib/format";
import { planSummary, avatarNetLifetime, PLAN_META, MAX_AGE, type PlanType } from "@/lib/points";
import Icon from "@/components/Icon";
import RoundDetailSheet from "@/components/RoundDetailSheet";

/**
 * 자주 쓰는 조합. 1회차(첫코드)와 2회차부터의 금액을 한 번에 채운다.
 * 값은 11만원 단위라 두 유형(11만형·33만형) 모두에서 그대로 쓸 수 있다.
 */
interface Template {
  label: string;
  first: number;
  rest: number;
}

const TEMPLATES: Template[] = [
  { label: "110 - 33", first: 1_100_000, rest: 330_000 },
  { label: "1100 - 330", first: 11_000_000, rest: 3_300_000 },
];

/** 11,000,000 → "1,100만" */
function manLabel(v: number): string {
  return `${Math.round(v / 10_000).toLocaleString("ko-KR")}만`;
}

export default function SimulatorClient({
  id,
  initialName,
  initialType,
  initialRounds,
  initialAllowZero,
}: {
  id: number;
  initialName: string;
  initialType: PlanType;
  initialRounds: number[];
  initialAllowZero: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<PlanType>(initialType);
  // 아바타를 0으로(그 회차엔 안 만들기) 잡을 수 있는지
  const [allowZero, setAllowZero] = useState(initialAllowZero);
  const [rounds, setRounds] = useState<number[]>(
    initialRounds.length ? initialRounds : [PLAN_META[initialType].min]
  );
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
    rounds: (initialRounds.length ? initialRounds : [PLAN_META[initialType].min]).join(","),
  }));

  const meta = PLAN_META[type];
  const presets =
    type === "won33" ? [330000, 440000, 550000, 660000] : [110000, 220000, 330000, 440000];

  const summary = useMemo(() => planSummary(rounds, meta.cap), [rounds, meta.cap]);

  const dirty =
    name !== saved.name ||
    type !== saved.type ||
    allowZero !== saved.allowZero ||
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
  function addRound() {
    setRounds((rs) => [...rs, rs.length ? rs[rs.length - 1] : meta.min]);
  }
  function removeRound(i: number) {
    setRounds((rs) => (rs.length <= 1 ? rs : rs.filter((_, idx) => idx !== i)));
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

  /** 회차 수를 n개로. 늘릴 땐 마지막 값을 이어서 채운다. */
  function setRoundCount(n: number) {
    if (n === rounds.length) return;
    const next = rounds.slice(0, n);
    const last = rounds[rounds.length - 1] ?? meta.min;
    while (next.length < n) next.push(last);
    bulk(next, `${n}회차로 맞췄습니다`);
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

  /** 템플릿: 1회차와 2회차부터의 금액을 한 번에 */
  function applyTemplate(tpl: Template) {
    const first = clamp(0, tpl.first);
    const rest = clamp(1, tpl.rest);
    const n = Math.max(rounds.length, 2);
    bulk(
      Array.from({ length: n }, (_, i) => (i === 0 ? first : rest)),
      `${tpl.label} 으로 채웠습니다`
    );
  }

  /** 회차마다 한 단위씩 올려서 */
  function fillStepUp() {
    const first = rounds[0] ?? meta.min;
    bulk(
      rounds.map((_, i) => clamp(i, first + i * meta.step)),
      `회차마다 ${meta.step / 10000}만원씩 올렸습니다`
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
      body: JSON.stringify({ name: name.trim() || "새 플랜", planType: type, rounds, allowZero }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved({ name: name.trim() || "새 플랜", type, allowZero, rounds: rounds.join(",") });
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
              <Icon name="arrow_back" size={26} />
            </Link>
            <h1 className="text-headline-sm font-headline-sm text-on-surface font-bold">시뮬레이터</h1>
          </div>
          <Link
            href={`/present?plan=${id}`}
            className="min-h-[44px] px-3 rounded-xl bg-secondary text-on-secondary text-label-md font-bold flex items-center gap-1"
          >
            <Icon name="present_to_all" size={20} />보여주기
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
        </div>

        {/* 요약 (sticky) */}
        <div className="sticky top-16 z-30 mb-space-lg">
          <div className="bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl p-space-md shadow-md">
            <div className="flex items-center justify-between bg-surface-container-low/60 rounded-xl px-3.5 py-2.5 mb-3">
              <span className="text-label-md font-semibold text-on-surface-variant">총 매출 누적</span>
              <span className="text-headline-md font-headline-md text-on-surface font-bold">{won(summary.totalInvest)}원</span>
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
                  {won(summary.totalNet)}
                </span>
                <span className="text-body-lg-bold font-body-lg-bold text-secondary">원</span>
              </div>
            </div>

          </div>
        </div>

        {/* 언제부터 남는 장사가 되는지 — sticky 밖에 둔다.
            sticky 카드가 화면의 절반을 넘게 덮으면 아래 내용이 안 보인다. */}
        <div className="grid grid-cols-2 gap-2 mb-space-lg">
          <div className="rounded-xl bg-tertiary-fixed px-3 py-2.5">
            <div className="text-[15px] font-bold text-on-tertiary-fixed leading-tight">
              본전 되는 때
            </div>
            <div className="text-[22px] font-extrabold text-on-tertiary-fixed num-font leading-tight mt-0.5">
              {summary.breakEvenRound ? `${summary.breakEvenRound}회차` : "없음"}
            </div>
            <div className="text-[14px] font-semibold text-on-tertiary-fixed/80 leading-tight">
              받은 돈 ≥ 넣은 돈
            </div>
          </div>
          <div className="rounded-xl bg-secondary-container px-3 py-2.5">
            <div className="text-[15px] font-bold text-on-secondary-container leading-tight">
              수당으로 채우는 때
            </div>
            <div className="text-[22px] font-extrabold text-on-secondary-container num-font leading-tight mt-0.5">
              {summary.selfFundRound ? `${summary.selfFundRound}회차` : "없음"}
            </div>
            <div className="text-[14px] font-semibold text-on-secondary-container/80 leading-tight">
              다음 회차 매출 충당
            </div>
          </div>
        </div>

        {/* 빠른 채우기 — 18회차를 하나씩 넣지 않아도 되게 */}
        <section className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm mb-space-lg flex flex-col gap-4">
          <div>
            <h2 className="text-[21px] font-extrabold text-on-surface">빠른 채우기</h2>
            <p className="text-[17px] text-on-surface-variant font-semibold mt-0.5">
              1회차(본코드)만 정하면 나머지는 한 번에 채웁니다
            </p>
          </div>

          {/* 몇 회차까지 */}
          <div>
            <p className="text-[19px] font-bold text-on-surface mb-2">몇 회차까지 할까요?</p>
            <div className="flex items-center gap-2">
              {[6, 12, MAX_AGE].map((n) => {
                const on = rounds.length === n;
                return (
                  <button
                    key={n}
                    onClick={() => setRoundCount(n)}
                    className={`flex-1 min-h-[56px] rounded-xl text-[19px] font-bold border-2 ${
                      on
                        ? "border-primary bg-primary-fixed text-on-primary-fixed"
                        : "border-surface-container bg-surface-container-lowest text-on-surface"
                    }`}
                  >
                    {n}회차
                  </button>
                );
              })}
            </div>
            <p className="text-[16px] text-on-surface-variant font-semibold mt-1.5">
              지금 {rounds.length}회차 · 아바타는 18회차까지 삽니다
            </p>
          </div>

          {/* 2회차부터 채우는 법 */}
          <div>
            <p className="text-[19px] font-bold text-on-surface mb-2">
              2회차부터 얼마로 채울까요?
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => fillRest(p)}
                  className="min-h-[56px] px-4 rounded-xl bg-surface-container text-on-surface text-[18px] font-bold active:scale-95"
                >
                  {p / 10000}만
                </button>
              ))}
              <button
                onClick={() => fillRest(rounds[0] ?? meta.min)}
                className="min-h-[56px] px-4 rounded-xl bg-primary text-on-primary text-[18px] font-bold flex items-center gap-1.5 active:scale-95"
              >
                <Icon name="content_copy" size={20} />
                1회차와 같게
              </button>
              {allowZero && (
                <button
                  onClick={() => fillRest(0)}
                  className="min-h-[56px] px-4 rounded-xl bg-surface-container text-on-surface-variant text-[18px] font-bold active:scale-95"
                >
                  안 만들기
                </button>
              )}
              <button
                onClick={fillStepUp}
                className="min-h-[56px] px-4 rounded-xl bg-surface-container text-on-surface text-[18px] font-bold flex items-center gap-1.5 active:scale-95"
              >
                <Icon name="trending_up" size={20} />
                {meta.step / 10000}만씩 올리기
              </button>
            </div>
          </div>

          {/* 템플릿 — 자주 쓰는 조합을 한 번에 */}
          <div>
            <p className="text-[19px] font-bold text-on-surface mb-2">템플릿으로 한 번에</p>
            <div className="flex items-stretch gap-2">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  onClick={() => applyTemplate(tpl)}
                  className="flex-1 min-h-[76px] rounded-xl border-2 border-primary/30 bg-primary-fixed/50 px-3 py-2.5 text-left active:scale-[0.97]"
                >
                  <span className="block text-[20px] font-extrabold text-on-primary-fixed leading-tight">
                    {tpl.label}
                  </span>
                  <span className="block text-[15px] font-semibold text-on-primary-fixed/80 leading-tight mt-1">
                    1회차 {manLabel(tpl.first)}
                    <br />
                    2회차부터 {manLabel(tpl.rest)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 회차별 자세히 보기 */}
        <button
          onClick={() => setOpenRound(1)}
          className="attention-blink w-full min-h-[60px] rounded-2xl bg-secondary text-on-secondary text-[20px] font-extrabold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] mb-space-lg"
        >
          <Icon name="timeline" size={24} />
          회차별 수당 자세히 보기
        </button>

        {/* 회차별 목표매출 */}
        <div className="mb-space-sm">
          <h2 className="text-[21px] font-extrabold text-on-surface">회차별 목표매출</h2>
          <p className="text-[17px] text-on-surface-variant font-semibold mt-0.5">
            {meta.step / 10000}만원 단위 · 최소 {meta.min / 10000}만원 · 모두 {rounds.length}회차
          </p>
        </div>

        {/* 1회차(본코드)는 크게. 나머지는 여기서 파생되므로 여기만 공들여 정한다. */}
        <section className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm mb-space-md">
          <div className="flex items-center justify-between mb-2">
            <span className="px-3 py-1.5 rounded-full bg-primary text-on-primary text-[17px] font-bold">
              1회차 · 본코드
            </span>
            <span className="text-[17px] font-bold text-secondary">
              평생 +{shortKRW(avatarNetLifetime(rounds[0] ?? meta.min, meta.cap))}원
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => step(0, -1)}
              aria-label="감소"
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
              aria-label="증가"
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
              자세히
            </button>
          </div>
        </section>

        {/* 2회차부터는 한 줄로. 18개가 큰 카드로 늘어서면 화면이 어수선해진다. */}
        {rounds.length > 1 && (
          <div className="flex flex-col gap-2 mb-space-md">
            {rounds.slice(1).map((goal, idx) => {
              const i = idx + 1;
              return (
                <div
                  key={i}
                  className="bg-surface-container-lowest rounded-xl pl-3 pr-1.5 py-2 shadow-sm flex items-center gap-1.5"
                >
                  <span className="w-[52px] shrink-0 text-[17px] font-bold text-on-surface-variant">
                    {i + 1}회차
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
                      {goal <= 0 ? "수당 없음" : `평생 +${shortKRW(avatarNetLifetime(goal, meta.cap))}`}
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
                  <button
                    onClick={() => removeRound(i)}
                    aria-label={`${i + 1}회차 삭제`}
                    className="w-9 h-11 rounded-lg text-outline flex items-center justify-center active:scale-90 shrink-0"
                  >
                    <Icon name="delete" size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 mb-space-lg">
          <button
            onClick={addRound}
            className="flex-1 min-h-[56px] rounded-xl bg-surface-container text-primary text-[18px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.98]"
          >
            <Icon name="add_circle" size={22} />회차 추가
          </button>
          <Link
            href={`/timeline?plan=${id}`}
            className="flex-1 min-h-[56px] rounded-xl bg-surface-container text-on-surface text-[18px] font-bold flex items-center justify-center gap-1.5"
          >
            <Icon name="timeline" size={22} />타임라인
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
          lastRound={Math.min(MAX_AGE, summary.inflow.length)}
          onRound={setOpenRound}
          onClose={() => setOpenRound(null)}
        />
      )}
    </div>
  );
}
