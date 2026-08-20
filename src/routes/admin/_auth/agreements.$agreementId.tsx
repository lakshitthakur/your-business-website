import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAgreement, updateAgreement, addPayment, addCharge, addNote, recordReturn, approveAgreement, activateAgreement } from "@/lib/agreements";
import { downloadAgreementPdf, downloadReceiptPdf } from "@/lib/pdfs";
import { toast } from "sonner";
import { ArrowLeft, Download, Plus, FileText, CreditCard, Car, User, Check } from "lucide-react";

export const Route = createFileRoute("/admin/_auth/agreements/$agreementId")({
  head: () => ({
    meta: [
      { title: "Agreement Detail — Punjab Rentals Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgreementDetailPage,
});

function AgreementDetailPage() {
  const { agreementId } = Route.useParams();
  const navigate = useNavigate();
  const [agreement, setAgreement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");

  async function load() {
    setLoading(true);
    const data = await getAgreement({ data: { agreement_no: agreementId } });
    setAgreement(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [agreementId]);

  async function handleApprove() {
    if (!confirm("Approve this agreement?")) return;
    try {
      await approveAgreement({ data: { id: agreement.id } });
      toast.success("Agreement approved");
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleActivate() {
    if (!confirm("Activate this agreement? This will generate weekly payments.")) return;
    try {
      const result = await activateAgreement({ data: { id: agreement.id } });
      toast.success(`Activated. ${result.payments_generated} payments generated.`);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDownloadPdf() {
    try {
      const result = await downloadAgreementPdf({ data: { agreement_id: agreement.id } });
      const blob = new Blob([new Uint8Array(result.pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (loading) return <div className="text-muted-foreground">Loading...</div>;
  if (!agreement) return <div className="text-muted-foreground">Agreement not found.</div>;

  return (
    <div>
      <Link to="/admin/agreements" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Agreements
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black">{agreement.agreement_no}</h1>
          <p className="mt-1 text-muted-foreground">
            {agreement.customer?.first_name} {agreement.customer?.last_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={agreement.status} />
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary"
          >
            <Download className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {agreement.status === "Pending" && (
          <>
            <button onClick={handleApprove} className="rounded-md bg-green-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-600">
              Approve
            </button>
            <button
              onClick={async () => {
                if (!confirm("Reject this agreement?")) return;
                await updateAgreement({ data: { id: agreement.id, status: "Rejected" } });
                toast.success("Rejected");
                await load();
              }}
              className="rounded-md bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
            >
              Reject
            </button>
          </>
        )}
        {agreement.status === "Approved" && (
          <button onClick={handleActivate} className="rounded-md bg-blue-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-600">
            Activate & Generate Payments
          </button>
        )}
        {agreement.status === "Active" && (
          <Link
            to="/admin/returns"
            search={{ agreement_id: agreement.id }}
            className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Record Return
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-border">
        <div className="flex gap-6">
          {["details", "payments", "notes", "audit"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 pb-2 text-sm font-medium capitalize ${
                activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "details" && <DetailsTab agreement={agreement} onReload={load} />}
        {activeTab === "payments" && <PaymentsTab agreement={agreement} onReload={load} />}
        {activeTab === "notes" && <NotesTab agreement={agreement} onReload={load} />}
        {activeTab === "audit" && <AuditTab agreement={agreement} />}
      </div>
    </div>
  );
}

function DetailsTab({ agreement, onReload }: { agreement: any; onReload: () => void }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <User className="h-5 w-5" /> Customer Details
        </h3>
        <div className="mt-4 space-y-2 text-sm">
          <DetailRow label="Name" value={`${agreement.customer?.first_name} ${agreement.customer?.last_name}`} />
          <DetailRow label="Email" value={agreement.customer?.email} />
          <DetailRow label="Phone" value={agreement.customer?.phone} />
          <DetailRow label="DOB" value={agreement.customer?.dob} />
          <DetailRow label="Licence" value={agreement.customer?.licence_number} />
          <DetailRow label="Licence Expiry" value={agreement.customer?.licence_expiry} />
          <DetailRow label="Address" value={`${agreement.customer?.residential_address}, ${agreement.customer?.suburb} ${agreement.customer?.state} ${agreement.customer?.postcode}`} />
          <DetailRow label="Emergency Contact" value={`${agreement.customer?.emergency_contact_name} (${agreement.customer?.emergency_contact_relationship}) ${agreement.customer?.emergency_contact_phone}`} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Car className="h-5 w-5" /> Vehicle & Rental
        </h3>
        <div className="mt-4 space-y-2 text-sm">
          {agreement.vehicle ? (
            <>
              <DetailRow label="Vehicle" value={`${agreement.vehicle.year} ${agreement.vehicle.make} ${agreement.vehicle.model}`} />
              <DetailRow label="Registration" value={agreement.vehicle.registration} />
            </>
          ) : (
            <DetailRow label="Vehicle" value="Not assigned" />
          )}
          <DetailRow label="Rental Period" value={`${agreement.rental_start || "TBC"} to ${agreement.rental_end || "TBC"}`} />
          <DetailRow label="Weekly Rate" value={`$${agreement.rental_amount}`} />
          <DetailRow label="Bond" value={`$${agreement.bond}`} />
          <DetailRow label="KM Allowance" value={agreement.km_allowance ? `${agreement.km_allowance} km` : "Unlimited"} />
          <DetailRow label="Pickup Odometer" value={agreement.pickup_odometer ? `${agreement.pickup_odometer} km` : "N/A"} />
          {agreement.return_odometer && (
            <>
              <DetailRow label="Return Odometer" value={`${agreement.return_odometer} km`} />
              <DetailRow label="Return Date" value={agreement.return_date} />
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <CreditCard className="h-5 w-5" /> Insurance & Payments
        </h3>
        <div className="mt-4 space-y-2 text-sm">
          <DetailRow label="Age Category" value={agreement.insurance_age_category} />
          <DetailRow label="Standard Excess" value={`$${agreement.standard_excess || 0}`} />
          <DetailRow label="Custom Excess" value={`$${agreement.custom_excess || 0}`} />
          <DetailRow label="Total Loss Excess" value={`$${agreement.total_loss_excess || 0}`} />
          <DetailRow label="Deposit" value={`$${agreement.deposit || 0}`} />
          <DetailRow label="Total Paid" value={`$${agreement.total_paid || 0}`} />
          <DetailRow label="Outstanding" value={`$${agreement.outstanding || 0}`} />
          <DetailRow label="Bond Status" value={agreement.bond_status} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <FileText className="h-5 w-5" /> Terms & Signature
        </h3>
        <div className="mt-4 space-y-2 text-sm">
          <DetailRow label="Terms Accepted" value={agreement.terms_accepted ? `Yes (${agreement.terms?.length || 0} clauses)` : "No"} />
          <DetailRow label="Terms Version" value={agreement.terms_version} />
          {agreement.signature && (
            <>
              <DetailRow label="Signed By" value={agreement.signature.signer_name} />
              <DetailRow label="Signed At" value={new Date(agreement.signature.signed_at).toLocaleString()} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentsTab({ agreement, onReload }: { agreement: any; onReload: () => void }) {
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paid_amount: 0,
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "",
    transaction_ref: "",
    notes: "",
  });

  async function handleMarkPaid(payment: any) {
    try {
      await addPayment({
        data: {
          id: payment.id,
          agreement_id: agreement.id,
          due_date: payment.due_date,
          amount: payment.amount,
          paid_amount: payment.amount,
          status: "Paid",
          payment_date: new Date().toISOString().split("T")[0],
        },
      });
      toast.success("Payment marked as paid");
      onReload();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleAddPayment() {
    try {
      const pendingPayment = agreement.payments?.find((p: any) => p.status === "Pending" || p.status === "Overdue");
      if (!pendingPayment) {
        toast.error("No pending payments to add payment to");
        return;
      }
      await addPayment({
        data: {
          id: pendingPayment.id,
          agreement_id: agreement.id,
          due_date: pendingPayment.due_date,
          amount: pendingPayment.amount,
          paid_amount: paymentForm.paid_amount,
          status: paymentForm.paid_amount >= pendingPayment.amount ? "Paid" : "Partially Paid",
          payment_date: paymentForm.payment_date,
          payment_method: paymentForm.payment_method,
          transaction_ref: paymentForm.transaction_ref,
          notes: paymentForm.notes,
        },
      });
      toast.success("Payment recorded");
      setShowAddPayment(false);
      onReload();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDownloadReceipt(payment: any) {
    try {
      const result = await downloadReceiptPdf({ data: { payment_id: payment.id } });
      const blob = new Blob([new Uint8Array(result.pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Payment Schedule</h3>
        <button
          onClick={() => setShowAddPayment(!showAddPayment)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Record Payment
        </button>
      </div>

      {showAddPayment && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Amount Paid ($)</label>
              <input
                type="number"
                value={paymentForm.paid_amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, paid_amount: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Payment Date</label>
              <input
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Payment Method</label>
              <input
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Transaction Ref</label>
              <input
                value={paymentForm.transaction_ref}
                onChange={(e) => setPaymentForm({ ...paymentForm, transaction_ref: e.target.value })}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddPayment} className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
              Save Payment
            </button>
            <button onClick={() => setShowAddPayment(false)} className="rounded-md border border-border px-3 py-1.5 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Period</th>
              <th className="px-4 py-3 text-left font-medium">Due Date</th>
              <th className="px-4 py-3 text-left font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">Paid</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {agreement.payments?.map((p: any) => (
              <tr key={p.id} className="hover:bg-secondary/30">
                <td className="px-4 py-3">{p.period_label}</td>
                <td className="px-4 py-3">{p.due_date}</td>
                <td className="px-4 py-3">${p.amount}</td>
                <td className="px-4 py-3">${p.paid_amount || 0}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {(p.status === "Pending" || p.status === "Overdue") && (
                      <button
                        onClick={() => handleMarkPaid(p)}
                        className="rounded-md bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600"
                      >
                        Mark Paid
                      </button>
                    )}
                    {p.status === "Paid" && (
                      <button
                        onClick={() => handleDownloadReceipt(p)}
                        className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary"
                      >
                        Receipt
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NotesTab({ agreement, onReload }: { agreement: any; onReload: () => void }) {
  const [note, setNote] = useState("");

  async function handleAddNote() {
    if (!note.trim()) return;
    try {
      await addNote({ data: { agreement_id: agreement.id, note } });
      toast.success("Note added");
      setNote("");
      onReload();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-lg font-bold">Add Note</h3>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Add a note about this agreement..."
        />
        <button
          onClick={handleAddNote}
          className="mt-2 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Add Note
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {agreement.notes?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          agreement.notes?.map((n: any) => (
            <div key={n.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm">{n.note}</p>
              <p className="mt-2 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AuditTab({ agreement }: { agreement: any }) {
  return (
    <div className="text-sm text-muted-foreground">
      <p>Audit logs for this agreement will appear here.</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: any }) {
  if (!value || value === "null" || value === "undefined") return null;
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Pending: "bg-yellow-100 text-yellow-700",
    Approved: "bg-blue-100 text-blue-700",
    Active: "bg-green-100 text-green-700",
    Completed: "bg-gray-100 text-gray-700",
    Rejected: "bg-red-100 text-red-700",
    Cancelled: "bg-gray-100 text-gray-700",
    Paid: "bg-green-100 text-green-700",
    Overdue: "bg-red-100 text-red-700",
    "Partially Paid": "bg-yellow-100 text-yellow-700",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}
