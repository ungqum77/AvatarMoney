// ============================================================================
// 종합소득세 어림셈 — 받은 수당에 세금이 얼마나 붙는지
// ============================================================================
//
// 떼고 받는 3.3% 는 세금을 다 낸 것이 아니다. '미리 조금 낸 것'(원천징수)이고,
// 다음 해 5월에 종합소득세로 정산하면서 훨씬 큰 금액을 더 낸다.
// 금액이 커질수록 실제 부담은 40% 를 넘어가는데, 이 앱이 '실지급' 만 보여주면
// 손에 쥘 돈을 크게 잘못 알게 된다.
//
// ── 세운 가정 (화면에도 그대로 적는다) ──────────────────────────────────
//   · 1회차 = 1년. 한 회차에 받은 수당이 그 해 소득 전부다.
//   · 필요경비 0원. 실제로 쓴 경비가 있으면 세금은 이보다 준다.
//     (= 가장 불리한 쪽으로 잡아 실제보다 적게 나오는 일이 없게 한다)
//   · 소득공제는 본인 기본공제 150만원만. 부양가족·연금·보험은 안 넣었다.
//   · 다른 소득은 없다고 본다.
//   · 세액공제(표준세액공제 등)는 넣지 않았다.
//
// 실제 신고는 사람마다 다르다. 이 값은 어림셈이고, 신고는 세무사와 해야 한다.

/** 원천징수 3.3% = 소득세 3% + 지방소득세 0.3% */
export const WITHHOLD_INCOME = 0.03;
export const WITHHOLD_LOCAL = 0.003;

/** 본인 기본공제 */
export const BASIC_DEDUCTION = 1_500_000;

/** 지방소득세 = 산출세액(소득세)의 10% */
export const LOCAL_TAX_RATE = 0.1;

/**
 * 종합소득세 세율 (소득세법 제55조). upTo = 그 구간의 윗끝(이하).
 * 누진공제를 적어두지 않고 구간마다 곱해서 더한다.
 * 누진공제 숫자를 옮겨 적다 틀리면 조용히 어긋나기 때문이다.
 * (tax.test.ts 에서 흔히 쓰는 누진공제표와 맞는지 확인한다)
 *
 * 세율은 바뀐다. 바뀌면 이 표만 고치면 된다.
 */
export const TAX_BRACKETS: { upTo: number; rate: number }[] = [
  { upTo: 14_000_000, rate: 0.06 },
  { upTo: 50_000_000, rate: 0.15 },
  { upTo: 88_000_000, rate: 0.24 },
  { upTo: 150_000_000, rate: 0.35 },
  { upTo: 300_000_000, rate: 0.38 },
  { upTo: 500_000_000, rate: 0.4 },
  { upTo: 1_000_000_000, rate: 0.42 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.45 },
];

/** 국세·지방세는 10원 미만을 버린다 */
function cut10(v: number): number {
  return Math.floor(v / 10) * 10;
}

/** 과세표준에 매기는 산출세액(소득세). 지방소득세는 따로 더한다. */
export function incomeTax(taxBase: number): number {
  if (taxBase <= 0) return 0;
  let tax = 0;
  let from = 0;
  for (const b of TAX_BRACKETS) {
    if (taxBase <= from) break;
    tax += (Math.min(taxBase, b.upTo) - from) * b.rate;
    from = b.upTo;
  }
  return cut10(tax);
}

/** 과세표준이 걸리는 구간의 세율. '몇 % 구간인지' 를 보여주는 데 쓴다. */
export function topRate(taxBase: number): number {
  if (taxBase <= 0) return 0;
  for (const b of TAX_BRACKETS) {
    if (taxBase <= b.upTo) return b.rate;
  }
  return TAX_BRACKETS[TAX_BRACKETS.length - 1].rate;
}

export interface YearTax {
  /** 수입금액(세전 산출 포인트) */
  income: number;
  /** 소득공제 */
  deduction: number;
  /** 과세표준 = 수입금액 − 공제 */
  taxBase: number;
  /** 산출세액(소득세) */
  incomeTax: number;
  /** 지방소득세 = 소득세 × 10% */
  localTax: number;
  /** 내야 할 세금 전부 */
  totalTax: number;
  /** 원천징수로 이미 낸 3.3% */
  prepaid: number;
  /** 5월에 더 낼 돈. 음수면 돌려받는다 */
  due: number;
  /** 세금 다 빼고 손에 남는 돈 */
  takeHome: number;
  /** 걸린 구간의 세율 */
  topRate: number;
  /** 수입 대비 실제로 떼인 비율 (실효세율) */
  effectiveRate: number;
}

/**
 * 한 해치 종합소득세.
 * @param income    그 해 수입금액(세전). 이 앱에서는 한 회차의 산출 포인트 합.
 * @param deduction 소득공제. 기본은 본인 기본공제 150만원.
 */
export function yearTax(income: number, deduction: number = BASIC_DEDUCTION): YearTax {
  const inc = Math.max(0, Math.round(income || 0));
  const base = Math.max(0, inc - deduction);
  const it = incomeTax(base);
  const lt = cut10(it * LOCAL_TAX_RATE);
  const total = it + lt;
  // 3.3% 는 소득세 3% + 지방소득세 0.3% 를 미리 낸 것이다. 둘 다 기납부로 빠진다.
  const prepaid = Math.round(inc * (WITHHOLD_INCOME + WITHHOLD_LOCAL));
  return {
    income: inc,
    deduction,
    taxBase: base,
    incomeTax: it,
    localTax: lt,
    totalTax: total,
    prepaid,
    due: total - prepaid,
    takeHome: inc - total,
    topRate: topRate(base),
    effectiveRate: inc > 0 ? total / inc : 0,
  };
}

export interface TaxSummary {
  /** 해마다의 세금 */
  years: YearTax[];
  /** 수입금액 합 */
  income: number;
  /** 세금 합 (소득세 + 지방소득세) */
  totalTax: number;
  /** 이미 낸 3.3% 합 */
  prepaid: number;
  /** 5월에 더 낼 돈 합 */
  due: number;
  /** 세금 다 빼고 손에 남는 돈 합 */
  takeHome: number;
  /** 수입 대비 실제로 떼인 비율 */
  effectiveRate: number;
}

/**
 * 회차마다의 세전 수입을 받아 전체 세금을 낸다.
 * 1회차 = 1년으로 보므로 회차 하나가 한 해다.
 * 수입이 0인 회차(수당이 없는 해)는 세금도 0이라 그대로 들어간다.
 */
export function taxSummary(
  incomesByRound: number[],
  deduction: number = BASIC_DEDUCTION
): TaxSummary {
  const years = incomesByRound.map((v) => yearTax(v, deduction));
  const sum = (pick: (y: YearTax) => number) => years.reduce((a, y) => a + pick(y), 0);
  const income = sum((y) => y.income);
  const totalTax = sum((y) => y.totalTax);
  return {
    years,
    income,
    totalTax,
    prepaid: sum((y) => y.prepaid),
    due: sum((y) => y.due),
    takeHome: sum((y) => y.takeHome),
    effectiveRate: income > 0 ? totalTax / income : 0,
  };
}
