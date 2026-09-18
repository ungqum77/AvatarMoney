import { describe, it, expect } from "vitest";
import { avatarPoint, netPoint, CAP, roundDetail, planSummary, MAX_AGE } from "./points";

// docs/계산규칙-avatarPoint.md 의 검증 정답표를 그대로 고정.
describe("avatarPoint — 극점 3억(33만형)", () => {
  const cap = CAP.won33;
  const cases: [number, number, number, number][] = [
    // 목표, k, 산출, 실지급
    [330_000, 1, 96_000, 92_832],
    [330_000, 3, 196_000, 189_532],
    [330_000, 4, 496_000, 479_632],
    [330_000, 12, 3_196_000, 3_090_532],
    [330_000, 16, 90_196_000, 87_219_532],
    [330_000, 17, 300_196_000, 290_289_532],
    [330_000, 19, 0, 0],
    [550_000, 4, 760_000, 734_920],
    [1_100_000, 1, 320_000, 309_440],
    [1_100_000, 14, 50_420_000, 48_756_140],
    [1_100_000, 15, 100_420_000, 97_106_140],
    [1_100_000, 16, 300_420_000, 290_506_140],
    [1_100_000, 0, 0, 0],
  ];
  it.each(cases)("goal=%d k=%d → 산출 %d / 실지급 %d", (goal, k, gross, net) => {
    expect(avatarPoint(goal, k, cap)).toBe(gross);
    expect(netPoint(avatarPoint(goal, k, cap))).toBe(net);
  });
});

describe("avatarPoint — 극점 1억(11만형)", () => {
  const cap = CAP.won11;
  it("1,100,000 k16 → 달성 1억 상한 = 100,420,000", () => {
    expect(avatarPoint(1_100_000, 16, cap)).toBe(100_420_000);
  });
  it("330,000 k17 → 달성 1억 상한 = 100,196,000", () => {
    expect(avatarPoint(330_000, 17, cap)).toBe(100_196_000);
  });
  it("330,000 k16 → 1억 미만이라 상한 미적용 = 90,196,000", () => {
    expect(avatarPoint(330_000, 16, cap)).toBe(90_196_000);
  });
});

// ============================================================================
// 회차 상세 — 분해값이 기존 합계와 어긋나면 안 된다
// ============================================================================
describe("roundDetail", () => {
  const cap = CAP.won33;
  // 1~4회차에 아바타를 만드는 플랜
  const goals = [330_000, 440_000, 330_000, 550_000];

  it("모든 회차에서 상세 합계 = 타임라인 유입값", () => {
    const summary = planSummary(goals, cap);
    for (const row of summary.inflow) {
      const d = roundDetail(goals, cap, row.round);
      expect(d.gross).toBe(row.gross);
      expect(d.net).toBe(row.net);
    }
  });

  it("아바타별 실지급을 더하면 그 회차 합계", () => {
    for (let R = 1; R <= goals.length + MAX_AGE; R++) {
      const d = roundDetail(goals, cap, R);
      expect(d.shares.reduce((a, s) => a + s.net, 0)).toBe(d.net);
      expect(d.shares.reduce((a, s) => a + s.gross, 0)).toBe(d.gross);
    }
  });

  it("아바타별 몫은 avatarPoint 와 같다", () => {
    for (let R = 1; R <= goals.length + MAX_AGE; R++) {
      for (const s of roundDetail(goals, cap, R).shares) {
        expect(s.gross).toBe(avatarPoint(s.goal, s.age, cap));
        expect(s.net).toBe(netPoint(s.gross));
      }
    }
  });

  it("살아있는 아바타만 나온다 (나이 1~18)", () => {
    for (let R = 1; R <= goals.length + MAX_AGE + 3; R++) {
      const d = roundDetail(goals, cap, R);
      for (const s of d.shares) {
        expect(s.age).toBeGreaterThanOrEqual(1);
        expect(s.age).toBeLessThanOrEqual(MAX_AGE);
        expect(s.bornRound).toBeLessThanOrEqual(R);
      }
      // 아직 안 만든 아바타는 빠진다
      expect(d.shares.every((s) => s.bornRound <= Math.min(R, goals.length))).toBe(true);
    }
  });

  it("1회차: 1회차 아바타 한 개, 나이 1, 판매만", () => {
    const d = roundDetail(goals, cap, 1);
    expect(d.shares).toHaveLength(1);
    const s = d.shares[0];
    expect(s.bornRound).toBe(1);
    expect(s.age).toBe(1);
    expect(s.settle).toBe(0); // 정착은 3회차부터
    expect(s.rate).toBe(0); // 달성은 4회차부터
    expect(s.gross).toBe(96_000); // 정답표: 330,000 k1 → 96,000
  });

  it("4회차: 아바타 4개가 각각 나이 4·3·2·1", () => {
    const d = roundDetail(goals, cap, 4);
    expect(d.shares.map((s) => s.age)).toEqual([4, 3, 2, 1]);
    expect(d.shares.map((s) => s.bornRound)).toEqual([1, 2, 3, 4]);
  });

  it("계산식 분해: 판매 + 정착 + 달성 = 산출", () => {
    const d = roundDetail([330_000], cap, 12); // k=12, 배수 10
    const s = d.shares[0];
    expect(s.rate).toBe(10);
    expect(s.capped).toBe(false);
    expect(s.sale + s.settle + s.achieve).toBe(s.gross);
    expect(s.gross).toBe(3_196_000); // 정답표
  });

  // 화면에 계산식을 그대로 보여주므로, 어떤 값에서도 항목의 합이
  // 산출액과 정확히 같아야 한다. 1원이라도 어긋나면 틀린 것처럼 보인다.
  it("모든 목표금액·나이에서 항목 합 = 산출 (1원도 안 어긋남)", () => {
    for (const capV of [CAP.won11, CAP.won33]) {
      for (let g = 110_000; g <= 3_300_000; g += 110_000) {
        for (let k = 1; k <= MAX_AGE; k++) {
          const s = roundDetail([g], capV, k).shares[0];
          expect(s.sale + s.settle + s.achieve).toBe(s.gross);
          expect(s.gross).toBe(avatarPoint(g, k, capV));
          expect(Number.isInteger(s.sale)).toBe(true);
          expect(Number.isInteger(s.achieve)).toBe(true);
          expect(Number.isInteger(s.base)).toBe(true);
        }
      }
    }
  });

  it("극점 상한에 잘리면 capped 로 표시된다", () => {
    // 440,000 → 기준매출 400,000. k17 배수 1000 → 달성 원값 4억 > 3억 이라 잘린다.
    const d = roundDetail([440_000], cap, 17);
    const s = d.shares[0];
    expect(s.achieveRaw).toBe(400_000_000);
    expect(s.achieve).toBe(cap);
    expect(s.capped).toBe(true);
    // 판매 128,000 + 정착 100,000 + 달성 3억
    expect(s.gross).toBe(300_228_000);
    expect(s.gross).toBe(avatarPoint(440_000, 17, cap));
  });

  it("달성 원값이 극점과 '같을' 때는 잘린 게 없으므로 capped 아님", () => {
    // 330,000 → 기준매출 300,000. k17 배수 1000 → 정확히 3억.
    const d = roundDetail([330_000], cap, 17);
    const s = d.shares[0];
    expect(s.achieveRaw).toBe(cap);
    expect(s.achieve).toBe(cap);
    expect(s.capped).toBe(false);
    expect(s.gross).toBe(300_196_000); // 정답표
  });

  it("18회차를 넘기면 그 아바타는 빠진다", () => {
    const d = roundDetail([330_000], cap, 19);
    expect(d.shares).toHaveLength(0);
    expect(d.net).toBe(0);
  });
});
