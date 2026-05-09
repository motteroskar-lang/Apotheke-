"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTED_HABITS = [
  "Train",
  "2h Deep Work",
  "Read 30min",
  "Cold shower",
  "No alcohol",
  "10,000 steps",
  "Meditate",
  "Journal",
  "No social media before 10am",
  "Sleep by 23:00",
  "Review goals",
  "Invest monthly",
];

const CORE_VALUES = [
  "Discipline", "Excellence", "Integrity", "Courage", "Growth",
  "Focus", "Health", "Freedom", "Loyalty", "Independence",
  "Ambition", "Clarity", "Consistency", "Resilience", "Ownership",
];

interface OnboardingData {
  fullName: string;
  identityStatement: string;
  values: string[];
  yearGoal: string;
  nonNegotiables: string[];
  customHabit: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    fullName: "",
    identityStatement: "",
    values: [],
    yearGoal: "",
    nonNegotiables: [],
    customHabit: "",
  });

  const TOTAL_STEPS = 4;

  const toggleValue = (v: string) => {
    setData((prev) => ({
      ...prev,
      values: prev.values.includes(v)
        ? prev.values.filter((x) => x !== v)
        : prev.values.length < 5
        ? [...prev.values, v]
        : prev.values,
    }));
  };

  const toggleHabit = (h: string) => {
    setData((prev) => ({
      ...prev,
      nonNegotiables: prev.nonNegotiables.includes(h)
        ? prev.nonNegotiables.filter((x) => x !== h)
        : prev.nonNegotiables.length < 7
        ? [...prev.nonNegotiables, h]
        : prev.nonNegotiables,
    }));
  };

  const addCustomHabit = () => {
    const h = data.customHabit.trim();
    if (!h || data.nonNegotiables.length >= 7) return;
    toggleHabit(h);
    setData((prev) => ({ ...prev, customHabit: "" }));
  };

  const canProceed = () => {
    if (step === 1) return data.fullName.trim() && data.identityStatement.trim();
    if (step === 2) return data.values.length >= 2;
    if (step === 3) return data.yearGoal.trim();
    if (step === 4) return data.nonNegotiables.length >= 3;
    return false;
  };

  const handleComplete = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("profiles").upsert({
      id: user.id,
      full_name: data.fullName,
      identity_statement: data.identityStatement,
      updated_at: new Date().toISOString(),
    });

    if (data.values.length > 0) {
      const valueRows = data.values.map((v, i) => ({
        user_id: user.id,
        value: v,
        rank: i + 1,
      }));
      await supabase.from("personal_values").insert(valueRows);
    }

    if (data.yearGoal) {
      await supabase.from("goals").insert({
        user_id: user.id,
        title: data.yearGoal,
        category: "vision",
        horizon: "annual",
        year: new Date().getFullYear(),
        status: "active",
      });
    }

    if (data.nonNegotiables.length > 0) {
      const habitRows = data.nonNegotiables.map((h) => ({
        user_id: user.id,
        name: h,
        category: "character",
        frequency: "daily",
        is_non_negotiable: true,
        active: true,
      }));
      await supabase.from("habits").insert(habitRows);
    }

    router.push("/command");
  };

  return (
    <div className="min-h-screen bg-apex-bg flex flex-col items-center justify-center px-4">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-0.5 flex-1 rounded-full transition-colors duration-300",
                i < step ? "bg-apex-blue" : "bg-apex-border"
              )}
            />
          ))}
        </div>

        {/* Step 1: Identity */}
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="mb-2 text-2xs font-semibold uppercase tracking-widest text-apex-text-muted">
              Step 1 / {TOTAL_STEPS}
            </div>
            <h1 className="text-xl font-semibold text-apex-text-primary mb-1">
              Who are you becoming?
            </h1>
            <p className="text-sm text-apex-text-muted mb-8">
              Before we build your system, define your identity. Not your goals — your identity.
            </p>

            <div className="flex flex-col gap-5">
              <Input
                label="Your name"
                placeholder="First name"
                value={data.fullName}
                onChange={(e) => setData({ ...data, fullName: e.target.value })}
                autoFocus
              />

              <div className="flex flex-col gap-1.5">
                <label className="data-label">Identity statement</label>
                <Textarea
                  placeholder='e.g. "I am becoming a disciplined, financially free entrepreneur who operates at elite level in every domain of life."'
                  value={data.identityStatement}
                  onChange={(e) =>
                    setData({ ...data, identityStatement: e.target.value })
                  }
                  rows={4}
                  className="text-sm"
                />
                <p className="text-2xs text-apex-text-disabled">
                  Write as present-tense becoming. This will appear throughout your system.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Values */}
        {step === 2 && (
          <div className="animate-fade-in">
            <div className="mb-2 text-2xs font-semibold uppercase tracking-widest text-apex-text-muted">
              Step 2 / {TOTAL_STEPS}
            </div>
            <h1 className="text-xl font-semibold text-apex-text-primary mb-1">
              Core values
            </h1>
            <p className="text-sm text-apex-text-muted mb-8">
              Select 3–5 values that define how you operate. These are not aspirations — they are standards.
            </p>

            <div className="flex flex-wrap gap-2">
              {CORE_VALUES.map((v) => (
                <button
                  key={v}
                  onClick={() => toggleValue(v)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm border transition-colors duration-100",
                    data.values.includes(v)
                      ? "bg-apex-blue/10 border-apex-blue/30 text-apex-blue"
                      : "bg-apex-surface border-apex-border text-apex-text-muted hover:text-apex-text-secondary hover:border-zinc-600"
                  )}
                >
                  {data.values.includes(v) && (
                    <Check size={10} className="inline mr-1.5" />
                  )}
                  {v}
                </button>
              ))}
            </div>

            <p className="text-2xs text-apex-text-disabled mt-4">
              {data.values.length}/5 selected
            </p>
          </div>
        )}

        {/* Step 3: Year goal */}
        {step === 3 && (
          <div className="animate-fade-in">
            <div className="mb-2 text-2xs font-semibold uppercase tracking-widest text-apex-text-muted">
              Step 3 / {TOTAL_STEPS}
            </div>
            <h1 className="text-xl font-semibold text-apex-text-primary mb-1">
              One defining goal
            </h1>
            <p className="text-sm text-apex-text-muted mb-8">
              What is the single most important thing you will achieve in{" "}
              {new Date().getFullYear()}? Not a list — one goal.
            </p>

            <Textarea
              placeholder={`e.g. "Reach €50,000 net worth and establish a consistent 5-day training program."`}
              value={data.yearGoal}
              onChange={(e) => setData({ ...data, yearGoal: e.target.value })}
              rows={4}
              className="text-sm"
              autoFocus
            />
          </div>
        )}

        {/* Step 4: Non-negotiables */}
        {step === 4 && (
          <div className="animate-fade-in">
            <div className="mb-2 text-2xs font-semibold uppercase tracking-widest text-apex-text-muted">
              Step 4 / {TOTAL_STEPS}
            </div>
            <h1 className="text-xl font-semibold text-apex-text-primary mb-1">
              Non-negotiables
            </h1>
            <p className="text-sm text-apex-text-muted mb-2">
              Choose 5–7 behaviors you will do daily without exception. These are operational minimum standards.
            </p>
            <p className="text-xs text-apex-amber mb-6">
              Hard cap: 7. Choose what actually matters.
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {SUGGESTED_HABITS.map((h) => (
                <button
                  key={h}
                  onClick={() => toggleHabit(h)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs border transition-colors duration-100",
                    data.nonNegotiables.includes(h)
                      ? "bg-apex-blue/10 border-apex-blue/30 text-apex-blue"
                      : "bg-apex-surface border-apex-border text-apex-text-muted hover:text-apex-text-secondary hover:border-zinc-600"
                  )}
                >
                  {data.nonNegotiables.includes(h) && (
                    <Check size={9} className="inline mr-1" />
                  )}
                  {h}
                </button>
              ))}
            </div>

            {/* Custom */}
            <div className="flex gap-2">
              <input
                type="text"
                className="apex-input flex-1 text-xs"
                placeholder="Add custom habit..."
                value={data.customHabit}
                onChange={(e) =>
                  setData({ ...data, customHabit: e.target.value })
                }
                onKeyDown={(e) => e.key === "Enter" && addCustomHabit()}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={addCustomHabit}
                disabled={
                  !data.customHabit.trim() || data.nonNegotiables.length >= 7
                }
              >
                Add
              </Button>
            </div>

            <p className="text-2xs text-apex-text-disabled mt-3">
              {data.nonNegotiables.length}/7 selected
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 text-xs text-apex-text-muted hover:text-apex-text-secondary transition-colors"
            >
              <ArrowLeft size={12} />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < TOTAL_STEPS ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Continue
              <ArrowRight size={13} />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={!canProceed() || loading}
            >
              {loading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <>
                  Initialize system
                  <ArrowRight size={13} />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
