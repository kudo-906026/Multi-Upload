import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config();

const port = parseInt(process.env.PORT || '8080', 10);
const rawBaseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${port}`;
// Normalize base URL without trailing slash
const publicBaseUrl = rawBaseUrl.replace(/\/+$/, '');

export const config = {
  port,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Public base URL (for OAuth callbacks & video serving)
  publicBaseUrl,

  // Encryption key for securing stored OAuth tokens at rest (AES-256-GCM)
  encryptionKey: process.env.TOKEN_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || '',

  // Gemini API Key
  geminiApiKey: process.env.GEMINI_API_KEY || '',

  // Google / YouTube Developer App Credentials
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET || '',
    redirectUri: `${publicBaseUrl}/api/auth/youtube/callback`,
  },

  // Meta / Instagram Developer App Credentials
  meta: {
    appId: process.env.META_APP_ID || process.env.INSTAGRAM_CLIENT_ID || process.env.META_CLIENT_ID || '',
    appSecret: process.env.META_APP_SECRET || process.env.INSTAGRAM_CLIENT_SECRET || process.env.META_CLIENT_SECRET || '',
    redirectUri: `${publicBaseUrl}/api/auth/instagram/callback`,
  },

  // Google Cloud Storage (Optional)
  gcsBucketName: process.env.GCS_BUCKET_NAME || '',
  
  // Storage upload directory
  uploadDir: path.resolve(process.cwd(), 'uploads'),
};
