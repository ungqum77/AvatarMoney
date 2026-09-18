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
  roundsJson: text("rounds_json").notNull(), // JSON: number[] (회차별 목표금액)
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

export type User = typeof users.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Session = typeof sessions.$inferSelect;
