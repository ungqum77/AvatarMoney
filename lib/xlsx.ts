// ============================================================================
// 아주 작은 .xlsx 만들기 — 표 하나짜리 엑셀 파일을 브라우저에서 바로 만든다
// ============================================================================
//
// xlsx 는 XML 몇 장을 zip 으로 묶은 것이다. 표 한 장만 내보내면 되는데
// SheetJS(400KB+) 를 들이면 앱이 그만큼 무거워진다. 어르신 휴대폰에서
// 첫 화면이 늦어지는 값이 엑셀 한 번 받는 값보다 크다.
//
// 압축은 하지 않는다(store). 표가 커봐야 수십 KB 라 압축이 필요 없고,
// deflate 를 직접 넣으면 그게 또 코드 덩어리가 된다.

/** 셀에 넣을 수 있는 값. 숫자는 숫자로 들어가야 엑셀에서 합계가 된다. */
export type Cell = string | number | null;

export interface SheetSpec {
  /** 시트 이름. 엑셀 제한대로 31자까지, : \ / ? * [ ] 는 못 쓴다 */
  name: string;
  rows: Cell[][];
  /** 열 너비(엑셀 기준 글자 수). 안 주면 기본 너비 */
  cols?: number[];
  /** 굵게 그릴 행 번호 (0부터) */
  boldRows?: number[];
}

// ── XML ─────────────────────────────────────────────────────────────────────

/** XML 에서 뜻을 갖는 글자를 바꾼다. 엑셀이 못 읽는 제어문자는 털어낸다. */
function esc(s: string): string {
  return s
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 0 → "A", 25 → "Z", 26 → "AA" */
export function colName(i: number): string {
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/** 엑셀이 시트 이름으로 못 받는 글자를 걷어내고 31자로 자른다 */
function safeSheetName(name: string): string {
  const s = name.replace(/[:\\/?*[\]]/g, " ").trim().slice(0, 31);
  return s || "Sheet1";
}

// 셀 서식(styles.xml 의 cellXfs 차례)
//   0 = 보통 / 1 = 굵게 / 2 = 숫자(#,##0) / 3 = 굵은 숫자
const S_PLAIN = 0;
const S_BOLD = 1;
const S_NUM = 2;
const S_NUM_BOLD = 3;

function sheetXml(spec: SheetSpec): string {
  const bold = new Set(spec.boldRows ?? []);

  const cols = spec.cols?.length
    ? `<cols>${spec.cols
        .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
        .join("")}</cols>`
    : "";

  const rows = spec.rows
    .map((cells, r) => {
      const isBold = bold.has(r);
      const body = cells
        .map((v, c) => {
          if (v === null || v === undefined || v === "") return "";
          const ref = `${colName(c)}${r + 1}`;
          if (typeof v === "number" && Number.isFinite(v)) {
            return `<c r="${ref}" s="${isBold ? S_NUM_BOLD : S_NUM}"><v>${v}</v></c>`;
          }
          const s = isBold ? S_BOLD : S_PLAIN;
          return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(
            String(v)
          )}</t></is></c>`;
        })
        .join("");
      return `<row r="${r + 1}">${body}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${rows}</sheetData></worksheet>`;
}

// 굵게 한 벌, 숫자 서식 한 벌만 있으면 된다.
// fills 는 엑셀이 앞의 둘(none·gray125)을 반드시 요구한다.
const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="3" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

function workbookXml(sheetName: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
}

// ── ZIP (압축 없이 담기만) ──────────────────────────────────────────────────

let CRC_TABLE: Uint32Array | null = null;
function crcTable(): Uint32Array {
  if (CRC_TABLE) return CRC_TABLE;
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  CRC_TABLE = t;
  return t;
}

function crc32(buf: Uint8Array): number {
  const t = crcTable();
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** zip 은 1980년식 날짜·시간을 2바이트씩 담는다 */
function dosDateTime(d: Date): { date: number; time: number } {
  return {
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
  };
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

function zipStore(entries: ZipEntry[], now: Date): Uint8Array {
  const { date, time } = dosDateTime(now);
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const e of entries) {
    const nameBytes = new TextEncoder().encode(e.name);
    const crc = crc32(e.data);
    const size = e.data.length;

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // 로컬 헤더 표식
    lv.setUint16(4, 20, true); // 필요한 버전 2.0
    lv.setUint16(6, 0x0800, true); // 이름이 UTF-8 이라고 알린다
    lv.setUint16(8, 0, true); // 압축 안 함
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    parts.push(local, e.data);

    const cd = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true); // 중앙 목록 표식
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true); // 이 파일의 로컬 헤더 위치
    cd.set(nameBytes, 46);
    central.push(cd);

    offset += local.length + size;
  }

  const centralSize = central.reduce((a, b) => a + b.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); // 끝 표식
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const all = [...parts, ...central, eocd];
  const total = all.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of all) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

// ── 만들기 ──────────────────────────────────────────────────────────────────

/** 표 한 장짜리 .xlsx 파일의 알맹이를 만든다 */
export function buildXlsx(spec: SheetSpec, now: Date = new Date()): Uint8Array {
  const enc = new TextEncoder();
  const name = safeSheetName(spec.name);
  return zipStore(
    [
      { name: "[Content_Types].xml", data: enc.encode(CONTENT_TYPES_XML) },
      { name: "_rels/.rels", data: enc.encode(ROOT_RELS_XML) },
      { name: "xl/workbook.xml", data: enc.encode(workbookXml(name)) },
      { name: "xl/_rels/workbook.xml.rels", data: enc.encode(WORKBOOK_RELS_XML) },
      { name: "xl/styles.xml", data: enc.encode(STYLES_XML) },
      { name: "xl/worksheets/sheet1.xml", data: enc.encode(sheetXml(spec)) },
    ],
    now
  );
}

/** 파일 이름에 못 쓰는 글자를 걷어낸다 */
export function safeFileName(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim().slice(0, 80) || "파일";
}

/**
 * 만든 .xlsx 를 내려받게 한다. 브라우저에서만 쓴다.
 * 아이폰 사파리는 a[download] 로 '파일' 앱에 저장된다.
 */
export function downloadXlsx(fileName: string, spec: SheetSpec): void {
  const bytes = buildXlsx(spec);
  // Blob 은 ArrayBuffer 를 받는다. 뷰를 그대로 넘기면 타입이 맞지 않으므로
  // 딱 맞는 크기로 한 번 옮겨 담는다(수십 KB 라 부담이 없다).
  const ab = new ArrayBuffer(bytes.length);
  new Uint8Array(ab).set(bytes);
  const blob = new Blob([ab], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.toLowerCase().endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 바로 지우면 사파리에서 저장이 끊기는 일이 있어 한 박자 늦춘다.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
