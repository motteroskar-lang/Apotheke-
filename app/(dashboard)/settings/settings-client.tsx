"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Check, Loader2 } from "lucide-react";

interface Props {
  profile: Profile | null;
  values: { id: string; value: string; rank: number | null }[];
  email: string;
}

export function SettingsClient({ profile, values, email }: Props) {
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    identity_statement: profile?.identity_statement ?? "",
    timezone: profile?.timezone ?? "Europe/Oslo",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("profiles").update({
      full_name: form.full_name,
      identity_statement: form.identity_statement,
      timezone: form.timezone,
    }).eq("id", profile?.id ?? "");
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="pb-5 border-b border-apex-border mb-6">
        <h1 className="text-xs font-semibold uppercase tracking-widest text-apex-text-primary">Settings</h1>
      </div>

      <div className="flex flex-col gap-6">
        {/* Account */}
        <div>
          <p className="section-header">Account</p>
          <div className="bg-apex-surface border border-apex-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-apex-blue/20 border border-apex-blue/30 rounded-md flex items-center justify-center">
                <span className="text-apex-blue text-xs font-semibold">
                  {form.full_name?.[0]?.toUpperCase() ?? "?"}
                </span>
              </div>
              <div>
                <p className="text-sm text-apex-text-primary">{form.full_name || "—"}</p>
                <p className="text-xs text-apex-text-muted">{email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile */}
        <div>
          <p className="section-header">Profile</p>
          <div className="flex flex-col gap-4">
            <Input
              label="Full name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Your name"
            />
            <div className="flex flex-col gap-1.5">
              <label className="data-label">Identity statement</label>
              <Textarea
                value={form.identity_statement}
                onChange={(e) => setForm({ ...form, identity_statement: e.target.value })}
                rows={4}
                placeholder="I am becoming..."
              />
              <p className="text-2xs text-apex-text-disabled">
                This appears throughout your system as a constant reminder.
              </p>
            </div>
          </div>
        </div>

        {/* Values */}
        {values.length > 0 && (
          <div>
            <p className="section-header">Core Values</p>
            <div className="flex flex-wrap gap-2">
              {values.map((v) => (
                <span key={v.id} className="px-3 py-1 bg-cyan-500/5 border border-cyan-500/20 rounded text-xs text-cyan-400">
                  {v.value}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <><Check size={13} /> Saved</> : "Save changes"}
          </Button>
        </div>

        {/* Danger zone */}
        <div className="border-t border-apex-border pt-6">
          <p className="section-header text-apex-red/70">System</p>
          <div className="bg-apex-surface border border-apex-border rounded-lg p-4">
            <p className="text-xs text-apex-text-muted mb-3">
              Your data is stored securely. Export or delete your account at any time.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm">Export data</Button>
              <Button variant="destructive" size="sm">Delete account</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
