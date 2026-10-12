import { Router, Request, Response } from 'express';
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
import { config } from '../config.js';
import { ApiResponse, PlatformAuthStatus, Platform, ConnectedAccount, VideoFormatSettings, PlatformFormatSettings, VideoMetadata } from '../../shared/types.js';

const router = Router();

// Multer setup with support for 1GB video upload and extensive media formats:
// MP4, MOV, WebM, MKV, AVI, M4V, 3GP, FLV, WMV, MPEG, and HEVC
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
      cb(new Error('Unsupported video format. Please upload MP4, MOV, WebM, MKV, AVI, M4V, 3GP, FLV, WMV, MPEG, or HEVC.'));
    }
  },
});

// Memory storage for small chunk uploads in resumable flow
const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB max per chunk (Cloud Run safe)
});

// --- Multi-Account & Auth Routes ---
router.get('/auth/status', (req: Request, res: Response) => {
  const yt = YouTubeService.getAuthStatus();
  const ig = InstagramService.getAuthStatus();

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

// List all connected accounts (sanitized, zero token leakage)
router.get('/accounts', (req: Request, res: Response) => {
  const platform = req.query.platform as Platform | undefined;
  const accounts = AccountStorageService.getPublicAccounts(platform);
  res.json({ success: true, data: accounts });
});

// Disconnect / Delete an account
router.delete('/accounts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = AccountStorageService.removeAccount(id);
  if (deleted) {
    res.json({ success: true, message: 'Account disconnected successfully.' });
  } else {
    res.status(404).json({ success: false, error: 'Account not found.' });
  }
});

// Set default account for a platform
router.post('/accounts/:id/default', (req: Request, res: Response) => {
  const { id } = req.params;
  const updated = AccountStorageService.setDefault(id);
  if (updated) {
    res.json({ success: true, message: 'Default account updated.' });
  } else {
    res.status(404).json({ success: false, error: 'Account not found.' });
  }
});

// --- YouTube Google OAuth 2.0 Flow ---
router.get('/auth/youtube/url', (req: Request, res: Response) => {
  try {
    if (!config.google.clientId || !config.google.clientSecret) {
      return res.status(400).json({
        success: false,
        error: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not configured in environment variables.',
      });
    }
    const url = YouTubeService.getAuthUrl();
    res.json({ success: true, data: { url } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Direct browser OAuth callback from Google
router.get('/auth/youtube/callback', async (req: Request, res: Response) => {
  try {
    const { code, error } = req.query;
    if (error) {
      return res.redirect(`/?auth_error=${encodeURIComponent(String(error))}`);
    }
    if (!code) {
      return res.redirect('/?auth_error=missing_code');
    }
    await YouTubeService.handleCallback(String(code));
    return res.redirect('/?connected=youtube');
  } catch (err: any) {
    console.error('[YouTubeCallback] Error:', err);
    return res.redirect(`/?auth_error=${encodeURIComponent(err.message || 'OAuth exchange failed')}`);
  }
});

// JSON API OAuth callback exchange (for popup / in-app exchanges)
router.post('/auth/youtube/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Authorization code is required' });
    }
    const account = await YouTubeService.handleCallback(code);
    res.json({ success: true, data: account, message: `Connected YouTube channel: ${account.name}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Instagram API with Instagram Login Flow ---
router.get('/auth/instagram/url', (req: Request, res: Response) => {
  try {
    if (!config.meta.appId || !config.meta.appSecret) {
      return res.status(400).json({
        success: false,
        error: 'META_APP_ID and META_APP_SECRET are not configured in environment variables.',
      });
    }
    const url = InstagramService.getAuthUrl();
    res.json({ success: true, data: { url } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Direct browser OAuth callback from Meta
router.get('/auth/instagram/callback', async (req: Request, res: Response) => {
  try {
    const { code, error } = req.query;
    if (error) {
      return res.redirect(`/?auth_error=${encodeURIComponent(String(error))}`);
    }
    if (!code) {
      return res.redirect('/?auth_error=missing_code');
    }
    await InstagramService.handleCallback(String(code));
    return res.redirect('/?connected=instagram');
  } catch (err: any) {
    console.error('[InstagramCallback] Error:', err);
    return res.redirect(`/?auth_error=${encodeURIComponent(err.message || 'Meta OAuth exchange failed')}`);
  }
});

// JSON API OAuth callback exchange
router.post('/auth/instagram/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Authorization code is required' });
    }
    const account = await InstagramService.handleCallback(code);
    res.json({ success: true, data: account, message: `Connected Instagram account: ${account.name}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Refresh default Instagram account token
router.post('/auth/instagram/refresh', async (req: Request, res: Response) => {
  try {
    const defaultAccount = AccountStorageService.getDefaultAccountTokens('instagram');
    const accountId = defaultAccount?.account?.id;
    if (!accountId) {
      return res.status(400).json({ success: false, error: 'No Instagram account connected to refresh.' });
    }
    const result = await InstagramService.refreshAccountToken(accountId);
    if (result.success) {
      res.json({
        success: true,
        data: result,
        message: `Instagram token refreshed! 60 days remaining.`,
      });
    } else {
      res.status(400).json({ success: false, error: result.error || 'Failed to refresh token' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Refresh Instagram long-lived token for a specific account
router.post('/auth/instagram/:id/refresh', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await InstagramService.refreshAccountToken(id);
    if (result.success) {
      res.json({
        success: true,
        data: result,
        message: `Instagram token refreshed! 60 days remaining.`,
      });
    } else {
      res.status(400).json({ success: false, error: result.error || 'Failed to refresh token' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Video Upload & 1GB Resumable Upload Routes ---
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

// Initialize Direct Signed Resumable Upload Session (Direct GCS or Preview Stream)
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
    });

    res.json({ success: true, data: session });
  } catch (err: any) {
    console.error('[ResumableInit] Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to initialize resumable upload' });
  }
});

// Finalize direct resumable upload session (called after client finishes direct PUT upload)
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

// Alias for finish
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

// Stream chunk for resumable upload (legacy fallback)
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

      // JSON finalization call
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

    // Locate source video file
    let inputPath = originalPath || VideoStorageService.getFilePath(`${id}.mp4`);
    if (!inputPath || !fs.existsSync(inputPath)) {
      // Look for any extension with this id
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

// --- Trend Finder Route (Gemini Google Search Grounding & YouTube Data API) ---
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const niche = String(req.query.niche || 'tech');
    const region = String(req.query.region || 'US');
    const forceRefresh = req.query.refresh === 'true';

    const report = await TrendService.getNicheTrends(niche, region, forceRefresh);
    res.json({ success: true, data: report });
  } catch (err: any) {
    console.error('[TrendsRoute] Error fetching trends:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch trending topics' });
  }
});

// --- Gemini Video Analysis with Search Grounding ---
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { filename, titleHint, descriptionHint, tone } = req.body;

    if (!filename) {
      return res.status(400).json({ success: false, error: 'Filename or video identifier is required' });
    }

    const analysis = await GeminiService.analyzeVideo({
      filename,
      titleHint,
      descriptionHint,
      tone,
    });

    res.json({ success: true, data: analysis });
  } catch (err: any) {
    console.error('[AnalyzeRoute] Analysis error:', err);
    res.status(500).json({ success: false, error: err.message || 'AI analysis failed' });
  }
});

// --- Presets Routes ---
router.get('/presets', (req: Request, res: Response) => {
  const presets = PresetService.getAll();
  res.json({ success: true, data: presets });
});

router.post('/presets', (req: Request, res: Response) => {
  try {
    const { platform, name, fixedHashtags, descriptionFooter, category, privacy, tone, shareToFeed } = req.body;
    if (!platform || (platform !== 'youtube' && platform !== 'instagram')) {
      return res.status(400).json({ success: false, error: 'Valid platform (youtube or instagram) is required' });
    }

    const saved = PresetService.savePreset({
      platform,
      name,
      fixedHashtags: Array.isArray(fixedHashtags) ? fixedHashtags : [],
      descriptionFooter: descriptionFooter || '',
      category: category || '28',
      privacy: privacy || 'public',
      tone: tone || 'viral_hook',
      shareToFeed: shareToFeed ?? true,
    });

    res.json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/presets/merge', (req: Request, res: Response) => {
  try {
    const { aiOutput, platform } = req.body;
    if (!aiOutput || !platform) {
      return res.status(400).json({ success: false, error: 'aiOutput and platform are required' });
    }

    const merged = PresetService.mergeWithPreset(aiOutput, platform as Platform);
    res.json({ success: true, data: merged });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Publishing & Jobs Routes ---
router.post('/publish', (req: Request, res: Response) => {
  try {
    const { video, targetPlatforms, selectedAccounts, youtubePayload, instagramPayload } = req.body;

    if (!video || !video.storagePath) {
      return res.status(400).json({ success: false, error: 'Valid video metadata is required' });
    }

    if (!Array.isArray(targetPlatforms) || targetPlatforms.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one target platform must be selected' });
    }

    const job = JobQueueService.createJob({
      video,
      targetPlatforms,
      selectedAccounts,
      youtubePayload,
      instagramPayload,
    });

    res.json({ success: true, data: job });
  } catch (err: any) {
    console.error('[PublishRoute] Publish error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to start publish job' });
  }
});

router.get('/jobs', (req: Request, res: Response) => {
  const jobs = JobQueueService.getAll();
  res.json({ success: true, data: jobs });
});

router.get('/jobs/:id', (req: Request, res: Response) => {
  const job = JobQueueService.getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }
  res.json({ success: true, data: job });
});

router.post('/jobs/:id/retry/:platform', async (req: Request, res: Response) => {
  try {
    const { id, platform } = req.params;
    if (platform !== 'youtube' && platform !== 'instagram') {
      return res.status(400).json({ success: false, error: 'Invalid platform parameter' });
    }

    const updatedJob = await JobQueueService.retryPlatform(id, platform as Platform);
    res.json({ success: true, data: updatedJob });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Smart Keyword Generation Route (Gemini SEO Tags & Instagram Alt-Text) ---
router.post('/smart-keywords', async (req: Request, res: Response) => {
  try {
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
    // Dynamically package if not yet created
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
// Guarantees the server NEVER returns HTML for any /api route
router.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl || req.path}`,
  });
});

// --- Global JSON Error Handler for /api router ---
// Guarantees all exceptions in API routes return valid JSON
router.use((err: any, req: Request, res: Response, next: any) => {
  console.error('[API Router Error]', err);
  const status = typeof err.status === 'number' ? err.status : (typeof err.statusCode === 'number' ? err.statusCode : 500);
  res.status(status).json({
    success: false,
    error: err.message || 'An API error occurred',
  });
});

export default router;
