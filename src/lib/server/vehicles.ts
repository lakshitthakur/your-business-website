import { createServerFn } from "@tanstack/react-start";
import { getDB, generateId } from "@/lib/db";
import { z } from "zod";

const vehicleSchema = z.object({
  vehicle_type: z.enum(["car", "suv", "van", "truck"]),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  registration: z.string().optional(),
  description: z.string().optional(),
  weekly_price: z.number().min(0).default(0),
  bond: z.number().min(0).default(0),
  km_allowance: z.number().int().min(0).default(0),
  extra_km_rate: z.number().min(0).default(0),
  excess_amount: z.number().min(0).default(0),
  clearance: z.string().optional(),
  roadside_cover: z.boolean().default(true),
  status: z.enum(["Available", "Reserved", "Active", "Maintenance", "Unavailable"]).default("Available"),
  available: z.boolean().default(true),
});

export const createVehicle = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof vehicleSchema>) => vehicleSchema.parse(data))
  .handler(async ({ data }) => {
    const db = getDB();
    const id = generateId();
    await db
      .prepare(
        `INSERT INTO vehicles (id, vehicle_type, make, model, year, registration, description, weekly_price, bond, km_allowance, extra_km_rate, excess_amount, clearance, roadside_cover, status, available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        data.vehicle_type,
        data.make,
        data.model,
        data.year,
        data.registration || null,
        data.description || null,
        data.weekly_price,
        data.bond,
        data.km_allowance,
        data.extra_km_rate,
        data.excess_amount,
        data.clearance || null,
        data.roadside_cover ? 1 : 0,
        data.status,
        data.available ? 1 : 0
      )
      .run();
    return { id };
  });

export const updateVehicle = createServerFn({ method: "POST" })
  .validator((data: { id: string } & Partial<z.infer<typeof vehicleSchema>>) => data)
  .handler(async ({ data }) => {
    const db = getDB();
    const { id, ...fields } = data;
    const updates: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(typeof value === "boolean" ? (value ? 1 : 0) : value);
      }
    }

    if (updates.length === 0) return { success: true };

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await db
      .prepare(`UPDATE vehicles SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();
    return { success: true };
  });

export const getVehicle = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const db = getDB();
    const result = await db.prepare("SELECT * FROM vehicles WHERE id = ?").bind(data.id).first();
    return result;
  });

export const listVehicles = createServerFn({ method: "GET" })
  .validator(
    (data: { status?: string; vehicle_type?: string; available?: boolean; search?: string; limit?: number; offset?: number }) =>
      data || {}
  )
  .handler(async ({ data }) => {
    const db = getDB();
    const conditions: string[] = [];
    const params: any[] = [];

    if (data.status) {
      conditions.push("status = ?");
      params.push(data.status);
    }
    if (data.vehicle_type) {
      conditions.push("vehicle_type = ?");
      params.push(data.vehicle_type);
    }
    if (data.available !== undefined) {
      conditions.push("available = ?");
      params.push(data.available ? 1 : 0);
    }
    if (data.search) {
      conditions.push("(make LIKE ? OR model LIKE ? OR registration LIKE ?)");
      const s = `%${data.search}%`;
      params.push(s, s, s);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = data.limit || 50;
    const offset = data.offset || 0;

    const result = await db
      .prepare(`SELECT * FROM vehicles ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .bind(...params, limit, offset)
      .all();
    return result.results;
  });

export const deleteVehicle = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const db = getDB();
    await db.prepare("DELETE FROM vehicles WHERE id = ?").bind(data.id).run();
    return { success: true };
  });
