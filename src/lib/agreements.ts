import { createServerFn } from "@tanstack/react-start";
import { getDB, generateId, getNextAgreementNo } from "@/lib/db";
import { z } from "zod";

const agreementSchema = z.object({
  customer_id: z.string().min(1),
  vehicle_id: z.string().optional(),
  hire_type: z.enum(["individual", "business"]).default("individual"),
  rental_start: z.string().optional(),
  rental_end: z.string().optional(),
  rental_amount: z.number().min(0).default(0),
  rental_cycle: z.string().default("weekly"),
  payment_day: z.number().int().min(1).max(7).default(1),
  bond: z.number().min(0).default(0),
  km_allowance: z.number().int().min(0).default(0),
  extra_km_rate: z.number().min(0).default(0),
  pickup_odometer: z.number().int().optional(),
  deposit: z.number().min(0).default(0),
  amount_due_pickup: z.number().min(0).default(0),
  payment_method: z.string().optional(),
  payment_notes: z.string().optional(),
  insurance_age_category: z.string().optional(),
  standard_excess: z.number().optional(),
  custom_excess: z.number().optional(),
  total_loss_excess: z.number().optional(),
  terms_version: z.string().default("v1"),
  agreement_version: z.string().default("v1"),
  terms: z.array(z.object({ clause_key: z.string(), clause_label: z.string().optional() })).default([]),
  terms_accepted: z.boolean().default(false),
});

export const createAgreement = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof agreementSchema>) => agreementSchema.parse(data))
  .handler(async ({ data }) => {
    const db = getDB();
    const id = generateId();
    const agreement_no = await getNextAgreementNo(db);
    const now = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO rental_agreements (id, agreement_no, customer_id, vehicle_id, hire_type, rental_start, rental_end, rental_amount, rental_cycle, payment_day, bond, km_allowance, extra_km_rate, pickup_odometer, deposit, amount_due_pickup, payment_method, payment_notes, insurance_age_category, standard_excess, custom_excess, total_loss_excess, terms_version, agreement_version, terms_accepted, terms_accepted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        agreement_no,
        data.customer_id,
        data.vehicle_id || null,
        data.hire_type,
        data.rental_start || null,
        data.rental_end || null,
        data.rental_amount,
        data.rental_cycle,
        data.payment_day,
        data.bond,
        data.km_allowance,
        data.extra_km_rate,
        data.pickup_odometer || null,
        data.deposit,
        data.amount_due_pickup,
        data.payment_method || null,
        data.payment_notes || null,
        data.insurance_age_category || null,
        data.standard_excess || null,
        data.custom_excess || null,
        data.total_loss_excess || null,
        data.terms_version,
        data.agreement_version,
        data.terms_accepted ? 1 : 0,
        data.terms_accepted ? now : null
      )
      .run();

    for (const term of data.terms) {
      await db
        .prepare(`INSERT INTO agreement_terms (id, agreement_id, clause_key, clause_label, accepted) VALUES (?, ?, ?, ?, 1)`)
        .bind(generateId(), id, term.clause_key, term.clause_label || null)
        .run();
    }

    await db
      .prepare(`INSERT INTO audit_logs (id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`)
      .bind(generateId(), "agreement_created", "rental_agreement", id, JSON.stringify({ agreement_no }))
      .run();

    return { id, agreement_no };
  });

export const saveSignature = createServerFn({ method: "POST" })
  .validator(
    (data: { agreement_id: string; signer_name: string; signature_data: string; agreement_version?: string; terms_version?: string }) =>
      data
  )
  .handler(async ({ data }) => {
    const db = getDB();
    const id = generateId();
    const now = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO signatures (id, agreement_id, signer_name, signature_data, signed_at, agreement_version, terms_version) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, data.agreement_id, data.signer_name, data.signature_data, now, data.agreement_version || "v1", data.terms_version || "v1")
      .run();

    await db
      .prepare(`UPDATE rental_agreements SET status = 'Pending', updated_at = ? WHERE id = ?`)
      .bind(now, data.agreement_id)
      .run();

    return { id };
  });

export const getAgreement = createServerFn({ method: "GET" })
  .validator((data: { id?: string; agreement_no?: string }) => data)
  .handler(async ({ data }) => {
    const db = getDB();
    let agreement;
    if (data.id) {
      agreement = await db.prepare("SELECT * FROM rental_agreements WHERE id = ?").bind(data.id).first();
    } else if (data.agreement_no) {
      agreement = await db.prepare("SELECT * FROM rental_agreements WHERE agreement_no = ?").bind(data.agreement_no).first();
    }
    if (!agreement) return null;

    const [customer, vehicle, terms, signature, payments, charges, notes, inspections] = await Promise.all([
      db.prepare("SELECT * FROM customers WHERE id = ?").bind((agreement as any).customer_id).first(),
      (agreement as any).vehicle_id
        ? db.prepare("SELECT * FROM vehicles WHERE id = ?").bind((agreement as any).vehicle_id).first()
        : Promise.resolve(null),
      db.prepare("SELECT * FROM agreement_terms WHERE agreement_id = ?").bind((agreement as any).id).all(),
      db.prepare("SELECT * FROM signatures WHERE agreement_id = ?").bind((agreement as any).id).first(),
      db.prepare("SELECT * FROM payments WHERE agreement_id = ? ORDER BY due_date ASC").bind((agreement as any).id).all(),
      db.prepare("SELECT * FROM charges WHERE agreement_id = ? ORDER BY created_at ASC").bind((agreement as any).id).all(),
      db.prepare("SELECT * FROM agreement_notes WHERE agreement_id = ? ORDER BY created_at DESC").bind((agreement as any).id).all(),
      db.prepare("SELECT * FROM inspections WHERE agreement_id = ? ORDER BY inspected_at DESC").bind((agreement as any).id).all(),
    ]);

    return {
      ...agreement,
      customer,
      vehicle,
      terms: terms.results,
      signature,
      payments: payments.results,
      charges: charges.results,
      notes: notes.results,
      inspections: inspections.results,
    };
  });

export const listAgreements = createServerFn({ method: "GET" })
  .validator(
    (data: {
      status?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }) => data || {}
  )
  .handler(async ({ data }) => {
    const db = getDB();
    const conditions: string[] = [];
    const params: any[] = [];

    if (data.status) {
      conditions.push("a.status = ?");
      params.push(data.status);
    }
    if (data.search) {
      conditions.push(
        "(a.agreement_no LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR v.registration LIKE ?)"
      );
      const s = `%${data.search}%`;
      params.push(s, s, s, s, s, s);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = data.limit || 50;
    const offset = data.offset || 0;

    const result = await db
      .prepare(
        `SELECT a.*, c.first_name, c.last_name, c.email, c.phone, v.make, v.model, v.year, v.registration
         FROM rental_agreements a
         LEFT JOIN customers c ON a.customer_id = c.id
         LEFT JOIN vehicles v ON a.vehicle_id = v.id
         ${where}
         ORDER BY a.created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(...params, limit, offset)
      .all();
    return result.results;
  });

export const updateAgreement = createServerFn({ method: "POST" })
  .validator((data: { id: string; [key: string]: any }) => data)
  .handler(async ({ data }) => {
    const db = getDB();
    const { id, ...fields } = data;
    const updates: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && key !== "id") {
        updates.push(`${key} = ?`);
        values.push(typeof value === "boolean" ? (value ? 1 : 0) : value);
      }
    }

    if (updates.length === 0) return { success: true };

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await db
      .prepare(`UPDATE rental_agreements SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();

    await db
      .prepare(`INSERT INTO audit_logs (id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`)
      .bind(generateId(), "agreement_updated", "rental_agreement", id, JSON.stringify(fields))
      .run();

    return { success: true };
  });

export const approveAgreement = createServerFn({ method: "POST" })
  .validator((data: { id: string; vehicle_id?: string; rental_start?: string; rental_end?: string; pickup_odometer?: number }) => data)
  .handler(async ({ data }) => {
    const db = getDB();
    const now = new Date().toISOString();

    await db
      .prepare(
        `UPDATE rental_agreements SET status = 'Approved', vehicle_id = COALESCE(?, vehicle_id), rental_start = COALESCE(?, rental_start), rental_end = COALESCE(?, rental_end), pickup_odometer = COALESCE(?, pickup_odometer), updated_at = ? WHERE id = ?`
      )
      .bind(
        data.vehicle_id || null,
        data.rental_start || null,
        data.rental_end || null,
        data.pickup_odometer || null,
        now,
        data.id
      )
      .run();

    if (data.vehicle_id) {
      await db.prepare(`UPDATE vehicles SET status = 'Reserved', current_renter_id = ?, updated_at = ? WHERE id = ?`).bind(data.id, now, data.vehicle_id).run();
    }

    await db
      .prepare(`INSERT INTO audit_logs (id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`)
      .bind(generateId(), "agreement_approved", "rental_agreement", data.id, JSON.stringify(data))
      .run();

    return { success: true };
  });

export const activateAgreement = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const db = getDB();
    const now = new Date().toISOString();

    const agreement = await db.prepare("SELECT * FROM rental_agreements WHERE id = ?").bind(data.id).first<any>();
    if (!agreement) throw new Error("Agreement not found");

    await db
      .prepare(`UPDATE rental_agreements SET status = 'Active', updated_at = ? WHERE id = ?`)
      .bind(now, data.id)
      .run();

    if (agreement.vehicle_id) {
      await db
        .prepare(`UPDATE vehicles SET status = 'Active', current_renter_id = ?, updated_at = ? WHERE id = ?`)
        .bind(data.id, now, agreement.vehicle_id)
        .run();
    }

    const startDate = new Date(agreement.rental_start);
    const endDate = new Date(agreement.rental_end);
    const weeklyRate = agreement.rental_amount;
    let totalOutstanding = 0;
    let week = 1;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dueDate = current.toISOString().split("T")[0];
      await db
        .prepare(
          `INSERT INTO payments (id, agreement_id, period_label, due_date, amount, status) VALUES (?, ?, ?, ?, ?, 'Pending')`
        )
        .bind(generateId(), data.id, `Week ${week}`, dueDate, weeklyRate)
        .run();
      totalOutstanding += weeklyRate;
      current.setDate(current.getDate() + 7);
      week++;
    }

    await db
      .prepare(`UPDATE rental_agreements SET outstanding = ?, updated_at = ? WHERE id = ?`)
      .bind(totalOutstanding, now, data.id)
      .run();

    await db
      .prepare(`INSERT INTO audit_logs (id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`)
      .bind(generateId(), "agreement_activated", "rental_agreement", data.id, JSON.stringify({ weeks: week - 1, total: totalOutstanding }))
      .run();

    return { success: true, payments_generated: week - 1, total_outstanding: totalOutstanding };
  });

export const addPayment = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id?: string;
      agreement_id: string;
      due_date: string;
      amount: number;
      period_label?: string;
      paid_amount?: number;
      status?: string;
      payment_date?: string;
      payment_method?: string;
      transaction_ref?: string;
      notes?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const db = getDB();
    const now = new Date().toISOString();

    if (data.id) {
      const updates: string[] = [];
      const values: any[] = [];
      if (data.paid_amount !== undefined) { updates.push("paid_amount = ?"); values.push(data.paid_amount); }
      if (data.status) { updates.push("status = ?"); values.push(data.status); }
      if (data.payment_date) { updates.push("payment_date = ?"); values.push(data.payment_date); }
      if (data.payment_method) { updates.push("payment_method = ?"); values.push(data.payment_method); }
      if (data.transaction_ref) { updates.push("transaction_ref = ?"); values.push(data.transaction_ref); }
      if (data.notes) { updates.push("notes = ?"); values.push(data.notes); }
      updates.push("updated_at = ?");
      values.push(now, data.id);

      await db.prepare(`UPDATE payments SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
    } else {
      await db
        .prepare(
          `INSERT INTO payments (id, agreement_id, period_label, due_date, amount, paid_amount, status, payment_date, payment_method, transaction_ref, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          generateId(),
          data.agreement_id,
          data.period_label || null,
          data.due_date,
          data.amount,
          data.paid_amount || 0,
          data.status || "Pending",
          data.payment_date || null,
          data.payment_method || null,
          data.transaction_ref || null,
          data.notes || null
        )
        .run();
    }

    const agreement = await db.prepare("SELECT * FROM rental_agreements WHERE id = ?").bind(data.agreement_id).first<any>();
    if (agreement) {
      const payments = await db.prepare("SELECT * FROM payments WHERE agreement_id = ?").bind(data.agreement_id).all();
      let totalPaid = 0;
      let outstanding = 0;
      for (const p of payments.results as any[]) {
        totalPaid += p.paid_amount || 0;
        if (p.status !== "Waived") outstanding += p.amount - (p.paid_amount || 0);
      }
      await db
        .prepare(`UPDATE rental_agreements SET total_paid = ?, outstanding = ?, updated_at = ? WHERE id = ?`)
        .bind(totalPaid, outstanding, now, data.agreement_id)
        .run();
    }

    return { success: true };
  });

export const addCharge = createServerFn({ method: "POST" })
  .validator((data: { agreement_id: string; description: string; amount: number; charge_type?: string }) => data)
  .handler(async ({ data }) => {
    const db = getDB();
    await db
      .prepare(`INSERT INTO charges (id, agreement_id, description, amount, charge_type) VALUES (?, ?, ?, ?, ?)`)
      .bind(generateId(), data.agreement_id, data.description, data.amount, data.charge_type || "admin")
      .run();
    return { success: true };
  });

export const addNote = createServerFn({ method: "POST" })
  .validator((data: { agreement_id: string; note: string; created_by?: string }) => data)
  .handler(async ({ data }) => {
    const db = getDB();
    await db
      .prepare(`INSERT INTO agreement_notes (id, agreement_id, note, created_by) VALUES (?, ?, ?, ?)`)
      .bind(generateId(), data.agreement_id, data.note, data.created_by || null)
      .run();
    return { success: true };
  });

export const markOverduePayments = createServerFn({ method: "POST" }).handler(async () => {
  const db = getDB();
  const result = await db
    .prepare(`UPDATE payments SET status = 'Overdue', updated_at = datetime('now') WHERE status = 'Pending' AND due_date < date('now')`)
    .run();
  return { updated: result.meta.changes };
});

export const recordReturn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      agreement_id: string;
      return_date: string;
      return_odometer: number;
      return_fuel_level?: string;
      return_damage?: string;
      return_cleaning?: string;
      return_missing_items?: string;
      return_notes?: string;
      bond_status?: string;
      bond_deductions?: number;
    }) => data
  )
  .handler(async ({ data }) => {
    const db = getDB();
    const now = new Date().toISOString();

    const agreement = await db.prepare("SELECT * FROM rental_agreements WHERE id = ?").bind(data.agreement_id).first<any>();
    if (!agreement) throw new Error("Agreement not found");

    const kmUsed = data.return_odometer - (agreement.pickup_odometer || 0);
    let extraKmCharge = 0;
    if (agreement.km_allowance && kmUsed > agreement.km_allowance) {
      extraKmCharge = (kmUsed - agreement.km_allowance) * (agreement.extra_km_rate || 0);
    }

    await db
      .prepare(
        `UPDATE rental_agreements SET status = 'Completed', return_date = ?, return_odometer = ?, return_fuel_level = ?, return_damage = ?, return_cleaning = ?, return_missing_items = ?, return_notes = ?, bond_status = COALESCE(?, bond_status), bond_deductions = COALESCE(?, bond_deductions), updated_at = ? WHERE id = ?`
      )
      .bind(
        data.return_date,
        data.return_odometer,
        data.return_fuel_level || null,
        data.return_damage || null,
        data.return_cleaning || null,
        data.return_missing_items || null,
        data.return_notes || null,
        data.bond_status || null,
        data.bond_deductions || null,
        now,
        data.agreement_id
      )
      .run();

    if (agreement.vehicle_id) {
      await db
        .prepare(`UPDATE vehicles SET status = 'Available', current_renter_id = NULL, updated_at = ? WHERE id = ?`)
        .bind(now, agreement.vehicle_id)
        .run();
    }

    await db
      .prepare(
        `INSERT INTO inspections (id, agreement_id, inspection_type, odometer, fuel_level, damage, cleaning, missing_items, notes, inspected_at) VALUES (?, ?, 'return', ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        generateId(),
        data.agreement_id,
        data.return_odometer,
        data.return_fuel_level || null,
        data.return_damage || null,
        data.return_cleaning || null,
        data.return_missing_items || null,
        data.return_notes || null,
        now
      )
      .run();

    if (extraKmCharge > 0) {
      await db
        .prepare(`INSERT INTO charges (id, agreement_id, description, amount, charge_type) VALUES (?, ?, ?, ?, 'extra_km')`)
        .bind(generateId(), data.agreement_id, `Extra KM charges (${kmUsed}km used, ${agreement.km_allowance}km allowance)`, extraKmCharge)
        .run();
    }

    await db
      .prepare(`INSERT INTO audit_logs (id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`)
      .bind(generateId(), "vehicle_returned", "rental_agreement", data.agreement_id, JSON.stringify({ km_used: kmUsed, extra_km_charge: extraKmCharge }))
      .run();

    return { success: true, km_used: kmUsed, extra_km_charge: extraKmCharge };
  });

export const getDashboardStats = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDB();

  const [
    activeRentals,
    pendingAgreements,
    availableVehicles,
    paymentsDue,
    overduePayments,
    weeklyRevenue,
    outstandingBalance,
    recentAgreements,
    recentPayments,
  ] = await Promise.all([
    db.prepare(`SELECT COUNT(*) as count FROM rental_agreements WHERE status = 'Active'`).first<{ count: number }>(),
    db.prepare(`SELECT COUNT(*) as count FROM rental_agreements WHERE status = 'Pending'`).first<{ count: number }>(),
    db.prepare(`SELECT COUNT(*) as count FROM vehicles WHERE status = 'Available'`).first<{ count: number }>(),
    db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(amount - paid_amount), 0) as total FROM payments WHERE status = 'Pending' AND due_date <= date('now', '+7 days')`).first<{ count: number; total: number }>(),
    db.prepare(`SELECT COUNT(*) as count, COALESCE(SUM(amount - paid_amount), 0) as total FROM payments WHERE status = 'Overdue'`).first<{ count: number; total: number }>(),
    db
      .prepare(
        `SELECT COALESCE(SUM(paid_amount), 0) as total FROM payments WHERE status = 'Paid' AND payment_date >= date('now', '-7 days')`
      )
      .first<{ total: number }>(),
    db.prepare(`SELECT COALESCE(SUM(outstanding), 0) as total FROM rental_agreements WHERE status IN ('Active', 'Approved')`).first<{ total: number }>(),
    db
      .prepare(
        `SELECT a.agreement_no, c.first_name, c.last_name, v.make, v.model, a.status, a.created_at FROM rental_agreements a LEFT JOIN customers c ON a.customer_id = c.id LEFT JOIN vehicles v ON a.vehicle_id = v.id ORDER BY a.created_at DESC LIMIT 5`
      )
      .all(),
    db
      .prepare(
        `SELECT p.*, a.agreement_no, c.first_name, c.last_name FROM payments p LEFT JOIN rental_agreements a ON p.agreement_id = a.id LEFT JOIN customers c ON a.customer_id = c.id ORDER BY p.created_at DESC LIMIT 5`
      )
      .all(),
  ]);

  return {
    active_rentals: activeRentals?.count || 0,
    pending_agreements: pendingAgreements?.count || 0,
    available_vehicles: availableVehicles?.count || 0,
    payments_due: { count: paymentsDue?.count || 0, total: paymentsDue?.total || 0 },
    overdue_payments: { count: overduePayments?.count || 0, total: overduePayments?.total || 0 },
    weekly_revenue: weeklyRevenue?.total || 0,
    outstanding_balance: outstandingBalance?.total || 0,
    recent_agreements: recentAgreements.results,
    recent_payments: recentPayments.results,
  };
});

export const getReports = createServerFn({ method: "GET" })
  .validator(
    (data: {
      type: "weekly_revenue" | "monthly_revenue" | "outstanding" | "overdue" | "vehicle_utilization";
      from?: string;
      to?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const db = getDB();
    const from = data.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const to = data.to || new Date().toISOString().split("T")[0];

    switch (data.type) {
      case "weekly_revenue": {
        const result = await db
          .prepare(
            `SELECT strftime('%Y-W%W', payment_date) as week, SUM(paid_amount) as total, COUNT(*) as count FROM payments WHERE status = 'Paid' AND payment_date BETWEEN ? AND ? GROUP BY week ORDER BY week`
          )
          .bind(from, to)
          .all();
        return result.results;
      }
      case "monthly_revenue": {
        const result = await db
          .prepare(
            `SELECT strftime('%Y-%m', payment_date) as month, SUM(paid_amount) as total, COUNT(*) as count FROM payments WHERE status = 'Paid' AND payment_date BETWEEN ? AND ? GROUP BY month ORDER BY month`
          )
          .bind(from, to)
          .all();
        return result.results;
      }
      case "outstanding": {
        const result = await db
          .prepare(
            `SELECT a.agreement_no, c.first_name, c.last_name, a.outstanding, a.status FROM rental_agreements a LEFT JOIN customers c ON a.customer_id = c.id WHERE a.outstanding > 0 AND a.status IN ('Active', 'Approved') ORDER BY a.outstanding DESC`
          )
          .all();
        return result.results;
      }
      case "overdue": {
        const result = await db
          .prepare(
            `SELECT p.*, a.agreement_no, c.first_name, c.last_name FROM payments p LEFT JOIN rental_agreements a ON p.agreement_id = a.id LEFT JOIN customers c ON a.customer_id = c.id WHERE p.status = 'Overdue' ORDER BY p.due_date ASC`
          )
          .all();
        return result.results;
      }
      case "vehicle_utilization": {
        const result = await db
          .prepare(
            `SELECT v.id, v.make, v.model, v.registration, v.status, COUNT(a.id) as rental_count, COALESCE(SUM(julianday(COALESCE(a.return_date, 'now')) - julianday(a.rental_start)), 0) as rental_days FROM vehicles v LEFT JOIN rental_agreements a ON v.id = a.vehicle_id AND a.status IN ('Active', 'Completed') GROUP BY v.id ORDER BY rental_days DESC`
          )
          .all();
        return result.results;
      }
      default:
        return [];
    }
  });

export const getAuditLogs = createServerFn({ method: "GET" })
  .validator((data: { limit?: number; offset?: number; entity_type?: string }) => data || {})
  .handler(async ({ data }) => {
    const db = getDB();
    const limit = data.limit || 50;
    const offset = data.offset || 0;
    const where = data.entity_type ? `WHERE entity_type = ?` : "";
    const params = data.entity_type ? [data.entity_type, limit, offset] : [limit, offset];
    const result = await db
      .prepare(`SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .bind(...params)
      .all();
    return result.results;
  });

export const getSettings = createServerFn({ method: "GET" })
  .validator((data: { key: string }) => data)
  .handler(async ({ data }) => {
    const db = getDB();
    const result = await db.prepare("SELECT value FROM settings WHERE key = ?").bind(data.key).first<{ value: string }>();
    if (!result) return null;
    try {
      return JSON.parse(result.value);
    } catch {
      return result.value;
    }
  });

export const updateSettings = createServerFn({ method: "POST" })
  .validator((data: { key: string; value: any }) => data)
  .handler(async ({ data }) => {
    const db = getDB();
    await db
      .prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')`)
      .bind(data.key, JSON.stringify(data.value), JSON.stringify(data.value))
      .run();
    return { success: true };
  });
