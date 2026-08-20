import { createServerFn } from "@tanstack/react-start";
import { getDB, getBucket } from "@/lib/db";
import { generateAgreementPDF, generateReceiptPDF } from "@/lib/pdf";

export const generateAgreementPdf = createServerFn({ method: "GET" })
  .validator((data: { agreement_id: string }) => data)
  .handler(async ({ data }) => {
    const db = getDB();
    const agreement = await db.prepare("SELECT * FROM rental_agreements WHERE id = ?").bind(data.agreement_id).first<any>();
    if (!agreement) throw new Error("Agreement not found");

    const [customer, vehicle, terms, signature] = await Promise.all([
      db.prepare("SELECT * FROM customers WHERE id = ?").bind(agreement.customer_id).first(),
      agreement.vehicle_id ? db.prepare("SELECT * FROM vehicles WHERE id = ?").bind(agreement.vehicle_id).first() : null,
      db.prepare("SELECT * FROM agreement_terms WHERE agreement_id = ?").bind(agreement.id).all(),
      db.prepare("SELECT * FROM signatures WHERE agreement_id = ?").bind(agreement.id).first(),
    ]);

    const fullAgreement = { ...agreement, customer, vehicle, terms: terms.results, signature };
    const pdfBytes = await generateAgreementPDF(fullAgreement);

    const bucket = getBucket();
    const key = `agreements/${agreement.agreement_no}.pdf`;
    await bucket.put(key, pdfBytes, {
      httpMetadata: { contentType: "application/pdf" },
      customMetadata: { agreement_id: agreement.id, agreement_no: agreement.agreement_no },
    });

    return { key, agreement_no: agreement.agreement_no };
  });

export const downloadAgreementPdf = createServerFn({ method: "GET" })
  .validator((data: { agreement_id: string }) => data)
  .handler(async ({ data }) => {
    const db = getDB();
    const agreement = await db.prepare("SELECT * FROM rental_agreements WHERE id = ?").bind(data.agreement_id).first<any>();
    if (!agreement) throw new Error("Agreement not found");

    const [customer, vehicle, terms, signature] = await Promise.all([
      db.prepare("SELECT * FROM customers WHERE id = ?").bind(agreement.customer_id).first(),
      agreement.vehicle_id ? db.prepare("SELECT * FROM vehicles WHERE id = ?").bind(agreement.vehicle_id).first() : null,
      db.prepare("SELECT * FROM agreement_terms WHERE agreement_id = ?").bind(agreement.id).all(),
      db.prepare("SELECT * FROM signatures WHERE agreement_id = ?").bind(agreement.id).first(),
    ]);

    const fullAgreement = { ...agreement, customer, vehicle, terms: terms.results, signature };
    const pdfBytes = await generateAgreementPDF(fullAgreement);

    return {
      pdfBytes: Array.from(pdfBytes),
      filename: `${agreement.agreement_no}.pdf`,
    };
  });

export const downloadReceiptPdf = createServerFn({ method: "GET" })
  .validator((data: { payment_id: string }) => data)
  .handler(async ({ data }) => {
    const db = getDB();
    const payment = await db.prepare("SELECT * FROM payments WHERE id = ?").bind(data.payment_id).first<any>();
    if (!payment) throw new Error("Payment not found");

    const agreement = await db.prepare("SELECT * FROM rental_agreements WHERE id = ?").bind(payment.agreement_id).first<any>();
    if (!agreement) throw new Error("Agreement not found");

    const customer = await db.prepare("SELECT * FROM customers WHERE id = ?").bind(agreement.customer_id).first();
    const vehicle = agreement.vehicle_id ? await db.prepare("SELECT * FROM vehicles WHERE id = ?").bind(agreement.vehicle_id).first() : null;

    const fullAgreement = { ...agreement, customer, vehicle };
    const pdfBytes = await generateReceiptPDF(payment, fullAgreement);

    return {
      pdfBytes: Array.from(pdfBytes),
      filename: `receipt-${agreement.agreement_no}-${payment.period_label || payment.id}.pdf`,
    };
  });
