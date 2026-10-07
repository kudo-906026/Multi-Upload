import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Public base URL (used for media access by Instagram)
  publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 8080}`,

  // Gemini API
  geminiApiKey: process.env.GEMINI_API_KEY || '',

  // YouTube / Google OAuth
  youtube: {
    clientId: process.env.YOUTUBE_CLIENT_ID || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
    redirectUri: process.env.YOUTUBE_REDIRECT_URI || `http://localhost:${process.env.PORT || 8080}/api/auth/youtube/callback`,
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN || '',
  },

  // Instagram Graph API
  instagram: {
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
    userId: process.env.INSTAGRAM_USER_ID || '',
    tokenIssuedAt: process.env.INSTAGRAM_TOKEN_ISSUED_AT ? new Date(process.env.INSTAGRAM_TOKEN_ISSUED_AT) : new Date(),
  },

  // Google Cloud Storage (Optional)
  gcsBucketName: process.env.GCS_BUCKET_NAME || '',
  
  // Storage upload directory
  uploadDir: path.resolve(process.cwd(), 'uploads'),
};
