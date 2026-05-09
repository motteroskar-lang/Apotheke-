"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DomainHeader } from "@/components/layout/domain-header";
import { TrendChart } from "@/components/charts/trend-chart";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Activity, Moon, Timer, Scale } from "lucide-react";
import { cn, isoDate, formatDuration, calculate1RM } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface WorkoutSet {
  exercise_name: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  is_warmup: boolean;
}

interface Workout {
  id: string;
  workout_date: string;
  duration_minutes: number | null;
  overall_feel: number | null;
  notes: string | null;
  workout_sets?: WorkoutSet[];
}

interface Run {
  id: string;
  session_date: string;
  distance_km: number;
  duration_seconds: number;
  run_type: string;
  perceived_effort: number | null;
}

interface Sleep {
  id: string;
  sleep_date: string;
  total_hours: number;
  quality: number | null;
  hrv: number | null;
}

interface Body {
  id: string;
  measured_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
}

interface Props {
  workouts: Workout[];
  runs: Run[];
  sleepRecords: Sleep[];
  bodyMeasurements: Body[];
}

type LogModal = "workout" | "sleep" | "run" | "body" | null;

export function PhysicalClient({ workouts: initWorkouts, runs: initRuns, sleepRecords: initSleep, bodyMeasurements: initBody }: Props) {
  const [workouts, setWorkouts] = useState<Workout[]>(initWorkouts);
  const [runs, setRuns] = useState<Run[]>(initRuns);
  const [sleepRecords, setSleepRecords] = useState<Sleep[]>(initSleep);
  const [bodyMeasurements, setBodyMeasurements] = useState<Body[]>(initBody);
  const [modal, setModal] = useState<LogModal>(null);

  // Forms
  const [workoutForm, setWorkoutForm] = useState({
    workout_date: isoDate(),
    duration_minutes: "",
    overall_feel: "7",
    notes: "",
    sets: [{ exercise_name: "", weight_kg: "", reps: "", rpe: "" }],
  });

  const [sleepForm, setSleepForm] = useState({
    sleep_date: isoDate(),
    total_hours: "",
    quality: "7",
    hrv: "",
    resting_hr: "",
    notes: "",
  });

  const [runForm, setRunForm] = useState({
    session_date: isoDate(),
    distance_km: "",
    duration_minutes: "",
    duration_seconds: "",
    run_type: "easy",
    perceived_effort: "7",
    avg_heart_rate: "",
    notes: "",
  });

  const [bodyForm, setBodyForm] = useState({
    measured_at: isoDate(),
    weight_kg: "",
    body_fat_pct: "",
    waist_cm: "",
    notes: "",
  });

  const handleLogWorkout = async () => {
    if (!workoutForm.workout_date) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: workout } = await supabase.from("workouts").insert({
      user_id: user.id,
      workout_date: workoutForm.workout_date,
      duration_minutes: workoutForm.duration_minutes ? parseInt(workoutForm.duration_minutes) : null,
      overall_feel: workoutForm.overall_feel ? parseInt(workoutForm.overall_feel) : null,
      notes: workoutForm.notes || null,
    }).select().single();

    if (workout) {
      const validSets = workoutForm.sets.filter((s) => s.exercise_name.trim());
      if (validSets.length > 0) {
        const setRows = validSets.map((s, i) => ({
          workout_id: workout.id,
          exercise_name: s.exercise_name,
          set_number: i + 1,
          weight_kg: s.weight_kg ? parseFloat(s.weight_kg) : null,
          reps: s.reps ? parseInt(s.reps) : null,
          rpe: s.rpe ? parseFloat(s.rpe) : null,
          is_warmup: false,
          is_pr: false,
        }));
        await supabase.from("workout_sets").insert(setRows);
      }
      setWorkouts((prev) => [{ ...workout, workout_sets: [] }, ...prev]);
    }
    setModal(null);
    setWorkoutForm({
      workout_date: isoDate(), duration_minutes: "", overall_feel: "7",
      notes: "", sets: [{ exercise_name: "", weight_kg: "", reps: "", rpe: "" }],
    });
  };

  const handleLogSleep = async () => {
    if (!sleepForm.total_hours) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from("sleep_records").upsert({
      user_id: user.id,
      sleep_date: sleepForm.sleep_date,
      total_hours: parseFloat(sleepForm.total_hours),
      quality: sleepForm.quality ? parseInt(sleepForm.quality) : null,
      hrv: sleepForm.hrv ? parseInt(sleepForm.hrv) : null,
      resting_hr: sleepForm.resting_hr ? parseInt(sleepForm.resting_hr) : null,
      notes: sleepForm.notes || null,
    }, { onConflict: "user_id,sleep_date" }).select().single();

    if (data) {
      setSleepRecords((prev) => {
        const next = prev.filter((s) => s.sleep_date !== data.sleep_date);
        return [...next, data].sort((a, b) => a.sleep_date.localeCompare(b.sleep_date));
      });
    }
    setModal(null);
  };

  const handleLogRun = async () => {
    if (!runForm.distance_km || !runForm.duration_minutes) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const durationSecs =
      parseInt(runForm.duration_minutes) * 60 + parseInt(runForm.duration_seconds || "0");

    const { data } = await supabase.from("running_sessions").insert({
      user_id: user.id,
      session_date: runForm.session_date,
      distance_km: parseFloat(runForm.distance_km),
      duration_seconds: durationSecs,
      run_type: runForm.run_type,
      perceived_effort: runForm.perceived_effort ? parseInt(runForm.perceived_effort) : null,
      avg_heart_rate: runForm.avg_heart_rate ? parseInt(runForm.avg_heart_rate) : null,
      notes: runForm.notes || null,
    }).select().single();

    if (data) setRuns((prev) => [data, ...prev]);
    setModal(null);
  };

  const handleLogBody = async () => {
    if (!workoutForm.workout_date) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from("body_measurements").insert({
      user_id: user.id,
      measured_at: bodyForm.measured_at,
      weight_kg: bodyForm.weight_kg ? parseFloat(bodyForm.weight_kg) : null,
      body_fat_pct: bodyForm.body_fat_pct ? parseFloat(bodyForm.body_fat_pct) : null,
      waist_cm: bodyForm.waist_cm ? parseFloat(bodyForm.waist_cm) : null,
      notes: bodyForm.notes || null,
    }).select().single();

    if (data) setBodyMeasurements((prev) => [...prev, data]);
    setModal(null);
  };

  // Chart data
  const sleepChartData = sleepRecords.map((s) => ({ date: s.sleep_date, value: s.total_hours }));
  const weightChartData = bodyMeasurements
    .filter((b) => b.weight_kg)
    .map((b) => ({ date: b.measured_at, value: b.weight_kg! }));
  const weeklyKm = runs.reduce((a, r) => a + r.distance_km, 0);

  // Stats
  const avgSleep = sleepRecords.length > 0
    ? (sleepRecords.reduce((a, s) => a + s.total_hours, 0) / sleepRecords.length).toFixed(1)
    : null;
  const latestWeight = bodyMeasurements.length > 0
    ? bodyMeasurements[bodyMeasurements.length - 1].weight_kg
    : null;

  return (
    <div className="animate-fade-in">
      <DomainHeader
        title="Physical"
        subtitle="Training · Sleep · Running · Body composition"
        accentColor="#3B82F6"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setModal("sleep")}>
              <Moon size={12} /> Sleep
            </Button>
            <Button size="sm" variant="outline" onClick={() => setModal("run")}>
              <Timer size={12} /> Run
            </Button>
            <Button size="sm" variant="outline" onClick={() => setModal("body")}>
              <Scale size={12} /> Body
            </Button>
            <Button size="sm" onClick={() => setModal("workout")}>
              <Plus size={12} /> Workout
            </Button>
          </div>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Sessions (30d)", value: `${workouts.length}`, sub: "target 20" },
          { label: "Sleep avg", value: avgSleep ? `${avgSleep}h` : "—", sub: "target 7.5h" },
          { label: "Weekly km", value: `${weeklyKm.toFixed(1)}km`, sub: `${runs.length} runs` },
          { label: "Weight", value: latestWeight ? `${latestWeight}kg` : "—", sub: "latest" },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <span className="data-label">{s.label}</span>
            <span className="data-value text-base">{s.value}</span>
            <span className="text-2xs text-apex-text-disabled">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-apex-surface border border-apex-border rounded-lg p-4">
          <p className="section-header">Sleep (30d)</p>
          <TrendChart
            data={sleepChartData}
            color="#A855F7"
            unit="h"
            referenceValue={7.5}
            referenceLabel="target"
            movingAverage
          />
        </div>
        {weightChartData.length > 1 && (
          <div className="bg-apex-surface border border-apex-border rounded-lg p-4">
            <p className="section-header">Body weight (90d)</p>
            <TrendChart
              data={weightChartData}
              color="#3B82F6"
              unit="kg"
              movingAverage
            />
          </div>
        )}
      </div>

      {/* Recent workouts */}
      <div className="mb-6">
        <p className="section-header">Recent Workouts</p>
        {workouts.length === 0 ? (
          <div className="border border-dashed border-apex-border rounded-lg p-6 text-center">
            <Activity size={18} className="text-apex-text-disabled mx-auto mb-2" />
            <p className="text-xs text-apex-text-muted">No workouts logged yet</p>
            <button onClick={() => setModal("workout")} className="text-xs text-apex-blue hover:underline mt-1">
              Log first workout →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {workouts.slice(0, 8).map((w) => (
              <div
                key={w.id}
                className="flex items-center gap-4 py-2 px-3 bg-apex-surface border border-apex-border rounded-md"
              >
                <span className="font-mono text-xs text-apex-text-muted w-20 flex-shrink-0">
                  {format(parseISO(w.workout_date), "EEE MMM d")}
                </span>
                <div className="flex-1 flex gap-3 flex-wrap">
                  {w.workout_sets && w.workout_sets.length > 0 ? (
                    <span className="text-xs text-apex-text-secondary">
                      {[...new Set(w.workout_sets.map((s) => s.exercise_name))].slice(0, 3).join(", ")}
                      {w.workout_sets.length > 3 ? " +" + (w.workout_sets.length - 3) : ""}
                    </span>
                  ) : (
                    <span className="text-xs text-apex-text-muted">Workout logged</span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {w.duration_minutes && (
                    <span className="font-mono text-xs text-apex-text-muted">{w.duration_minutes}min</span>
                  )}
                  {w.overall_feel && (
                    <Badge variant={w.overall_feel >= 7 ? "green" : w.overall_feel >= 5 ? "blue" : "amber"}>
                      {w.overall_feel}/10
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent runs */}
      {runs.length > 0 && (
        <div>
          <p className="section-header">Recent Runs</p>
          <div className="flex flex-col gap-2">
            {runs.slice(0, 5).map((r) => {
              const pace = r.duration_seconds / r.distance_km;
              const paceMin = Math.floor(pace / 60);
              const paceSec = Math.round(pace % 60);
              return (
                <div key={r.id} className="flex items-center gap-4 py-2 px-3 bg-apex-surface border border-apex-border rounded-md">
                  <span className="font-mono text-xs text-apex-text-muted w-20 flex-shrink-0">
                    {format(parseISO(r.session_date), "EEE MMM d")}
                  </span>
                  <Badge variant={
                    r.run_type === "zone2" ? "green"
                    : r.run_type === "interval" ? "red"
                    : r.run_type === "tempo" ? "amber"
                    : "default"
                  }>
                    {r.run_type}
                  </Badge>
                  <span className="font-mono text-xs text-apex-text-primary">
                    {r.distance_km.toFixed(2)}km
                  </span>
                  <span className="font-mono text-xs text-apex-text-muted">
                    {paceMin}:{paceSec.toString().padStart(2, "0")}/km
                  </span>
                  <span className="font-mono text-xs text-apex-text-muted ml-auto">
                    {formatDuration(r.duration_seconds)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Log workout modal */}
      <Modal open={modal === "workout"} onOpenChange={(o) => !o && setModal(null)} title="Log Workout" size="lg">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <Input label="Date" type="date" value={workoutForm.workout_date}
              onChange={(e) => setWorkoutForm({ ...workoutForm, workout_date: e.target.value })} />
            <Input label="Duration (min)" type="number" placeholder="75" value={workoutForm.duration_minutes}
              onChange={(e) => setWorkoutForm({ ...workoutForm, duration_minutes: e.target.value })} />
            <Input label="Feel (1-10)" type="number" min="1" max="10" value={workoutForm.overall_feel}
              onChange={(e) => setWorkoutForm({ ...workoutForm, overall_feel: e.target.value })} />
          </div>

          <div>
            <p className="section-header mb-2">Sets</p>
            <div className="flex flex-col gap-2">
              {workoutForm.sets.map((set, i) => (
                <div key={i} className="grid grid-cols-4 gap-2">
                  <input className="apex-input col-span-2 text-xs" placeholder="Exercise name" value={set.exercise_name}
                    onChange={(e) => {
                      const next = [...workoutForm.sets];
                      next[i] = { ...next[i], exercise_name: e.target.value };
                      setWorkoutForm({ ...workoutForm, sets: next });
                    }} />
                  <input className="apex-input text-xs" placeholder="kg" type="number" value={set.weight_kg}
                    onChange={(e) => {
                      const next = [...workoutForm.sets];
                      next[i] = { ...next[i], weight_kg: e.target.value };
                      setWorkoutForm({ ...workoutForm, sets: next });
                    }} />
                  <input className="apex-input text-xs" placeholder="reps" type="number" value={set.reps}
                    onChange={(e) => {
                      const next = [...workoutForm.sets];
                      next[i] = { ...next[i], reps: e.target.value };
                      setWorkoutForm({ ...workoutForm, sets: next });
                    }} />
                </div>
              ))}
              <button
                onClick={() => setWorkoutForm({ ...workoutForm, sets: [...workoutForm.sets, { exercise_name: "", weight_kg: "", reps: "", rpe: "" }] })}
                className="text-xs text-apex-blue hover:underline text-left"
              >
                + Add set
              </button>
            </div>
          </div>

          <Textarea label="Notes" placeholder="Optional..." value={workoutForm.notes}
            onChange={(e) => setWorkoutForm({ ...workoutForm, notes: e.target.value })} rows={2} />

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleLogWorkout} className="flex-1">Save workout</Button>
          </div>
        </div>
      </Modal>

      {/* Log sleep modal */}
      <Modal open={modal === "sleep"} onOpenChange={(o) => !o && setModal(null)} title="Log Sleep">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date (wake)" type="date" value={sleepForm.sleep_date}
              onChange={(e) => setSleepForm({ ...sleepForm, sleep_date: e.target.value })} />
            <Input label="Total hours" type="number" step="0.1" placeholder="7.5" value={sleepForm.total_hours}
              onChange={(e) => setSleepForm({ ...sleepForm, total_hours: e.target.value })} autoFocus />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Quality (1-10)" type="number" min="1" max="10" value={sleepForm.quality}
              onChange={(e) => setSleepForm({ ...sleepForm, quality: e.target.value })} />
            <Input label="HRV (ms)" type="number" placeholder="65" value={sleepForm.hrv}
              onChange={(e) => setSleepForm({ ...sleepForm, hrv: e.target.value })} />
            <Input label="Resting HR" type="number" placeholder="52" value={sleepForm.resting_hr}
              onChange={(e) => setSleepForm({ ...sleepForm, resting_hr: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleLogSleep} disabled={!sleepForm.total_hours} className="flex-1">Save</Button>
          </div>
        </div>
      </Modal>

      {/* Log run modal */}
      <Modal open={modal === "run"} onOpenChange={(o) => !o && setModal(null)} title="Log Run">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" value={runForm.session_date}
              onChange={(e) => setRunForm({ ...runForm, session_date: e.target.value })} />
            <Select label="Type" value={runForm.run_type} onValueChange={(v) => setRunForm({ ...runForm, run_type: v })}>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="zone2">Zone 2</SelectItem>
              <SelectItem value="tempo">Tempo</SelectItem>
              <SelectItem value="interval">Interval</SelectItem>
              <SelectItem value="long">Long run</SelectItem>
              <SelectItem value="recovery">Recovery</SelectItem>
              <SelectItem value="race">Race</SelectItem>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Distance (km)" type="number" step="0.01" placeholder="10.00" value={runForm.distance_km}
              onChange={(e) => setRunForm({ ...runForm, distance_km: e.target.value })} autoFocus />
            <Input label="Duration (min)" type="number" placeholder="48" value={runForm.duration_minutes}
              onChange={(e) => setRunForm({ ...runForm, duration_minutes: e.target.value })} />
            <Input label="Avg HR" type="number" placeholder="145" value={runForm.avg_heart_rate}
              onChange={(e) => setRunForm({ ...runForm, avg_heart_rate: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleLogRun} disabled={!runForm.distance_km || !runForm.duration_minutes} className="flex-1">Save</Button>
          </div>
        </div>
      </Modal>

      {/* Log body modal */}
      <Modal open={modal === "body"} onOpenChange={(o) => !o && setModal(null)} title="Body Measurement">
        <div className="flex flex-col gap-4">
          <Input label="Date" type="date" value={bodyForm.measured_at}
            onChange={(e) => setBodyForm({ ...bodyForm, measured_at: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Weight (kg)" type="number" step="0.1" placeholder="84.5" value={bodyForm.weight_kg}
              onChange={(e) => setBodyForm({ ...bodyForm, weight_kg: e.target.value })} autoFocus />
            <Input label="Body fat %" type="number" step="0.1" placeholder="14.5" value={bodyForm.body_fat_pct}
              onChange={(e) => setBodyForm({ ...bodyForm, body_fat_pct: e.target.value })} />
            <Input label="Waist (cm)" type="number" step="0.5" placeholder="82" value={bodyForm.waist_cm}
              onChange={(e) => setBodyForm({ ...bodyForm, waist_cm: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleLogBody} className="flex-1">Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
