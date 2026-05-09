"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skill } from "@/types/database";
import { DomainHeader } from "@/components/layout/domain-header";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Layers, ArrowUp } from "lucide-react";
import { cn, isoDate } from "@/lib/utils";

interface Props {
  skills: Skill[];
  deepWork: { project: string | null; duration_minutes: number }[];
}

const LEVEL_LABELS = ["", "Novice", "Beginner", "Developing", "Competent", "Proficient", "Advanced", "Expert", "Master", "Elite", "World-class"];

const CATEGORY_COLORS: Record<string, string> = {
  business: "#F59E0B",
  technical: "#3B82F6",
  communication: "#A855F7",
  physical: "#22C55E",
  language: "#06B6D4",
  creative: "#EC4899",
  other: "#52525B",
};

export function SkillsClient({ skills: initSkills, deepWork }: Props) {
  const [skills, setSkills] = useState<Skill[]>(initSkills);
  const [addOpen, setAddOpen] = useState(false);
  const [levelUpId, setLevelUpId] = useState<string | null>(null);
  const [levelUpEvidence, setLevelUpEvidence] = useState("");

  const [form, setForm] = useState({
    name: "", category: "business", current_level: "1", target_level: "10", description: "",
  });

  const byCategory = skills.reduce<Record<string, Skill[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("skills").insert({
      user_id: user.id,
      name: form.name,
      category: form.category,
      current_level: parseInt(form.current_level),
      target_level: parseInt(form.target_level),
      description: form.description || null,
    }).select().single();
    if (data) setSkills((prev) => [...prev, data]);
    setAddOpen(false);
    setForm({ name: "", category: "business", current_level: "1", target_level: "10", description: "" });
  };

  const handleLevelUp = async () => {
    if (!levelUpId || !levelUpEvidence.trim()) return;
    const skill = skills.find((s) => s.id === levelUpId);
    if (!skill || skill.current_level >= skill.target_level) return;
    const supabase = createClient();
    const newLevel = skill.current_level + 1;
    await supabase.from("skill_progress_log").insert({
      skill_id: levelUpId, log_date: isoDate(),
      previous_level: skill.current_level, new_level: newLevel, evidence: levelUpEvidence,
    });
    await supabase.from("skills").update({
      current_level: newLevel, last_assessed: isoDate(),
    }).eq("id", levelUpId);
    setSkills((prev) => prev.map((s) => s.id === levelUpId ? { ...s, current_level: newLevel } : s));
    setLevelUpId(null);
    setLevelUpEvidence("");
  };

  return (
    <div className="animate-fade-in">
      <DomainHeader
        title="Skills"
        subtitle="Competency tracking · Evidence-based progression"
        accentColor="#F59E0B"
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={12} /> Add skill
          </Button>
        }
      />

      {skills.length === 0 ? (
        <div className="border border-dashed border-apex-border rounded-lg p-10 text-center">
          <Layers size={22} className="text-apex-text-disabled mx-auto mb-3" />
          <p className="text-sm text-apex-text-muted mb-1">No skills tracked</p>
          <p className="text-xs text-apex-text-disabled mb-4">Add skills and level up through evidence-based progression.</p>
          <Button size="sm" onClick={() => setAddOpen(true)}>Add first skill</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(byCategory).map(([category, catSkills]) => (
            <div key={category}>
              <p className="section-header capitalize">{category}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {catSkills.map((skill) => {
                  const pct = ((skill.current_level - 1) / (skill.target_level - 1)) * 100;
                  const color = CATEGORY_COLORS[skill.category] ?? "#52525B";
                  return (
                    <div key={skill.id} className="bg-apex-surface border border-apex-border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-apex-text-primary">{skill.name}</p>
                          <p className="text-2xs text-apex-text-muted">{LEVEL_LABELS[skill.current_level]}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-apex-text-secondary">
                            {skill.current_level}/{skill.target_level}
                          </span>
                          <button
                            onClick={() => setLevelUpId(skill.id)}
                            className="p-1 rounded hover:bg-apex-surface-2 text-apex-text-muted hover:text-apex-amber transition-colors"
                          >
                            <ArrowUp size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="h-1 bg-apex-surface-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      {skill.description && (
                        <p className="text-2xs text-apex-text-disabled mt-1.5">{skill.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add skill modal */}
      <Modal open={addOpen} onOpenChange={setAddOpen} title="Add Skill">
        <div className="flex flex-col gap-4">
          <Input label="Skill name" placeholder="e.g. Sales, Python, Spanish..." value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          <Select label="Category" value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
            <SelectItem value="communication">Communication</SelectItem>
            <SelectItem value="physical">Physical</SelectItem>
            <SelectItem value="language">Language</SelectItem>
            <SelectItem value="creative">Creative</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Current level (1-10)" type="number" min="1" max="10" value={form.current_level}
              onChange={(e) => setForm({ ...form, current_level: e.target.value })} />
            <Input label="Target level (1-10)" type="number" min="1" max="10" value={form.target_level}
              onChange={(e) => setForm({ ...form, target_level: e.target.value })} />
          </div>
          <Textarea label="Description (optional)" placeholder="What does mastery look like?" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.name.trim()} className="flex-1">Add skill</Button>
          </div>
        </div>
      </Modal>

      {/* Level up modal */}
      <Modal open={!!levelUpId} onOpenChange={(o) => !o && setLevelUpId(null)} title="Level Up Skill">
        <div className="flex flex-col gap-4">
          {levelUpId && (
            <>
              <div className="bg-apex-surface-2 rounded-md px-3 py-2">
                <p className="text-xs text-apex-text-secondary">
                  {skills.find((s) => s.id === levelUpId)?.name} —{" "}
                  Level {skills.find((s) => s.id === levelUpId)?.current_level} →{" "}
                  {(skills.find((s) => s.id === levelUpId)?.current_level ?? 0) + 1}
                </p>
              </div>
              <Textarea
                label="Evidence of level up"
                placeholder="What proves you've reached this level? Specific achievement, project, or demonstration..."
                value={levelUpEvidence}
                onChange={(e) => setLevelUpEvidence(e.target.value)}
                rows={3}
                autoFocus
              />
              <p className="text-2xs text-apex-text-disabled">
                You cannot level up without evidence. Theory without application = zero.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setLevelUpId(null)} className="flex-1">Cancel</Button>
                <Button onClick={handleLevelUp} disabled={!levelUpEvidence.trim()} className="flex-1">Confirm level up</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
