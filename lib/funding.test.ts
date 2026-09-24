import { it, expect } from "vitest";
import { planSummary, fundingPlan, roundDetail, CAP, PLAN_HORIZON, MAX_AGE, avatarPoint, netPoint } from "./points";

/** 앱 코드를 안 쓰고 처음부터 다시 짠 검증용 구현 (일부러 다른 방식으로) */
function bruteForce(goals: number[], cap: number) {
  // 회차별 총매출: 살아있는 아바타 전부
  const sales: number[] = [];
  const inflow: number[] = [];
  for (let R = 1; R <= PLAN_HORIZON; R++) {
    let s = 0;
    let n = 0;
    goals.forEach((g, i) => {
      const born = i + 1;
      const age = R - born + 1;
      if (age >= 1 && age <= MAX_AGE) {
        s += g;
        n += netPoint(avatarPoint(g, age, cap));
      }
    });
    sales.push(s);
    inflow.push(n);
  }
  // 지갑을 그대로 흉내낸다
  let wallet = 0;
  let mine = 0;
  const perRound: number[] = [];
  for (let R = 1; R <= PLAN_HORIZON; R++) {
    const need = sales[R - 1];
    let add = 0;
    while (wallet < need) {
      // 모자라면 딱 모자란 만큼 넣는다
      add = need - wallet;
      wallet += add;
    }
    mine += add;
    perRound.push(add);
    wallet -= need;
    wallet += inflow[R - 1];
  }
  const last = perRound.map((p, i) => (p > 0 ? i + 1 : 0)).filter(Boolean).pop() ?? null;
  return { mine, perRound, last, sales, inflow };
}

const rand = (seed: number) => {
  let x = seed;
  return () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
};

it("무작위 플랜 300개에서 앱 계산 = 독립 구현", () => {
  const r = rand(42);
  for (let t = 0; t < 300; t++) {
    const cap = r() < 0.5 ? CAP.won33 : CAP.won11;
    const len = 1 + Math.floor(r() * 18);
    const goals = Array.from({ length: len }, () =>
      r() < 0.15 ? 0 : Math.round(r() * 20) * 110_000
    );
    const bf = bruteForce(goals, cap);
    const fp = fundingPlan(goals, cap);

    expect(fp.totalPocket).toBe(bf.mine);
    expect(fp.rows.map((x) => x.pocket)).toEqual(bf.perRound);
    expect(fp.lastPocketRound).toBe(bf.last);
    // 회차별 총매출·수당도 같은 값이어야 한다
    expect(fp.rows.map((x) => x.sales)).toEqual(bf.sales);
    expect(fp.rows.map((x) => x.net)).toEqual(bf.inflow);
  }
});

it("자립 회차부터 18회차까지 내 돈이 0이다 (무작위 200개)", () => {
  const r = rand(7);
  for (let t = 0; t < 200; t++) {
    const cap = r() < 0.5 ? CAP.won33 : CAP.won11;
    const goals = Array.from({ length: 18 }, () => Math.max(1, Math.round(r() * 30)) * 110_000);
    const fp = fundingPlan(goals, cap);
    if (fp.selfSustainRound === null) {
      // 끝까지 내 돈이 들어갔다면 마지막 회차에도 넣었어야 한다
      expect(fp.lastPocketRound).toBe(PLAN_HORIZON);
      continue;
    }
    for (const row of fp.rows) {
      if (row.round >= fp.selfSustainRound) expect(row.pocket).toBe(0);
    }
    expect(fp.rows[fp.selfSustainRound - 2].pocket).toBeGreaterThan(0);
  }
});

it("planSummary·roundDetail·fundingPlan 이 서로 같은 수를 본다 (무작위 100개)", () => {
  const r = rand(99);
  for (let t = 0; t < 100; t++) {
    const cap = r() < 0.5 ? CAP.won33 : CAP.won11;
    const goals = Array.from({ length: 1 + Math.floor(r() * 18) }, () =>
      Math.round(r() * 20) * 110_000
    );
    const s = planSummary(goals, cap);
    // 수당: funding 의 net = inflow 의 net
    expect(s.funding.rows.map((x) => x.net)).toEqual(s.inflow.map((x) => x.net));
    // 매출: funding 의 sales 누계 = totalInvest
    expect(s.funding.rows.reduce((a, x) => a + x.sales, 0)).toBe(s.totalInvest);
    // 내 돈 ≤ 총매출 누계
    expect(s.funding.totalPocket).toBeLessThanOrEqual(s.totalInvest);
    // roundDetail 과도 일치
    for (let R = 1; R <= PLAN_HORIZON; R++) {
      const d = roundDetail(goals, cap, R);
      expect(d.pocket).toBe(s.funding.rows[R - 1].pocket);
      expect(d.sales).toBe(s.funding.rows[R - 1].sales);
      expect(d.net).toBe(s.funding.rows[R - 1].net);
      expect(d.cumulativePocket).toBe(s.funding.rows[R - 1].cumulativePocket);
    }
  }
});

it("돈이 사라지거나 생기지 않는다 — 넣은 내 돈 + 받은 수당 = 낸 매출 + 남은 돈", () => {
  const goals = Array.from({ length: 18 }, (_, i) => (i === 0 ? 1_100_000 : 330_000));
  const fp = fundingPlan(goals, CAP.won33);
  let inMoney = 0;
  let outMoney = 0;
  for (const row of fp.rows) {
    inMoney += row.pocket + row.net;
    outMoney += row.sales;
  }
  expect(inMoney - outMoney).toBe(fp.rows[PLAN_HORIZON - 1].leftover);
});
