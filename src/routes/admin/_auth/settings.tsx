import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "@/lib/agreements";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/_auth/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [insurance, setInsurance] = useState<any>(null);
  const [termsVersion, setTermsVersion] = useState("v1");
  const [agreementVersion, setAgreementVersion] = useState("v1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [ins, tv, av] = await Promise.all([
        getSettings({ data: { key: "insurance" } }),
        getSettings({ data: { key: "terms_version" } }),
        getSettings({ data: { key: "agreement_version" } }),
      ]);
      if (ins) setInsurance(ins);
      if (tv) setTermsVersion(typeof tv === "string" ? tv.replace(/"/g, "") : tv);
      if (av) setAgreementVersion(typeof av === "string" ? av.replace(/"/g, "") : av);
      setLoading(false);
    })();
  }, []);

  async function handleSaveInsurance() {
    setSaving(true);
    try {
      await updateSettings({ data: { key: "insurance", value: insurance } });
      toast.success("Insurance settings saved");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveVersions() {
    setSaving(true);
    try {
      await updateSettings({ data: { key: "terms_version", value: termsVersion } });
      await updateSettings({ data: { key: "agreement_version", value: agreementVersion } });
      toast.success("Versions saved");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-black">Settings</h1>
      <p className="mt-1 text-muted-foreground">Configure insurance rates and agreement versions.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-lg font-bold">Insurance Configuration</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Standard Excess ($)</label>
              <input type="number" value={insurance?.standard_excess || 0} onChange={(e) => setInsurance({ ...insurance, standard_excess: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Custom Excess ($)</label>
              <input type="number" value={insurance?.custom_excess || 0} onChange={(e) => setInsurance({ ...insurance, custom_excess: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Total Loss Excess ($)</label>
              <input type="number" value={insurance?.total_loss_excess || 0} onChange={(e) => setInsurance({ ...insurance, total_loss_excess: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Under 25 Excess ($)</label>
              <input type="number" value={insurance?.age_categories?.under_25 || 0} onChange={(e) => setInsurance({ ...insurance, age_categories: { ...insurance.age_categories, under_25: Number(e.target.value) } })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">25-70 Excess ($)</label>
              <input type="number" value={insurance?.age_categories?.["25_to_70"] || 0} onChange={(e) => setInsurance({ ...insurance, age_categories: { ...insurance.age_categories, "25_to_70": Number(e.target.value) } })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Over 70 Excess ($)</label>
              <input type="number" value={insurance?.age_categories?.over_70 || 0} onChange={(e) => setInsurance({ ...insurance, age_categories: { ...insurance.age_categories, over_70: Number(e.target.value) } })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <button onClick={handleSaveInsurance} disabled={saving} className="w-full rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {saving ? "Saving..." : "Save Insurance Settings"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-lg font-bold">Agreement & Terms Versions</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Terms Version</label>
              <input value={termsVersion} onChange={(e) => setTermsVersion(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Agreement Version</label>
              <input value={agreementVersion} onChange={(e) => setAgreementVersion(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <p className="text-sm text-muted-foreground">
              Bumping these versions will be recorded on all future agreements and signatures.
            </p>
            <button onClick={handleSaveVersions} disabled={saving} className="w-full rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {saving ? "Saving..." : "Save Versions"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
