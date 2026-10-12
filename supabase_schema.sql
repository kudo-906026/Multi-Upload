-- ==============================================================================
-- OmniPost Video - Supabase Database & Storage Setup Script
-- ==============================================================================
-- Run this complete script in your Supabase Dashboard:
-- 1. Go to your Supabase Project -> SQL Editor
-- 2. Click "New query", paste this entire script, and click "Run" (Ctrl+Enter)
-- ==============================================================================

-- 1. Connected Accounts Table (OAuth Tokens for YouTube & Instagram)
-- Stores channel metadata and AES-256-GCM encrypted refresh/access tokens
CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id TEXT PRIMARY KEY,
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

-- Index for fast platform lookups
CREATE INDEX IF NOT EXISTS idx_connected_accounts_platform 
  ON public.connected_accounts (platform);

-- Enable Row Level Security (RLS)
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running script
DROP POLICY IF EXISTS "Allow backend full access to connected_accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Allow service role full access" ON public.connected_accounts;

-- Permissive policy allowing backend (service role, anon, authenticated) full CRUD access
CREATE POLICY "Allow backend full access to connected_accounts" 
  ON public.connected_accounts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- 2. Public Video Storage Bucket Setup
-- ==============================================================================
-- Inserts the public 'videos' bucket into Supabase Storage if it does not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  1073741824, -- 1 GB file size limit
  ARRAY['video/*']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 1073741824,
  allowed_mime_types = ARRAY['video/*'];

-- Storage RLS Policies for 'videos' bucket
DROP POLICY IF EXISTS "Public can view videos bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to videos bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow update to videos bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete from videos bucket" ON storage.objects;

-- Allow public read access (required for Meta Graph API / Instagram Reels ingestion)
CREATE POLICY "Public can view videos bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

-- Allow signed & direct uploads to the bucket
CREATE POLICY "Allow uploads to videos bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'videos');

-- Allow updating objects
CREATE POLICY "Allow update to videos bucket"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'videos');

-- Allow backend deletion of posted videos (automatic post-publish cleanup)
CREATE POLICY "Allow delete from videos bucket"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'videos');
