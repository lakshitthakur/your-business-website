import { createServerFn } from "@tanstack/react-start";
import { getDB, generateId, getNextAgreementNo } from "@/lib/db";
import { z } from "zod";

const customerSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().min(1),
  dob: z.string().optional(),
  licence_number: z.string().optional(),
  licence_expiry: z.string().optional(),
  licence_state: z.string().optional(),
  licence_country: z.string().default("Australia"),
  residential_address: z.string().optional(),
  suburb: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  parking_address: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  entity_name: z.string().optional(),
  entity_abn: z.string().optional(),
  entity_type: z.string().optional(),
  authorised_person: z.string().optional(),
  authorised_position: z.string().optional(),
  entity_email: z.string().optional(),
  entity_phone: z.string().optional(),
  entity_address: z.string().optional(),
  entity_licence_number: z.string().optional(),
  entity_licence_expiry: z.string().optional(),
  entity_licence_state: z.string().optional(),
  entity_licence_country: z.string().default("Australia"),
  is_director: z.boolean().default(false),
});

export const createCustomer = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof customerSchema>) => customerSchema.parse(data))
  .handler(async ({ data }) => {
    const db = getDB();
    const id = generateId();
    await db
      .prepare(
        `INSERT INTO customers (id, first_name, last_name, email, phone, dob, licence_number, licence_expiry, licence_state, licence_country, residential_address, suburb, state, postcode, parking_address, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, entity_name, entity_abn, entity_type, authorised_person, authorised_position, entity_email, entity_phone, entity_address, entity_licence_number, entity_licence_expiry, entity_licence_state, entity_licence_country, is_director) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        data.first_name,
        data.last_name,
        data.email || null,
        data.phone,
        data.dob || null,
        data.licence_number || null,
        data.licence_expiry || null,
        data.licence_state || null,
        data.licence_country,
        data.residential_address || null,
        data.suburb || null,
        data.state || null,
        data.postcode || null,
        data.parking_address || null,
        data.emergency_contact_name || null,
        data.emergency_contact_relationship || null,
        data.emergency_contact_phone || null,
        data.entity_name || null,
        data.entity_abn || null,
        data.entity_type || null,
        data.authorised_person || null,
        data.authorised_position || null,
        data.entity_email || null,
        data.entity_phone || null,
        data.entity_address || null,
        data.entity_licence_number || null,
        data.entity_licence_expiry || null,
        data.entity_licence_state || null,
        data.entity_licence_country,
        data.is_director ? 1 : 0
      )
      .run();
    return { id };
  });

export const getCustomer = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const db = getDB();
    const result = await db.prepare("SELECT * FROM customers WHERE id = ?").bind(data.id).first();
    return result;
  });

export const listCustomers = createServerFn({ method: "GET" })
  .validator((data: { search?: string; limit?: number; offset?: number }) => data || {})
  .handler(async ({ data }) => {
    const db = getDB();
    const limit = data.limit || 50;
    const offset = data.offset || 0;

    if (data.search) {
      const search = `%${data.search}%`;
      const result = await db
        .prepare(
          `SELECT * FROM customers WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
        )
        .bind(search, search, search, search, limit, offset)
        .all();
      return result.results;
    }

    const result = await db
      .prepare("SELECT * FROM customers ORDER BY created_at DESC LIMIT ? OFFSET ?")
      .bind(limit, offset)
      .all();
    return result.results;
  });
