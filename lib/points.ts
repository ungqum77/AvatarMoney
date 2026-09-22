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
 * 플랜을 보는 기준 회차. 모든 합계(총매출·총수당·수익률·손익분기)가
 * 1~18회차 안에서 계산된다. 18회차에 만든 아바타는 그 뒤로도 살지만
 * 기준 밖이므로 세지 않는다.
 */
export const PLAN_HORIZON = 18;

/**
 * 한 아바타의 나이 k 회차 산출 포인트(세전).
 * @param goal 그 아바타(회차)의 목표금액
 * @param k    아바타 나이(현재회차 − 생성회차 + 1). 1~18만 유효.
 * @param cap  극점(달성 보너스 상한). 플랜 유형별 CAP.won11 / CAP.won33
 */
export function avatarPoint(goal: number, k: number, cap: number): number {
  if (k < 1 || k > MAX_AGE) return 0;
  // 목표매출이 0이면 그 회차에 아바타를 안 만든 것이다.
  // 이 가드가 없으면 3살부터 정착 10만원이 붙어 없는 아바타가 돈을 만든다.
  if (goal <= 0) return 0;
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

/** 나이 k 의 달성률(배수). 100% = 1. 4회차 미만은 0. */
export function achieveRate(k: number): number {
  return RATE[k] ?? 0;
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

/**
 * bornRound 회차에 만든 아바타가 기준 회차(18회차) 안에서 주는 실지급 합.
 * 5회차에 만든 아바타는 5~18회차까지 14번만 받는다. 평생(18번)이 아니다.
 */
export function avatarNetInPlan(
  goal: number,
  cap: number,
  bornRound: number,
  horizon: number = PLAN_HORIZON
): number {
  let sum = 0;
  for (let R = bornRound; R <= horizon; R++) {
    const k = R - bornRound + 1;
    if (k > MAX_AGE) break;
    sum += netPoint(avatarPoint(goal, k, cap));
  }
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

// ============================================================================
// 회차 상세 — 그 회차에 살아있는 아바타 하나하나가 얼마를 주는지, 계산식까지
// ============================================================================

/**
 * 어떤 정산 회차에서 아바타 한 개가 만들어내는 몫 (계산식 분해).
 *
 * 금액은 모두 정수(원)다. 목표÷1.1 이 부동소수점에서 딱 떨어지지 않아
 * (440,000/1.1 = 399999.99999999994) 화면에 그대로 쓰면 지저분하고,
 * 항목을 각각 반올림하면 합이 산출액과 1원 어긋나 계산이 틀린 것처럼 보인다.
 * 그래서 항목을 반올림하되 남는 1원은 가장 큰 항목이 흡수해서
 * 판매 + 정착 + 달성 = 산출 이 화면에서 항상 정확히 맞게 한다.
 */
export interface AvatarShare {
  bornRound: number; // 이 아바타를 만든 회차
  age: number; // 그 회차 기준 아바타 나이 k
  goal: number; // 그 아바타의 목표금액
  base: number; // 기준매출 B = 목표 ÷ 1.1
  sale: number; // 판매 = B × 32%
  settle: number; // 정착 = k≥3 이면 10만
  rate: number; // 달성률 배수 (k≥4 부터)
  achieveRaw: number; // 달성 원값 = B × 배수 (상한 적용 전)
  achieve: number; // 달성 = MIN(원값, 극점)
  capped: boolean; // 극점 상한에 '잘렸는지' (같기만 하면 잘린 게 아니므로 false)
  gross: number; // 산출 포인트(세전) = 판매 + 정착 + 달성
  net: number; // 실지급(세후)
}

/** 한 정산 회차의 전부 */
export interface RoundDetail {
  round: number; // 정산 회차 R
  gross: number; // 그 회차 산출 합(세전)
  net: number; // 그 회차 실지급 합(세후)
  shares: AvatarShare[]; // 살아있는 아바타별 몫 (나이 많은 순 = 먼저 만든 순)

  // 매출(= 그 회차에 넣는 목표매출)과 수당의 누계.
  // 회차마다 아바타를 하나 만드므로 그 회차 매출은 그 회차 목표매출 하나다.
  sales: number; // 이 회차에 넣는 총매출 = 살아있는 아바타들의 목표매출 합
  cumulativeSales: number; // 이 회차까지 새로 만든 아바타들의 목표매출 합
  cumulativeNet: number; // 1회차부터 이 회차까지 받은 실지급 합
  netMinusSales: number; // 누적수당 − 누적매출 (양수면 넣은 돈을 넘어섰다)
}

/**
 * 그 회차에 넣는 총매출 = 그 회차에 살아있는 아바타들의 목표매출 합.
 * 개인 2회차라면 1회차 아바타와 2회차 아바타의 금액을 더한 값이다.
 * 아바타가 18살을 넘겨 소멸하면 그만큼 빠진다.
 */
export function roundSalesTotal(goals: number[], R: number): number {
  let sum = 0;
  for (let c = 1; c <= Math.min(R, goals.length); c++) {
    const k = R - c + 1;
    if (k >= 1 && k <= MAX_AGE) sum += goals[c - 1] || 0;
  }
  return sum;
}

/**
 * 회차 R 까지 넣은 매출 누계 = 회차마다의 총매출을 전부 더한 값.
 * 매 회차 살아있는 아바타 전부의 매출을 채워야 하므로 한 번만 세면 안 된다.
 *   1회차 110만 · 2회차 33만 → 1회차 110만 + 2회차 143만 = 253만
 */
export function cumulativeSales(goals: number[], R: number): number {
  let sum = 0;
  for (let r = 1; r <= R; r++) sum += roundSalesTotal(goals, r);
  return sum;
}

/**
 * 정산 회차 R 에서 살아있는 아바타들이 각각 얼마를 주는지 분해한다.
 * 합계는 planSummary().inflow 의 같은 회차 값과 일치한다.
 */
export function roundDetail(goals: number[], cap: number, R: number): RoundDetail {
  const shares: AvatarShare[] = [];
  let gross = 0;
  let net = 0;

  for (let c = 1; c <= Math.min(R, goals.length); c++) {
    const k = R - c + 1;
    if (k < 1 || k > MAX_AGE) continue; // 아직 없거나 이미 소멸

    const goal = goals[c - 1] || 0;
    if (goal <= 0) continue; // 그 회차엔 아바타를 안 만들었다

    const baseExact = goal / 1.1;
    const rate = k >= 4 ? achieveRate(k) : 0;
    const achieveRawExact = baseExact * rate;
    const achieveExact = k >= 4 ? Math.min(achieveRawExact, cap) : 0;
    const settle = k >= 3 ? 100_000 : 0;

    // 합계는 avatarPoint 를 그대로 쓴다. 분해값 때문에 합계가 흔들리면 안 된다.
    const g = avatarPoint(goal, k, cap);
    const n = netPoint(g);
    gross += g;
    net += n;

    // 화면용 정수. 이중 반올림으로 생기는 차액은 큰 항목이 흡수해서
    // 판매 + 정착 + 달성 = 산출 이 화면에서 항상 맞아떨어지게 한다.
    let sale = Math.round(baseExact * 0.32);
    let achieve = Math.round(achieveExact);
    const drift = g - (sale + settle + achieve);
    if (achieve > 0) achieve += drift;
    else sale += drift;

    shares.push({
      bornRound: c,
      age: k,
      goal,
      base: Math.round(baseExact),
      sale,
      settle,
      rate,
      achieveRaw: Math.round(achieveRawExact),
      achieve,
      // 상한과 '같기만' 하면 잘린 게 없으므로 걸린 것으로 보지 않는다.
      capped: k >= 4 && achieveRawExact > cap + 0.5,
      gross: g,
      net: n,
    });
  }

  // 누적 수당: 1회차부터 R회차까지 각 회차에 들어온 실지급의 합
  let cumNet = 0;
  for (let r = 1; r <= R; r++) {
    for (let c = 1; c <= Math.min(r, goals.length); c++) {
      const k = r - c + 1;
      if (k >= 1 && k <= MAX_AGE) cumNet += netPoint(avatarPoint(goals[c - 1] || 0, k, cap));
    }
  }

  const sales = roundSalesTotal(goals, R);
  const cumSales = cumulativeSales(goals, R);

  return {
    round: R,
    gross,
    net,
    shares,
    sales,
    cumulativeSales: cumSales,
    cumulativeNet: cumNet,
    netMinusSales: cumNet - cumSales,
  };
}

/**
 * 자주 쓰는 조합. 1회차(첫코드)와 2회차부터의 금액을 한 번에 채운다.
 * 금액은 모두 11만원 단위라 11만형·33만형 어느 유형에서도 그대로 떨어진다.
 * (points.test.ts 에서 두 유형 모두 보정 없이 들어가는지 확인한다)
 */
export interface PlanTemplate {
  label: string;
  first: number; // 1회차
  rest: number; // 2회차부터
}

export const PLAN_TEMPLATES: PlanTemplate[] = [
  { label: "110 - 33", first: 1_100_000, rest: 330_000 },
  { label: "110 - 55", first: 1_100_000, rest: 550_000 },
  { label: "110 - 110", first: 1_100_000, rest: 1_100_000 },
  { label: "330 - 110", first: 3_300_000, rest: 1_100_000 },
  { label: "330 - 165", first: 3_300_000, rest: 1_650_000 },
  { label: "550 - 110", first: 5_500_000, rest: 1_100_000 },
  { label: "550 - 165", first: 5_500_000, rest: 1_650_000 },
  { label: "550 - 330", first: 5_500_000, rest: 3_300_000 },
  { label: "550 - 550", first: 5_500_000, rest: 5_500_000 },
  { label: "1100 - 330", first: 11_000_000, rest: 3_300_000 },
  { label: "1100 - 550", first: 11_000_000, rest: 5_500_000 },
];

export interface InflowRow {
  round: number; // 정산 회차 R
  net: number; // 그 회차에 들어오는 실지급 수당 합
  gross: number; // 세전
  cumulative: number; // 누적 실지급
}

export interface PlanSummary {
  totalInvest: number; // 총 투입 = 회차마다의 총매출을 전부 더한 값
  totalGross: number; // 총 산출(세전)
  totalNet: number; // 총 실지급(세후) — 화면 대표 숫자
  roi: number; // 수익률 % = (net − invest) / invest × 100
  perAvatarNet: number[]; // 각 회차 아바타의 평생 실지급 (시뮬레이터 행 표시용)
  inflow: InflowRow[]; // 회차별 유입(타임라인)
  peakRound: number; // 유입이 가장 큰 회차

  /**
   * 손익분기 회차 — 누적수당이 누적매출을 처음으로 따라잡는 회차.
   * 끝까지 못 따라잡으면 null.
   */
  breakEvenRound: number | null;

  /**
   * 자가충당 회차 — 그 회차에 받은 수당만으로 다음 회차 목표매출을
   * 낼 수 있게 되는 첫 회차. 이 회차부터는 주머니에서 더 안 꺼내도 된다.
   * 마지막 회차 뒤에는 넣을 게 없으므로 그 전까지만 본다. 없으면 null.
   */
  selfFundRound: number | null;
}

/**
 * 플랜 전체 집계.
 * @param goals 회차별 목표금액 배열 (index 0 = 1회차). 아바타는 그 회차에 생성.
 * @param cap   플랜 유형 극점
 */
export function planSummary(goals: number[], cap: number): PlanSummary {
  const n = goals.length;
  // 모든 합계는 18회차 기준이다. 18회차에 만든 아바타가 그 뒤로도 살지만
  // 기준 밖이라 세지 않는다.
  const lastR = PLAN_HORIZON;

  // 매 회차 살아있는 아바타 전부의 매출을 채운다. 한 번만 세면 안 된다.
  const totalInvest = cumulativeSales(goals, lastR);

  // 아바타별 몫도 18회차 안에서만 센다. 5회차 아바타는 14번만 받는다.
  const perAvatarNet = goals.map((g, i) => avatarNetInPlan(g, cap, i + 1, lastR));

  // 회차별 유입: R = 1 .. 18
  const inflow: InflowRow[] = [];
  let cumulative = 0;
  let peakRound = 1;
  let peakVal = -1;
  let totalGross = 0;
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
    totalGross += gross;
    inflow.push({ round: R, net, gross, cumulative });
    if (net > peakVal) {
      peakVal = net;
      peakRound = R;
    }
  }

  const totalNet = cumulative;
  const roi = totalInvest > 0 ? ((totalNet - totalInvest) / totalInvest) * 100 : 0;

  // 손익분기 회차: 누적수당이 누적매출을 처음 따라잡는 회차.
  // 아직 매출이 하나도 없으면(0으로 잡은 회차만 지났으면) 따질 게 없다.
  let breakEvenRound: number | null = null;
  for (const row of inflow) {
    const sales = cumulativeSales(goals, row.round);
    if (sales > 0 && row.cumulative >= sales) {
      breakEvenRound = row.round;
      break;
    }
  }

  // 자가충당 회차: 그 회차에 받은 수당으로 다음 회차에 넣어야 할
  // '총매출'(살아있는 아바타 전부의 목표매출 합)을 낼 수 있는 첫 회차.
  // 다음 회차 아바타 하나가 아니라 그 회차에 채워야 하는 전체와 견준다.
  let selfFundRound: number | null = null;
  for (let R = 1; R < inflow.length; R++) {
    const nextTotal = roundSalesTotal(goals, R + 1);
    if (nextTotal > 0 && inflow[R - 1].net >= nextTotal) {
      selfFundRound = R;
      break;
    }
  }

  return {
    totalInvest,
    totalGross,
    totalNet,
    roi,
    perAvatarNet,
    inflow,
    peakRound,
    breakEvenRound,
    selfFundRound,
  };
}
