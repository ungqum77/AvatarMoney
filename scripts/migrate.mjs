// Turso에 테이블을 만든다. turso CLI 없이 실행 가능.
//   npm run db:migrate
// .env.local 의 TURSO_DATABASE_URL / TURSO_AUTH_TOKEN 을 사용한다.
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@libsql/client";

const ENV_FILE = ".env.local";
const SQL_FILE = "drizzle/0000_init.sql";

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
const sql = readFileSync(SQL_FILE, "utf8");

console.log(`DB: ${url}`);
console.log(`SQL: ${SQL_FILE} 실행 중...`);

await db.executeMultiple(sql);

// 결과 확인
const { rows } = await db.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
);
console.log(`\n완료. 현재 테이블: ${rows.map((r) => r.name).join(", ")}`);

for (const t of ["users", "plans", "sessions"]) {
  const info = await db.execute(`PRAGMA table_info(${t})`);
  console.log(`  - ${t}: ${info.rows.map((c) => c.name).join(", ")}`);
}
