import { getCloudflareContext } from "@tanstack/react-start/server";

export function getDB() {
  const ctx = getCloudflareContext();
  return ctx.env.DB as D1Database;
}

export function getBucket() {
  const ctx = getCloudflareContext();
  return ctx.env.BUCKET as R2Bucket;
}

export function generateId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function getNextAgreementNo(db: D1Database): Promise<string> {
  const year = new Date().getFullYear();
  const existing = await db
    .prepare("SELECT seq FROM agreement_counter WHERE year = ?")
    .bind(year)
    .first<{ seq: number }>();

  let seq = 1;
  if (existing) {
    seq = existing.seq + 1;
    await db.prepare("UPDATE agreement_counter SET seq = ? WHERE year = ?").bind(seq, year).run();
  } else {
    await db.prepare("INSERT INTO agreement_counter (year, seq) VALUES (?, ?)").bind(year, seq).run();
  }

  return `PR-${year}-${seq.toString().padStart(6, "0")}`;
}
