import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createCustomer } from "@/lib/server/customers";
import { createAgreement, saveSignature, getSettings } from "@/lib/server/agreements";
import { downloadAgreementPdf } from "@/lib/server/pdfs";
import { SignaturePad } from "@/components/SignaturePad";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Check, FileText, Download } from "lucide-react";

export const Route = createFileRoute("/rental-agreement")({
  head: () => ({
    meta: [
      { title: "Start Rental Agreement — Punjab Rentals" },
      { name: "description", content: "Complete your vehicle rental agreement with Punjab Rentals." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RentalAgreementPage,
});

const STEPS = [
  { id: "business", label: "Business / Entity" },
  { id: "driver", label: "Driver" },
  { id: "vehicle", label: "Vehicle & Rental" },
  { id: "insurance", label: "Insurance" },
  { id: "terms", label: "Terms" },
  { id: "review", label: "Review" },
  { id: "signature", label: "Signature" },
  { id: "confirmation", label: "Confirmation" },
];

const TERMS_CLAUSES = [
  { key: "interstate", label: "Interstate travel is permitted with prior approval. Vehicle must be returned to VIC." },
  { key: "return_notice", label: "Minimum 7 days notice required for early return. Early return fees may apply." },
  { key: "smoking", label: "No smoking, vaping, or pets allowed in the vehicle. Cleaning fees apply for violations." },
  { key: "bond_refund", label: "Bond will be refunded within 14 days of vehicle return, subject to inspection and outstanding charges." },
  { key: "servicing", label: "All servicing is included and arranged by Punjab Rentals. Customer must make vehicle available." },
  { key: "mechanical_faults", label: "Report any mechanical faults immediately. Do not attempt repairs without authorization." },
  { key: "late_payments", label: "Late payments may incur additional fees. Persistent late payment may result in termination." },
  { key: "lost_keys", label: "Lost keys replacement fee: $350. Customer is responsible for all keys provided." },
  { key: "toll_parking", label: "Toll, parking, and speeding fines are the customer's responsibility. Administration fees apply." },
  { key: "tyre_damage", label: "Tyre damage beyond normal wear is the customer's responsibility." },
  { key: "insurance_excess", label: "Insurance excess applies in the event of an accident or claim. See insurance section for amounts." },
  { key: "accidents", label: "All accidents, hit-and-runs, and damage must be reported to police and Punjab Rentals within 24 hours." },
  { key: "late_charges", label: "Late return charges apply at 1.5x the daily rate. Unauthorized use beyond rental period may result in recovery." },
  { key: "roadside", label: "24/7 roadside assistance is included. Contact Punjab Rentals before arranging any assistance." },
  { key: "cleaning", label: "Vehicle must be returned in clean condition. Excessive cleaning fees may apply." },
  { key: "fuel", label: "Vehicle must be returned with the same fuel level as pickup. Refueling charges apply." },
  { key: "missing_equipment", label: "Customer is responsible for all equipment provided (spare tyre, jack, tools). Replacement fees apply." },
  { key: "car_conditions", label: "Car-specific: No off-road use. No towing without approval. No rideshare without commercial insurance." },
  { key: "truck_conditions", label: "Truck-specific: Do not exceed GVM. Load must be properly secured. Driver must hold appropriate licence." },
];

function RentalAgreementPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [hireType, setHireType] = useState<"individual" | "business">("individual");
  const [submitting, setSubmitting] = useState(false);
  const [agreementId, setAgreementId] = useState<string | null>(null);
  const [agreementNo, setAgreementNo] = useState<string | null>(null);

  const [business, setBusiness] = useState({
    entity_name: "",
    entity_abn: "",
    authorised_person: "",
    authorised_position: "",
    entity_email: "",
    entity_phone: "",
    entity_address: "",
    entity_licence_number: "",
    entity_licence_expiry: "",
    entity_licence_state: "",
    entity_licence_country: "Australia",
    is_director: false,
    parking_address: "",
  });

  const [driver, setDriver] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    dob: "",
    licence_number: "",
    licence_expiry: "",
    licence_state: "",
    licence_country: "Australia",
    residential_address: "",
    suburb: "",
    state: "",
    postcode: "",
    parking_address: "",
    emergency_contact_name: "",
    emergency_contact_relationship: "",
    emergency_contact_phone: "",
  });

  const [rental, setRental] = useState({
    vehicle_id: "",
    rental_start: "",
    rental_end: "",
    rental_amount: 0,
    rental_cycle: "weekly",
    payment_day: 1,
    bond: 0,
    km_allowance: 0,
    extra_km_rate: 0,
    pickup_odometer: 0,
    deposit: 0,
    amount_due_pickup: 0,
    payment_method: "",
    payment_notes: "",
  });

  const [insurance, setInsurance] = useState({
    age_category: "25_to_70",
    standard_excess: 2000,
    custom_excess: 3000,
    total_loss_excess: 5000,
  });

  const [acceptedTerms, setAcceptedTerms] = useState<Record<string, boolean>>({});
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");

  const allTermsAccepted = TERMS_CLAUSES.every((t) => acceptedTerms[t.key]);

  function nextStep() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function prevStep() {
    if (step > 0) setStep(step - 1);
  }

  async function handleSubmit() {
    if (!allTermsAccepted || !signatureData || !signerName) {
      toast.error("Please accept all terms and provide your signature");
      return;
    }

    setSubmitting(true);
    try {
      const customerData = hireType === "business" ? { ...driver, ...business } : driver;
      const { id: customerId } = await createCustomer({ data: customerData as any });

      const terms = TERMS_CLAUSES.filter((t) => acceptedTerms[t.key]).map((t) => ({
        clause_key: t.key,
        clause_label: t.label,
      }));

      const { id, agreement_no } = await createAgreement({
        data: {
          customer_id: customerId,
          vehicle_id: rental.vehicle_id || undefined,
          hire_type: hireType,
          rental_start: rental.rental_start || undefined,
          rental_end: rental.rental_end || undefined,
          rental_amount: rental.rental_amount,
          rental_cycle: rental.rental_cycle,
          payment_day: rental.payment_day,
          bond: rental.bond,
          km_allowance: rental.km_allowance,
          extra_km_rate: rental.extra_km_rate,
          pickup_odometer: rental.pickup_odometer,
          deposit: rental.deposit,
          amount_due_pickup: rental.amount_due_pickup,
          payment_method: rental.payment_method,
          payment_notes: rental.payment_notes,
          insurance_age_category: insurance.age_category,
          standard_excess: insurance.standard_excess,
          custom_excess: insurance.custom_excess,
          total_loss_excess: insurance.total_loss_excess,
          terms_accepted: true,
          terms,
        },
      });

      await saveSignature({
        data: {
          agreement_id: id,
          signer_name: signerName,
          signature_data: signatureData,
        },
      });

      setAgreementId(id);
      setAgreementNo(agreement_no);
      setStep(STEPS.length - 1);
      toast.success("Agreement submitted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit agreement");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownloadPdf() {
    if (!agreementId) return;
    try {
      const result = await downloadAgreementPdf({ data: { agreement_id: agreementId } });
      const blob = new Blob([new Uint8Array(result.pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message || "Failed to download PDF");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-black tracking-tight">
            <span className="bg-[var(--brand-dark)] px-2.5 py-1 text-white">PUNJAB</span>
            <span className="border-2 border-[var(--brand-dark)] px-2.5 py-1 text-[var(--brand-dark)]">RENTALS</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
            ← Back to site
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-black md:text-3xl">Vehicle Rental Agreement</h1>
        <p className="mt-1 text-muted-foreground">Complete all sections to create your rental agreement.</p>

        {/* Progress */}
        <div className="mt-6 mb-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                    i === step
                      ? "bg-primary text-primary-foreground"
                      : i < step
                        ? "bg-green-500 text-white"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs font-medium whitespace-nowrap ${i === step ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && <div className="h-px w-4 bg-border" />}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">Hire Type</h2>
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setHireType("individual")}
                    className={`flex-1 rounded-md border p-4 text-left ${hireType === "individual" ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <div className="font-semibold">Individual Hire</div>
                    <div className="text-sm text-muted-foreground">Personal rental</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHireType("business")}
                    className={`flex-1 rounded-md border p-4 text-left ${hireType === "business" ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <div className="font-semibold">Business Hire</div>
                    <div className="text-sm text-muted-foreground">Company / ABN rental</div>
                  </button>
                </div>
              </div>

              {hireType === "business" && (
                <>
                  <h3 className="text-lg font-bold">Business / Entity Details</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input label="Entity Name" value={business.entity_name} onChange={(v) => setBusiness({ ...business, entity_name: v })} required />
                    <Input label="ABN/ACN" value={business.entity_abn} onChange={(v) => setBusiness({ ...business, entity_abn: v })} />
                    <Input label="Authorised Person" value={business.authorised_person} onChange={(v) => setBusiness({ ...business, authorised_person: v })} required />
                    <Input label="Position" value={business.authorised_position} onChange={(v) => setBusiness({ ...business, authorised_position: v })} />
                    <Input label="Email" type="email" value={business.entity_email} onChange={(v) => setBusiness({ ...business, entity_email: v })} required />
                    <Input label="Phone" value={business.entity_phone} onChange={(v) => setBusiness({ ...business, entity_phone: v })} required />
                    <Input label="Entity Address" value={business.entity_address} onChange={(v) => setBusiness({ ...business, entity_address: v })} className="md:col-span-2" />
                    <Input label="Licence Number" value={business.entity_licence_number} onChange={(v) => setBusiness({ ...business, entity_licence_number: v })} />
                    <Input label="Licence Expiry" type="date" value={business.entity_licence_expiry} onChange={(v) => setBusiness({ ...business, entity_licence_expiry: v })} />
                    <Input label="Issuing State" value={business.entity_licence_state} onChange={(v) => setBusiness({ ...business, entity_licence_state: v })} />
                    <Input label="Country" value={business.entity_licence_country} onChange={(v) => setBusiness({ ...business, entity_licence_country: v })} />
                    <label className="flex items-center gap-2 md:col-span-2">
                      <input type="checkbox" checked={business.is_director} onChange={(e) => setBusiness({ ...business, is_director: e.target.checked })} />
                      <span className="text-sm">I am a Director / Shareholder / Trustee / Decision Maker</span>
                    </label>
                    <Input label="Parking Address" value={business.parking_address} onChange={(v) => setBusiness({ ...business, parking_address: v })} className="md:col-span-2" />
                  </div>
                </>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Driver Details</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="First Name" value={driver.first_name} onChange={(v) => setDriver({ ...driver, first_name: v })} required />
                <Input label="Last Name" value={driver.last_name} onChange={(v) => setDriver({ ...driver, last_name: v })} required />
                <Input label="Email" type="email" value={driver.email} onChange={(v) => setDriver({ ...driver, email: v })} />
                <Input label="Phone" value={driver.phone} onChange={(v) => setDriver({ ...driver, phone: v })} required />
                <Input label="Date of Birth" type="date" value={driver.dob} onChange={(v) => setDriver({ ...driver, dob: v })} />
                <Input label="Licence Number" value={driver.licence_number} onChange={(v) => setDriver({ ...driver, licence_number: v })} required />
                <Input label="Licence Expiry" type="date" value={driver.licence_expiry} onChange={(v) => setDriver({ ...driver, licence_expiry: v })} required />
                <Input label="Issuing State" value={driver.licence_state} onChange={(v) => setDriver({ ...driver, licence_state: v })} required />
                <Input label="Country" value={driver.licence_country} onChange={(v) => setDriver({ ...driver, licence_country: v })} />
                <Input label="Residential Address" value={driver.residential_address} onChange={(v) => setDriver({ ...driver, residential_address: v })} className="md:col-span-2" />
                <Input label="Suburb" value={driver.suburb} onChange={(v) => setDriver({ ...driver, suburb: v })} />
                <Input label="State" value={driver.state} onChange={(v) => setDriver({ ...driver, state: v })} />
                <Input label="Postcode" value={driver.postcode} onChange={(v) => setDriver({ ...driver, postcode: v })} />
                <Input label="Parking Address" value={driver.parking_address} onChange={(v) => setDriver({ ...driver, parking_address: v })} className="md:col-span-2" />
              </div>

              <h3 className="text-lg font-bold">Emergency Contact</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Name" value={driver.emergency_contact_name} onChange={(v) => setDriver({ ...driver, emergency_contact_name: v })} required />
                <Input label="Relationship" value={driver.emergency_contact_relationship} onChange={(v) => setDriver({ ...driver, emergency_contact_relationship: v })} />
                <Input label="Phone" value={driver.emergency_contact_phone} onChange={(v) => setDriver({ ...driver, emergency_contact_phone: v })} required />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Vehicle & Rental Details</h2>
              <p className="text-sm text-muted-foreground">Leave vehicle selection blank if to be assigned by admin.</p>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Rental Start Date" type="date" value={rental.rental_start} onChange={(v) => setRental({ ...rental, rental_start: v })} required />
                <Input label="Rental End Date" type="date" value={rental.rental_end} onChange={(v) => setRental({ ...rental, rental_end: v })} required />
                <Input label="Rental Amount ($)" type="number" value={rental.rental_amount} onChange={(v) => setRental({ ...rental, rental_amount: Number(v) })} required />
                <Select
                  label="Rental Cycle"
                  value={rental.rental_cycle}
                  onChange={(v) => setRental({ ...rental, rental_cycle: v })}
                  options={[
                    { value: "weekly", label: "Weekly" },
                    { value: "fortnightly", label: "Fortnightly" },
                    { value: "monthly", label: "Monthly" },
                  ]}
                />
                <Select
                  label="Payment Day"
                  value={String(rental.payment_day)}
                  onChange={(v) => setRental({ ...rental, payment_day: Number(v) })}
                  options={[
                    { value: "1", label: "Monday" },
                    { value: "2", label: "Tuesday" },
                    { value: "3", label: "Wednesday" },
                    { value: "4", label: "Thursday" },
                    { value: "5", label: "Friday" },
                    { value: "6", label: "Saturday" },
                    { value: "7", label: "Sunday" },
                  ]}
                />
                <Input label="Bond ($)" type="number" value={rental.bond} onChange={(v) => setRental({ ...rental, bond: Number(v) })} />
                <Input label="KM Allowance" type="number" value={rental.km_allowance} onChange={(v) => setRental({ ...rental, km_allowance: Number(v) })} />
                <Input label="Extra KM Rate ($)" type="number" value={rental.extra_km_rate} onChange={(v) => setRental({ ...rental, extra_km_rate: Number(v) })} />
                <Input label="Pickup Odometer (km)" type="number" value={rental.pickup_odometer} onChange={(v) => setRental({ ...rental, pickup_odometer: Number(v) })} />
                <Input label="Deposit ($)" type="number" value={rental.deposit} onChange={(v) => setRental({ ...rental, deposit: Number(v) })} />
                <Input label="Amount Due at Pickup ($)" type="number" value={rental.amount_due_pickup} onChange={(v) => setRental({ ...rental, amount_due_pickup: Number(v) })} />
                <Input label="Payment Method" value={rental.payment_method} onChange={(v) => setRental({ ...rental, payment_method: v })} />
                <Input label="Payment Notes" value={rental.payment_notes} onChange={(v) => setRental({ ...rental, payment_notes: v })} className="md:col-span-2" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Insurance</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Driver Age Category"
                  value={insurance.age_category}
                  onChange={(v) => setInsurance({ ...insurance, age_category: v })}
                  options={[
                    { value: "under_25", label: "Under 25" },
                    { value: "25_to_70", label: "25 - 70" },
                    { value: "over_70", label: "Over 70" },
                  ]}
                />
                <Input label="Standard Excess ($)" type="number" value={insurance.standard_excess} onChange={(v) => setInsurance({ ...insurance, standard_excess: Number(v) })} />
                <Input label="Custom Excess ($)" type="number" value={insurance.custom_excess} onChange={(v) => setInsurance({ ...insurance, custom_excess: Number(v) })} />
                <Input label="Total Loss Excess ($)" type="number" value={insurance.total_loss_excess} onChange={(v) => setInsurance({ ...insurance, total_loss_excess: Number(v) })} />
              </div>
              <div className="rounded-md border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Insurance Conditions</p>
                <ul className="mt-2 space-y-1">
                  <li>• Excess amounts apply per incident</li>
                  <li>• Insurance does not cover unauthorized drivers</li>
                  <li>• Claims must be reported within 24 hours</li>
                  <li>• Punjab Rentals insurance does not cover personal belongings</li>
                </ul>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Terms & Conditions</h2>
              <p className="text-sm text-muted-foreground">You must accept all terms to proceed.</p>
              <div className="space-y-3">
                {TERMS_CLAUSES.map((term) => (
                  <label key={term.key} className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-secondary/50">
                    <input
                      type="checkbox"
                      checked={acceptedTerms[term.key] || false}
                      onChange={(e) => setAcceptedTerms({ ...acceptedTerms, [term.key]: e.target.checked })}
                      className="mt-0.5"
                    />
                    <span className="text-sm">{term.label}</span>
                  </label>
                ))}
              </div>
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                <span className="font-semibold">{Object.values(acceptedTerms).filter(Boolean).length}</span> of {TERMS_CLAUSES.length} terms accepted
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Review Your Agreement</h2>
              <div className="space-y-4">
                <ReviewSection title="Hire Type">
                  <p>{hireType === "business" ? "Business Hire" : "Individual Hire"}</p>
                </ReviewSection>

                {hireType === "business" && (
                  <ReviewSection title="Business Details">
                    <p>{business.entity_name}</p>
                    <p>ABN: {business.entity_abn || "N/A"}</p>
                    <p>Authorised: {business.authorised_person} ({business.authorised_position})</p>
                    <p>{business.entity_email} | {business.entity_phone}</p>
                  </ReviewSection>
                )}

                <ReviewSection title="Driver Details">
                  <p>{driver.first_name} {driver.last_name}</p>
                  <p>{driver.email} | {driver.phone}</p>
                  <p>Licence: {driver.licence_number} (Expires: {driver.licence_expiry})</p>
                  <p>{driver.residential_address}, {driver.suburb} {driver.state} {driver.postcode}</p>
                </ReviewSection>

                <ReviewSection title="Rental Details">
                  <p>Period: {rental.rental_start} to {rental.rental_end}</p>
                  <p>Amount: ${rental.rental_amount} / {rental.rental_cycle}</p>
                  <p>Bond: ${rental.bond}</p>
                  <p>KM Allowance: {rental.km_allowance || "Unlimited"}</p>
                </ReviewSection>

                <ReviewSection title="Insurance">
                  <p>Age Category: {insurance.age_category}</p>
                  <p>Standard Excess: ${insurance.standard_excess}</p>
                  <p>Custom Excess: ${insurance.custom_excess}</p>
                  <p>Total Loss Excess: ${insurance.total_loss_excess}</p>
                </ReviewSection>

                <ReviewSection title="Terms Accepted">
                  <p>{Object.values(acceptedTerms).filter(Boolean).length} of {TERMS_CLAUSES.length} terms accepted</p>
                </ReviewSection>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Digital Signature</h2>
              <p className="text-sm text-muted-foreground">By signing below, you agree to all terms and conditions of this rental agreement.</p>

              <div>
                <label className="text-sm font-medium">Full Name (as signer)</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Enter your full legal name"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Signature</label>
                <div className="mt-1">
                  <SignaturePad
                    width={600}
                    height={200}
                    onSignatureChange={setSignatureData}
                    className="w-full"
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Draw your signature using your mouse, touchpad, or finger.
                </p>
              </div>

              {!allTermsAccepted && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  You must accept all terms and conditions before signing.
                </div>
              )}

              {!signerName && (
                <div className="rounded-md border border-border bg-secondary/50 p-3 text-sm text-muted-foreground">
                  Please enter your full name above.
                </div>
              )}

              {!signatureData && (
                <div className="rounded-md border border-border bg-secondary/50 p-3 text-sm text-muted-foreground">
                  Please provide your signature above.
                </div>
              )}
            </div>
          )}

          {step === 7 && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold">Agreement Submitted!</h2>
              <p className="text-muted-foreground">Your rental agreement has been successfully submitted.</p>

              {agreementNo && (
                <div className="rounded-md border border-border bg-secondary/50 p-4">
                  <p className="text-sm text-muted-foreground">Agreement Number</p>
                  <p className="text-2xl font-bold">{agreementNo}</p>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Your agreement is now pending admin review. You will be contacted once it has been approved and activated.
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Download className="h-4 w-4" /> Download Agreement PDF
                </button>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        {step < STEPS.length - 1 && (
          <div className="mt-6 flex justify-between">
            <button
              onClick={prevStep}
              disabled={step === 0}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>

            {step === STEPS.length - 2 ? (
              <button
                onClick={handleSubmit}
                disabled={submitting || !allTermsAccepted || !signatureData || !signerName}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Accept & Sign"}
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  className = "",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border p-4">
      <h4 className="text-sm font-semibold text-muted-foreground">{title}</h4>
      <div className="mt-2 text-sm">{children}</div>
    </div>
  );
}
