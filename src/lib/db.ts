let _db: D1Database | null = null;
let _bucket: R2Bucket | null = null;

export function getDB(): D1Database {
  const env = (globalThis as any).__WORKER_ENV__;
  if (!_db && env?.DB) {
    _db = env.DB;
  }
  if (!_db) {
    throw new Error("getDB() failed: D1 binding not available. Check that the Worker was initialized with env.");
  }
  return _db;
}

export function getBucket(): R2Bucket {
  const env = (globalThis as any).__WORKER_ENV__;
  if (!_bucket && env?.BUCKET) {
    _bucket = env.BUCKET;
  }
  if (!_bucket) {
    throw new Error("getBucket() failed: R2 binding not available. Check that the Worker was initialized with env.");
  }
  return _bucket;
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
