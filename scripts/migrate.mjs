// Turso에 테이블을 만든다. turso CLI 없이 실행 가능.
//   npm run db:migrate
// drizzle/*.sql 을 파일명 순서대로 전부 실행한다.
// 모든 SQL 이 CREATE TABLE IF NOT EXISTS 라 여러 번 돌려도 안전하다.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";

const ENV_FILE = ".env.local";
const SQL_DIR = "drizzle";

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const value = m[2].trim().replace(/^["'](.*)["']$/, "$1");
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

loadEnv(ENV_FILE);

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error(`\n[실패] TURSO_DATABASE_URL 이 없습니다.`);
  console.error(`  ${ENV_FILE} 파일을 만들고 아래 두 줄을 채워주세요:`);
  console.error(`  TURSO_DATABASE_URL=libsql://<DB이름>-<계정>.turso.io`);
  console.error(`  TURSO_AUTH_TOKEN=eyJ...\n`);
  process.exit(1);
}

const db = createClient({ url, authToken });
const files = readdirSync(SQL_DIR).filter((f) => f.endsWith(".sql")).sort();

console.log(`DB: ${url}`);
for (const f of files) {
  process.stdout.write(`  ${f} ... `);
  try {
    await db.executeMultiple(readFileSync(join(SQL_DIR, f), "utf8"));
    console.log("완료");
  } catch (e) {
    // SQLite 에는 ADD COLUMN IF NOT EXISTS 가 없다. 이미 있는 컬럼이면 넘어간다.
    if (/duplicate column name/i.test(String(e?.message ?? e))) {
      console.log("이미 적용됨");
    } else {
      throw e;
    }
  }
}

const { rows } = await db.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
);
console.log(`\n현재 테이블: ${rows.map((r) => r.name).join(", ")}`);
for (const t of rows.map((r) => r.name)) {
  const info = await db.execute(`PRAGMA table_info(${t})`);
  console.log(`  - ${t}: ${info.rows.map((c) => c.name).join(", ")}`);
}
