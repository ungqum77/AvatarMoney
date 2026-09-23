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

/**
 * 새 플랜의 기본 이름. '홍길동 9월23일 1번' 꼴.
 *
 * 매번 '새 플랜' 이면 목록에서 어느 게 어느 건지 못 알아본다.
 * 누가 언제 만든 것인지 이름에 담고, 같은 날 여러 개를 만들어도
 * 겹치지 않게 뒤 번호를 올린다. 지웠다 다시 만들어도 이미 쓴 번호는
 * 건너뛰므로 같은 이름이 두 개 생기지 않는다.
 *
 * @param userName 로그인한 사람 이름. 없으면 날짜만 쓴다.
 * @param existing 이미 있는 플랜들의 이름과 만든 때
 */
export function suggestPlanName(
  userName: string,
  existing: { name: string; createdAt: number }[],
  now: Date = new Date()
): string {
  const day = `${now.getMonth() + 1}월${now.getDate()}일`;

  const sameDay = (t: number) => {
    const d = new Date(t);
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  // 오늘 만든 개수와, 이미 쓰인 '…9월23일 N번' 중 가장 큰 번호.
  // 둘 중 큰 쪽 다음 번호를 쓴다.
  const madeToday = existing.filter((p) => sameDay(p.createdAt)).length;

  // 이름 끝이 '{오늘 날짜} {숫자}번' 인 것만 번호로 본다.
  // 날짜가 이름에 들어가므로 정규식을 짜맞추는 대신 직접 뜯는다.
  let used = 0;
  for (const p of existing) {
    const t = p.name.trim();
    if (!t.endsWith("번")) continue;
    const body = t.slice(0, -1).trimEnd(); // "홍길동 9월23일 3"
    const cut = body.lastIndexOf(" ");
    if (cut < 0) continue;
    const num = Number(body.slice(cut + 1));
    if (!Number.isInteger(num) || num <= 0) continue;
    if (!body.slice(0, cut).trimEnd().endsWith(day)) continue;
    used = Math.max(used, num);
  }

  const n = Math.max(madeToday, used) + 1;
  const who = userName.trim();
  return `${who ? `${who} ` : ""}${day} ${n}번`;
}
