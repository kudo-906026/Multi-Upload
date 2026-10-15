-- ==============================================================================
-- Migration: Scheduling, Analytics Snapshots, Best Time & Content Planner
-- All tables protected with Zero-Trust Per-User Row Level Security (RLS)
-- NO "USING (true)" policies exist anywhere in this migration.
-- ==============================================================================

-- 1. SCHEDULED POSTS TABLE
-- Stores deferred Instagram & YouTube scheduled publishing jobs per user
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'instagram' or 'youtube'
  run_at TIMESTAMPTZ NOT NULL,
  time_zone TEXT NOT NULL DEFAULT 'UTC',
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'publishing', 'completed', 'failed', 'cancelled'
  video_storage_path TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  title TEXT NOT NULL,
  payload JSONB NOT NULL,
  selected_account_id TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  last_error TEXT,
  result_post_id TEXT,
  result_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_status ON public.scheduled_posts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_run_at ON public.scheduled_posts(status, run_at);

-- 2. VIDEO ANALYTICS TABLE
-- Stores per-video performance stats, retention, watch time, and categorization per user
CREATE TABLE IF NOT EXISTS public.video_analytics (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'youtube' or 'instagram'
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  video_url TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  shares BIGINT DEFAULT 0,
  saves BIGINT DEFAULT 0,
  watch_time_hours NUMERIC DEFAULT 0,
  avg_retention_percent NUMERIC DEFAULT 0,
  first_48h_views BIGINT DEFAULT 0,
  first_48h_engagement_rate NUMERIC DEFAULT 0,
  tags JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  character TEXT,
  series TEXT,
  edit_style TEXT,
  music_audio TEXT,
  duration_seconds INT DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT video_analytics_user_platform_video UNIQUE (user_id, platform, video_id)
);

CREATE INDEX IF NOT EXISTS idx_video_analytics_user_views ON public.video_analytics(user_id, views DESC);
CREATE INDEX IF NOT EXISTS idx_video_analytics_user_published ON public.video_analytics(user_id, published_at DESC);

-- 3. ACCOUNT ANALYTICS SNAPSHOTS TABLE
-- Stores daily aggregated performance metrics per account & platform per user
CREATE TABLE IF NOT EXISTS public.account_analytics_snapshots (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  shares_saves BIGINT DEFAULT 0,
  subscribers_followers BIGINT DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT account_snapshots_user_platform_date UNIQUE (user_id, platform, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_account_snapshots_user_date ON public.account_analytics_snapshots(user_id, snapshot_date DESC);

-- 4. CONTENT PLANS TABLE
-- Stores AI-generated "What to upload next" patterns, 10 viral ideas & 2-week calendar per user
CREATE TABLE IF NOT EXISTS public.content_plans (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  niche TEXT NOT NULL,
  patterns JSONB NOT NULL,
  ideas JSONB NOT NULL,
  weekly_calendar JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_plans_user ON public.content_plans(user_id, updated_at DESC);

-- ==============================================================================
-- ZERO-TRUST ROW LEVEL SECURITY (RLS) POLICIES
-- Strict user isolation: auth.uid() = user_id. NO "USING (true)" policies!
-- ==============================================================================

-- Enable RLS on all 4 new tables
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_plans ENABLE ROW LEVEL SECURITY;

-- scheduled_posts RLS
DROP POLICY IF EXISTS "Users can only view their own scheduled posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Users can only insert their own scheduled posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Users can only update their own scheduled posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Users can only delete their own scheduled posts" ON public.scheduled_posts;

CREATE POLICY "Users can only view their own scheduled posts"
  ON public.scheduled_posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own scheduled posts"
  ON public.scheduled_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own scheduled posts"
  ON public.scheduled_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own scheduled posts"
  ON public.scheduled_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- video_analytics RLS
DROP POLICY IF EXISTS "Users can only view their own video analytics" ON public.video_analytics;
DROP POLICY IF EXISTS "Users can only insert their own video analytics" ON public.video_analytics;
DROP POLICY IF EXISTS "Users can only update their own video analytics" ON public.video_analytics;
DROP POLICY IF EXISTS "Users can only delete their own video analytics" ON public.video_analytics;

CREATE POLICY "Users can only view their own video analytics"
  ON public.video_analytics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own video analytics"
  ON public.video_analytics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own video analytics"
  ON public.video_analytics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own video analytics"
  ON public.video_analytics FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- account_analytics_snapshots RLS
DROP POLICY IF EXISTS "Users can only view their own account analytics" ON public.account_analytics_snapshots;
DROP POLICY IF EXISTS "Users can only insert their own account analytics" ON public.account_analytics_snapshots;
DROP POLICY IF EXISTS "Users can only update their own account analytics" ON public.account_analytics_snapshots;
DROP POLICY IF EXISTS "Users can only delete their own account analytics" ON public.account_analytics_snapshots;

CREATE POLICY "Users can only view their own account analytics"
  ON public.account_analytics_snapshots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own account analytics"
  ON public.account_analytics_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own account analytics"
  ON public.account_analytics_snapshots FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own account analytics"
  ON public.account_analytics_snapshots FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- content_plans RLS
DROP POLICY IF EXISTS "Users can only view their own content plans" ON public.content_plans;
DROP POLICY IF EXISTS "Users can only insert their own content plans" ON public.content_plans;
DROP POLICY IF EXISTS "Users can only update their own content plans" ON public.content_plans;
DROP POLICY IF EXISTS "Users can only delete their own content plans" ON public.content_plans;

CREATE POLICY "Users can only view their own content plans"
  ON public.content_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own content plans"
  ON public.content_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own content plans"
  ON public.content_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own content plans"
  ON public.content_plans FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
