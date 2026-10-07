# OmniPost Video ⚡

> Production-quality multi-platform video publisher for **YouTube Shorts** and **Instagram Reels** with **Gemini AI & Google Search Grounding**.

Upload a single video master once, analyze live trends with Google Search grounding, preview and edit platform-tailored metadata with device mockups, apply saved presets, and publish seamlessly to YouTube (via YouTube Data API v3 Resumable Upload) and Instagram (via Graph API Reels Container flow) with an asynchronous job queue and per-platform retry recovery.

---

## Architecture & Features

1. **One-Upload Multi-Platform Distribution**:
   - Supports MP4, MOV, and WebM up to 250MB with client/server validation.
   - Generates publicly accessible video URLs with HTTP Byte-Range support (required by Meta Graph API).
   - Distribute to YouTube, Instagram Reels, or both simultaneously.

2. **Gemini AI with Google Search Grounding**:
   - Grounded trend analysis powered by `gemini-2.5-flash` with Google Search tool (`google_search: {}`).
   - Retrieves real-time viral search queries, trending keywords, and high-retention hook recommendations.
   - Generates tailored packages for each platform:
     - **YouTube**: SEO title (<100 chars), rich chapter description, search tags (<500 chars), strategic hashtags, category mapping.
     - **Instagram Reels**: 3-second hook line, visual emoji caption, high-performing hashtag clusters, recommended trending audio style.

3. **Editable Review & Interactive Device Mockups**:
   - Live YouTube Shorts player mockup with channel badge, subscribe action, and tag chips.
   - Live Instagram Reels 9:16 vertical smartphone mockup with handle, caption expander, and engagement overlay.
   - Full editing controls for titles, descriptions, tag chips, category IDs, privacy visibility (`public`, `unlisted`, `private`), and feed sharing.

4. **Presets System**:
   - Save and edit custom presets per platform (fixed branded hashtags, description footers/links, category, privacy, tone).
   - Smart merge logic: Deduplicates hashtags, appends rich footer links, and overrides defaults.
   - Persists to database store (`data/presets.json` and Firestore compatible).

5. **YouTube Data API v3 (Resumable Upload)**:
   - Google OAuth 2.0 flow with refresh token management.
   - Multi-chunk resumable upload protocol (`uploadType=resumable&part=snippet,status`) with live byte progress tracking.

6. **Instagram Graph API Reels Publishing Flow**:
   - Full 3-step Reels container flow:
     1. `POST /{ig_user_id}/media` (creates container with public video URL)
     2. `GET /{container_id}` (polls status every 4 seconds until `FINISHED`)
     3. `POST /{ig_user_id}/media_publish` (publishes Reel live)
   - Automatic 60-day long-lived token refresh mechanism via Graph API.

7. **Fault-Tolerant Job Queue & Post History**:
   - Asynchronous background jobs with per-platform states (`pending`, `uploading`, `processing`, `published`, `failed`).
   - **Isolation Guarantee**: If Instagram fails (e.g. aspect ratio or network timeout), YouTube still publishes successfully!
   - Independent retry buttons for failed platforms without re-uploading succeeded ones.
   - Live execution event log console for every job.

---

## Environment Variables Setup

Create a `.env` file in the root directory (based on `.env.example`):

```bash
# Server Port & Base URL
PORT=8080
PUBLIC_BASE_URL=https://your-cloud-run-service.run.app

# Gemini API (Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key

# YouTube Data API v3 (Google Cloud Console OAuth 2.0 Web Application)
YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=https://your-cloud-run-service.run.app/api/auth/youtube/callback
YOUTUBE_REFRESH_TOKEN=your_refresh_token

# Meta Instagram Graph API (Instagram Business/Creator Account)
INSTAGRAM_ACCESS_TOKEN=your_long_lived_user_access_token
INSTAGRAM_USER_ID=your_instagram_business_account_id
```

### How to Obtain Credentials:

1. **Gemini API Key**:
   - Go to [Google AI Studio](https://aistudio.google.com/)
   - Click "Get API key" and paste it as `GEMINI_API_KEY`.

2. **YouTube Data API v3**:
   - Open [Google Cloud Console](https://console.cloud.google.com/)
   - Enable **YouTube Data API v3**.
   - Create an **OAuth 2.0 Client ID** (Web application).
   - Add authorized redirect URI: `https://your-domain.run.app/api/auth/youtube/callback` (or `http://localhost:8080/api/auth/youtube/callback` in local dev).
   - Scopes required: `https://www.googleapis.com/auth/youtube.upload` and `https://www.googleapis.com/auth/youtube.readonly`.

3. **Instagram Graph API**:
   - Convert your Instagram account to a **Business** or **Creator** account.
   - Connect it to a Facebook Page in Meta Business Suite.
   - In [Meta for Developers](https://developers.facebook.com/), create an app and add the **Instagram Graph API**.
   - Generate a Long-Lived User Access Token with permissions: `instagram_basic`, `instagram_content_publish`.
   - Find your Instagram User ID via Graph API Explorer: `GET /me/accounts?fields=instagram_business_account`.

*Note: In development or test mode when credentials are not yet entered, OmniPost automatically activates high-fidelity simulated test modes so the full uploading, container polling, and queueing workflows can be tested immediately.*

---

## Installation & Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run dev server (Express + Vite HMR)
npm run dev

# 3. Build for production (Cloud Run)
npm run build

# 4. Start production server
npm start
```

---

## Deployment to Google Cloud Run

Deploy with Docker or Buildpacks directly to Cloud Run:

```bash
gcloud run deploy omnipost-video \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,GEMINI_API_KEY=xxx"
```
