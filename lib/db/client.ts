import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

// 지연 초기화: env가 없어도 빌드는 통과하고, 실제 쿼리 시에만 연결한다.
let _db: LibSQLDatabase<typeof schema> | null = null;

export function getDb(): LibSQLDatabase<typeof schema> {
  if (_db) return _db;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    throw new Error(
      "TURSO_DATABASE_URL 이 설정되지 않았습니다. .env.local 을 확인하세요."
    );
  }
  const client = createClient({ url, authToken });
  _db = drizzle(client, { schema });
  return _db;
}

export { schema };
