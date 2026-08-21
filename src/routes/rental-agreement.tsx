import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { createCustomer } from "@/lib/customers";
import { createAgreement, saveSignature } from "@/lib/agreements";
import { downloadAgreementPdf } from "@/lib/pdfs";
import { getVehicle } from "@/lib/vehicles";
import { SignaturePad } from "@/components/SignaturePad";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Check, Download, Car } from "lucide-react";

export const Route = createFileRoute("/rental-agreement")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      vehicleId: (search.vehicleId as string) || "",
    };
  },
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

/** General T&C — shown to every renter (exact wording from Important Terms & Checklist). */
const GENERAL_TERMS = [
  { key: "interstate", label: "Interstate travel is not permitted. The vehicle is only insured and allowed to be driven within Victoria." },
  { key: "return_notice", label: "2 weeks advance notice must be provided before returning the vehicle to avoid losing your bond, unless a different arrangement has been mutually agreed upon." },
  { key: "smoking", label: "Smoking, vaping, or allowing pets inside the vehicle is strictly prohibited, $200 - Steam Cleaning Fee will be charged for any breach." },
  { key: "bond_refund", label: "Bond is refunded within 48 business hours of the vehicle being returned and inspected." },
  { key: "servicing", label: "The renter is responsible for taking the rental vehicle to the owner's designated mechanic for scheduled servicing and inspections in a prompt manner, with failure to do so making them liable for any resulting damage or issues, often requiring them to cover costs and potentially voiding insurance, as per the rental agreement." },
  { key: "mechanical_faults", label: "If Renter notice any mechanical issue, they must immediately contact us, not a random mechanic, and we will direct you to one of our approved repairers; failing to do so could make you responsible for extra cost." },
  { key: "late_payments", label: "Your Rental agreement is considered to be in breach if a payment is delayed by two days." },
  { key: "lost_keys", label: "Replacement for Lost keys can cost between $600 - $1500 depending upon the make and model of the vehicle." },
  { key: "toll_fee", label: "$7 administration fee per nomination is charged to Renter for every Toll nomination." },
  { key: "infringement_fee", label: "$35 administration fee per nomination is charged to Renter for every Parking, Speeding Or Any Infringement nomination." },
  { key: "tyre_damage", label: "Tyre Punctures OR faults/Damages to vehicles caused by driver fault must be fixed by the Renter before handover at their own cost." },
  {
    key: "insurance_excess",
    label:
      "The renter/business must pay insurance excess within 24 hrs of the accident before the insurer covers the claim. Some Senarios where access is payable are as follows:\n1. If you or your pre-nominated driver is at Fault\n2. If you are Involved in a Hit and Run incident but don't have full information to make an insurance claim\n3. Accidents involving animals (especially wildlife), your own property, or situations where no other person/entity is at fault\n4. Disputed Accident - No party accepts fault, it may go to court, where a magistrate decides\n5. Any incident where Insurance deems that the Excess is payable.",
  },
];

/** Terms applicable to Car Rental Only (exact wording). */
const CAR_RENTAL_TERMS = [
  { key: "car_late_charge", label: "Late charge is calculated at $40 per day inc GST." },
  { key: "car_roadside", label: "Roadside Assistance is NOT included in this agreement as standard. Roadside Assistance can be added for an additional cost." },
  { key: "car_scratches", label: "Minor surface scratches repair cost is $300/each. Major damages are to be fixed as per Insurance guidelines or by mutually agreed amount." },
  { key: "car_fees", label: "Vacuum fee - $50, Washing fee - $50, Fuel top up - $3.98 per litre, Steam Cleaning - $200, Stain removal - $70/each, Missing tyre - $350, Missing jack - $150, Missing floor mats - $100." },
];

/** Terms applicable to Truck Rental Only (exact wording). */
const TRUCK_RENTAL_TERMS = [
  { key: "truck_underbody", label: "Damgage to Under body and above Cab is not covered by Insurance and Renter will be liable to pay the Repair/Replacement. Example: If you a rock or metal underneath the body or hit a bridge or tree, insurance doesn't cover these damages." },
  { key: "truck_dpf", label: "Failure to follow Diesel Particulate Diffuser procedure will result in Out of pocket repair cost between $2000 - $7000 plus Towing Charges." },
  { key: "truck_roadside_included", label: "Standard Roadside Assistance within 60 kms of Melbourne CBD is included for free." },
  { key: "truck_roadside_outside", label: "Renter may have to pay out of pocket charges for Roadside Assistance and Towing service when you are outside 60 kms from Melbourne CBD." },
  { key: "truck_late_charge", label: "Late charge is calculated at $100 per day inc GST." },
  { key: "truck_nominated_driver", label: "Only the nominated driver is covered by insurance. For business hire, all drivers must be nominated prior to using the rented vehicle for them to covered in insurance." },
  { key: "truck_fees", label: "Vacuum fee - $50, Washing fee - $150, Fuel top up - $3.98 per litre, Steam Cleaning - $200, Stain removal - $70/each, Missing tyre - $650, Missing jack - $650, Missing floor mats - $400." },
  { key: "truck_scratches", label: "Minor surface scratches repair cost is $500/each. Major damages are fixed as per Insurance guidelines." },
];

function getApplicableTerms(vehicleType?: string | null) {
  const terms = [...GENERAL_TERMS];
  if (vehicleType === "truck") {
    terms.push(...TRUCK_RENTAL_TERMS);
  } else if (vehicleType === "car" || vehicleType === "suv" || vehicleType === "van") {
    terms.push(...CAR_RENTAL_TERMS);
  }
  return terms;
}

function RentalAgreementPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [hireType, setHireType] = useState<"individual" | "business">("individual");
  const [submitting, setSubmitting] = useState(false);
  const [agreementId, setAgreementId] = useState<string | null>(null);
  const [agreementNo, setAgreementNo] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

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
    dob: "",
    age_category: "25_to_70",
    standard_excess: 1500,
    writeoff_excess: 2000,
    combined_excess: 3500,
  });

  // Calculate age from DOB
  function calculateAge(dob: string): number {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  const driverAge = calculateAge(insurance.dob);

  const [acceptedTerms, setAcceptedTerms] = useState<Record<string, boolean>>({});
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");

  // Fetch selected vehicle
  useEffect(() => {
    if (search.vehicleId) {
      getVehicle({ data: { id: search.vehicleId } })
        .then((vehicle: any) => {
          if (vehicle) {
            setSelectedVehicle(vehicle);
            setRental((prev) => ({
              ...prev,
              vehicle_id: vehicle.id,
              rental_amount: vehicle.weekly_price || 0,
              bond: vehicle.bond || 0,
              km_allowance: vehicle.km_allowance || 0,
              extra_km_rate: vehicle.extra_km_rate || 0,
            }));
          }
        })
        .catch(() => {
          // Vehicle not found or fetch failed — user can select one later
        });
    }
  }, [search.vehicleId]);

  const applicableTerms = getApplicableTerms(selectedVehicle?.vehicle_type);

  function nextStep() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function prevStep() {
    if (step > 0) setStep(step - 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const customerData = hireType === "business" ? { ...driver, ...business } : driver;
      const { id: customerId } = await createCustomer({ data: customerData as any });

      const terms = applicableTerms.filter((t) => acceptedTerms[t.key]).map((t) => ({
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
          insurance_age_category: driverAge >= 21 && driverAge < 25 ? "under_25" : driverAge >= 25 && driverAge <= 70 ? "25_to_70" : "over_70",
          standard_excess: 1500,
          custom_excess: 2000,
          total_loss_excess: 3500,
          terms_accepted: Object.values(acceptedTerms).some(Boolean),
          terms,
        },
      });

      if (signatureData || signerName) {
        await saveSignature({
          data: {
            agreement_id: id,
            signer_name: signerName || "Unsigned",
            signature_data: signatureData || "",
          },
        });
      }

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
                    <Input label="Entity Name" value={business.entity_name} onChange={(v) => setBusiness({ ...business, entity_name: v })} />
                    <Input label="ABN/ACN" value={business.entity_abn} onChange={(v) => setBusiness({ ...business, entity_abn: v })} />
                    <Input label="Authorised Person" value={business.authorised_person} onChange={(v) => setBusiness({ ...business, authorised_person: v })} />
                    <Input label="Position" value={business.authorised_position} onChange={(v) => setBusiness({ ...business, authorised_position: v })} />
                    <Input label="Email" type="email" value={business.entity_email} onChange={(v) => setBusiness({ ...business, entity_email: v })} />
                    <Input label="Phone" value={business.entity_phone} onChange={(v) => setBusiness({ ...business, entity_phone: v })} />
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
                <Input label="First Name" value={driver.first_name} onChange={(v) => setDriver({ ...driver, first_name: v })} />
                <Input label="Last Name" value={driver.last_name} onChange={(v) => setDriver({ ...driver, last_name: v })} />
                <Input label="Email" type="email" value={driver.email} onChange={(v) => setDriver({ ...driver, email: v })} />
                <Input label="Phone" value={driver.phone} onChange={(v) => setDriver({ ...driver, phone: v })} />
                <Input label="Date of Birth" type="date" value={driver.dob} onChange={(v) => setDriver({ ...driver, dob: v })} />
                <Input label="Licence Number" value={driver.licence_number} onChange={(v) => setDriver({ ...driver, licence_number: v })} />
                <Input label="Licence Expiry" type="date" value={driver.licence_expiry} onChange={(v) => setDriver({ ...driver, licence_expiry: v })} />
                <Input label="Issuing State" value={driver.licence_state} onChange={(v) => setDriver({ ...driver, licence_state: v })} />
                <Input label="Country" value={driver.licence_country} onChange={(v) => setDriver({ ...driver, licence_country: v })} />
                <Input label="Residential Address" value={driver.residential_address} onChange={(v) => setDriver({ ...driver, residential_address: v })} className="md:col-span-2" />
                <Input label="Suburb" value={driver.suburb} onChange={(v) => setDriver({ ...driver, suburb: v })} />
                <Input label="State" value={driver.state} onChange={(v) => setDriver({ ...driver, state: v })} />
                <Input label="Postcode" value={driver.postcode} onChange={(v) => setDriver({ ...driver, postcode: v })} />
                <Input label="Parking Address" value={driver.parking_address} onChange={(v) => setDriver({ ...driver, parking_address: v })} className="md:col-span-2" />
              </div>

              <h3 className="text-lg font-bold">Emergency Contact</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Name" value={driver.emergency_contact_name} onChange={(v) => setDriver({ ...driver, emergency_contact_name: v })} />
                <Input label="Relationship" value={driver.emergency_contact_relationship} onChange={(v) => setDriver({ ...driver, emergency_contact_relationship: v })} />
                <Input label="Phone" value={driver.emergency_contact_phone} onChange={(v) => setDriver({ ...driver, emergency_contact_phone: v })} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Vehicle & Rental Details</h2>
              {selectedVehicle ? (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Car className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</p>
                      <p className="text-sm text-muted-foreground capitalize">{selectedVehicle.vehicle_type} {selectedVehicle.registration && `• ${selectedVehicle.registration}`}</p>
                    </div>
                    <button
                      onClick={() => navigate({ to: "/fleet" })}
                      className="ml-auto text-sm text-primary hover:underline"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <Car className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 font-medium">No vehicle selected</p>
                  <p className="mt-1 text-sm text-muted-foreground">Browse our fleet to select a vehicle for your rental.</p>
                  <a
                    href="/fleet"
                    className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    <Car className="h-4 w-4" /> Browse Fleet
                  </a>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Rental Start Date" type="date" value={rental.rental_start} onChange={(v) => setRental({ ...rental, rental_start: v })} />
                <Input label="Rental End Date" type="date" value={rental.rental_end} onChange={(v) => setRental({ ...rental, rental_end: v })} />
                <Input label="Rental Amount ($)" type="number" value={rental.rental_amount} onChange={(v) => setRental({ ...rental, rental_amount: Number(v) })} />
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
                <div>
                  <label className="text-sm font-medium">Date of Birth</label>
                  <input
                    type="date"
                    value={insurance.dob}
                    onChange={(e) => setInsurance({ ...insurance, dob: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Driver Age</label>
                  <div className="mt-1 flex items-center gap-2 rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm">
                    {driverAge > 0 ? (
                      <>
                        <span className="font-bold text-foreground">{driverAge}</span> years old
                      </>
                    ) : (
                      <span className="text-muted-foreground">Enter DOB above</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Standard Excess</label>
                  <div className="mt-1 rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm font-semibold">
                    $1,500
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Write-off Excess</label>
                  <div className="mt-1 rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm font-semibold">
                    $2,000
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Standard + Write-off Excess</label>
                  <div className="mt-1 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-bold">
                    $3,500
                  </div>
                </div>
              </div>
              <div className="rounded-md border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Insurance Conditions</p>
                <ul className="mt-2 space-y-1">
                  <li>• Minimum driver age: 21 years</li>
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
              <h2 className="text-xl font-bold">IMPORTANT TERMS & CHECKLIST</h2>
              <p className="text-sm text-muted-foreground">
                Please read the terms and tick each box. Should you need any clarification, please ask one of our staff members.
              </p>

              <div className="space-y-3">
                {GENERAL_TERMS.map((term) => (
                  <label key={term.key} className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-secondary/50">
                    <input
                      type="checkbox"
                      checked={acceptedTerms[term.key] || false}
                      onChange={(e) => setAcceptedTerms({ ...acceptedTerms, [term.key]: e.target.checked })}
                      className="mt-0.5"
                    />
                    <span className="text-sm whitespace-pre-line">{term.label}</span>
                  </label>
                ))}
              </div>

              {(selectedVehicle?.vehicle_type === "car" ||
                selectedVehicle?.vehicle_type === "suv" ||
                selectedVehicle?.vehicle_type === "van") && (
                <div className="space-y-3">
                  <h3 className="rounded-md bg-secondary px-3 py-2 text-sm font-semibold">Terms applicable to Car Rental Only</h3>
                  {CAR_RENTAL_TERMS.map((term) => (
                    <label key={term.key} className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-secondary/50">
                      <input
                        type="checkbox"
                        checked={acceptedTerms[term.key] || false}
                        onChange={(e) => setAcceptedTerms({ ...acceptedTerms, [term.key]: e.target.checked })}
                        className="mt-0.5"
                      />
                      <span className="text-sm whitespace-pre-line">{term.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {selectedVehicle?.vehicle_type === "truck" && (
                <div className="space-y-3">
                  <h3 className="rounded-md bg-secondary px-3 py-2 text-sm font-semibold">Terms applicable to Truck Rental Only</h3>
                  {TRUCK_RENTAL_TERMS.map((term) => (
                    <label key={term.key} className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-secondary/50">
                      <input
                        type="checkbox"
                        checked={acceptedTerms[term.key] || false}
                        onChange={(e) => setAcceptedTerms({ ...acceptedTerms, [term.key]: e.target.checked })}
                        className="mt-0.5"
                      />
                      <span className="text-sm whitespace-pre-line">{term.label}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                <span className="font-semibold">{applicableTerms.filter((t) => acceptedTerms[t.key]).length}</span> of {applicableTerms.length} terms accepted
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
                  {selectedVehicle ? (
                    <>
                      <p><strong>Vehicle:</strong> {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</p>
                      <p><strong>Type:</strong> {selectedVehicle.vehicle_type}</p>
                      {selectedVehicle.registration && <p><strong>Registration:</strong> {selectedVehicle.registration}</p>}
                    </>
                  ) : (
                    <p className="text-muted-foreground">No vehicle selected — will be assigned by admin</p>
                  )}
                  <p>Period: {rental.rental_start} to {rental.rental_end}</p>
                  <p>Amount: ${rental.rental_amount} / {rental.rental_cycle}</p>
                  <p>Bond: ${rental.bond}</p>
                  <p>KM Allowance: {rental.km_allowance || "Unlimited"}</p>
                </ReviewSection>

                <ReviewSection title="Insurance">
                  <p>Driver Age: {driverAge} years</p>
                  <p>Standard Excess: $1,500</p>
                  <p>Write-off Excess: $2,000</p>
                  <p>Standard + Write-off Excess: $3,500</p>
                </ReviewSection>

                <ReviewSection title="Terms Accepted">
                  <p>{applicableTerms.filter((t) => acceptedTerms[t.key]).length} of {applicableTerms.length} terms accepted</p>
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
                disabled={submitting}
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
  className = "",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
