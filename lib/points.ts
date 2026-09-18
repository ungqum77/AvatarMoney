// ============================================================================
// 수당 계산 엔진 — 이 앱의 유일한 계산 본체
// docs/계산규칙-avatarPoint.md 를 그대로 구현. 값은 points.test.ts 정답표로 고정.
// ============================================================================

// 달성률(배수). 100% = 1.  4~18회차만 유효.
const RATE: Record<number, number> = {
  4: 1, 5: 1, 6: 2, 7: 2, 8: 3, 9: 3, 10: 5, 11: 5,
  12: 10, 13: 20, 14: 50, 15: 100, 16: 300, 17: 1000, 18: 1000,
};

// 극점(cap) = '달성 보너스'의 한 회차 상한 (플랜 유형별)
export const CAP = { won11: 100_000_000, won33: 300_000_000 } as const;

// 원천징수 3.3%
export const WITHHOLD = 0.033;

// 아바타는 18회차까지 생존
export const MAX_AGE = 18;

/**
 * 한 아바타의 나이 k 회차 산출 포인트(세전).
 * @param goal 그 아바타(회차)의 목표금액
 * @param k    아바타 나이(현재회차 − 생성회차 + 1). 1~18만 유효.
 * @param cap  극점(달성 보너스 상한). 플랜 유형별 CAP.won11 / CAP.won33
 */
export function avatarPoint(goal: number, k: number, cap: number): number {
  if (k < 1 || k > MAX_AGE) return 0;
  const B = goal / 1.1; // 기준매출 = 목표 ÷ 1.1 (목표의 10%는 회사사치세)
  let p = B * 0.32; // 판매 (상한 없음)
  if (k >= 3) p += 100_000; // 정착 (3회차부터, 상한 없음)
  if (k >= 4) p += Math.min(B * (RATE[k] ?? 0), cap); // ★ 달성만 극점 상한
  return Math.round(p);
}

/** 실지급(세후) = 산출 × (1 − 3.3%) */
export function netPoint(gross: number): number {
  return Math.round(gross * (1 - WITHHOLD));
}

/** 아바타 한 개의 평생(1~18회차) 세전 합계 */
export function avatarGrossLifetime(goal: number, cap: number): number {
  let sum = 0;
  for (let k = 1; k <= MAX_AGE; k++) sum += avatarPoint(goal, k, cap);
  return sum;
}

/** 아바타 한 개의 평생(1~18회차) 세후(실지급) 합계 */
export function avatarNetLifetime(goal: number, cap: number): number {
  let sum = 0;
  for (let k = 1; k <= MAX_AGE; k++) sum += netPoint(avatarPoint(goal, k, cap));
  return sum;
}

export type PlanType = "won11" | "won33";

export const PLAN_META: Record<
  PlanType,
  { label: string; min: number; step: number; cap: number; capLabel: string }
> = {
  won11: { label: "11만원형", min: 110_000, step: 110_000, cap: CAP.won11, capLabel: "1억" },
  won33: { label: "33만원형", min: 330_000, step: 110_000, cap: CAP.won33, capLabel: "3억" },
};

export interface InflowRow {
  round: number; // 정산 회차 R
  net: number; // 그 회차에 들어오는 실지급 수당 합
  gross: number; // 세전
  cumulative: number; // 누적 실지급
}

export interface PlanSummary {
  totalInvest: number; // 총 투입 = Σ 목표금액
  totalGross: number; // 총 산출(세전)
  totalNet: number; // 총 실지급(세후) — 화면 대표 숫자
  roi: number; // 수익률 % = (net − invest) / invest × 100
  perAvatarNet: number[]; // 각 회차 아바타의 평생 실지급 (시뮬레이터 행 표시용)
  inflow: InflowRow[]; // 회차별 유입(타임라인)
  peakRound: number; // 유입이 가장 큰 회차
}

/**
 * 플랜 전체 집계.
 * @param goals 회차별 목표금액 배열 (index 0 = 1회차). 아바타는 그 회차에 생성.
 * @param cap   플랜 유형 극점
 */
export function planSummary(goals: number[], cap: number): PlanSummary {
  const n = goals.length;
  const totalInvest = goals.reduce((a, b) => a + (b || 0), 0);

  // 각 아바타(회차 c) 평생 실지급/세전
  const perAvatarNet = goals.map((g) => avatarNetLifetime(g, cap));
  const totalNet = perAvatarNet.reduce((a, b) => a + b, 0);
  const totalGross = goals.reduce((a, g) => a + avatarGrossLifetime(g, cap), 0);

  // 회차별 유입: R = 1 .. n + 17 (마지막 아바타가 18회 생존)
  const inflow: InflowRow[] = [];
  let cumulative = 0;
  let peakRound = 1;
  let peakVal = -1;
  const lastR = n + MAX_AGE - 1;
  for (let R = 1; R <= lastR; R++) {
    let net = 0;
    let gross = 0;
    for (let c = 1; c <= Math.min(R, n); c++) {
      const k = R - c + 1;
      if (k >= 1 && k <= MAX_AGE) {
        const g = avatarPoint(goals[c - 1], k, cap);
        gross += g;
        net += netPoint(g);
      }
    }
    cumulative += net;
    inflow.push({ round: R, net, gross, cumulative });
    if (net > peakVal) {
      peakVal = net;
      peakRound = R;
    }
  }

  const roi = totalInvest > 0 ? ((totalNet - totalInvest) / totalInvest) * 100 : 0;

  return { totalInvest, totalGross, totalNet, roi, perAvatarNet, inflow, peakRound };
}
