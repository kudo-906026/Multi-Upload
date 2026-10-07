# OmniPost Video ⚡

> Production-quality multi-platform video publisher for **YouTube Shorts** and **Instagram Reels** with **Gemini AI & Google Search Grounding**.

Upload a single video master once, analyze live trends with Google Search grounding, preview and edit platform-tailored metadata with device mockups, apply saved presets, and publish seamlessly to YouTube (via YouTube Data API v3 Resumable Upload) and Instagram (via Graph API Reels Container flow) with an asynchronous job queue and per-platform retry recovery.

---

## 📱 Download & Install Options

### 1. Native Android App (Capacitor APK)
OmniPost Video is configured as a native Android app powered by **Capacitor**:
- **Automated GitHub Builds**: The workflow `.github/workflows/build-android-apk.yml` automatically compiles `omnipost-video-latest.apk` on every push!
- **Download from GitHub Actions Artifacts**: Go to your GitHub repository -> **Actions** tab -> click latest run -> download **`omnipost-video-android-apk`**.
- **Download from GitHub Releases**: Direct APK release attached to version tags (e.g. `v1.0.0`).
- **Local Native Android Build**:
  ```bash
  npm run cap:sync    # Build client & sync web assets to android/
  npm run cap:build   # Build debug APK using Gradle
  ```

### 2. One-Click Native App Installation (PWA)
OmniPost is packaged as a **Progressive Web App (PWA)** with standalone windowing, offline asset caching, and native OS integration:
- **Android / Chrome Desktop**: Tap the **"Download App"** button in the header, or click the **Install App** icon in the browser address bar.
- **iOS / Safari**: Tap **Share (⎋)** -> scroll down -> tap **"Add to Home Screen (⊞)"** -> tap **Add**.
- Launches directly from your phone app drawer or desktop dock without browser toolbars.

### 2. Download from GitHub Releases
Our automated GitHub Actions workflow builds and publishes production archives on every release:
- Go to **GitHub -> Releases**
- Download `omnipost-video-v1.0.0-standalone.zip` or `.tar.gz`
- Unzip and run:
  ```bash
  npm install --omit=dev
  npm start
  ```

### 3. Run with Docker (Single Command)
```bash
docker run -d \
  -p 8080:8080 \
  -e GEMINI_API_KEY="your_api_key" \
  --name omnipost-video \
  ghcr.io/malakardilip170/omnipost-video:latest
```

---

## 🛠️ GitHub Actions Workflows

We provide three complete, automated GitHub workflows under `.github/workflows/`:

1. **`ci.yml` (CI - Build & Test)**:
   - Triggers on every push and pull request to `main`.
   - Runs TypeScript linting, verification, and full-stack builds (`npm run build`).
   - Verifies that both `dist/client/index.html` and the server bundle compile cleanly before any merge.

2. **`release.yml` (Release & Distribute App)**:
   - Triggers when you push a version tag (e.g. `git tag v1.0.0 && git push origin v1.0.0`) or click **Run workflow** in the GitHub Actions tab.
   - Automatically builds the full application.
   - Packages standalone distribution ZIP and TAR.GZ archives.
   - Publishes a formal GitHub Release with download links and release notes.
   - Builds and publishes the multi-architecture Docker image to **GitHub Container Registry (ghcr.io)**.

3. **`deploy-cloud-run.yml` (Continuous Deployment)**:
   - Automated workflow to deploy the container directly to Google Cloud Run.

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

---

## Local Development & Packaging

```bash
# 1. Install dependencies
npm install

# 2. Run dev server (Express + Vite HMR)
npm run dev

# 3. Build for production
npm run build

# 4. Create standalone downloadable zip package
npm run package

# 5. Start production server
npm start
```
