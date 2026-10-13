# OmniPost Video ⚡

> Production-quality multi-platform video publisher for **YouTube Shorts** and **Instagram Reels** with **Gemini AI & Google Search Grounding**.
> **100% Free Hosting**: Powered by **Supabase** (Database & Storage) and **Render** (Free Web Service with FFmpeg) — **No Google Cloud billing or paid subscriptions required!**

Upload video formats (MP4, MOV, WebM, MKV, AVI, etc.) directly to Supabase Storage using signed upload URLs, format aspect ratios (9:16, 1:1, 4:5, 16:9), analyze trends with Gemini Search Grounding, preview platform mockups, generate smart SEO keywords and Instagram alt-text, and publish seamlessly to YouTube and Instagram Reels with automatic post-publish cleanup.

---

## 🚀 Free Deployment Guide (Supabase + Render)

You can run and host the entire application **100% free** without any credit card or Google Cloud billing by combining:
1. **Supabase (Free Tier)**: For storing OAuth account tokens and temporary video files with signed upload URLs.
2. **Render (Free Web Service)**: For running the Dockerized Node.js/Express + React application with FFmpeg pre-installed.
3. **Google AI Studio (Free Tier)**: For Gemini API key with Google Search Grounding.

---

### Step 1: Set Up Supabase (Database & Storage)

1. Create a free account at [Supabase](https://supabase.com/) and create a **New Project**.
2. **Create the Public Storage Bucket**:
   - In your project sidebar, click **Storage** -> **New Bucket**.
   - Name the bucket: `videos`
   - Toggle **Public bucket** to **ON** (required so Meta Graph API can fetch video files for Instagram Reels).
   - Under **Additional Configuration**, set **Allowed MIME types** to `video/*` and maximum file size to `1073741824` (1 GB).
   - Click **Save**.
3. **Run the Multi-User Database & Security Rules Script**:
   - In your Supabase project sidebar, click **SQL Editor** -> **New query**.
   - Paste and run the complete script from **`supabase_schema.sql`** (or below):

   ```sql
   -- 1. Connected Accounts (isolated by user_id)
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

   -- 2. Platform Presets (isolated by user_id)
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

   -- 3. Publishing Jobs (isolated by user_id)
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

   -- 4. History (isolated by user_id)
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

   -- 5. AI Usage & Rate Limiting (isolated by user_id)
   CREATE TABLE IF NOT EXISTS public.user_ai_usage (
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     usage_date DATE NOT NULL,
     analyze_count INT DEFAULT 0,
     trend_count INT DEFAULT 0,
     keywords_count INT DEFAULT 0,
     last_request_at TIMESTAMPTZ DEFAULT NOW(),
     PRIMARY KEY (user_id, usage_date)
   );

   -- Enable Row Level Security (RLS) on all tables (No USING (true) policies)
   ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.presets ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.user_ai_usage ENABLE ROW LEVEL SECURITY;

   -- Zero-Trust User Isolation Policies
   CREATE POLICY "Users can only view their own accounts" ON public.connected_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
   CREATE POLICY "Users can only insert their own accounts" ON public.connected_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
   CREATE POLICY "Users can only update their own accounts" ON public.connected_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
   CREATE POLICY "Users can only delete their own accounts" ON public.connected_accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);

   CREATE POLICY "Users can only view their own presets" ON public.presets FOR SELECT TO authenticated USING (auth.uid() = user_id);
   CREATE POLICY "Users can only insert their own presets" ON public.presets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
   CREATE POLICY "Users can only update their own presets" ON public.presets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
   CREATE POLICY "Users can only delete their own presets" ON public.presets FOR DELETE TO authenticated USING (auth.uid() = user_id);

   CREATE POLICY "Users can only view their own jobs" ON public.jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
   CREATE POLICY "Users can only insert their own jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
   CREATE POLICY "Users can only update their own jobs" ON public.jobs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
   CREATE POLICY "Users can only delete their own jobs" ON public.jobs FOR DELETE TO authenticated USING (auth.uid() = user_id);

   CREATE POLICY "Users can only view their own history" ON public.history FOR SELECT TO authenticated USING (auth.uid() = user_id);
   CREATE POLICY "Users can only insert their own history" ON public.history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
   CREATE POLICY "Users can only delete their own history" ON public.history FOR DELETE TO authenticated USING (auth.uid() = user_id);

   CREATE POLICY "Users can only view their own AI usage" ON public.user_ai_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
   CREATE POLICY "Users can only update their own AI usage" ON public.user_ai_usage FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
   ```

4. **Copy your API Credentials**:
   - Go to **Project Settings** (gear icon) -> **API**.
   - Copy **Project URL** (`https://<project-ref>.supabase.co`).
   - Copy **`anon` Public Key** (used for browser user auth).
   - Copy **`service_role` Secret Key** (used by backend only).

---

### Step 2: Deploy to Render (Free Web Service with FFmpeg)

Render provides free Docker hosting and automatically assigns an HTTPS URL (`https://<your-app-name>.onrender.com`).

#### Option A: 1-Click Blueprint (Recommended)
1. Fork or push this repository to your **GitHub** account.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New +** -> **Blueprint**.
3. Select your repository. Render will automatically detect `render.yaml`.
4. Enter the required environment variables when prompted and click **Apply**.

#### Option B: Manual Web Service Setup
1. In the [Render Dashboard](https://dashboard.render.com/), click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name**: `omnipost-video` (or your preferred name)
   - **Region**: Choose the closest region (e.g., Oregon, Frankfurt, Singapore)
   - **Runtime**: **Docker** (Render will build `Dockerfile` which includes `ffmpeg` and Node.js 22)
   - **Instance Type**: **Free**
4. Under **Environment Variables**, add:

| Key | Value / Description |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | Your Supabase Project URL (`https://<project-ref>.supabase.co`) |
| `SUPABASE_ANON_KEY` | Your Supabase `anon` public key (for user sign-in/up) |
| `SUPABASE_SECRET_KEY` | Your Supabase `service_role` / Secret API key (or `SUPABASE_SERVICE_ROLE_KEY`) |
| `SUPABASE_STORAGE_BUCKET` | `videos` |
| `GEMINI_API_KEY` | Your free Gemini API key from [Google AI Studio](https://aistudio.google.com/) |
| `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID (from Google Cloud Console) |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth Client Secret |
| `META_APP_ID` | Your Meta Developer App ID (Instagram Graph API) |
| `META_APP_SECRET` | Your Meta Developer App Secret |
| `TOKEN_ENCRYPTION_KEY` | Any random 32+ character string (for AES-256-GCM token encryption & OAuth state signing) |

*(Note: Render automatically injects `PORT=10000` and `RENDER_EXTERNAL_URL`. The app dynamically binds to `process.env.PORT` on `0.0.0.0` and uses `RENDER_EXTERNAL_URL` if `PUBLIC_BASE_URL` is omitted).*

5. Click **Create Web Service**. Render will build the container, install FFmpeg, compile the client and server, and make your app live!

---

### Step 3: Exact OAuth Redirect URIs to Register

To connect YouTube channels and Instagram accounts in-app, register the exact callback URIs in your developer portals using your Render domain (`https://<your-app-name>.onrender.com`):

| Platform | Developer Portal | Exact Authorized Redirect URI | Required Scopes |
| :--- | :--- | :--- | :--- |
| **YouTube** | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) | `https://<your-app-name>.onrender.com/api/auth/youtube/callback`<br/>*(or `http://localhost:8080/api/auth/youtube/callback`)* | `youtube.upload`<br/>`youtube.readonly`<br/>`userinfo.profile` |
| **Instagram** | [Meta for Developers](https://developers.facebook.com/apps) | `https://<your-app-name>.onrender.com/api/auth/instagram/callback`<br/>*(or `http://localhost:8080/api/auth/instagram/callback`)* | `instagram_basic`<br/>`instagram_content_publish`<br/>`pages_show_list`<br/>`pages_read_engagement` |

#### 1. YouTube Data API Setup (Free Google Cloud Project)
*(Google Cloud Projects are free and do not require billing for standard YouTube Data API v3 quota)*:
1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Go to **APIs & Services** -> **Library** -> Search and enable **YouTube Data API v3**.
3. Go to **OAuth consent screen**:
   - User Type: **External**
   - Fill in App name & developer email.
   - Add scopes:
     - `https://www.googleapis.com/auth/youtube.upload`
     - `https://www.googleapis.com/auth/youtube.readonly`
     - `https://www.googleapis.com/auth/userinfo.profile`
   - Under **Test users**, add your Google email address.
4. Go to **Credentials** -> **Create Credentials** -> **OAuth client ID**:
   - Application type: **Web application**
   - Name: `OmniPost Video Client`
   - **Authorized redirect URIs**:
     - `https://<your-app-name>.onrender.com/api/auth/youtube/callback`
     - `http://localhost:8080/api/auth/youtube/callback` (for local development)
5. Copy **Client ID** and **Client Secret** into your Render environment variables.

#### 2. Instagram Graph API Setup (Free Meta Developer Account)
1. Open [Meta for Developers](https://developers.facebook.com/) and create a free App.
2. Select App Type: **Business** or **Other**.
3. Under Add products, add **Instagram Graph API** / **Instagram**.
4. Go to **Instagram** / **Facebook Login** -> **Settings**:
   - Under **Valid OAuth Redirect URIs**, enter:
     - `https://<your-app-name>.onrender.com/api/auth/instagram/callback`
     - `http://localhost:8080/api/auth/instagram/callback` (for local development)
5. In App **Settings** -> **Basic**, copy your **App ID** and **App Secret**.
6. Ensure your Instagram account is an **Instagram Professional (Business or Creator)** account linked to a Facebook Page.

---

## 🔄 Direct Supabase Upload & Auto-Delete Lifecycle

1. **Direct Signed Upload**: When selecting a video, the browser asks the backend for a signed upload URL (`POST /api/upload/resumable/init`). The backend generates a signed URL with Supabase Storage.
2. **Zero Backend Bandwidth**: The browser uploads the raw video bytes directly to Supabase via HTTP `PUT`. The Render server never receives the raw video upload stream, saving CPU, RAM, and bandwidth.
3. **Public URL with Byte-Ranges**: Supabase Storage provides a public URL with native HTTP Byte-Range support, allowing Meta's servers to ingest the video directly when publishing Instagram Reels.
4. **Automatic Post-Publish Deletion**: As soon as publishing to YouTube and/or Instagram completes, `JobQueueService` automatically calls `VideoStorageService.deleteVideoAfterPosting()`. This deletes the video file from Supabase Storage and clears temporary cache on disk, preventing storage accumulation and keeping you safely within the free tier.

---

## 📱 Mobile & PWA Installation

OmniPost Video includes a built-in **Progressive Web App (PWA)** and **Capacitor Android** configuration:
- **PWA on Android / iOS / Desktop**: Tap **Install App** in your browser toolbar or header to run full-screen as a standalone native app.
- **Android APK**: Automated GitHub Actions workflow `.github/workflows/build-android-apk.yml` builds debug APKs directly in your GitHub Actions tab.

---

## 💻 Local Development

```bash
# 1. Clone repository
git clone <your-repo-url>
cd omnipost-video

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env
# Edit .env with your Supabase, Gemini, and OAuth credentials

# 4. Start local development server (Express + Vite HMR on port 8080)
npm run dev

# 5. Build for production test
npm run build
npm start
```
