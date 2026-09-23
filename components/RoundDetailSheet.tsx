"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { won, shortKRW } from "@/lib/format";
import { roundDetail, roundSalesTotal, WITHHOLD, MAX_AGE, type AvatarShare } from "@/lib/points";
import Icon from "@/components/Icon";

/**
 * 한 회차에서 아바타들이 각각 얼마를 주는지 보여준다.
 * 60대 기준: 한 화면에 한 회차만. 계산식은 접어두고 눌러서 편다.
 */
export default function RoundDetailSheet({
  goals,
  cap,
  capLabel,
  round,
  lastRound,
  currentRound = 0,
  onRound,
  onClose,
}: {
  goals: number[];
  cap: number;
  capLabel: string;
  round: number;
  lastRound: number;
  /** 지금 내가 몇 회차인지. 0 = 아직 안 정함 */
  currentRound?: number;
  onRound: (r: number) => void;
  onClose: () => void;
}) {
  const detail = useMemo(() => roundDetail(goals, cap, round), [goals, cap, round]);

  // 수명(18회차)이 다해 빠진 아바타. 19회차면 1회차 아바타가 여기 들어간다.
  const expired = useMemo(() => {
    const born = Math.min(round, goals.length); // 지금까지 만든 아바타 수
    const out: number[] = [];
    for (let c = 1; c <= born; c++) if (round - c + 1 > MAX_AGE) out.push(c);
    return out;
  }, [round, goals.length]);

  const [openAll, setOpenAll] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);

  // 회차를 넘기면 본문은 맨 위부터 다시 보고, 회차 칩은 현재 회차가 보이게 따라간다.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
    chipRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [round]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && round > 1) onRound(round - 1);
      if (e.key === "ArrowRight" && round < lastRound) onRound(round + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [round, lastRound, onRound, onClose]);

  return (
    // z-[60]: 하단 탭바(z-50) 위
    <div className="fixed inset-0 z-[60] bg-surface flex flex-col">
      {/* 헤더 */}
      <header className="shrink-0 pt-safe bg-surface-container-low shadow-sm">
        <div className="h-16 px-margin-mobile flex items-center justify-between">
          <h2 className="text-headline-md font-headline-md text-on-surface font-bold">회차별 계산식</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="min-h-[48px] px-4 rounded-xl bg-surface-container text-on-surface font-bold text-[19px] flex items-center gap-1.5 active:scale-95"
          >
            <Icon name="close" size={22} />
            닫기
          </button>
        </div>

        {/* 회차 이동 */}
        <div className="px-margin-mobile pb-3 flex items-center gap-2">
          <button
            onClick={() => onRound(round - 1)}
            disabled={round <= 1}
            aria-label="이전 회차"
            className="w-16 h-16 rounded-2xl bg-surface-container-lowest text-primary flex items-center justify-center shadow-sm active:scale-90 disabled:opacity-30"
          >
            <Icon name="arrow_back" size={30} />
          </button>
          <div className="flex-1 text-center">
            {/* 회사 회차가 아니라 '내가 시작하고 몇 번째인지' */}
            <div className="text-[17px] text-on-surface-variant font-bold">내</div>
            <div className="text-[40px] leading-none font-extrabold text-on-surface num-font">
              {round}
              <span className="text-[22px] font-bold ml-1">회차</span>
            </div>
            <div className="text-[17px] text-on-surface-variant font-semibold mt-1">
              모두 {lastRound}회차
            </div>
            {/* 지금 보고 있는 회차가 내 회차인지 바로 알 수 있게 */}
            {currentRound > 0 && (
              <div
                className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[15px] font-bold ${
                  currentRound === round
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {currentRound === round ? "지금 내 회차" : `내 회차는 ${currentRound}회차`}
              </div>
            )}
          </div>
          <button
            onClick={() => onRound(round + 1)}
            disabled={round >= lastRound}
            aria-label="다음 회차"
            className="w-16 h-16 rounded-2xl bg-surface-container-lowest text-primary flex items-center justify-center shadow-sm active:scale-90 disabled:opacity-30"
          >
            <Icon name="arrow_forward" size={30} />
          </button>
        </div>

        {/* 회차 빠른 이동 */}
        <div className="px-margin-mobile pb-3 flex items-center gap-1.5 overflow-x-auto">
          {Array.from({ length: lastRound }, (_, i) => i + 1).map((r) => (
            <button
              key={r}
              ref={r === round ? chipRef : undefined}
              onClick={() => onRound(r)}
              className={`min-w-[48px] h-12 rounded-xl text-[18px] font-bold shrink-0 ${
                r === round
                  ? "bg-primary text-on-primary shadow-sm"
                  : r === currentRound
                    ? "bg-primary-fixed text-on-primary-fixed ring-2 ring-primary"
                    : "bg-surface-container-lowest text-on-surface-variant"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </header>

      {/* 본문 */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto px-margin-mobile pb-safe">
        {/* 이 회차 총액 */}
        <section className="mt-4 rounded-2xl bg-primary p-space-lg text-on-primary shadow-lg">
          <p className="text-[19px] font-semibold opacity-90">내 {round}회차에 받는 돈</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-[40px] leading-tight font-extrabold num-font">{won(detail.net)}</span>
            <span className="text-[22px] font-bold">원</span>
          </div>
          <p className="text-[17px] font-semibold opacity-90 mt-1">
            세금 떼기 전 {won(detail.gross)}원
          </p>
          <div className="mt-3 pt-3 border-t border-on-primary/25 flex items-center justify-between gap-2">
            <span className="text-[18px] font-semibold opacity-90">이 회차에 넣는 총매출</span>
            <span className="text-[20px] font-extrabold num-font">
              {detail.sales > 0 ? `${won(detail.sales)}원` : "없음"}
            </span>
          </div>
          <p className="text-[15px] font-semibold opacity-80 mt-1">
            살아있는 아바타 {detail.shares.length}개의 목표매출을 더한 금액
          </p>
        </section>

        {detail.shares.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-surface-container-lowest p-space-lg text-center">
            <p className="text-[20px] font-bold text-on-surface">이 회차에는 수당이 없습니다</p>
            <p className="text-[18px] text-on-surface-variant mt-1">
              살아있는 아바타가 없습니다.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-5 mb-2 flex items-center justify-between">
              <h3 className="text-[21px] font-extrabold text-on-surface">
                아바타 {detail.shares.length}개가 만들어 줍니다
              </h3>
              <button
                onClick={() => setOpenAll((v) => !v)}
                className="min-h-[44px] px-3 rounded-xl bg-surface-container text-primary text-[17px] font-bold"
              >
                {openAll ? "계산식 접기" : "계산식 펴기"}
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {detail.shares.map((s) => (
                <AvatarCard key={s.bornRound} share={s} capLabel={capLabel} forceOpen={openAll} />
              ))}
            </div>

            {/* 합계 확인 */}
            <section className="mt-4 rounded-2xl bg-surface-container-high p-space-md">
              <div className="flex items-center justify-between">
                <span className="text-[19px] font-bold text-on-surface">
                  아바타 {detail.shares.length}개 합계
                </span>
                <span className="text-[22px] font-extrabold text-on-surface num-font">
                  {won(detail.net)}원
                </span>
              </div>
            </section>

          </>
        )}

        <ExpiredNote expired={expired} />

        {/* 매출·수당 누계 */}
        <section className="mt-4 rounded-2xl bg-surface-container-lowest shadow-sm overflow-hidden">
          <div className="px-space-md py-2.5 bg-surface-container-low">
            <h3 className="text-[19px] font-extrabold text-on-surface">내 {round}회차까지 누적</h3>
          </div>

          <div className="px-space-md py-3 flex items-center justify-between gap-2">
            <span className="text-[19px] font-bold text-on-surface">
              누적 매출
              <span className="text-[16px] font-semibold text-on-surface-variant ml-1.5">넣은 돈</span>
            </span>
            <span className="text-[21px] font-extrabold text-on-surface num-font">
              {won(detail.cumulativeSales)}원
            </span>
          </div>

          <div className="px-space-md py-3 flex items-center justify-between gap-2 border-t-2 border-surface-container">
            <span className="text-[19px] font-bold text-on-surface">
              누적 수당
              <span className="text-[16px] font-semibold text-on-surface-variant ml-1.5">받은 돈</span>
            </span>
            <span className="text-[21px] font-extrabold text-secondary num-font">
              {won(detail.cumulativeNet)}원
            </span>
          </div>

          {/* 누적수당 − 누적매출. 양수면 넣은 돈을 넘어선 것이라 좋은 쪽이다. */}
          <div
            className={`px-space-md py-3.5 border-t-2 border-surface-container ${
              detail.netMinusSales < 0 ? "bg-tertiary-fixed" : "bg-secondary-container"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-[19px] font-extrabold ${
                  detail.netMinusSales < 0 ? "text-on-tertiary-fixed" : "text-on-secondary-container"
                }`}
              >
                누적수당 − 누적매출
              </span>
              <span
                className={`text-[22px] font-extrabold num-font ${
                  detail.netMinusSales < 0 ? "text-on-tertiary-fixed" : "text-on-secondary-container"
                }`}
              >
                {detail.netMinusSales < 0 ? "−" : "+"}
                {won(Math.abs(detail.netMinusSales))}원
              </span>
            </div>
            <p
              className={`text-[17px] font-semibold mt-1 ${
                detail.netMinusSales < 0 ? "text-on-tertiary-fixed" : "text-on-secondary-container"
              }`}
            >
              {detail.netMinusSales < 0
                ? `아직 ${won(-detail.netMinusSales)}원 더 받아야 넣은 돈만큼 됩니다`
                : detail.netMinusSales === 0
                  ? "넣은 돈을 정확히 다 받았습니다"
                  : `넣은 돈을 다 받고 ${won(detail.netMinusSales)}원 더 받았습니다`}
            </p>
          </div>
        </section>

        {/* 본문 안에도 회차 이동. 아래까지 읽고 나서 위로 안 올라가도 되게.
            갈 회차의 매출을 함께 적어 누르기 전에 보이게 한다. */}
        <nav className="mt-5 mb-8 flex items-stretch gap-2">
          <button
            onClick={() => onRound(round - 1)}
            disabled={round <= 1}
            className="flex-1 min-h-[88px] rounded-2xl bg-surface-container-lowest border-2 border-surface-container text-on-surface flex flex-col items-center justify-center gap-0.5 active:scale-[0.97] disabled:opacity-30"
          >
            <span className="text-[16px] font-semibold text-on-surface-variant flex items-center gap-1">
              <Icon name="arrow_back" size={16} />
              이전
            </span>
            <span className="text-[21px] font-extrabold">{round > 1 ? `${round - 1}회차` : "처음"}</span>
            {round > 1 && (
              <span className="text-[15px] font-semibold text-on-surface-variant">
                {salesLabel(goals, round - 1)}
              </span>
            )}
          </button>
          <button
            onClick={() => onRound(round + 1)}
            disabled={round >= lastRound}
            className="flex-[2] min-h-[88px] rounded-2xl bg-primary text-on-primary flex flex-col items-center justify-center gap-0.5 shadow-md active:scale-[0.97] disabled:opacity-30"
          >
            <span className="text-[16px] font-semibold opacity-90 flex items-center gap-1">
              다음 회차 보기
              <Icon name="arrow_forward" size={16} />
            </span>
            <span className="text-[23px] font-extrabold">
              {round < lastRound ? `${round + 1}회차` : "마지막"}
            </span>
            {round < lastRound && (
              <span className="text-[15px] font-semibold opacity-90">
                {salesLabel(goals, round + 1)}
              </span>
            )}
          </button>
        </nav>
      </div>
    </div>
  );
}

/** 회차 이동 버튼에 적을 그 회차의 총매출(살아있는 아바타들의 합). */
function salesLabel(goals: number[], r: number): string {
  const g = roundSalesTotal(goals, r);
  return g > 0 ? `총매출 ${shortKRW(g)}원` : "투입 없음";
}

/** 수명(18회차)이 다해 빠진 아바타를 알려준다. 개수가 왜 줄었는지 보이게. */
function ExpiredNote({ expired }: { expired: number[] }) {
  if (expired.length === 0) return null;
  const list = expired.slice(-3);
  return (
    <section className="mt-3 rounded-2xl bg-surface-container p-space-md">
      <p className="text-[19px] font-bold text-on-surface-variant">
        수명이 끝난 아바타 {expired.length}개
      </p>
      <p className="text-[17px] text-on-surface-variant font-semibold mt-1">
        {expired.length > 3 && "… "}
        {list.map((c) => `${c}회차`).join(", ")} 아바타는 18살까지 살고 사라졌습니다.
      </p>
    </section>
  );
}

function AvatarCard({
  share: s,
  capLabel,
  forceOpen,
}: {
  share: AvatarShare;
  capLabel: string;
  forceOpen: boolean;
}) {
  const [open, setOpen] = useState(false);
  const show = forceOpen || open;

  return (
    <article className="rounded-2xl bg-surface-container-lowest shadow-sm overflow-hidden">
      <div className="p-space-md">
        <div className="flex items-center justify-between gap-2">
          <span className="px-3 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[17px] font-bold whitespace-nowrap">
            {s.bornRound}회차 아바타
          </span>
          <span className="px-3 py-1.5 rounded-full bg-surface-container text-on-surface text-[17px] font-bold whitespace-nowrap">
            {s.age}살
          </span>
        </div>

        {/* 금액 영역 — 넣은 돈(목표매출)과 받는 돈(실지급)을 확실히 나눈다 */}
        <div className="mt-3 rounded-xl border-2 border-surface-container overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-surface-container-low">
            <span className="text-[18px] font-bold text-on-surface-variant">목표매출</span>
            <span className="text-[20px] font-extrabold text-on-surface num-font">{won(s.goal)}원</span>
          </div>
          <div className="flex items-end justify-between gap-2 px-3.5 py-3 bg-secondary-container">
            <div className="min-w-0">
              <p className="text-[17px] font-bold text-on-secondary-container">이 회차 실지급</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-[30px] leading-tight font-extrabold text-on-secondary-container num-font">
                  {won(s.net)}
                </span>
                <span className="text-[19px] font-bold text-on-secondary-container">원</span>
              </div>
            </div>
            <button
              onClick={() => setOpen((v) => !v)}
              className="min-h-[48px] px-3 rounded-xl bg-surface-container-lowest text-on-surface text-[17px] font-bold shrink-0 flex items-center gap-1 shadow-sm"
            >
              {show ? "접기" : "계산식"}
              {!show && <Icon name="south" size={18} />}
            </button>
          </div>
        </div>

        {s.age < 4 && (
          <p className="mt-2 text-[17px] text-on-surface-variant font-semibold">
            {s.age < 3 ? "아직 판매 수당만 나옵니다 (정착은 3살부터)" : "정착이 붙었습니다 (달성은 4살부터)"}
          </p>
        )}
        {s.capped && (
          <p className="mt-2 text-[17px] text-tertiary font-bold">
            달성이 극점 {capLabel}에서 멈췄습니다
          </p>
        )}
      </div>

      {show && (
        <div className="border-t-2 border-surface-container bg-surface-container-low px-space-md py-3 flex flex-col gap-2.5">
          <Line
            label="기준매출"
            formula={`${won(s.goal)} ÷ 1.1`}
            value={s.base}
            note="목표매출의 10%는 회사사치세"
          />
          <Line label="판매" formula={`${won(s.base)} × 32%`} value={s.sale} />
          <Line
            label="정착"
            formula={s.settle > 0 ? "3살부터 붙는 10만원" : "3살부터 (아직 없음)"}
            value={s.settle}
            muted={s.settle === 0}
          />
          <Line
            label="달성"
            formula={
              s.age < 4
                ? "4살부터 (아직 없음)"
                : s.capped
                  ? `${won(s.base)} × ${s.rate * 100}% = ${won(s.achieveRaw)} → 극점 ${capLabel}`
                  : `${won(s.base)} × ${s.rate * 100}%`
            }
            value={s.achieve}
            muted={s.age < 4}
            warn={s.capped}
          />

          <div className="border-t-2 border-surface-container pt-2.5 flex items-center justify-between">
            <span className="text-[19px] font-extrabold text-on-surface">산출</span>
            <span className="text-[21px] font-extrabold text-on-surface num-font">{won(s.gross)}원</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[18px] font-semibold text-on-surface-variant">
              세금 −{(WITHHOLD * 100).toFixed(1)}%
            </span>
            <span className="text-[18px] font-semibold text-on-surface-variant num-font">
              −{won(s.gross - s.net)}원
            </span>
          </div>
          <div className="flex items-center justify-between bg-secondary-container rounded-xl px-3 py-2.5">
            <span className="text-[19px] font-extrabold text-on-secondary-container">실지급</span>
            <span className="text-[22px] font-extrabold text-on-secondary-container num-font">
              {won(s.net)}원
            </span>
          </div>
        </div>
      )}
    </article>
  );
}

function Line({
  label,
  formula,
  value,
  note,
  muted,
  warn,
}: {
  label: string;
  formula: string;
  value: number;
  note?: string;
  muted?: boolean;
  warn?: boolean;
}) {
  return (
    <div className={muted ? "opacity-50" : ""}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[19px] font-bold text-on-surface shrink-0">{label}</span>
        <span
          className={`text-[20px] font-extrabold num-font ${warn ? "text-tertiary" : "text-on-surface"}`}
        >
          {won(value)}원
        </span>
      </div>
      <p className="text-[16px] text-on-surface-variant font-semibold num-font">{formula}</p>
      {note && <p className="text-[15px] text-outline font-semibold">{note}</p>}
    </div>
  );
}
