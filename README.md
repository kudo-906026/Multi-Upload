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
3. **Create the Connected Accounts Table**:
   - In your project sidebar, click **SQL Editor** -> **New query**.
   - Paste and run the following SQL schema:

   ```sql
   CREATE TABLE IF NOT EXISTS connected_accounts (
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

   -- Enable Row Level Security (optional for backend service role key)
   ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;

   -- Service role bypasses RLS; allow server access
   CREATE POLICY "Allow service role full access" ON connected_accounts
     FOR ALL USING (true);
   ```

4. **Copy your API Credentials**:
   - Go to **Project Settings** (gear icon) -> **API**.
   - Copy **Project URL** (`https://<project-ref>.supabase.co`).
   - Copy **`service_role` Secret Key** (used by backend to generate signed upload URLs and manage tokens securely).

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
| `SUPABASE_SECRET_KEY` | Your Supabase `service_role` / Secret API key (or `SUPABASE_SERVICE_ROLE_KEY`) |
| `SUPABASE_STORAGE_BUCKET` | `videos` |
| `GEMINI_API_KEY` | Your free Gemini API key from [Google AI Studio](https://aistudio.google.com/) |
| `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID (from Google Cloud Console) |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth Client Secret |
| `META_APP_ID` | Your Meta Developer App ID (Instagram Graph API) |
| `META_APP_SECRET` | Your Meta Developer App Secret |
| `TOKEN_ENCRYPTION_KEY` | Any random 32+ character string (for AES-256-GCM token encryption) |

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
