import { describe, it, expect } from "vitest";
import {
  incomeTax,
  topRate,
  yearTax,
  taxSummary,
  BASIC_DEDUCTION,
  TAX_BRACKETS,
} from "./tax";

/**
 * 흔히 쓰는 '누진공제표'. 구간마다 곱해 더한 값과 여기서 나온 값이 같아야 한다.
 * 세율을 구간별로 계산하는 쪽(tax.ts)과, 표를 보고 계산하는 쪽(여기)이
 * 서로 맞는지 대조한다. 한쪽을 잘못 고치면 바로 드러난다.
 */
const PROGRESSIVE = [
  { upTo: 14_000_000, rate: 0.06, minus: 0 },
  { upTo: 50_000_000, rate: 0.15, minus: 1_260_000 },
  { upTo: 88_000_000, rate: 0.24, minus: 5_760_000 },
  { upTo: 150_000_000, rate: 0.35, minus: 15_440_000 },
  { upTo: 300_000_000, rate: 0.38, minus: 19_940_000 },
  { upTo: 500_000_000, rate: 0.4, minus: 25_940_000 },
  { upTo: 1_000_000_000, rate: 0.42, minus: 35_940_000 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.45, minus: 65_940_000 },
];

function byTable(base: number): number {
  if (base <= 0) return 0;
  const row = PROGRESSIVE.find((r) => base <= r.upTo)!;
  return Math.floor((base * row.rate - row.minus) / 10) * 10;
}

describe("종합소득세 산출세액", () => {
  it("누진공제표로 계산한 값과 같다", () => {
    const cases = [
      1_000_000, 13_999_999, 14_000_000, 14_000_001, 30_000_000, 50_000_000, 50_000_001,
      88_000_000, 120_000_000, 150_000_000, 200_000_000, 300_000_000, 400_000_000,
      500_000_000, 700_000_000, 1_000_000_000, 1_000_000_001, 3_500_000_000,
    ];
    for (const base of cases) {
      expect([base, incomeTax(base)]).toEqual([base, byTable(base)]);
    }
  });

  it("과세표준이 없으면 세금도 없다", () => {
    expect([incomeTax(0), incomeTax(-5), incomeTax(-1_000_000)]).toEqual([0, 0, 0]);
  });

  it("구간 경계에서 세금이 튀지 않는다 (1원 더 벌어 손해 보는 일이 없어야 한다)", () => {
    for (const b of TAX_BRACKETS) {
      if (!Number.isFinite(b.upTo)) continue;
      const before = b.upTo - incomeTax(b.upTo);
      const after = b.upTo + 1_000 - incomeTax(b.upTo + 1_000);
      expect([b.upTo, after >= before]).toEqual([b.upTo, true]);
    }
  });

  it("걸린 구간의 세율을 알려준다", () => {
    expect([
      topRate(0),
      topRate(14_000_000),
      topRate(14_000_001),
      topRate(1_000_000_000),
      topRate(1_000_000_001),
    ]).toEqual([0, 0.06, 0.15, 0.42, 0.45]);
  });
});

describe("한 해치 세금", () => {
  it("공제를 빼고 과세표준을 잡는다", () => {
    const y = yearTax(51_500_000);
    expect([y.deduction, y.taxBase]).toEqual([BASIC_DEDUCTION, 50_000_000]);
  });

  it("소득세 + 지방소득세(소득세의 10%) 를 낸다", () => {
    const y = yearTax(51_500_000);
    const it = incomeTax(50_000_000);
    expect([y.incomeTax, y.localTax, y.totalTax]).toEqual([
      it,
      Math.floor((it * 0.1) / 10) * 10,
      it + Math.floor((it * 0.1) / 10) * 10,
    ]);
  });

  it("이미 낸 3.3% 를 빼고 5월에 더 낼 돈을 낸다", () => {
    const y = yearTax(1_000_000_000);
    expect([y.prepaid, y.due]).toEqual([33_000_000, y.totalTax - 33_000_000]);
  });

  it("10억이면 실제 부담이 40% 를 넘는다 (3.3% 로 끝나지 않는다)", () => {
    const y = yearTax(1_000_000_000);
    expect([y.topRate, y.effectiveRate > 0.4, y.due > 0]).toEqual([0.42, true, true]);
  });

  it("아주 적게 벌면 오히려 돌려받는다", () => {
    // 6% 구간에서는 세금이 (수입−150만)×6%×1.1 이라
    // 수입 300만원 아래여야 원천징수 3.3% 보다 적어져 환급이 난다.
    const y = yearTax(2_000_000);
    expect([y.due < 0, y.takeHome > y.income * 0.967]).toEqual([true, true]);
  });

  it("1,000만원만 벌어도 이미 3.3% 로는 모자라다", () => {
    const y = yearTax(10_000_000);
    expect([y.totalTax, y.prepaid, y.due > 0]).toEqual([561_000, 330_000, true]);
  });

  it("손에 남는 돈 = 수입 − 세금 전부", () => {
    for (const inc of [0, 5_000_000, 100_000_000, 2_000_000_000]) {
      const y = yearTax(inc);
      expect([inc, y.takeHome]).toEqual([inc, inc - y.totalTax]);
    }
  });

  it("수입이 없으면 세금도 0 이다", () => {
    const y = yearTax(0);
    expect([y.totalTax, y.prepaid, y.due, y.takeHome, y.effectiveRate]).toEqual([0, 0, 0, 0, 0]);
  });
});

describe("플랜 전체 세금", () => {
  const incomes = [3_000_000, 0, 120_000_000, 900_000_000];
  const s = taxSummary(incomes);

  it("회차(=해)마다 따로 매긴 뒤 더한다", () => {
    expect(s.years.map((y) => y.totalTax)).toEqual(
      incomes.map((v) => yearTax(v).totalTax)
    );
  });

  it("합계가 각 해의 합과 맞는다", () => {
    expect([s.income, s.totalTax, s.prepaid, s.due, s.takeHome]).toEqual([
      incomes.reduce((a, b) => a + b, 0),
      s.years.reduce((a, y) => a + y.totalTax, 0),
      s.years.reduce((a, y) => a + y.prepaid, 0),
      s.years.reduce((a, y) => a + y.due, 0),
      s.years.reduce((a, y) => a + y.takeHome, 0),
    ]);
  });

  it("한 해에 몰아 받으면 나눠 받을 때보다 세금이 많다", () => {
    const 한번에 = taxSummary([400_000_000]);
    const 나눠서 = taxSummary([100_000_000, 100_000_000, 100_000_000, 100_000_000]);
    expect(한번에.totalTax > 나눠서.totalTax).toBe(true);
  });
});
