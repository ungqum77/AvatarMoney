import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// 회원 (직접 가입: 휴대폰 + 비번 + 이름)
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  phone: text("phone").notNull().unique(), // 로그인 아이디(하이픈 제거 저장)
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
});

// 회원별 명명 플랜
export const plans = sqliteTable("plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  planType: text("plan_type").notNull().default("won33"), // 'won11' | 'won33'
  roundsJson: text("rounds_json").notNull(), // JSON: number[] (회차별 목표매출)
  // 아바타를 0으로(그 회차엔 안 만들기) 잡을 수 있는지. 0=불가 / 1=가능
  allowZero: integer("allow_zero").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
});

// 자체 세션
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), // 세션 토큰(랜덤)
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
});

// 비밀번호 재설정 토큰 (이름+휴대폰 확인에 성공하면 발급, 10분 유효, 1회용)
export const passwordResets = sqliteTable("password_resets", {
  token: text("token").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: integer("expires_at").notNull(),
  usedAt: integer("used_at"),
  createdAt: integer("created_at").notNull(),
});

// 시도 횟수 제한용 기록
export const authAttempts = sqliteTable("auth_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  phone: text("phone").notNull(),
  kind: text("kind").notNull(), // 'reset'
  ok: integer("ok").notNull(), // 0 실패 / 1 성공
  at: integer("at").notNull(),
});

export type User = typeof users.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Session = typeof sessions.$inferSelect;
