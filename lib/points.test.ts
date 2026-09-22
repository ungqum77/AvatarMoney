import { describe, it, expect } from "vitest";
import {
  avatarPoint,
  netPoint,
  CAP,
  roundDetail,
  planSummary,
  cumulativeSales,
  roundSalesTotal,
  avatarNetLifetime,
  avatarNetInPlan,
  PLAN_HORIZON,
  PLAN_TEMPLATES,
  PLAN_META,
  MAX_AGE,
} from "./points";

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

// ============================================================================
// 개인 회차 기준 아바타 수명
//   "19회차가 되면 제일 처음에 만든 아바타의 수명이 다하고
//    2회차에 만든 아바타가 18회차(18살)가 된다"
// ============================================================================
describe("아바타 수명 — 개인 회차 기준", () => {
  const cap = CAP.won33;
  const goals = Array.from({ length: 18 }, () => 330_000); // 1~18회차에 매회 생성

  it("18회차: 아바타 18개, 1회차 아바타가 18살", () => {
    const d = roundDetail(goals, cap, 18);
    expect(d.shares).toHaveLength(18);
    expect(d.shares[0]).toMatchObject({ bornRound: 1, age: 18 });
    expect(d.shares[17]).toMatchObject({ bornRound: 18, age: 1 });
  });

  it("19회차: 1회차 아바타는 소멸, 2회차 아바타가 18살", () => {
    const d = roundDetail(goals, cap, 19);
    expect(d.shares.some((s) => s.bornRound === 1)).toBe(false); // 소멸
    expect(d.shares[0]).toMatchObject({ bornRound: 2, age: 18 });
    expect(d.shares).toHaveLength(17); // 2~18회차 아바타
  });

  it("회차가 갈수록 가장 오래된 아바타부터 한 개씩 빠진다", () => {
    for (let R = 19; R <= 36; R++) {
      const d = roundDetail(goals, cap, R);
      const oldest = d.shares[0];
      if (!oldest) {
        expect(R).toBeGreaterThan(35); // 18회차 아바타가 35회차까지 산다
        continue;
      }
      // 살아있는 것 중 제일 오래된 아바타는 항상 18살
      expect(oldest.age).toBe(18);
      expect(oldest.bornRound).toBe(R - 17);
    }
  });

  it("35회차가 마지막 수당 — 18회차 아바타의 18살", () => {
    const d35 = roundDetail(goals, cap, 35);
    expect(d35.shares).toHaveLength(1);
    expect(d35.shares[0]).toMatchObject({ bornRound: 18, age: 18 });
    expect(roundDetail(goals, cap, 36).shares).toHaveLength(0);
  });
});

// ============================================================================
// 매출·수당 누계
// ============================================================================
describe("누적매출 / 누적수당", () => {
  const cap = CAP.won33;
  const goals = [330_000, 440_000, 550_000];

  it("이 회차에 넣는 총매출 = 살아있는 아바타들의 목표매출 합", () => {
    // 1회차 110만, 2회차 33만 → 2회차에 넣는 총매출은 143만
    const g = [1_100_000, 330_000];
    expect(roundDetail(g, cap, 1).sales).toBe(1_100_000);
    expect(roundDetail(g, cap, 2).sales).toBe(1_430_000);
    // 3회차엔 새로 안 만들지만 둘 다 살아있으므로 그대로 143만
    expect(roundDetail(g, cap, 3).sales).toBe(1_430_000);
  });

  it("아바타가 소멸하면 그만큼 총매출이 줄어든다", () => {
    const g = [1_100_000, 330_000];
    expect(roundDetail(g, cap, 18).sales).toBe(1_430_000);
    // 19회차에 1회차 아바타(110만)가 18살을 넘겨 빠진다
    expect(roundDetail(g, cap, 19).sales).toBe(330_000);
    expect(roundDetail(g, cap, 20).sales).toBe(0);
  });

  it("roundSalesTotal 은 아바타가 늘수록 쌓인다", () => {
    expect(roundSalesTotal(goals, 1)).toBe(330_000);
    expect(roundSalesTotal(goals, 2)).toBe(770_000);
    expect(roundSalesTotal(goals, 3)).toBe(1_320_000);
    expect(roundSalesTotal(goals, 4)).toBe(1_320_000); // 더 안 만들어도 유지
  });

  it("누적매출은 회차마다의 총매출을 전부 더한 값", () => {
    // 1회차 110만 / 2회차 33만 / 3회차 33만
    //   1회차 총매출 110만
    //   2회차 총매출 110 + 33 = 143만  → 누적 253만
    //   3회차 총매출 110 + 33 + 33 = 176만 → 누적 429만
    const g = [1_100_000, 330_000, 330_000];
    expect(roundSalesTotal(g, 1)).toBe(1_100_000);
    expect(roundSalesTotal(g, 2)).toBe(1_430_000);
    expect(roundSalesTotal(g, 3)).toBe(1_760_000);
    expect(roundDetail(g, cap, 1).cumulativeSales).toBe(1_100_000);
    expect(roundDetail(g, cap, 2).cumulativeSales).toBe(2_530_000);
    expect(roundDetail(g, cap, 3).cumulativeSales).toBe(4_290_000);
  });

  it("아바타를 더 안 만들어도 살아있는 동안은 매 회차 매출을 채운다", () => {
    const g = [1_100_000, 330_000, 330_000];
    // 4회차엔 새 아바타가 없지만 셋 다 살아있으므로 176만을 또 넣는다
    expect(roundSalesTotal(g, 4)).toBe(1_760_000);
    expect(cumulativeSales(g, 4)).toBe(4_290_000 + 1_760_000);
  });

  it("누적수당은 타임라인의 누적값과 같다", () => {
    const summary = planSummary(goals, cap);
    for (const row of summary.inflow) {
      expect(roundDetail(goals, cap, row.round).cumulativeNet).toBe(row.cumulative);
    }
  });

  it("누적수당은 그 회차까지의 회차별 수당을 더한 값", () => {
    let running = 0;
    for (let R = 1; R <= goals.length + MAX_AGE; R++) {
      const d = roundDetail(goals, cap, R);
      running += d.net;
      expect(d.cumulativeNet).toBe(running);
    }
  });

  it("누적수당 − 누적매출", () => {
    for (let R = 1; R <= goals.length + MAX_AGE; R++) {
      const d = roundDetail(goals, cap, R);
      expect(d.netMinusSales).toBe(d.cumulativeNet - d.cumulativeSales);
    }
  });

  it("초반에는 아직 회수 전(음수), 나중에는 수당이 넘어선다(양수)", () => {
    // 1회차: 33만 넣고 92,832 받음 → 아직 237,168 모자람
    const d1 = roundDetail(goals, cap, 1);
    expect(d1.netMinusSales).toBe(92_832 - 330_000);
    expect(d1.netMinusSales).toBeLessThan(0);
    // 마지막 회차에는 수당이 훨씬 크다
    const dLast = roundDetail(goals, cap, goals.length + MAX_AGE - 1);
    expect(dLast.netMinusSales).toBeGreaterThan(0);
  });

  it("마지막 회차의 누적값 = 플랜 전체 합계", () => {
    const summary = planSummary(goals, cap);
    const last = roundDetail(goals, cap, summary.inflow.length);
    expect(last.cumulativeSales).toBe(summary.totalInvest);
    expect(last.cumulativeNet).toBe(summary.totalNet);
  });
});

// ============================================================================
// 손익분기 회차 / 자가충당 회차
// ============================================================================
describe("손익분기 회차", () => {
  const cap = CAP.won33;

  it("누적수당이 누적매출을 처음 따라잡는 회차", () => {
    const goals = Array.from({ length: 18 }, () => 330_000);
    const s = planSummary(goals, cap);
    const be = s.breakEvenRound!;
    expect(be).not.toBeNull();

    // 그 회차에서는 따라잡았고
    const at = roundDetail(goals, cap, be);
    expect(at.cumulativeNet).toBeGreaterThanOrEqual(at.cumulativeSales);
    // 바로 앞 회차에서는 아직이었다
    const before = roundDetail(goals, cap, be - 1);
    expect(before.cumulativeNet).toBeLessThan(before.cumulativeSales);
  });

  it("1회차만 있는 플랜도 언젠가는 손익분기를 넘는다", () => {
    const s = planSummary([330_000], cap);
    expect(s.breakEvenRound).not.toBeNull();
    const d = roundDetail([330_000], cap, s.breakEvenRound!);
    expect(d.cumulativeNet).toBeGreaterThanOrEqual(d.cumulativeSales);
  });

  it("손익분기 전 회차에서는 차액이 음수, 이후에는 0 이상", () => {
    const goals = Array.from({ length: 6 }, () => 330_000);
    const be = planSummary(goals, cap).breakEvenRound!;
    for (let R = 1; R < be; R++) {
      expect(roundDetail(goals, cap, R).netMinusSales).toBeLessThan(0);
    }
    expect(roundDetail(goals, cap, be).netMinusSales).toBeGreaterThanOrEqual(0);
  });
});

describe("자가충당 회차", () => {
  const cap = CAP.won33;

  it("그 회차 수당으로 다음 회차 '총매출' 을 낼 수 있는 첫 회차", () => {
    const goals = Array.from({ length: 18 }, () => 330_000);
    const s = planSummary(goals, cap);
    const sf = s.selfFundRound!;
    expect(sf).not.toBeNull();

    // 그 회차 수당 ≥ 다음 회차에 넣어야 할 총매출(살아있는 아바타 전부)
    expect(s.inflow[sf - 1].net).toBeGreaterThanOrEqual(roundSalesTotal(goals, sf + 1));
    // 앞 회차들은 모자랐다
    for (let R = 1; R < sf; R++) {
      expect(s.inflow[R - 1].net).toBeLessThan(roundSalesTotal(goals, R + 1));
    }
  });

  it("아바타 하나짜리도 그 아바타를 계속 채워야 하므로 자가충당 회차가 있다", () => {
    // 1회차 아바타 하나여도 살아있는 18회차 동안 매 회차 33만을 채워야 한다.
    const sf = planSummary([330_000], cap).selfFundRound!;
    expect(sf).not.toBeNull();
    expect(planSummary([330_000], cap).inflow[sf - 1].net).toBeGreaterThanOrEqual(330_000);
  });

  it("목표매출을 크게 키우면 자가충당이 늦어진다", () => {
    const flat = planSummary(Array.from({ length: 12 }, () => 330_000), cap).selfFundRound!;
    // 회차마다 크게 올리면 따라잡기 더 어렵다
    const rising = planSummary(
      Array.from({ length: 12 }, (_, i) => 330_000 + i * 1_100_000),
      cap
    ).selfFundRound;
    expect(rising === null || rising >= flat).toBe(true);
  });
});

// ============================================================================
// 목표매출 0 = 그 회차엔 아바타를 안 만든다
// ============================================================================
describe("아바타 0 (안 만드는 회차)", () => {
  const cap = CAP.won33;

  it("목표매출 0 이면 어느 나이에서도 수당이 없다", () => {
    for (let k = 1; k <= MAX_AGE; k++) {
      // 가드가 없으면 3살부터 정착 10만원이 붙는다
      expect(avatarPoint(0, k, cap)).toBe(0);
      expect(netPoint(avatarPoint(0, k, cap))).toBe(0);
    }
  });

  it("0인 회차는 아바타 목록에 안 나온다", () => {
    // 1회차 33만 · 2회차 0 · 3회차 33만
    const g = [330_000, 0, 330_000];
    const d = roundDetail(g, cap, 3);
    expect(d.shares.map((s) => s.bornRound)).toEqual([1, 3]);
    expect(d.shares.every((s) => s.goal > 0)).toBe(true);
  });

  it("0인 회차는 총매출에도 안 들어간다", () => {
    const g = [330_000, 0, 330_000];
    expect(roundSalesTotal(g, 1)).toBe(330_000);
    expect(roundSalesTotal(g, 2)).toBe(330_000); // 2회차는 안 만들었다
    expect(roundSalesTotal(g, 3)).toBe(660_000);
  });

  it("0인 회차는 수당에 안 들어간다", () => {
    // 1회차 아바타는 1~18회차(18번), 3회차 아바타는 3~18회차(16번) 받는다
    const withZero = planSummary([330_000, 0, 330_000], cap);
    const manual =
      avatarNetInPlan(330_000, cap, 1) + avatarNetInPlan(330_000, cap, 3);
    expect(withZero.totalNet).toBe(manual);
  });

  it("전부 0이면 매출도 수당도 0", () => {
    const s = planSummary([0, 0, 0], cap);
    expect(s.totalNet).toBe(0);
    expect(s.totalInvest).toBe(0);
    // 매출이 하나도 없으면 본전을 따질 게 없다. 0 >= 0 이라고 1회차로 치면 안 된다.
    expect(s.breakEvenRound).toBeNull();
  });

  it("앞 회차를 0으로 비워두면 본전 회차는 매출이 시작된 뒤에 잡힌다", () => {
    // 1·2회차는 안 만들고 3회차부터 시작
    const s = planSummary([0, 0, 330_000, 330_000], cap);
    expect(s.breakEvenRound).not.toBeNull();
    expect(s.breakEvenRound!).toBeGreaterThanOrEqual(3);
  });

  it("항목 합 = 산출 은 0이 섞여도 유지된다", () => {
    const g = [330_000, 0, 550_000, 0, 440_000];
    for (let R = 1; R <= g.length + MAX_AGE; R++) {
      const d = roundDetail(g, cap, R);
      expect(d.shares.reduce((a, s) => a + s.net, 0)).toBe(d.net);
      for (const s of d.shares) {
        expect(s.sale + s.settle + s.achieve).toBe(s.gross);
      }
    }
  });
});

// ============================================================================
// 1회차(본코드)는 0으로 잡을 수 없다
//   0으로 들어와도 아바타가 하나는 있어야 하므로, 화면과 API 가 최저로 올린다.
//   계산 쪽은 0 을 받으면 그대로 '없음' 으로 다루는지만 확인한다.
// ============================================================================
describe("1회차 본코드", () => {
  const cap = CAP.won33;

  it("1회차가 0이면 아무 수당도 안 나온다 (그래서 화면·API 가 막는다)", () => {
    const s = planSummary([0, 330_000], cap);
    // 2회차 아바타만 남는다
    expect(roundDetail([0, 330_000], cap, 2).shares.map((x) => x.bornRound)).toEqual([2]);
    // 2회차 아바타는 2~18회차(17번)만 받는다
    expect(s.totalNet).toBe(avatarNetInPlan(330_000, cap, 2));
  });

  it("2회차부터는 0으로 비워도 1회차 아바타는 살아있다", () => {
    const g = [330_000, 0, 0, 330_000];
    const d = roundDetail(g, cap, 4);
    expect(d.shares.map((x) => x.bornRound)).toEqual([1, 4]);
    expect(roundSalesTotal(g, 4)).toBe(660_000);
  });
});

// ============================================================================
// 플랜 템플릿 — 금액이 단위에 딱 떨어져야 한다
//   떨어지지 않으면 화면의 보정(clamp)에 걸려 누른 값과 다른 값이 들어간다.
// ============================================================================
describe("플랜 템플릿", () => {
  /** 화면·API 의 보정과 같은 규칙 */
  function normalize(v: number, meta: { min: number; step: number }): number {
    if (v < meta.min) return meta.min;
    const rem = (v - meta.min) % meta.step;
    return rem === 0 ? v : v - rem;
  }

  it("모든 템플릿 금액이 두 유형에서 보정 없이 들어간다", () => {
    for (const tpl of PLAN_TEMPLATES) {
      for (const t of ["won11", "won33"] as const) {
        const meta = PLAN_META[t];
        expect([tpl.label, t, normalize(tpl.first, meta)]).toEqual([tpl.label, t, tpl.first]);
        expect([tpl.label, t, normalize(tpl.rest, meta)]).toEqual([tpl.label, t, tpl.rest]);
      }
    }
  });

  it("사장님이 정한 열한 가지가 1회차 금액 오름차순으로 있다", () => {
    expect(PLAN_TEMPLATES.map((t) => t.label)).toEqual([
      "110 - 33",
      "110 - 55",
      "110 - 110",
      "330 - 110",
      "330 - 165",
      "550 - 110",
      "550 - 165",
      "550 - 330",
      "550 - 550",
      "1100 - 330",
      "1100 - 550",
    ]);
  });

  it("라벨의 숫자와 실제 금액이 일치한다", () => {
    for (const tpl of PLAN_TEMPLATES) {
      const [a, b] = tpl.label.split(" - ").map((s) => Number(s) * 10_000);
      expect([tpl.label, tpl.first, tpl.rest]).toEqual([tpl.label, a, b]);
    }
  });
});

// ============================================================================
// 18회차 기준 — 모든 합계가 1~18회차 안에서만 계산된다
// ============================================================================
describe("18회차 기준", () => {
  const cap = CAP.won33;
  const goals = Array.from({ length: 18 }, () => 330_000);

  it("회차별 유입은 18회차까지만", () => {
    const s = planSummary(goals, cap);
    expect(s.inflow).toHaveLength(PLAN_HORIZON);
    expect(s.inflow[s.inflow.length - 1].round).toBe(18);
  });

  it("회차 수가 적어도 18회차까지 본다 (아바타는 계속 살아있다)", () => {
    const s = planSummary([330_000], cap);
    expect(s.inflow).toHaveLength(18);
    // 1회차 아바타 하나가 18번 받는다
    expect(s.totalNet).toBe(avatarNetLifetime(330_000, cap));
  });

  it("총수당 = 18회차 누적수당", () => {
    const s = planSummary(goals, cap);
    expect(s.totalNet).toBe(s.inflow[17].cumulative);
    expect(s.totalNet).toBe(roundDetail(goals, cap, 18).cumulativeNet);
  });

  it("총매출 = 18회차 누적매출", () => {
    const s = planSummary(goals, cap);
    expect(s.totalInvest).toBe(cumulativeSales(goals, 18));
    expect(s.totalInvest).toBe(roundDetail(goals, cap, 18).cumulativeSales);
  });

  it("아바타별 몫도 18회차 안에서만 — 늦게 만들수록 적게 받는다", () => {
    const s = planSummary(goals, cap);
    // 1회차는 18번, 18회차는 1번
    expect(s.perAvatarNet[0]).toBe(avatarNetInPlan(330_000, cap, 1));
    expect(s.perAvatarNet[17]).toBe(avatarNetInPlan(330_000, cap, 18));
    expect(s.perAvatarNet[17]).toBe(netPoint(avatarPoint(330_000, 1, cap)));
    // 뒤로 갈수록 줄어든다
    for (let i = 1; i < s.perAvatarNet.length; i++) {
      expect(s.perAvatarNet[i]).toBeLessThan(s.perAvatarNet[i - 1]);
    }
    // 아바타별 몫을 더하면 총수당
    expect(s.perAvatarNet.reduce((a, b) => a + b, 0)).toBe(s.totalNet);
  });

  it("1회차 아바타만 18번 꽉 채워 받는다", () => {
    const s = planSummary(goals, cap);
    expect(s.perAvatarNet[0]).toBe(avatarNetLifetime(330_000, cap));
    expect(s.perAvatarNet[1]).toBeLessThan(avatarNetLifetime(330_000, cap));
  });

  it("최고 정산 회차도 18회차 안에서 고른다", () => {
    const s = planSummary(goals, cap);
    expect(s.peakRound).toBeLessThanOrEqual(18);
  });

  it("18회차 안에 못 따라잡으면 손익분기는 없음", () => {
    // 1회차만 크게 잡고 나머지를 계속 키우면 매출이 수당을 계속 앞선다
    const heavy = Array.from({ length: 18 }, (_, i) => 330_000 + i * 3_300_000);
    const s = planSummary(heavy, cap);
    if (s.breakEvenRound !== null) expect(s.breakEvenRound).toBeLessThanOrEqual(18);
  });
});
