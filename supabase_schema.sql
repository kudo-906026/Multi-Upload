-- ==============================================================================
-- OmniPost Video - Multi-User Supabase Database & Security Rules
-- Production Schema with Row Level Security (RLS) & auth.users Isolation
-- ==============================================================================
-- Run this script in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ==============================================================================

-- 1. CONNECTED ACCOUNTS TABLE
-- Stores connected YouTube channels and Instagram Professional accounts per user
CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  name TEXT NOT NULL,
  handle TEXT,
  avatar_url TEXT,
  platform_account_id TEXT NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_default BOOLEAN DEFAULT false,
  encrypted_tokens JSONB NOT NULL
);

-- Migration for existing installations without user_id
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'connected_accounts' 
      AND column_name = 'user_id'
  ) THEN 
    ALTER TABLE public.connected_accounts 
      ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF; 
END $$;

-- 2. PLATFORM PRESETS TABLE
-- Stores custom hashtags, footers, and publish defaults per user & platform
CREATE TABLE IF NOT EXISTS public.presets (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  name TEXT NOT NULL,
  fixed_hashtags JSONB DEFAULT '[]'::jsonb,
  description_footer TEXT DEFAULT '',
  category TEXT DEFAULT '28',
  privacy TEXT DEFAULT 'public',
  tone TEXT DEFAULT 'viral_hook',
  share_to_feed BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT presets_user_platform_unique UNIQUE (user_id, platform)
);

-- Migration for existing presets
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'presets' 
      AND column_name = 'user_id'
  ) THEN 
    ALTER TABLE public.presets 
      ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF; 
END $$;

-- 3. PUBLISHING JOBS TABLE
-- Stores multi-platform video publishing queues and live statuses per user
CREATE TABLE IF NOT EXISTS public.jobs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_status TEXT NOT NULL,
  target_platforms JSONB NOT NULL,
  video JSONB NOT NULL,
  selected_accounts JSONB,
  metadata JSONB NOT NULL,
  platform_results JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Migration for existing jobs
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'jobs' 
      AND column_name = 'user_id'
  ) THEN 
    ALTER TABLE public.jobs 
      ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF; 
END $$;

-- 4. PUBLISHING HISTORY TABLE
-- Records published video links and post confirmations per user
CREATE TABLE IF NOT EXISTS public.history (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id TEXT REFERENCES public.jobs(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  external_id TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  details JSONB
);

-- Migration for existing history
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'history' 
      AND column_name = 'user_id'
  ) THEN 
    ALTER TABLE public.history 
      ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF; 
END $$;

-- 5. USER AI USAGE & RATE LIMITING TABLE
-- Tracks daily Gemini AI analysis requests per user to protect shared API quota
CREATE TABLE IF NOT EXISTS public.user_ai_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  analyze_count INT DEFAULT 0,
  trend_count INT DEFAULT 0,
  keywords_count INT DEFAULT 0,
  last_request_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, usage_date)
);

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- Zero-trust: Every user can ONLY access and modify their own records.
-- No permissive "USING (true)" policies exist.
-- ==============================================================================

-- Drop legacy permissive policies if they exist
DROP POLICY IF EXISTS "Allow service role full access" ON public.connected_accounts;
DROP POLICY IF EXISTS "Allow service role full access" ON public.presets;
DROP POLICY IF EXISTS "Allow service role full access" ON public.jobs;
DROP POLICY IF EXISTS "Allow service role full access" ON public.history;
DROP POLICY IF EXISTS "Allow service role full access" ON public.user_ai_usage;

-- Enable RLS on every table
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_usage ENABLE ROW LEVEL SECURITY;

-- Drop prior user policies to avoid duplicate name conflicts
DROP POLICY IF EXISTS "Users can only view their own accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can only insert their own accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can only update their own accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can only delete their own accounts" ON public.connected_accounts;

DROP POLICY IF EXISTS "Users can only view their own presets" ON public.presets;
DROP POLICY IF EXISTS "Users can only insert their own presets" ON public.presets;
DROP POLICY IF EXISTS "Users can only update their own presets" ON public.presets;
DROP POLICY IF EXISTS "Users can only delete their own presets" ON public.presets;

DROP POLICY IF EXISTS "Users can only view their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can only insert their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can only update their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can only delete their own jobs" ON public.jobs;

DROP POLICY IF EXISTS "Users can only view their own history" ON public.history;
DROP POLICY IF EXISTS "Users can only insert their own history" ON public.history;
DROP POLICY IF EXISTS "Users can only delete their own history" ON public.history;

DROP POLICY IF EXISTS "Users can only view their own AI usage" ON public.user_ai_usage;
DROP POLICY IF EXISTS "Users can only update their own AI usage" ON public.user_ai_usage;

-- Policy definitions for connected_accounts
CREATE POLICY "Users can only view their own accounts"
  ON public.connected_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own accounts"
  ON public.connected_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own accounts"
  ON public.connected_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own accounts"
  ON public.connected_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy definitions for presets
CREATE POLICY "Users can only view their own presets"
  ON public.presets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own presets"
  ON public.presets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own presets"
  ON public.presets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own presets"
  ON public.presets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy definitions for jobs
CREATE POLICY "Users can only view their own jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own jobs"
  ON public.jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own jobs"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own jobs"
  ON public.jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy definitions for history
CREATE POLICY "Users can only view their own history"
  ON public.history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own history"
  ON public.history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own history"
  ON public.history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy definitions for user_ai_usage
CREATE POLICY "Users can only view their own AI usage"
  ON public.user_ai_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only update their own AI usage"
  ON public.user_ai_usage FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 7. SUPABASE STORAGE BUCKET POLICIES (videos bucket)
-- Allows authenticated users to upload and manage videos under their own user folder:
-- /videos/<auth.uid()>/<filename>
-- ==============================================================================

-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('videos', 'videos', true, 1073741824, ARRAY['video/*'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 1073741824;

-- Storage object policies
DROP POLICY IF EXISTS "Users can upload to their own user folder" ON storage.objects;
DROP POLICY IF EXISTS "Public can stream videos for publishing" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own videos" ON storage.objects;

-- Allow users to upload only inside their own folder: <user_id>/<file>
CREATE POLICY "Users can upload to their own user folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'videos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read so Meta Instagram servers can stream published video files
CREATE POLICY "Public can stream videos for publishing"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'videos');

-- Allow users to delete their own video files
CREATE POLICY "Users can delete their own videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'videos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ==============================================================================
-- 8. SCHEDULING, ANALYTICS SNAPSHOTS, BEST TIME & CONTENT PLANNER TABLES
-- All tables protected with Zero-Trust Per-User Row Level Security (RLS)
-- NO "USING (true)" policies exist anywhere in this schema.
-- ==============================================================================

-- 8.1. SCHEDULED POSTS TABLE
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

-- 8.2. VIDEO ANALYTICS TABLE
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

-- 8.3. ACCOUNT ANALYTICS SNAPSHOTS TABLE
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

-- 8.4. CONTENT PLANS TABLE
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

-- 8.5. ROW LEVEL SECURITY (RLS) POLICIES FOR NEW TABLES
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_plans ENABLE ROW LEVEL SECURITY;

-- scheduled_posts RLS
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
