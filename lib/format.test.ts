import { describe, it, expect } from "vitest";
import { suggestPlanName } from "./format";

const NOW = new Date(2026, 8, 23, 14, 0, 0); // 2026-09-23
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10).getTime();

describe("새 플랜 기본 이름", () => {
  it("이름과 날짜, 첫 번호를 붙인다", () => {
    expect(suggestPlanName("홍길동", [], NOW)).toBe("홍길동 9월23일 1번");
  });

  it("이름이 없으면 날짜만 쓴다", () => {
    expect(suggestPlanName("", [], NOW)).toBe("9월23일 1번");
    expect(suggestPlanName("   ", [], NOW)).toBe("9월23일 1번");
  });

  it("오늘 만든 개수만큼 번호가 올라간다", () => {
    const existing = [
      { name: "아무 이름", createdAt: at(2026, 9, 23) },
      { name: "또 다른 이름", createdAt: at(2026, 9, 23) },
    ];
    expect(suggestPlanName("홍길동", existing, NOW)).toBe("홍길동 9월23일 3번");
  });

  it("어제 만든 것은 세지 않는다", () => {
    const existing = [
      { name: "어제 것", createdAt: at(2026, 9, 22) },
      { name: "그제 것", createdAt: at(2026, 9, 21) },
    ];
    expect(suggestPlanName("홍길동", existing, NOW)).toBe("홍길동 9월23일 1번");
  });

  it("지웠다 다시 만들어도 이미 쓴 번호는 건너뛴다", () => {
    // 1·2·3번을 만들고 앞의 둘을 지운 상태
    const existing = [{ name: "홍길동 9월23일 3번", createdAt: at(2026, 9, 23) }];
    expect(suggestPlanName("홍길동", existing, NOW)).toBe("홍길동 9월23일 4번");
  });

  it("다른 날 번호와는 겹쳐도 상관없다", () => {
    const existing = [{ name: "홍길동 9월22일 7번", createdAt: at(2026, 9, 22) }];
    expect(suggestPlanName("홍길동", existing, NOW)).toBe("홍길동 9월23일 1번");
  });

  it("남이 붙인 비슷한 이름에 걸려 넘어지지 않는다", () => {
    const existing = [
      { name: "9월23일 회식", createdAt: at(2026, 9, 23) },
      { name: "9월23일 2번 플랜(복사본)", createdAt: at(2026, 9, 23) },
    ];
    // 끝이 'N번' 인 것만 번호로 본다 → 오늘 만든 개수 2개가 기준
    expect(suggestPlanName("", existing, NOW)).toBe("9월23일 3번");
  });
});
