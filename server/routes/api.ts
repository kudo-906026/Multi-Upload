import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { VideoStorageService } from '../storage/videoStorage.js';
import { GeminiService } from '../services/geminiService.js';
import { YouTubeService } from '../services/youtubeService.js';
import { InstagramService } from '../services/instagramService.js';
import { PresetService } from '../services/presetService.js';
import { JobQueueService } from '../services/jobQueue.js';
import { ApiResponse, PlatformAuthStatus, Platform } from '../../shared/types.js';

const router = Router();

// Multer setup with validation for video formats and 250MB limit
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
    fileSize: 250 * 1024 * 1024, // 250MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'];
    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.match(/\.(mp4|mov|webm|mkv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Please upload an MP4, MOV, or WebM video.'));
    }
  },
});

// --- Auth Routes ---
router.get('/auth/status', (req: Request, res: Response) => {
  const yt = YouTubeService.getAuthStatus();
  const ig = InstagramService.getAuthStatus();

  const data: PlatformAuthStatus = {
    youtube: yt,
    instagram: ig,
  };

  res.json({ success: true, data });
});

router.get('/auth/youtube/url', (req: Request, res: Response) => {
  try {
    const url = YouTubeService.getAuthUrl();
    res.json({ success: true, data: { url } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/auth/youtube/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Authorization code is required' });
    }
    const result = await YouTubeService.exchangeCode(code);
    res.json({ success: true, data: result, message: 'YouTube successfully authorized!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/auth/instagram/refresh', async (req: Request, res: Response) => {
  try {
    const result = await InstagramService.refreshLongLivedToken();
    if (result.success) {
      res.json({ success: true, data: result, message: `Instagram token refreshed! ${result.daysRemaining} days remaining.` });
    } else {
      res.status(400).json({ success: false, error: result.error || 'Failed to refresh Instagram token' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Video Upload Route ---
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
    const { video, targetPlatforms, youtubePayload, instagramPayload } = req.body;

    if (!video || !video.storagePath) {
      return res.status(400).json({ success: false, error: 'Valid video metadata is required' });
    }

    if (!Array.isArray(targetPlatforms) || targetPlatforms.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one target platform must be selected' });
    }

    const job = JobQueueService.createJob({
      video,
      targetPlatforms,
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

export default router;
