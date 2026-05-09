"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { DailyBrief } from "@/types/database";
import { Check, Loader2, Plus, X } from "lucide-react";
import { isoDate } from "@/lib/utils";

interface MissionBriefProps {
  brief: DailyBrief | null;
  onUpdate: (brief: DailyBrief) => void;
}

export function MissionBrief({ brief, onUpdate }: MissionBriefProps) {
  const [priorities, setPriorities] = useState<string[]>(
    brief?.top_3_priorities ?? ["", "", ""]
  );
  const [intention, setIntention] = useState(brief?.daily_intention ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!brief?.completed_at);

  const handleSave = async () => {
    const filtered = priorities.filter((p) => p.trim());
    if (filtered.length === 0) return;

    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = isoDate();
    const { data } = await supabase
      .from("daily_briefs")
      .upsert(
        {
          user_id: user.id,
          brief_date: today,
          top_3_priorities: filtered,
          daily_intention: intention || null,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,brief_date" }
      )
      .select()
      .single();

    if (data) {
      onUpdate(data);
      setSaved(true);
    }
    setSaving(false);
  };

  const updatePriority = (idx: number, value: string) => {
    const next = [...priorities];
    next[idx] = value;
    setPriorities(next);
    setSaved(false);
  };

  return (
    <div>
      <p className="section-header">Mission Brief</p>

      <div className="flex flex-col gap-2 mb-3">
        {priorities.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-apex-text-disabled font-mono text-xs w-4 flex-shrink-0">
              {i + 1}.
            </span>
            <input
              type="text"
              value={p}
              onChange={(e) => updatePriority(i, e.target.value)}
              placeholder={
                i === 0
                  ? "Top priority today..."
                  : `Priority ${i + 1}...`
              }
              className="flex-1 bg-transparent border-b border-apex-border focus:border-apex-blue/40 outline-none text-sm text-apex-text-primary placeholder:text-apex-text-disabled py-1 transition-colors"
            />
          </div>
        ))}
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={intention}
          onChange={(e) => {
            setIntention(e.target.value);
            setSaved(false);
          }}
          placeholder="Today's intention (optional)..."
          className="w-full bg-transparent border-b border-apex-border focus:border-apex-blue/40 outline-none text-xs text-apex-text-secondary placeholder:text-apex-text-disabled py-1 transition-colors italic"
        />
      </div>

      {!saved ? (
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !priorities.some((p) => p.trim())}
          className="w-full"
        >
          {saving ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            "Set brief"
          )}
        </Button>
      ) : (
        <div className="flex items-center gap-2 text-xs text-apex-green">
          <Check size={12} />
          Brief set
        </div>
      )}
    </div>
  );
}
