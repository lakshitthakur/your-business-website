import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function generateAgreementPDF(agreement: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  let y = height - margin;
  const lineHeight = 14;
  const sectionGap = 20;

  function drawText(text: string, options: { x?: number; y?: number; size?: number; font?: any; color?: any; maxWidth?: number } = {}) {
    const { x = margin, size = 10, font: f = font, color = rgb(0, 0, 0), maxWidth = width - 2 * margin } = options;
    const lines = wrapText(text, f, size, maxWidth);
    for (const line of lines) {
      if (y < margin + 20) {
        const newPage = pdfDoc.addPage([595.28, 841.89]);
        y = newPage.getSize().height - margin;
      }
      page.drawText(line, { x, y, size, font: f, color });
      y -= lineHeight;
    }
  }

  function drawSection(title: string) {
    y -= sectionGap / 2;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    y -= 15;
    drawText(title, { size: 12, font: boldFont });
    y -= 5;
  }

  function drawField(label: string, value: any) {
    if (value === null || value === undefined || value === "") return;
    drawText(`${label}: ${value}`, { size: 9 });
  }

  function wrapText(text: string, f: any, size: number, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = f.widthOfTextAtSize(testLine, size);
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : [""];
  }

  // Header
  drawText("PUNJAB RENTALS", { size: 20, font: boldFont, x: margin });
  y -= 5;
  drawText("Vehicle Rental Agreement", { size: 14, font: boldFont });
  y -= 10;
  drawText(`Agreement No: ${agreement.agreement_no}`, { size: 11, font: boldFont });
  drawText(`Date: ${new Date(agreement.created_at).toLocaleDateString("en-AU")}`, { size: 9 });
  y -= sectionGap;

  // Customer/Business Details
  drawSection("Customer / Business Details");
  if (agreement.hire_type === "business") {
    drawField("Entity Name", agreement.customer?.entity_name);
    drawField("ABN/ACN", agreement.customer?.entity_abn);
    drawField("Authorised Person", agreement.customer?.authorised_person);
    drawField("Position", agreement.customer?.authorised_position);
    drawField("Email", agreement.customer?.entity_email || agreement.customer?.email);
    drawField("Phone", agreement.customer?.entity_phone || agreement.customer?.phone);
    drawField("Address", agreement.customer?.entity_address);
  } else {
    drawField("Name", `${agreement.customer?.first_name} ${agreement.customer?.last_name}`);
    drawField("Email", agreement.customer?.email);
    drawField("Phone", agreement.customer?.phone);
    drawField("DOB", agreement.customer?.dob);
    drawField("Licence No", agreement.customer?.licence_number);
    drawField("Licence Expiry", agreement.customer?.licence_expiry);
    drawField("Licence State", agreement.customer?.licence_state);
    drawField("Address", agreement.customer?.residential_address);
    drawField("Suburb", agreement.customer?.suburb);
    drawField("State", agreement.customer?.state);
    drawField("Postcode", agreement.customer?.postcode);
  }
  drawField("Emergency Contact", agreement.customer?.emergency_contact_name);
  drawField("Emergency Relationship", agreement.customer?.emergency_contact_relationship);
  drawField("Emergency Phone", agreement.customer?.emergency_contact_phone);

  // Vehicle Details
  if (agreement.vehicle) {
    drawSection("Vehicle Details");
    drawField("Registration", agreement.vehicle.registration);
    drawField("Vehicle", `${agreement.vehicle.year} ${agreement.vehicle.make} ${agreement.vehicle.model}`);
    drawField("Type", agreement.vehicle.vehicle_type);
    drawField("Clearance", agreement.vehicle.clearance);
    drawField("Roadside Cover", agreement.vehicle.roadside_cover ? "Yes" : "No");
  }

  // Rental Terms
  drawSection("Rental Terms");
  drawField("Rental Period", agreement.rental_start && agreement.rental_end ? `${agreement.rental_start} to ${agreement.rental_end}` : "TBC");
  drawField("Rental Amount", `$${agreement.rental_amount} / ${agreement.rental_cycle}`);
  drawField("Bond", `$${agreement.bond}`);
  drawField("KM Allowance", agreement.km_allowance ? `${agreement.km_allowance} km` : "Unlimited");
  drawField("Extra KM Rate", agreement.extra_km_rate ? `$${agreement.extra_km_rate} per km` : "N/A");
  drawField("Pickup Odometer", agreement.pickup_odometer);

  // Insurance
  drawSection("Insurance");
  drawField("Age Category", agreement.insurance_age_category);
  drawField("Standard Excess", agreement.standard_excess ? `$${agreement.standard_excess}` : null);
  drawField("Custom Excess", agreement.custom_excess ? `$${agreement.custom_excess}` : null);
  drawField("Total Loss Excess", agreement.total_loss_excess ? `$${agreement.total_loss_excess}` : null);

  // Payment Details
  drawSection("Payment Details");
  drawField("Deposit", `$${agreement.deposit}`);
  drawField("Amount Due at Pickup", `$${agreement.amount_due_pickup}`);
  drawField("Payment Method", agreement.payment_method);
  drawField("Payment Day", agreement.payment_day);
  drawField("Payment Notes", agreement.payment_notes);

  // Terms & Conditions
  if (agreement.terms && agreement.terms.length > 0) {
    drawSection("Terms & Conditions Accepted");
    for (const term of agreement.terms) {
      drawText(`✓ ${term.clause_label || term.clause_key}`, { size: 9 });
    }
  }

  // Signature
  if (agreement.signature) {
    drawSection("Digital Signature");
    drawField("Signer", agreement.signature.signer_name);
    drawField("Signed At", new Date(agreement.signature.signed_at).toLocaleString("en-AU"));
    drawField("Agreement Version", agreement.signature.agreement_version);
    drawField("Terms Version", agreement.signature.terms_version);
  }

  // Footer
  y = margin + 30;
  drawText(`Generated: ${new Date().toLocaleString("en-AU")}`, { size: 8, color: rgb(0.5, 0.5, 0.5) });
  drawText("Punjab Rentals — Truganina & Dandenong South VIC — 0404 115 670", { size: 8, color: rgb(0.5, 0.5, 0.5) });

  return await pdfDoc.save();
}

export async function generateReceiptPDF(payment: any, agreement: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  let y = height - margin;
  const lineHeight = 14;

  function drawText(text: string, options: { x?: number; y?: number; size?: number; font?: any; color?: any } = {}) {
    const { x = margin, size = 10, font: f = font, color = rgb(0, 0, 0) } = options;
    page.drawText(text, { x, y, size, font: f, color });
    y -= lineHeight;
  }

  // Header
  drawText("PUNJAB RENTALS", { size: 20, font: boldFont });
  y -= 5;
  drawText("Payment Receipt", { size: 14, font: boldFont });
  y -= 20;

  drawText(`Receipt Date: ${new Date().toLocaleDateString("en-AU")}`, { size: 10 });
  drawText(`Agreement No: ${agreement.agreement_no}`, { size: 10 });
  y -= 20;

  // Customer
  drawText("Customer Details", { size: 12, font: boldFont });
  y -= 5;
  drawText(`Name: ${agreement.customer?.first_name} ${agreement.customer?.last_name}`, { size: 10 });
  drawText(`Email: ${agreement.customer?.email || "N/A"}`, { size: 10 });
  drawText(`Phone: ${agreement.customer?.phone || "N/A"}`, { size: 10 });
  y -= 20;

  // Vehicle
  if (agreement.vehicle) {
    drawText("Vehicle", { size: 12, font: boldFont });
    y -= 5;
    drawText(`${agreement.vehicle.year} ${agreement.vehicle.make} ${agreement.vehicle.model}`, { size: 10 });
    drawText(`Registration: ${agreement.vehicle.registration || "N/A"}`, { size: 10 });
    y -= 20;
  }

  // Payment Details
  drawText("Payment Details", { size: 12, font: boldFont });
  y -= 5;
  drawText(`Period: ${payment.period_label || "N/A"}`, { size: 10 });
  drawText(`Due Date: ${payment.due_date}`, { size: 10 });
  drawText(`Amount: $${payment.amount}`, { size: 10 });
  drawText(`Paid Amount: $${payment.paid_amount || payment.amount}`, { size: 10, font: boldFont });
  drawText(`Payment Date: ${payment.payment_date || new Date().toLocaleDateString("en-AU")}`, { size: 10 });
  drawText(`Payment Method: ${payment.payment_method || "N/A"}`, { size: 10 });
  drawText(`Transaction Ref: ${payment.transaction_ref || "N/A"}`, { size: 10 });
  y -= 20;

  // Outstanding
  drawText(`Outstanding Balance: $${agreement.outstanding || 0}`, { size: 11, font: boldFont });
  y -= 30;

  // Footer
  y = margin + 30;
  drawText("Thank you for your payment.", { size: 10, color: rgb(0.3, 0.3, 0.3) });
  y -= 10;
  drawText("Punjab Rentals — Truganina & Dandenong South VIC — 0404 115 670", { size: 8, color: rgb(0.5, 0.5, 0.5) });

  return await pdfDoc.save();
}
