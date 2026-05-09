-- APEX OS — Initial Schema
-- Run in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES & IDENTITY
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  date_of_birth DATE,
  timezone TEXT DEFAULT 'Europe/Oslo',
  identity_statement TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE identity_pillars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pillar TEXT NOT NULL,
  category TEXT CHECK (category IN ('physical','mental','financial','character','career','vision')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE personal_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GOALS & VISION
-- ============================================

CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('physical','mental','financial','career','character','vision')),
  horizon TEXT CHECK (horizon IN ('life','decade','annual','quarterly','monthly')),
  year INTEGER,
  quarter INTEGER CHECK (quarter BETWEEN 1 AND 4),
  target_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','achieved','abandoned','deferred')),
  parent_goal_id UUID REFERENCES goals(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE weekly_focus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  focus_areas TEXT[] NOT NULL,
  top_priority TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

CREATE TABLE weekly_sitrep (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  what_happened TEXT,
  what_worked TEXT,
  what_didnt TEXT,
  patterns_observed TEXT,
  changes_next_week TEXT,
  next_week_focus TEXT,
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 10),
  physical_rating INTEGER CHECK (physical_rating BETWEEN 1 AND 10),
  mental_rating INTEGER CHECK (mental_rating BETWEEN 1 AND 10),
  financial_rating INTEGER CHECK (financial_rating BETWEEN 1 AND 10),
  discipline_rating INTEGER CHECK (discipline_rating BETWEEN 1 AND 10),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- ============================================
-- HABITS & DISCIPLINE
-- ============================================

CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('physical','mental','financial','character','career')),
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily','weekdays','custom')),
  custom_days INTEGER[],
  is_non_negotiable BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  completed BOOLEAN NOT NULL,
  skipped BOOLEAN DEFAULT false,
  skip_reason TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habit_id, log_date)
);

CREATE TABLE discomfort_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('physical','social','professional','financial','emotional')),
  intensity INTEGER CHECK (intensity BETWEEN 1 AND 10),
  outcome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PHYSICAL PERFORMANCE
-- ============================================

CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  muscle_groups TEXT[],
  movement_pattern TEXT CHECK (movement_pattern IN ('push','pull','squat','hinge','carry','rotate','core','other')),
  equipment TEXT,
  is_compound BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('strength','hypertrophy','power','endurance','circuit','mobility')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES workout_templates(id),
  workout_date DATE NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  overall_feel INTEGER CHECK (overall_feel BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id),
  exercise_name TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  weight_kg DECIMAL(6,2),
  reps INTEGER,
  rpe DECIMAL(3,1),
  is_warmup BOOLEAN DEFAULT false,
  is_pr BOOLEAN DEFAULT false,
  notes TEXT
);

CREATE TABLE running_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  session_date DATE NOT NULL,
  start_time TIMESTAMPTZ,
  distance_km DECIMAL(6,3) NOT NULL,
  duration_seconds INTEGER NOT NULL,
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  elevation_gain_m INTEGER,
  run_type TEXT CHECK (run_type IN ('easy','tempo','interval','long','recovery','race','zone2')) DEFAULT 'easy',
  vo2max_estimate DECIMAL(5,2),
  perceived_effort INTEGER CHECK (perceived_effort BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  measured_at DATE NOT NULL,
  weight_kg DECIMAL(5,2),
  body_fat_pct DECIMAL(5,2),
  waist_cm DECIMAL(5,1),
  chest_cm DECIMAL(5,1),
  left_arm_cm DECIMAL(5,1),
  right_arm_cm DECIMAL(5,1),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sleep_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  sleep_date DATE NOT NULL,
  bedtime TIMESTAMPTZ,
  wake_time TIMESTAMPTZ,
  total_hours DECIMAL(4,2) NOT NULL,
  quality INTEGER CHECK (quality BETWEEN 1 AND 10),
  hrv INTEGER,
  resting_hr INTEGER,
  notes TEXT,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sleep_date)
);

-- ============================================
-- MENTAL PERFORMANCE
-- ============================================

CREATE TABLE deep_work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  session_date DATE NOT NULL,
  start_time TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL,
  project TEXT,
  focus_quality INTEGER CHECK (focus_quality BETWEEN 1 AND 10),
  distractions INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reading_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  book_title TEXT NOT NULL,
  author TEXT,
  category TEXT DEFAULT 'other',
  status TEXT DEFAULT 'reading' CHECK (status IN ('planned','reading','completed','abandoned')),
  start_date DATE,
  end_date DATE,
  pages_total INTEGER,
  pages_read INTEGER DEFAULT 0,
  rating INTEGER CHECK (rating BETWEEN 1 AND 10),
  key_insight TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  entry_date DATE NOT NULL,
  entry_type TEXT DEFAULT 'daily' CHECK (entry_type IN ('daily','morning','evening','reflection','event')),
  content TEXT,
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  mood INTEGER CHECK (mood BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FINANCIAL GROWTH
-- ============================================

CREATE TABLE financial_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  snapshot_date DATE NOT NULL,
  net_worth DECIMAL(14,2) NOT NULL,
  total_assets DECIMAL(14,2),
  total_liabilities DECIMAL(14,2),
  cash_savings DECIMAL(14,2),
  investment_value DECIMAL(14,2),
  other_assets DECIMAL(14,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

CREATE TABLE income_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('salary','freelance','business','dividend','rental','other')),
  currency TEXT DEFAULT 'NOK',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE income_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID REFERENCES income_streams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  record_month DATE NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stream_id, record_month)
);

CREATE TABLE expense_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  record_month DATE NOT NULL,
  category TEXT CHECK (category IN ('housing','food','transport','health','education','entertainment','other')),
  amount DECIMAL(14,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, record_month, category)
);

-- ============================================
-- SKILLS & CAREER
-- ============================================

CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('business','technical','communication','physical','language','creative','other')),
  current_level INTEGER DEFAULT 1 CHECK (current_level BETWEEN 1 AND 10),
  target_level INTEGER DEFAULT 10,
  description TEXT,
  evidence TEXT[],
  last_assessed DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE skill_progress_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  previous_level INTEGER,
  new_level INTEGER,
  evidence TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DAILY OPERATIONS
-- ============================================

CREATE TABLE daily_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  brief_date DATE NOT NULL,
  top_3_priorities TEXT[] NOT NULL DEFAULT '{}',
  energy_forecast INTEGER CHECK (energy_forecast BETWEEN 1 AND 10),
  daily_intention TEXT,
  completed_at TIMESTAMPTZ,
  end_of_day_rating INTEGER CHECK (end_of_day_rating BETWEEN 1 AND 10),
  end_of_day_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, brief_date)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_focus ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_sitrep ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE discomfort_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE running_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE deep_work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_progress_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_briefs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see/edit their own profile
CREATE POLICY "profiles_self" ON profiles FOR ALL USING (auth.uid() = id);

-- Generic user_id policy factory (for all tables with user_id)
CREATE POLICY "identity_pillars_self" ON identity_pillars FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "personal_values_self" ON personal_values FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "goals_self" ON goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "weekly_focus_self" ON weekly_focus FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "weekly_sitrep_self" ON weekly_sitrep FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "habits_self" ON habits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "habit_logs_self" ON habit_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "discomfort_log_self" ON discomfort_log FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "workout_templates_self" ON workout_templates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "workouts_self" ON workouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "running_sessions_self" ON running_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "body_measurements_self" ON body_measurements FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "sleep_records_self" ON sleep_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "deep_work_sessions_self" ON deep_work_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "reading_log_self" ON reading_log FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "journal_entries_self" ON journal_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "financial_snapshots_self" ON financial_snapshots FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "income_streams_self" ON income_streams FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "income_records_self" ON income_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "expense_records_self" ON expense_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "skills_self" ON skills FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "daily_briefs_self" ON daily_briefs FOR ALL USING (auth.uid() = user_id);

-- Exercises: system exercises readable by all, user exercises by owner
CREATE POLICY "exercises_read" ON exercises FOR SELECT USING (
  created_by IS NULL OR auth.uid() = created_by
);
CREATE POLICY "exercises_write" ON exercises FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "exercises_update" ON exercises FOR UPDATE USING (auth.uid() = created_by);

-- Workout sets via workout ownership
CREATE POLICY "workout_sets_self" ON workout_sets FOR ALL USING (
  workout_id IN (SELECT id FROM workouts WHERE user_id = auth.uid())
);

-- Skill progress log via skill ownership
CREATE POLICY "skill_progress_log_self" ON skill_progress_log FOR ALL USING (
  skill_id IN (SELECT id FROM skills WHERE user_id = auth.uid())
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
