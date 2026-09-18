import { describe, it, expect } from "vitest";
import { avatarPoint, netPoint, CAP } from "./points";

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
