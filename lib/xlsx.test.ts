import { describe, it, expect } from "vitest";
import { buildXlsx, colName, safeFileName } from "./xlsx";

/**
 * zip 을 되읽어서 담긴 파일 이름과 알맹이를 꺼낸다.
 * 압축을 안 했으므로(store) 헤더만 읽으면 그대로 나온다.
 */
function readZip(buf: Uint8Array): Map<string, string> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const dec = new TextDecoder();

  // 끝 표식(EOCD)을 뒤에서부터 찾는다
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  expect(eocd).toBeGreaterThanOrEqual(0);

  const count = dv.getUint16(eocd + 10, true);
  let at = dv.getUint32(eocd + 16, true);
  const out = new Map<string, string>();

  for (let n = 0; n < count; n++) {
    expect(dv.getUint32(at, true)).toBe(0x02014b50); // 중앙 목록 표식
    const size = dv.getUint32(at + 20, true);
    const nameLen = dv.getUint16(at + 28, true);
    const extraLen = dv.getUint16(at + 30, true);
    const commentLen = dv.getUint16(at + 32, true);
    const local = dv.getUint32(at + 42, true);
    const name = dec.decode(buf.subarray(at + 46, at + 46 + nameLen));

    expect(dv.getUint32(local, true)).toBe(0x04034b50); // 로컬 헤더 표식
    const lNameLen = dv.getUint16(local + 26, true);
    const lExtraLen = dv.getUint16(local + 28, true);
    const start = local + 30 + lNameLen + lExtraLen;
    out.set(name, dec.decode(buf.subarray(start, start + size)));

    at += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

describe("xlsx 만들기", () => {
  const book = buildXlsx({
    name: "회차수당표",
    rows: [
      ["플랜", "내 플랜 <A&B>"],
      [],
      ["회차", "수당"],
      [1, 92832],
      [2, 185664],
    ],
    cols: [10, 18],
    boldRows: [0, 2],
  });

  it("zip 으로 열리고 xlsx 가 요구하는 파일이 다 들어있다", () => {
    const files = readZip(book);
    expect(Array.from(files.keys()).sort()).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
    ]);
  });

  it("zip 표식으로 시작한다 (엑셀이 첫 두 글자로 가른다)", () => {
    expect([book[0], book[1]]).toEqual([0x50, 0x4b]); // "PK"
  });

  it("숫자는 숫자로, 글자는 inlineStr 로 들어간다", () => {
    const sheet = readZip(book).get("xl/worksheets/sheet1.xml")!;
    expect(sheet).toContain(`<c r="A4" s="2"><v>1</v></c>`);
    expect(sheet).toContain(`<c r="B4" s="2"><v>92832</v></c>`);
    expect(sheet).toContain(`t="inlineStr"`);
  });

  it("XML 에서 뜻을 갖는 글자를 바꿔둔다", () => {
    const sheet = readZip(book).get("xl/worksheets/sheet1.xml")!;
    expect(sheet).toContain("내 플랜 &lt;A&amp;B&gt;");
  });

  it("굵게 지정한 줄만 굵은 서식을 쓴다", () => {
    const sheet = readZip(book).get("xl/worksheets/sheet1.xml")!;
    expect(sheet).toContain(`<c r="A1" s="1"`); // 굵은 글자
    expect(sheet).toContain(`<c r="A4" s="2"`); // 보통 숫자
    expect(sheet).toContain(`<c r="A3" s="1"`); // 굵은 글자
  });

  it("빈 줄도 행으로 남는다 (줄 번호가 밀리면 표가 어긋난다)", () => {
    const sheet = readZip(book).get("xl/worksheets/sheet1.xml")!;
    expect(sheet).toContain(`<row r="2"></row>`);
    expect(sheet).toContain(`<row r="3">`);
  });

  it("열 너비를 지정하면 cols 로 나간다", () => {
    const sheet = readZip(book).get("xl/worksheets/sheet1.xml")!;
    expect(sheet).toContain(`<col min="1" max="1" width="10" customWidth="1"/>`);
    expect(sheet).toContain(`<col min="2" max="2" width="18" customWidth="1"/>`);
  });

  it("시트 이름에 못 쓰는 글자는 걷어내고 31자로 자른다", () => {
    const odd = buildXlsx({ name: "가/나:다*라".repeat(10), rows: [["x"]] });
    const wb = readZip(odd).get("xl/workbook.xml")!;
    const name = /name="([^"]*)"/.exec(wb)![1];
    expect([name.length <= 31, /[:\\/?*[\]]/.test(name)]).toEqual([true, false]);
  });
});

describe("표 만들기 거들이", () => {
  it("열 이름은 A, Z, AA 순서로 간다", () => {
    expect([colName(0), colName(25), colName(26), colName(27), colName(51), colName(52)]).toEqual([
      "A",
      "Z",
      "AA",
      "AB",
      "AZ",
      "BA",
    ]);
  });

  it("파일 이름에 못 쓰는 글자를 밑줄로 바꾼다", () => {
    expect(safeFileName(`내/플랜:1*2?"<>|`)).toBe("내_플랜_1_2_____");
  });
});
