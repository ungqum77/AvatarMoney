// 숫자/금액 표시 헬퍼

/** 1234567 → "1,234,567" */
export function won(n: number): string {
  return Math.round(n || 0).toLocaleString("ko-KR");
}

/** 큰 금액을 '만 원' 단위로 축약 표시. 38,500,000 → "3,850만" */
export function manwon(n: number): string {
  const man = Math.round((n || 0) / 10_000);
  return man.toLocaleString("ko-KR");
}

/** 억/만 자동 축약 (프레젠테이션·요약용). 320,000,000 → "3억 2,000만" */
export function shortKRW(n: number): string {
  const v = Math.round(n || 0);
  if (v >= 100_000_000) {
    const eok = Math.floor(v / 100_000_000);
    const man = Math.round((v % 100_000_000) / 10_000);
    return man > 0 ? `${eok}억 ${man.toLocaleString("ko-KR")}만` : `${eok}억`;
  }
  if (v >= 10_000) return `${Math.round(v / 10_000).toLocaleString("ko-KR")}만`;
  return v.toLocaleString("ko-KR");
}

/** 휴대폰 하이픈 포맷 */
export function formatPhone(raw: string): string {
  const d = (raw || "").replace(/[^0-9]/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length < 11) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/** 하이픈 제거(저장/조회용) */
export function normalizePhone(raw: string): string {
  return (raw || "").replace(/[^0-9]/g, "");
}

/**
 * 넣은 돈 대비 몇 배인지. 수익률은 12,000% 씩 나와서 가로로 넘치고
 * 와닿지도 않는다. '123배' 처럼 적는다.
 */
export function multiple(invest: number, net: number): string {
  if (invest <= 0) return "—";
  const x = net / invest;
  if (x < 10) return `${x.toFixed(1)}배`;
  return `${Math.round(x).toLocaleString("ko-KR")}배`;
}

/**
 * 화면의 대표 금액용. 억이 넘어가면 축약한다.
 *   36,190,555,200 → "361억 9,055만"
 * 11자리 숫자는 카드 밖으로 삐져나오고, 어르신이 쉼표를 세어 읽어야 한다.
 * 억 단위 축약이 한국말로 읽는 방식과도 같다.
 */
export function bigWon(n: number): string {
  const v = Math.round(n || 0);
  return Math.abs(v) >= 100_000_000 ? shortKRW(v) : won(v);
}
