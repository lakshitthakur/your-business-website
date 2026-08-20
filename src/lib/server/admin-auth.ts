import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { getDB, generateId } from "@/lib/db";
import { getRequest, setCookie, getCookie } from "@tanstack/react-start/server";
import { z } from "zod";

const ADMIN_SESSION_COOKIE = "pr_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24;

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "punjab_rentals_salt_v1");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getSession(): { admin_id: string; email: string } | null {
  const request = getRequest();
  if (!request) return null;
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, v.join("=")];
    })
  );
  const sessionCookie = cookies[ADMIN_SESSION_COOKIE];
  if (!sessionCookie) return null;
  try {
    return JSON.parse(atob(sessionCookie));
  } catch {
    return null;
  }
}

function setSession(adminId: string, email: string) {
  const session = btoa(JSON.stringify({ admin_id: adminId, email }));
  setCookie(ADMIN_SESSION_COOKIE, session, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

function clearSession() {
  setCookie(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export const requireAdmin = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const session = getSession();
  if (!session) throw new Error("Unauthorized");
  return next({ context: { adminId: session.admin_id, adminEmail: session.email } });
});

export const adminLogin = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const db = getDB();
    const admin = await db
      .prepare("SELECT * FROM admin_users WHERE email = ?")
      .bind(data.email.toLowerCase().trim())
      .first<any>();
    if (!admin) return { success: false, error: "Invalid email or password" };

    const hash = await hashPassword(data.password);
    if (hash !== admin.password_hash) return { success: false, error: "Invalid email or password" };

    await db
      .prepare("UPDATE admin_users SET last_login = datetime('now') WHERE id = ?")
      .bind(admin.id)
      .run();

    setSession(admin.id, admin.email);
    await db
      .prepare("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)")
      .bind(generateId(), admin.id, "admin_login", "admin_user", admin.id)
      .run();

    return { success: true };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  clearSession();
  return { success: true };
});

export const getAdminSession = createServerFn({ method: "GET" }).handler(async () => {
  const session = getSession();
  if (!session) return null;
  const db = getDB();
  const admin = await db
    .prepare("SELECT id, email, name FROM admin_users WHERE id = ?")
    .bind(session.admin_id)
    .first();
  return admin;
});

export const setupAdmin = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string; name: string }) => data)
  .handler(async ({ data }) => {
    const db = getDB();
    const existing = await db.prepare("SELECT id FROM admin_users LIMIT 1").first();
    if (existing) throw new Error("Admin already exists. Use login.");

    const id = generateId();
    const hash = await hashPassword(data.password);
    await db
      .prepare("INSERT INTO admin_users (id, email, password_hash, name) VALUES (?, ?, ?, ?)")
      .bind(id, data.email.toLowerCase().trim(), hash, data.name)
      .run();

    setSession(id, data.email);
    return { success: true, id };
  });

export const changePassword = createServerFn({ method: "POST" })
  .validator((data: { current_password: string; new_password: string }) => data)
  .handler(async ({ data }) => {
    const session = getSession();
    if (!session) throw new Error("Unauthorized");

    const db = getDB();
    const admin = await db.prepare("SELECT * FROM admin_users WHERE id = ?").bind(session.admin_id).first<any>();
    if (!admin) throw new Error("Admin not found");

    const currentHash = await hashPassword(data.current_password);
    if (currentHash !== admin.password_hash) throw new Error("Current password is incorrect");

    const newHash = await hashPassword(data.new_password);
    await db.prepare("UPDATE admin_users SET password_hash = ? WHERE id = ?").bind(newHash, session.admin_id).run();

    return { success: true };
  });
