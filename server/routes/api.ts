import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { VideoStorageService } from '../storage/videoStorage.js';
import { GeminiService } from '../services/geminiService.js';
import { YouTubeService } from '../services/youtubeService.js';
import { InstagramService } from '../services/instagramService.js';
import { PresetService } from '../services/presetService.js';
import { JobQueueService } from '../services/jobQueue.js';
import { AccountStorageService } from '../services/accountStorage.js';
import { FFmpegService } from '../services/ffmpegService.js';
import { TrendService } from '../services/trendService.js';
import { OAuthStateService } from '../services/oauthStateService.js';
import { AIUsageService } from '../services/aiUsageService.js';
import { SchedulingService } from '../services/schedulingService.js';
import { AnalyticsService } from '../services/analyticsService.js';
import { ContentPlannerService } from '../services/contentPlannerService.js';
import { requireAuth } from '../middleware/auth.js';
import { config } from '../config.js';
import {
  ApiResponse,
  PlatformAuthStatus,
  Platform,
  ConnectedAccount,
  VideoFormatSettings,
  PlatformFormatSettings,
  VideoMetadata,
} from '../../shared/types.js';

const router = Router();

// Multer setup with support for 1GB video upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(process.cwd(), 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1 GB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /\.(mp4|mov|webm|mkv|avi|m4v|3gp|flv|wmv|mpeg|mpg|hevc|h265|ts)$/i;
    const allowedMimeTypes = [
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'video/x-matroska',
      'video/x-msvideo',
      'video/x-m4v',
      'video/3gpp',
      'video/x-flv',
      'video/x-ms-wmv',
      'video/mpeg',
      'video/hevc',
      'video/mp2t',
      'application/octet-stream',
    ];

    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.match(allowedExtensions)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Unsupported video format. Please upload MP4, MOV, WebM, MKV, AVI, M4V, 3GP, FLV, WMV, MPEG, or HEVC.'
        )
      );
    }
  },
});

// Memory storage for small chunk uploads in resumable flow
const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB max per chunk
});

// ==============================================================================
// 1. PUBLIC UNPROTECTED ENDPOINTS
// ==============================================================================

/**
 * Public endpoint that returns only SUPABASE_URL and SUPABASE_ANON_KEY.
 * The frontend fetches this at startup so it does not rely on build-time VITE_ variables.
 * Secret keys are strictly kept on backend only.
 */
router.get('/config', (req: Request, res: Response) => {
  res.json({
    SUPABASE_URL: config.supabase.url || '',
    SUPABASE_ANON_KEY: config.supabase.anonKey || '',
  });
});

router.get('/config/auth', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      supabaseUrl: config.supabase.url || '',
      supabaseAnonKey: config.supabase.anonKey || '',
    },
    SUPABASE_URL: config.supabase.url || '',
    SUPABASE_ANON_KEY: config.supabase.anonKey || '',
  });
});

/**
 * Direct browser OAuth callback from Google (YouTube).
 * Unprotected so Google can redirect without bearer header, but IDENTIFIES
 * THE USER via cryptographically signed HMAC state parameter created at connect.
 */
router.get('/auth/youtube/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;
    if (error || error_description) {
      const errMsg = String(error_description || error);
      console.warn('[YouTubeCallback] Real Google OAuth error:', errMsg);
      return res.redirect(`/?auth_error=${encodeURIComponent(`Google OAuth error: ${errMsg}`)}&platform=youtube`);
    }
    if (!code) {
      return res.redirect('/?auth_error=missing_code&platform=youtube');
    }

    const stateData = OAuthStateService.verifyState(String(state || ''), 'youtube');
    if (!stateData) {
      console.warn('[YouTubeCallback] Invalid or expired OAuth state');
      return res.redirect(
        `/?auth_error=${encodeURIComponent('Security validation failed: Invalid or expired OAuth state. Please reconnect.')}&platform=youtube`
      );
    }

    const account = await YouTubeService.handleCallback(String(code), stateData.userId);
    let targetUrl = '/?connected=youtube';
    if (account.missingPermissions && account.missingPermissions.length > 0) {
      targetUrl += `&missing=${encodeURIComponent(account.missingPermissions.join(','))}`;
    }
    return res.redirect(targetUrl);
  } catch (err: any) {
    console.error('[YouTubeCallback] Error:', err);
    const realMsg = err.response?.data?.error_description || err.response?.data?.error || err.message || 'Google OAuth exchange failed';
    return res.redirect(`/?auth_error=${encodeURIComponent(realMsg)}&platform=youtube`);
  }
});

/**
 * Direct browser OAuth callback from Meta (Instagram).
 * Unprotected so Meta can redirect without bearer header, but IDENTIFIES
 * THE USER via cryptographically signed HMAC state parameter created at connect.
 */
router.get('/auth/instagram/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description, error_reason } = req.query;
    if (error || error_description || error_reason) {
      const errMsg = String(error_description || error_reason || error);
      console.warn('[InstagramCallback] Real Meta OAuth error:', errMsg);
      return res.redirect(`/?auth_error=${encodeURIComponent(`Meta OAuth error: ${errMsg}`)}&platform=instagram`);
    }
    if (!code) {
      return res.redirect('/?auth_error=missing_code&platform=instagram');
    }

    const rawCode = String(code).replace(/#.*$/, '').trim();
    const stateData = OAuthStateService.verifyState(String(state || ''), 'instagram');
    if (!stateData) {
      console.warn('[InstagramCallback] Invalid or expired OAuth state');
      return res.redirect(
        `/?auth_error=${encodeURIComponent('Security validation failed: Invalid or expired OAuth state. Please reconnect.')}&platform=instagram`
      );
    }

    const account = await InstagramService.handleCallback(rawCode, stateData.userId);
    let targetUrl = '/?connected=instagram';
    if (account.missingPermissions && account.missingPermissions.length > 0) {
      targetUrl += `&missing=${encodeURIComponent(account.missingPermissions.join(','))}`;
    }
    return res.redirect(targetUrl);
  } catch (err: any) {
    console.error('[InstagramCallback] Error:', err);
    const realMsg = err.response?.data?.error_message || err.response?.data?.error?.message || err.message || 'Instagram OAuth exchange failed';
    return res.redirect(`/?auth_error=${encodeURIComponent(realMsg)}&platform=instagram`);
  }
});

/**
 * JSON API OAuth callback exchange for YouTube (popup / manual exchange).
 * Resolves user from state or bearer token.
 */
router.post('/auth/youtube/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Authorization code is required' });
    }

    let userId = req.user?.id;
    if (!userId && state) {
      const stateData = OAuthStateService.verifyState(String(state), 'youtube');
      if (stateData) userId = stateData.userId;
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Valid session or signed state must be provided.',
      });
    }

    const account = await YouTubeService.handleCallback(code, userId);
    res.json({
      success: true,
      data: account,
      missingPermissions: account.missingPermissions,
      message: `Connected YouTube channel: ${account.name}`,
    });
  } catch (err: any) {
    const realMsg = err.response?.data?.error_description || err.response?.data?.error || err.message || 'YouTube authorization failed';
    res.status(500).json({ success: false, error: realMsg });
  }
});

/**
 * JSON API OAuth callback exchange for Instagram.
 * Resolves user from state or bearer token.
 */
router.post('/auth/instagram/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Authorization code is required' });
    }

    let userId = req.user?.id;
    if (!userId && state) {
      const stateData = OAuthStateService.verifyState(String(state), 'instagram');
      if (stateData) userId = stateData.userId;
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Valid session or signed state must be provided.',
      });
    }

    const account = await InstagramService.handleCallback(code, userId);
    res.json({
      success: true,
      data: account,
      missingPermissions: account.missingPermissions,
      message: `Connected Instagram account: ${account.name}`,
    });
  } catch (err: any) {
    const realMsg = err.response?.data?.error_message || err.response?.data?.error?.message || err.message || 'Instagram authorization failed';
    res.status(500).json({ success: false, error: realMsg });
  }
});

// --- Protected Background Scheduled Publishing Endpoint ---
// Requires CRON_SECRET header or Bearer authorization to prevent unauthorized triggering
router.post('/cron/tick', async (req: Request, res: Response) => {
  const secretHeader = (req.headers['x-cron-secret'] as string) || '';
  const authHeader = (req.headers['authorization'] as string) || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const querySecret = (req.query.secret as string) || '';

  const incomingSecret = secretHeader || bearerToken || querySecret;

  if (!incomingSecret || incomingSecret !== config.cronSecret) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing CRON_SECRET header.',
    });
  }

  try {
    const result = await SchedulingService.processCronTick();
    res.json({
      success: true,
      message: `Cron tick completed. Processed ${result.processed} scheduled posts (${result.successful} succeeded, ${result.failed} failed).`,
      data: result,
    });
  } catch (err: any) {
    console.error('[API /cron/tick Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Also allow GET for cron services that only do GET requests
router.get('/cron/tick', async (req: Request, res: Response) => {
  const secretHeader = (req.headers['x-cron-secret'] as string) || '';
  const authHeader = (req.headers['authorization'] as string) || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const querySecret = (req.query.secret as string) || '';

  const incomingSecret = secretHeader || bearerToken || querySecret;

  if (!incomingSecret || incomingSecret !== config.cronSecret) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing CRON_SECRET header.',
    });
  }

  try {
    const result = await SchedulingService.processCronTick();
    res.json({
      success: true,
      message: `Cron tick completed. Processed ${result.processed} scheduled posts (${result.successful} succeeded, ${result.failed} failed).`,
      data: result,
    });
  } catch (err: any) {
    console.error('[API /cron/tick Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// 2. PROTECTED MULTI-USER API ROUTES (Enforces Supabase Auth Session)
// ==============================================================================

// Mount auth middleware for all subsequent routes
router.use(requireAuth);

// --- User Profile & AI Quota Routes ---
router.get('/user/me', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      id: req.user!.id,
      email: req.user!.email,
    },
  });
});

router.get('/user/ai-quota', async (req: Request, res: Response) => {
  try {
    const quota = await AIUsageService.getQuota(req.user!.id);
    res.json({ success: true, data: quota });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Multi-Account & Auth Status Routes ---
router.get('/auth/status', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const yt = await YouTubeService.getAuthStatus(userId);
  const ig = await InstagramService.getAuthStatus(userId);

  const data: PlatformAuthStatus = {
    youtube: yt,
    instagram: ig,
    developerConfig: {
      googleConfigured: Boolean(config.google.clientId && config.google.clientSecret),
      metaConfigured: Boolean(config.meta.appId && config.meta.appSecret),
      googleRedirectUri: config.google.redirectUri,
      metaRedirectUri: config.meta.redirectUri,
      publicBaseUrl: config.publicBaseUrl,
    },
  };

  res.json({ success: true, data });
});

// List all connected accounts for the logged-in user (sanitized, zero token leakage)
router.get('/accounts', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const platform = req.query.platform as Platform | undefined;
  const accounts = await AccountStorageService.getPublicAccounts(userId, platform);
  res.json({ success: true, data: accounts });
});

// Disconnect / Delete an account belonging to the logged-in user
router.delete('/accounts/:id', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const deleted = await AccountStorageService.removeAccount(userId, id);
  if (deleted) {
    res.json({ success: true, message: 'Account disconnected successfully.' });
  } else {
    res.status(404).json({ success: false, error: 'Account not found or access denied.' });
  }
});

// Set default account for a platform for the logged-in user
router.post('/accounts/:id/default', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const updated = await AccountStorageService.setDefault(userId, id);
  if (updated) {
    res.json({ success: true, message: 'Default account updated.' });
  } else {
    res.status(404).json({ success: false, error: 'Account not found or access denied.' });
  }
});

// --- YouTube Google OAuth 2.0 URL (Signed state with userId) ---
router.get('/auth/youtube/url', (req: Request, res: Response) => {
  try {
    if (!config.google.clientId || !config.google.clientSecret) {
      return res.status(400).json({
        success: false,
        error: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not configured in environment variables.',
      });
    }
    const url = YouTubeService.getAuthUrl(req.user!.id);
    res.json({ success: true, data: { url } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Instagram API OAuth URL (Signed state with userId) ---
router.get('/auth/instagram/url', (req: Request, res: Response) => {
  try {
    if (!config.meta.appId || !config.meta.appSecret) {
      return res.status(400).json({
        success: false,
        error: 'META_APP_ID and META_APP_SECRET are not configured in environment variables.',
      });
    }
    const url = InstagramService.getAuthUrl(req.user!.id);
    res.json({ success: true, data: { url } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Refresh Instagram token for default account
router.post('/auth/instagram/refresh', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const defaultAccount = AccountStorageService.getDefaultAccountTokens(userId, 'instagram');
    const accountId = defaultAccount?.account?.id;
    if (!accountId) {
      return res.status(400).json({ success: false, error: 'No Instagram account connected to refresh.' });
    }
    const result = await InstagramService.refreshAccountToken(userId, accountId);
    if (result.success) {
      res.json({
        success: true,
        data: result,
        message: 'Instagram token refreshed! 60 days remaining.',
      });
    } else {
      res.status(400).json({ success: false, error: result.error || 'Failed to refresh token' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Refresh Instagram token for specific account
router.post('/auth/instagram/:id/refresh', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const result = await InstagramService.refreshAccountToken(userId, id);
    if (result.success) {
      res.json({
        success: true,
        data: result,
        message: 'Instagram token refreshed! 60 days remaining.',
      });
    } else {
      res.status(400).json({ success: false, error: result.error || 'Failed to refresh token' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Video Upload & Resumable Upload Routes (Scoped per-user folder) ---
router.post('/upload', upload.single('video') as any, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No video file uploaded' });
    }

    const videoMetadata = await VideoStorageService.saveVideo(req.file);
    res.json({ success: true, data: videoMetadata });
  } catch (err: any) {
    console.error('[UploadRoute] Upload error:', err);
    res.status(500).json({ success: false, error: err.message || 'Video upload failed' });
  }
});

// Initialize Direct Signed Resumable Upload Session (Stores under <userId>/<filename>)
router.post('/upload/resumable/init', async (req: Request, res: Response) => {
  try {
    const { originalName, totalSize, mimeType } = req.body;
    if (!originalName || !totalSize) {
      return res.status(400).json({ success: false, error: 'originalName and totalSize are required' });
    }

    const session = await VideoStorageService.initResumableSession({
      originalName,
      totalSize: Number(totalSize),
      mimeType: mimeType || 'video/mp4',
      userId: req.user!.id,
    });

    res.json({ success: true, data: session });
  } catch (err: any) {
    console.error('[ResumableInit] Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to initialize resumable upload' });
  }
});

// Finalize direct resumable upload session
router.post('/upload/resumable/finish', async (req: Request, res: Response) => {
  try {
    const { sessionId, originalName, mimeType, totalSize } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }

    const video = await VideoStorageService.finishResumableSession({
      sessionId,
      originalName,
      mimeType,
      totalSize: totalSize ? Number(totalSize) : undefined,
    });

    res.json({ success: true, data: { isComplete: true, video } });
  } catch (err: any) {
    console.error('[ResumableFinish] Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to finalize resumable upload' });
  }
});

router.post('/upload/resumable/complete', async (req: Request, res: Response) => {
  try {
    const { sessionId, originalName, mimeType, totalSize } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }

    const video = await VideoStorageService.finishResumableSession({
      sessionId,
      originalName,
      mimeType,
      totalSize: totalSize ? Number(totalSize) : undefined,
    });

    res.json({ success: true, data: { isComplete: true, video } });
  } catch (err: any) {
    console.error('[ResumableComplete] Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to finalize resumable upload' });
  }
});

// Stream chunk for resumable upload (fallback)
router.post(
  '/upload/resumable/chunk',
  (req: Request, res: Response, next) => {
    if (req.is('application/json')) {
      return next();
    }
    (chunkUpload.single('chunk') as any)(req, res, next);
  },
  async (req: Request, res: Response) => {
    try {
      const { sessionId, isLastChunk, originalName, mimeType, totalSize } = req.body;
      if (!sessionId) {
        return res.status(400).json({ success: false, error: 'sessionId is required' });
      }

      if (req.file) {
        const result = await VideoStorageService.appendChunk(
          sessionId,
          req.file.buffer,
          isLastChunk === 'true' || isLastChunk === true
        );
        return res.json({ success: true, data: result });
      }

      const video = await VideoStorageService.finishResumableSession({
        sessionId,
        originalName,
        mimeType,
        totalSize: totalSize ? Number(totalSize) : undefined,
      });
      return res.json({ success: true, data: { isComplete: true, video } });
    } catch (err: any) {
      console.error('[ResumableChunk] Error:', err);
      res.status(500).json({ success: false, error: err.message || 'Chunk append failed' });
    }
  }
);

// Check background FFmpeg transcoding status
router.get('/conversion/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const progress = VideoStorageService.getConversionProgress(id);
  res.json({ success: true, data: progress });
});

// --- Aspect Ratio Adjustment & Trimming with FFmpeg ---
router.post('/video/:id/format', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { format, platformFormats, originalPath } = req.body;

    if (!format || !format.aspectRatio || !format.mode) {
      return res.status(400).json({ success: false, error: 'Valid format settings are required' });
    }

    let inputPath = originalPath || VideoStorageService.getFilePath(`${id}.mp4`);
    if (!inputPath || !fs.existsSync(inputPath)) {
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      const files = fs.readdirSync(uploadsDir);
      const matched = files.find((f) => f.startsWith(id) && !f.includes('_formatted'));
      if (matched) {
        inputPath = path.join(uploadsDir, matched);
      }
    }

    if (!inputPath || !fs.existsSync(inputPath)) {
      return res.status(404).json({ success: false, error: `Video file for ID ${id} not found.` });
    }

    const safeRatio = String(format.aspectRatio).replace(':', 'x');
    const formattedFilename = `${id}_formatted_${safeRatio}.mp4`;
    const outputPath = path.join(path.resolve(process.cwd(), 'uploads'), formattedFilename);

    console.log(`[FormatRoute] Formatting video ${id} with aspect ratio ${format.aspectRatio} (${format.mode})...`);

    const result = await FFmpegService.applyFormatAndTrim({
      inputPath,
      outputPath,
      format,
    });

    const publicUrl = `${config.publicBaseUrl.replace(/\/$/, '')}/media/${formattedFilename}`;

    const formattedMetadata: Partial<VideoMetadata> = {
      id,
      storagePath: result.outputPath,
      publicUrl,
      durationSec: result.duration,
      width: result.width,
      height: result.height,
      formatSettings: format,
      platformFormats,
    };

    res.json({
      success: true,
      data: formattedMetadata,
      message: `Video formatted to ${format.aspectRatio} successfully!`,
    });
  } catch (err: any) {
    console.error('[FormatRoute] Format error:', err);
    res.status(500).json({ success: false, error: err.message || 'Video formatting failed' });
  }
});

// --- Trend Finder Route (Rate Limited & Daily Quota Protected) ---
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Rate-limit per user to prevent rapid bursts
    const quotaCheck = await AIUsageService.checkAndIncrement(userId, 'trend');
    if (!quotaCheck.allowed) {
      return res.status(429).json({ success: false, error: quotaCheck.error });
    }

    const niche = String(req.query.niche || 'anime edits (amv)');
    const region = String(req.query.region || 'US');
    const timeRange = (req.query.timeRange as '24h' | '7d' | '30d') || '7d';
    const sort = (req.query.sort as 'newest' | 'most_viewed') || 'most_viewed';
    const forceRefresh = req.query.refresh === 'true';

    const report = await TrendService.getNicheTrends(niche, region, timeRange, sort, forceRefresh, userId);
    res.json({ success: true, data: report });
  } catch (err: any) {
    console.error('[TrendsRoute] Error fetching trends:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch trending topics' });
  }
});

// --- Gemini Video Analysis with Search Grounding (Rate Limited & Daily Quota Protected) ---
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Protect shared Gemini key: Check rate limit & daily quota
    const quotaCheck = await AIUsageService.checkAndIncrement(userId, 'analyze');
    if (!quotaCheck.allowed) {
      return res.status(429).json({ success: false, error: quotaCheck.error });
    }

    const {
      filename,
      videoId,
      storagePath,
      titleHint,
      descriptionHint,
      tone,
      confirmedTopic,
      confirmedSeries,
      confirmedCharacters,
    } = req.body;

    if (!filename && !videoId && !storagePath) {
      return res.status(400).json({ success: false, error: 'Filename or video identifier is required' });
    }

    const analysis = await GeminiService.analyzeVideo({
      filename: filename || (videoId ? `${videoId}.mp4` : 'video.mp4'),
      videoId,
      storagePath,
      titleHint,
      descriptionHint,
      tone,
      confirmedTopic,
      confirmedSeries,
      confirmedCharacters,
      userId,
    });

    res.json({ success: true, data: analysis });
  } catch (err: any) {
    console.error('[AnalyzeRoute] Analysis error:', err);
    res.status(500).json({ success: false, error: err.message || 'AI analysis failed' });
  }
});

// --- Smart Keyword Generation Route (Rate Limited & Daily Quota Protected) ---
router.post('/smart-keywords', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Protect shared Gemini key: Check rate limit & daily quota
    const quotaCheck = await AIUsageService.checkAndIncrement(userId, 'keywords');
    if (!quotaCheck.allowed) {
      return res.status(429).json({ success: false, error: quotaCheck.error });
    }

    const { title, description, topic, videoFilename } = req.body;
    const result = await GeminiService.generateSmartKeywords({
      title,
      description,
      topic,
      videoFilename,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('[SmartKeywordsRoute] Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate smart keywords' });
  }
});

// --- Presets Routes (Scoped by User) ---
router.get('/presets', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const presets = await PresetService.getAll(userId);
  res.json({ success: true, data: presets });
});

router.post('/presets', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      id,
      platform,
      name,
      genre,
      titleTemplate,
      descriptionTemplate,
      captionTemplate,
      fixedHashtags,
      descriptionFooter,
      tags,
      category,
      privacy,
      tone,
      shareToFeed,
      madeForKids,
      language,
      defaultLocation,
      collaborators,
      hashtagLimit,
    } = req.body;

    if (!platform || (platform !== 'youtube' && platform !== 'instagram')) {
      return res.status(400).json({ success: false, error: 'Valid platform (youtube or instagram) is required' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Preset name is required' });
    }

    const saved = await PresetService.savePreset(userId, {
      id,
      platform,
      name: name.trim(),
      genre: genre || 'custom',
      titleTemplate,
      descriptionTemplate,
      captionTemplate,
      fixedHashtags: Array.isArray(fixedHashtags) ? fixedHashtags : [],
      descriptionFooter: descriptionFooter || '',
      tags: Array.isArray(tags) ? tags : [],
      category: category || (platform === 'youtube' ? '1' : '28'),
      privacy: privacy || 'public',
      tone: tone || 'viral_hook',
      shareToFeed: shareToFeed ?? true,
      madeForKids: madeForKids ?? false,
      language: language || 'en',
      defaultLocation,
      collaborators: Array.isArray(collaborators) ? collaborators : [],
      hashtagLimit: hashtagLimit || 5,
    });

    res.json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/presets/merge', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { aiOutput, platform, presetId, customPreset } = req.body;
    if (!aiOutput || !platform) {
      return res.status(400).json({ success: false, error: 'aiOutput and platform are required' });
    }

    let preset = customPreset;
    if (!preset && presetId) {
      preset = await PresetService.getById(userId, presetId);
    }

    const merged = await PresetService.mergeWithPreset(userId, aiOutput, platform as Platform, preset);
    res.json({ success: true, data: merged });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Publishing & Jobs Routes (Scoped by User) ---
router.post('/publish', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      video,
      targetPlatforms,
      selectedAccounts,
      youtubePayload,
      instagramPayload,
      isScheduled,
      scheduledPublishTime,
      scheduledTimeZone,
      youtubeScheduledPublishTime,
      youtubeScheduledTimeZone,
      instagramScheduledPublishTime,
      instagramScheduledTimeZone,
    } = req.body;

    if (!video || !video.storagePath) {
      return res.status(400).json({ success: false, error: 'Valid video metadata is required' });
    }

    if (!Array.isArray(targetPlatforms) || targetPlatforms.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one target platform must be selected' });
    }

    const ytPublishTime = youtubeScheduledPublishTime || scheduledPublishTime;
    const ytTz = youtubeScheduledTimeZone || scheduledTimeZone || 'UTC';
    const igPublishTime = instagramScheduledPublishTime || scheduledPublishTime;
    const igTz = instagramScheduledTimeZone || scheduledTimeZone || 'UTC';

    // If Instagram is scheduled: store in Supabase and defer execution until run_at
    const isInstagramDeferred = Boolean(isScheduled && igPublishTime && targetPlatforms.includes('instagram'));
    if (isInstagramDeferred) {
      await SchedulingService.createScheduledPost(userId, {
        platform: 'instagram',
        runAt: igPublishTime,
        timeZone: igTz,
        title: instagramPayload?.caption?.slice(0, 80) || video.originalName || 'Scheduled Reel',
        videoStoragePath: video.storagePath,
        videoUrl: video.publicUrl,
        thumbnailUrl: instagramPayload?.coverImageUrl || video.thumbnailUrl,
        payload: { instagram: instagramPayload },
        selectedAccountId: selectedAccounts?.instagramAccountId,
      });
    }

    // Determine platforms for immediate job execution
    const immediatePlatforms = targetPlatforms.filter((p: string) => !(p === 'instagram' && isInstagramDeferred));

    let job = null;
    if (immediatePlatforms.length > 0) {
      const ytPayloadWithSchedule = youtubePayload ? { ...youtubePayload } : undefined;
      if (isScheduled && ytPublishTime && ytPayloadWithSchedule) {
        ytPayloadWithSchedule.scheduledPublishTime = ytPublishTime;
        ytPayloadWithSchedule.privacyStatus = 'private';
      }

      job = JobQueueService.createJob(userId, {
        video,
        targetPlatforms: immediatePlatforms,
        selectedAccounts,
        youtubePayload: ytPayloadWithSchedule,
        instagramPayload: isInstagramDeferred ? undefined : instagramPayload,
      });

      // Also record YouTube scheduled post in scheduled_posts so user can view all schedules in one place
      if (isScheduled && ytPublishTime && immediatePlatforms.includes('youtube')) {
        await SchedulingService.createScheduledPost(userId, {
          platform: 'youtube',
          runAt: ytPublishTime,
          timeZone: ytTz,
          title: youtubePayload?.title || video.originalName || 'Scheduled YouTube Short',
          videoUrl: video.publicUrl,
          thumbnailUrl: youtubePayload?.customThumbnailUrl || video.thumbnailUrl,
          payload: { youtube: ytPayloadWithSchedule },
          selectedAccountId: selectedAccounts?.youtubeAccountId,
          status: 'completed', // Handled natively by YouTube publishAt
        });
      }
    }

    res.json({
      success: true,
      data: job,
      isScheduled: Boolean(isScheduled),
      scheduledTime: scheduledPublishTime,
    });
  } catch (err: any) {
    console.error('[PublishRoute] Publish error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to start publish job' });
  }
});

router.get('/jobs', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const jobs = await JobQueueService.getAll(userId);
  res.json({ success: true, data: jobs });
});

router.get('/jobs/:id', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const job = JobQueueService.getJob(userId, req.params.id);
  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found or access denied' });
  }
  res.json({ success: true, data: job });
});

router.post('/jobs/:id/retry/:platform', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id, platform } = req.params;
    if (platform !== 'youtube' && platform !== 'instagram') {
      return res.status(400).json({ success: false, error: 'Invalid platform parameter' });
    }

    const updatedJob = await JobQueueService.retryPlatform(userId, id, platform as Platform);
    res.json({ success: true, data: updatedJob });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// SCHEDULING ROUTES (Per-User)
// ==========================================
router.get('/schedule', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const posts = await SchedulingService.getScheduledPosts(userId);
    res.json({ success: true, data: posts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { platform, runAt, timeZone, title, videoStoragePath, videoUrl, thumbnailUrl, payload, selectedAccountId } = req.body;

    if (!platform || !runAt) {
      return res.status(400).json({ success: false, error: 'Platform and runAt are required for scheduling.' });
    }

    const post = await SchedulingService.createScheduledPost(userId, {
      platform,
      runAt,
      timeZone: timeZone || 'UTC',
      title: title || 'Scheduled Post',
      videoStoragePath,
      videoUrl,
      thumbnailUrl,
      payload,
      selectedAccountId,
    });

    res.json({ success: true, data: post });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/schedule/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { runAt, timeZone, title, caption, hashtags } = req.body;

    let updated = null;
    if (runAt) {
      updated = await SchedulingService.reschedule(userId, id, runAt, timeZone);
    }
    if (title || caption || hashtags) {
      updated = await SchedulingService.updateScheduledPost(userId, id, { title, caption, hashtags, runAt, timeZone });
    }

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Scheduled post not found or access denied.' });
    }

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/schedule/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const success = await SchedulingService.cancelScheduledPost(userId, id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Scheduled post not found or access denied.' });
    }
    res.json({ success: true, message: 'Scheduled post cancelled and held video removed.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ANALYTICS & STATS ROUTES (Per-User)
// ==========================================
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const timeZone = (req.query.tz as string) || 'UTC';
    const overview = await AnalyticsService.getOverview(userId, timeZone, false);
    res.json({ success: true, data: overview });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/analytics/refresh', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const timeZone = (req.body.tz as string) || 'UTC';
    const overview = await AnalyticsService.getOverview(userId, timeZone, true);
    res.json({ success: true, data: overview });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// CONTENT PLANNER ROUTES ("WHAT TO UPLOAD NEXT")
// ==========================================
router.get('/planner', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const niche = (req.query.niche as string) || 'anime edits (amv)';
    const timeZone = (req.query.tz as string) || 'UTC';
    const plan = await ContentPlannerService.generatePlan(userId, niche, timeZone, false);
    res.json({ success: true, data: plan });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/planner/generate', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { niche, timeZone } = req.body;
    const plan = await ContentPlannerService.generatePlan(userId, niche || 'anime edits (amv)', timeZone || 'UTC', true);
    res.json({ success: true, data: plan });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Direct App Package Download Endpoint ---
router.get('/download/app', (req: Request, res: Response) => {
  const rootDir = process.cwd();
  const tarPath = path.join(rootDir, 'dist', 'omnipost-video-standalone.tar.gz');
  const fallbackTarPath = path.join(rootDir, 'omnipost-video-standalone.tar.gz');

  if (fs.existsSync(tarPath)) {
    return res.download(tarPath, 'omnipost-video-v1.0.0-standalone.tar.gz');
  } else if (fs.existsSync(fallbackTarPath)) {
    return res.download(fallbackTarPath, 'omnipost-video-v1.0.0-standalone.tar.gz');
  } else {
    try {
      execSync('npm run package', { cwd: rootDir, stdio: 'ignore' });
      if (fs.existsSync(fallbackTarPath)) {
        return res.download(fallbackTarPath, 'omnipost-video-v1.0.0-standalone.tar.gz');
      }
    } catch (e) {
      console.error('[DownloadApp] Error packaging app:', e);
    }
    return res.status(500).json({ success: false, error: 'App package could not be generated' });
  }
});

// --- JSON 404 Handler for undefined /api endpoints ---
router.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl || req.path}`,
  });
});

// --- Global JSON Error Handler for /api router ---
router.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[API Router Error]', err);
  const status =
    typeof err.status === 'number'
      ? err.status
      : typeof err.statusCode === 'number'
      ? err.statusCode
      : 500;
  res.status(status).json({
    success: false,
    error: err.message || 'An API error occurred',
  });
});

export default router;
