export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  date_of_birth: string | null;
  timezone: string;
  identity_statement: string | null;
  created_at: string;
  updated_at: string;
}

export interface IdentityPillar {
  id: string;
  user_id: string;
  pillar: string;
  category: string;
  active: boolean;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  horizon: string;
  year: number | null;
  quarter: number | null;
  target_date: string | null;
  status: string;
  parent_goal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyFocus {
  id: string;
  user_id: string;
  week_start: string;
  focus_areas: string[];
  top_priority: string;
  notes: string | null;
  created_at: string;
}

export interface WeeklySitrep {
  id: string;
  user_id: string;
  week_start: string;
  what_happened: string | null;
  what_worked: string | null;
  what_didnt: string | null;
  patterns_observed: string | null;
  changes_next_week: string | null;
  next_week_focus: string | null;
  overall_rating: number | null;
  physical_rating: number | null;
  mental_rating: number | null;
  financial_rating: number | null;
  discipline_rating: number | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string;
  frequency: string;
  custom_days: number[] | null;
  is_non_negotiable: boolean;
  active: boolean;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  log_date: string;
  completed: boolean;
  skipped: boolean;
  skip_reason: string | null;
  logged_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  template_id: string | null;
  workout_date: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  overall_feel: number | null;
  notes: string | null;
  created_at: string;
}

export interface WorkoutSet {
  id: string;
  workout_id: string;
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  is_warmup: boolean;
  is_pr: boolean;
  notes: string | null;
}

export interface RunningSession {
  id: string;
  user_id: string;
  session_date: string;
  distance_km: number;
  duration_seconds: number;
  avg_heart_rate: number | null;
  run_type: string;
  vo2max_estimate: number | null;
  perceived_effort: number | null;
  notes: string | null;
  created_at: string;
}

export interface SleepRecord {
  id: string;
  user_id: string;
  sleep_date: string;
  bedtime: string | null;
  wake_time: string | null;
  total_hours: number;
  quality: number;
  hrv: number | null;
  resting_hr: number | null;
  notes: string | null;
  created_at: string;
}

export interface BodyMeasurement {
  id: string;
  user_id: string;
  measured_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  waist_cm: number | null;
  notes: string | null;
  created_at: string;
}

export interface DeepWorkSession {
  id: string;
  user_id: string;
  session_date: string;
  duration_minutes: number;
  project: string | null;
  focus_quality: number | null;
  distractions: number;
  notes: string | null;
  created_at: string;
}

export interface ReadingLog {
  id: string;
  user_id: string;
  book_title: string;
  author: string | null;
  category: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  pages_total: number | null;
  pages_read: number;
  rating: number | null;
  key_insight: string | null;
  notes: string | null;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  entry_date: string;
  entry_type: string;
  content: string | null;
  energy_level: number | null;
  mood: number | null;
  created_at: string;
}

export interface FinancialSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  net_worth: number;
  total_assets: number | null;
  total_liabilities: number | null;
  cash_savings: number | null;
  investment_value: number | null;
  created_at: string;
}

export interface IncomeStream {
  id: string;
  user_id: string;
  name: string;
  type: string;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export interface IncomeRecord {
  id: string;
  stream_id: string;
  user_id: string;
  record_month: string;
  amount: number;
  notes: string | null;
  created_at: string;
}

export interface ExpenseRecord {
  id: string;
  user_id: string;
  record_month: string;
  category: string;
  amount: number;
  notes: string | null;
  created_at: string;
}

export interface Skill {
  id: string;
  user_id: string;
  name: string;
  category: string;
  current_level: number;
  target_level: number;
  description: string | null;
  evidence: string[] | null;
  last_assessed: string | null;
  created_at: string;
}

export interface DailyBrief {
  id: string;
  user_id: string;
  brief_date: string;
  top_3_priorities: string[];
  energy_forecast: number | null;
  daily_intention: string | null;
  completed_at: string | null;
  end_of_day_rating: number | null;
  end_of_day_note: string | null;
  created_at: string;
}
