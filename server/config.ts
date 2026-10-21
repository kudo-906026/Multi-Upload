import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config();

const port = parseInt(process.env.PORT || '8080', 10);
// Render injects RENDER_EXTERNAL_URL (e.g. https://omnipost-video.onrender.com)
const rawBaseUrl = process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
// Normalize base URL without trailing slash
const publicBaseUrl = rawBaseUrl.replace(/\/+$/, '');

export const config = {
  port,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Public base URL (for OAuth callbacks & video serving)
  publicBaseUrl,

  // Encryption key for securing stored OAuth tokens at rest (AES-256-GCM)
  encryptionKey: process.env.TOKEN_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || '',

  // Secret token for protecting /api/cron/tick background scheduler endpoint
  cronSecret: process.env.CRON_SECRET || 'omnipost_secure_cron_secret_2026',

  // Gemini API Key
  geminiApiKey: process.env.GEMINI_API_KEY || '',

  // YouTube Data API v3 Key
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',

  // Google / YouTube Developer App Credentials
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET || '',
    redirectUri: `${publicBaseUrl}/api/auth/youtube/callback`,
  },

  // Meta / Instagram Developer App Credentials (Instagram API with Instagram Login)
  meta: {
    appId: process.env.META_APP_ID || process.env.INSTAGRAM_CLIENT_ID || process.env.META_CLIENT_ID || '',
    appSecret: process.env.META_APP_SECRET || process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_CLIENT_SECRET || '',
    redirectUri:
      process.env.INSTAGRAM_REDIRECT_URI ||
      process.env.META_REDIRECT_URI ||
      'https://omnipost-k6b5.onrender.com/api/auth/instagram/callback',
  },

  // Supabase Storage & Database Configuration (Free Tier, replaces GCS & Firestore)
  supabase: {
    url: (process.env.SUPABASE_URL || '').replace(/\/+$/, ''),
    key:
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY ||
      '',
    anonKey:
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      '',
    bucket: process.env.SUPABASE_STORAGE_BUCKET || process.env.SUPABASE_BUCKET || 'videos',
  },

  // Google Cloud Storage (Legacy / Optional)
  gcsBucketName: process.env.GCS_BUCKET_NAME || '',
  
  // Storage upload directory
  uploadDir: path.resolve(process.cwd(), 'uploads'),
};
