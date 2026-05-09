"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { WeeklySitrep } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Props {
  currentSitrep: WeeklySitrep | null;
  previousSitrep: WeeklySitrep | null;
  weekStart: string;
  autoSummary: string;
  allSitreps: WeeklySitrep[];
}

const QUESTIONS = [
  { key: "what_happened", label: "What happened this week?", hint: "Be factual. What did you do?" },
  { key: "what_worked", label: "What worked?", hint: "What should you keep doing?" },
  { key: "what_didnt", label: "What didn't work?", hint: "Where did you fall short? Be honest." },
  { key: "patterns_observed", label: "What patterns did you notice?", hint: "Across training, work, behavior." },
  { key: "changes_next_week", label: "What will you do differently?", hint: "Specific changes, not intentions." },
  { key: "next_week_focus", label: "What is your focus next week?", hint: "1-3 areas maximum." },
] as const;

const DOMAIN_RATINGS = [
  { key: "physical_rating", label: "Physical" },
  { key: "mental_rating", label: "Mental" },
  { key: "financial_rating", label: "Financial" },
  { key: "discipline_rating", label: "Discipline" },
] as const;

type FormData = {
  what_happened: string;
  what_worked: string;
  what_didnt: string;
  patterns_observed: string;
  changes_next_week: string;
  next_week_focus: string;
  physical_rating: number;
  mental_rating: number;
  financial_rating: number;
  discipline_rating: number;
  overall_rating: number;
};

export function SitrepClient({ currentSitrep, previousSitrep, weekStart, autoSummary, allSitreps }: Props) {
  const isCompleted = currentSitrep?.completed ?? false;
  const [form, setForm] = useState<FormData>({
    what_happened: currentSitrep?.what_happened ?? "",
    what_worked: currentSitrep?.what_worked ?? "",
    what_didnt: currentSitrep?.what_didnt ?? "",
    patterns_observed: currentSitrep?.patterns_observed ?? "",
    changes_next_week: currentSitrep?.changes_next_week ?? "",
    next_week_focus: currentSitrep?.next_week_focus ?? "",
    physical_rating: currentSitrep?.physical_rating ?? 5,
    mental_rating: currentSitrep?.mental_rating ?? 5,
    financial_rating: currentSitrep?.financial_rating ?? 5,
    discipline_rating: currentSitrep?.discipline_rating ?? 5,
    overall_rating: currentSitrep?.overall_rating ?? 5,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(isCompleted);
  const [showHistory, setShowHistory] = useState(false);

  const weekLabel = format(parseISO(weekStart), "MMM d, yyyy");

  const handleSave = async (complete: boolean) => {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("weekly_sitrep").upsert(
      {
        user_id: user.id,
        week_start: weekStart,
        ...form,
        completed: complete,
        completed_at: complete ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,week_start" }
    );

    if (complete) setSaved(true);
    setSaving(false);
  };

  const canComplete = QUESTIONS.every((q) => form[q.key].trim().length > 0);

  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between pb-5 border-b border-apex-border mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xs font-semibold uppercase tracking-widest text-apex-text-primary">
              Weekly SITREP
            </h1>
            {saved ? (
              <Badge variant="green"><Check size={9} className="mr-1" />Complete</Badge>
            ) : (
              <Badge variant="amber"><AlertTriangle size={9} className="mr-1" />Outstanding</Badge>
            )}
          </div>
          <p className="text-xs text-apex-text-muted">Week of {weekLabel}</p>
          {autoSummary && (
            <p className="text-xs text-apex-text-secondary font-mono mt-1">
              {autoSummary}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {QUESTIONS.map((q) => (
            <div key={q.key}>
              <label className="block text-xs font-semibold text-apex-text-primary mb-0.5">
                {q.label}
              </label>
              <p className="text-2xs text-apex-text-muted mb-2">{q.hint}</p>
              <textarea
                value={form[q.key]}
                onChange={(e) => setForm({ ...form, [q.key]: e.target.value })}
                disabled={saved}
                rows={3}
                className={cn(
                  "apex-input resize-none w-full",
                  saved && "opacity-60 cursor-not-allowed"
                )}
              />
            </div>
          ))}

          {/* Actions */}
          {!saved ? (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="flex-1"
              >
                Save draft
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={saving || !canComplete}
                className="flex-1"
              >
                {saving ? "Saving..." : "Complete SITREP"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-apex-green">
              <Check size={14} />
              SITREP complete for week of {weekLabel}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-5">
          {/* Domain ratings */}
          <div className="bg-apex-surface border border-apex-border rounded-lg p-4">
            <p className="section-header">Domain Ratings</p>
            <div className="flex flex-col gap-3">
              {DOMAIN_RATINGS.map(({ key, label }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-apex-text-secondary">{label}</span>
                    <span className="font-mono text-xs text-apex-text-primary">{form[key]}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={form[key]}
                    disabled={saved}
                    onChange={(e) => setForm({ ...form, [key]: parseInt(e.target.value) })}
                    className="w-full accent-apex-blue"
                  />
                </div>
              ))}
              <div className="border-t border-apex-border pt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-apex-text-primary">Overall</span>
                  <span className="font-mono text-xs font-medium text-apex-text-primary">{form.overall_rating}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={form.overall_rating}
                  disabled={saved}
                  onChange={(e) => setForm({ ...form, overall_rating: parseInt(e.target.value) })}
                  className="w-full accent-apex-blue"
                />
              </div>
            </div>
          </div>

          {/* Previous SITREP */}
          {previousSitrep && previousSitrep.completed && (
            <div className="bg-apex-surface border border-apex-border rounded-lg p-4">
              <p className="section-header">Previous Week</p>
              <div className="flex flex-col gap-2">
                {previousSitrep.what_worked && (
                  <div>
                    <p className="text-2xs text-apex-text-muted mb-0.5">What worked</p>
                    <p className="text-xs text-apex-text-secondary line-clamp-3">{previousSitrep.what_worked}</p>
                  </div>
                )}
                {previousSitrep.next_week_focus && (
                  <div>
                    <p className="text-2xs text-apex-text-muted mb-0.5">Focus set</p>
                    <p className="text-xs text-apex-text-secondary">{previousSitrep.next_week_focus}</p>
                  </div>
                )}
                <div className="flex items-center gap-3 pt-1 border-t border-apex-border">
                  {[
                    { label: "P", val: previousSitrep.physical_rating },
                    { label: "M", val: previousSitrep.mental_rating },
                    { label: "F", val: previousSitrep.financial_rating },
                    { label: "D", val: previousSitrep.discipline_rating },
                  ].map(({ label, val }) => (
                    val !== null && (
                      <div key={label} className="flex flex-col items-center">
                        <span className="text-2xs text-apex-text-disabled">{label}</span>
                        <span className={cn(
                          "font-mono text-xs font-medium",
                          val >= 7 ? "text-apex-green" : val >= 5 ? "text-apex-amber" : "text-apex-red"
                        )}>
                          {val}
                        </span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SITREP history */}
          {allSitreps.length > 0 && (
            <div className="bg-apex-surface border border-apex-border rounded-lg p-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center justify-between w-full"
              >
                <p className="section-header mb-0">History ({allSitreps.length})</p>
                {showHistory ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              {showHistory && (
                <div className="flex flex-col gap-1 mt-3">
                  {allSitreps.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-1">
                      <span className="font-mono text-xs text-apex-text-muted">
                        {format(parseISO(s.week_start), "MMM d")}
                      </span>
                      {s.overall_rating && (
                        <span className={cn(
                          "font-mono text-xs",
                          s.overall_rating >= 7 ? "text-apex-green" : s.overall_rating >= 5 ? "text-apex-amber" : "text-apex-red"
                        )}>
                          {s.overall_rating}/10
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
