# OmniPost Video ⚡

A multi-platform video publishing studio for **YouTube Shorts** and **Instagram Reels** with **Gemini AI & Google Search Grounding**.

---

## User Guide

### 1. Sign Up & Log In
1. Open the application in your browser.
2. If you don't have an account, click **"Sign up"** and enter your email and a password (minimum 6 characters), or click **"Sign in with Google"**.
3. Once logged in, your session is saved automatically.
4. If you ever forget your password, click **"Forgot password?"** on the login screen to receive a password reset link by email.
5. You can log out anytime using the **Logout** button in the top navigation bar.

---

### 2. Connect Your YouTube & Instagram Accounts
Each user manages their own independent accounts. Your tokens are encrypted and never shared with other users.

#### Connecting YouTube (Google):
1. Navigate to the **Accounts** tab in the navigation bar.
2. Click **"Connect YouTube Channel"**.
3. You will be redirected to Google's sign-in page. Select the Google account that manages your YouTube channel.
4. Allow permissions for YouTube video uploads (`youtube.upload`).
5. After authorizing, you will be redirected back to the app with your YouTube channel name and avatar connected.

#### Connecting Instagram (Meta):
1. Navigate to the **Accounts** tab in the navigation bar.
2. Click **"Connect Instagram Account"**.
3. **Important Requirements**:
   - Your Instagram account **must be a Professional Account** (Creator or Business). Personal Instagram accounts cannot publish Reels via the Instagram Graph API. To switch, open the Instagram mobile app -> **Settings** -> **Account Type and Tools** -> **Switch to Professional Account**.
   - If the Meta developer app is currently in **Development Mode**, your Facebook/Instagram user account must be added as a **Tester** or **Developer** under the Meta App Dashboard (**App Roles** -> **Roles** -> **Add Testers**), and you must accept the invitation at [developers.facebook.com/requests](https://developers.facebook.com/requests).
4. Authorize the requested permissions (`instagram_basic`, `instagram_content_publish`).
5. After authorizing, your Instagram handle will appear under Connected Accounts.
6. Instagram tokens remain valid for 60 days. You can refresh your token at any time by clicking **"Refresh Token"** on the Accounts page.

---

### 3. Using the Video Studio

#### Step 1: Upload Video
- Drag and drop or browse any video file (MP4, MOV, WebM, MKV, AVI, etc., up to 1GB).
- Your file is uploaded into your private, isolated user folder on cloud storage.

#### Step 2: Format & Trim
- **Aspect Ratio**: Convert your video to vertical format (9:16 Shorts/Reels), Square (1:1), Portrait feed (4:5), or Widescreen (16:9).
- **Background Styling**: Choose intelligent Gaussian Blur padding, Center Crop, or Scale to Fit.
- **Trimming**: Set start and end points to keep your video within platform duration limits.

#### Step 3: AI Trend Analysis & SEO
- Enter an optional niche, topic, or focus keyword.
- Click **"Analyze with Gemini AI"**. Gemini uses real-time Google Search Grounding to find currently trending keywords and generates:
  - Viral titles optimized for high click-through rates.
  - SEO-rich descriptions and platform-specific hashtags.
  - YouTube search tags and Instagram accessibility alt-text.

#### Step 4: Review & Multi-Platform Publish
- Preview live mockups showing how your video will look on YouTube Shorts and Instagram Reels.
- Fine-tune captions, privacy status (Public, Unlisted, Private), and select which accounts to post to.
- Click **"Publish"** to begin simultaneous background publishing.
- **Automatic Cleanup**: As soon as posting completes, the master video file is automatically deleted from cloud storage to protect your privacy and prevent storage clutter.

---

### 4. Platform Presets
Under the **Presets** tab, configure reusable defaults per platform:
- **Fixed Hashtags**: Hashtags that are automatically added to every post (e.g., `#shorts #reels #creator`).
- **Description Footer**: Standard signature text (e.g., links to your website, merchandise, or social handles).
- **Default Privacy & Category**: Pre-select your preferred YouTube category and visibility.

---

### 5. Trends Tab
- Browse viral topics, breakout keywords, and popular audio across niches (Tech, Gaming, Fitness, Food, Finance, Lifestyle, etc.) and regions.
- Click **"Use in Studio"** on any trend to immediately start a new video project seeded with that topic.

---

### 6. Queue & Publishing History
- The **Queue** tab monitors live publishing jobs, displaying real-time progress for transcoding, container generation, and platform status.
- Once completed, view direct clickable links to your published YouTube Short or Instagram Reel.

---

### 7. Troubleshooting

- **"No connected account found"**: Make sure you have connected your YouTube channel or Instagram account under the **Accounts** tab before clicking Publish.
- **Instagram "Media container creation failed"**: Verify that your Instagram account is a Creator or Business account, and that your video is an accepted format (MP4/MOV with H.264 video and AAC audio).
- **Instagram "App Not Active / Feature Unavailable"**: While the Meta developer app is in Development Mode, only approved testers can connect. Ensure your account is added under **App Roles -> Testers** in the Meta Developer Console.
- **Too Many AI Requests (HTTP 429)**: Each user has a generous daily quota (20 analyses, 30 trend searches per day) and a rate limit of 10 requests per minute to protect the shared Gemini API capacity. Quotas reset daily at 00:00 UTC.

---

## Deployment (Developers Only)

To host this multi-user application on Render with Supabase:

### Environment Variables

Configure these variables in your **Render Web Service Dashboard** (under **Environment**):

| Variable Name | Purpose |
| :--- | :--- |
| `NODE_ENV` | Set to `production` |
| `PORT` | Set to `10000` (Render provides this default) |
| `PUBLIC_BASE_URL` | Your public HTTPS service URL (e.g., `https://your-app-name.onrender.com`) |
| `SUPABASE_URL` | Your Supabase project URL (`https://<project-ref>.supabase.co`) |
| `SUPABASE_ANON_KEY` | Supabase Anon Public Key (used for client-side authentication) |
| `SUPABASE_PUBLISHABLE_KEY` | Alternative name for `SUPABASE_ANON_KEY` (supported by the client) |
| `SUPABASE_SECRET_KEY` | Supabase Service Role Secret Key (used strictly by the backend) |
| `SUPABASE_STORAGE_BUCKET` | Public storage bucket name for temporary video uploads (default: `videos`) |
| `GEMINI_API_KEY` | Google Gemini API key from Google AI Studio |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID (YouTube Data API v3) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret |
| `META_APP_ID` | Meta App ID from Meta for Developers (Instagram Graph API) |
| `META_APP_SECRET` | Meta App Secret |
| `TOKEN_ENCRYPTION_KEY` | A random string (minimum 32 characters) for AES-256-GCM token encryption |

### OAuth Redirect URIs

Add these exact URIs in your developer consoles:

- **Google Cloud Console** (APIs & Services -> Credentials -> Authorized redirect URIs):
  ```
  https://<your-app-name>.onrender.com/api/auth/youtube/callback
  ```

- **Meta Developer Portal** (Instagram Login / Facebook Login -> Settings -> Valid OAuth Redirect URIs):
  ```
  https://<your-app-name>.onrender.com/api/auth/instagram/callback
  ```
