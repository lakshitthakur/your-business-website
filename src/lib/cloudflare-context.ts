import { AsyncLocalStorage } from "node:async_hooks";

type CloudflareEnv = {
  DB: D1Database;
  BUCKET: R2Bucket;
  ENVIRONMENT?: string;
  [key: string]: unknown;
};

let _env: CloudflareEnv | null = null;

export function setCloudflareContext(env: CloudflareEnv): void {
  _env = env;
}

export function getCloudflareContext(): CloudflareEnv {
  if (!_env) throw new Error("Cloudflare context not available");
  return _env;
}
