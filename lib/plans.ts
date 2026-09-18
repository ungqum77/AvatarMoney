import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { plans } from "@/lib/db/schema";
import type { PlanType } from "@/lib/points";

export interface PlanDTO {
  id: number;
  name: string;
  planType: PlanType;
  rounds: number[];
  allowZero: boolean;
  updatedAt: number | null;
  createdAt: number;
}

function toDTO(row: typeof plans.$inferSelect): PlanDTO {
  let rounds: number[] = [];
  try {
    const parsed = JSON.parse(row.roundsJson);
    if (Array.isArray(parsed)) rounds = parsed.map((n) => Number(n) || 0);
  } catch {
    rounds = [];
  }
  return {
    id: row.id,
    name: row.name,
    planType: (row.planType === "won11" ? "won11" : "won33") as PlanType,
    rounds,
    allowZero: row.allowZero === 1,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
  };
}

export async function getPlansForUser(userId: number): Promise<PlanDTO[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(plans)
    .where(eq(plans.userId, userId))
    .orderBy(desc(plans.updatedAt), desc(plans.createdAt));
  return rows.map(toDTO);
}

export async function getPlan(userId: number, id: number): Promise<PlanDTO | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(plans)
    .where(and(eq(plans.id, id), eq(plans.userId, userId)))
    .limit(1);
  return rows[0] ? toDTO(rows[0]) : null;
}

export async function createPlan(
  userId: number,
  data: { name: string; planType: PlanType; rounds: number[]; allowZero?: boolean }
): Promise<PlanDTO> {
  const db = getDb();
  const now = Date.now();
  const inserted = await db
    .insert(plans)
    .values({
      userId,
      name: data.name.slice(0, 60) || "새 플랜",
      planType: data.planType,
      roundsJson: JSON.stringify(data.rounds),
      allowZero: data.allowZero ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return toDTO(inserted[0]);
}

export async function updatePlan(
  userId: number,
  id: number,
  data: Partial<{ name: string; planType: PlanType; rounds: number[]; allowZero: boolean }>
): Promise<PlanDTO | null> {
  const db = getDb();
  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  if (data.name !== undefined) patch.name = data.name.slice(0, 60) || "새 플랜";
  if (data.planType !== undefined) patch.planType = data.planType;
  if (data.rounds !== undefined) patch.roundsJson = JSON.stringify(data.rounds);
  if (data.allowZero !== undefined) patch.allowZero = data.allowZero ? 1 : 0;
  const updated = await db
    .update(plans)
    .set(patch)
    .where(and(eq(plans.id, id), eq(plans.userId, userId)))
    .returning();
  return updated[0] ? toDTO(updated[0]) : null;
}

export async function deletePlan(userId: number, id: number): Promise<boolean> {
  const db = getDb();
  const res = await db
    .delete(plans)
    .where(and(eq(plans.id, id), eq(plans.userId, userId)))
    .returning({ id: plans.id });
  return res.length > 0;
}
