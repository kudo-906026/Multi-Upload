import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import apiRoutes from './routes/api.js';
import { AccountStorageService } from './services/accountStorage.js';
import { InstagramService } from './services/instagramService.js';
import { JobQueueService } from './services/jobQueue.js';
import { SchedulingService } from './services/schedulingService.js';
import { VideoStorageService } from './storage/videoStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Initialize persistent services
  AccountStorageService.init();
  InstagramService.initAutoRefresh();
  JobQueueService.init();
  SchedulingService.init();

  // Internal 60s background heartbeat for checking due scheduled posts
  setInterval(() => {
    SchedulingService.processCronTick().catch((e) => {
      console.warn('[Server Heartbeat Cron Notice]', e.message);
    });
  }, 60 * 1000);

  const app = express();

  // Basic Middleware
  app.use(cors());

  // Security Headers: Ensure Referrer-Policy is strict-origin-when-cross-origin (NOT no-referrer)
  // and Content-Security-Policy explicitly allows YouTube and youtube-nocookie frames
  app.use((req, res, next) => {
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; " +
      "frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://youtube-nocookie.com; " +
      "img-src 'self' data: blob: https: https://*.ytimg.com https://*.youtube.com https://*.cdninstagram.com; " +
      "media-src 'self' blob: data: https:;"
    );
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Ensure uploads directory exists
  if (!fs.existsSync(config.uploadDir)) {
    fs.mkdirSync(config.uploadDir, { recursive: true });
  }

  // Public Media Serving (with Range header support for video streaming & external scrapers like Instagram Graph API)
  app.use(
    '/media',
    (req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Range');
      next();
    },
    express.static(config.uploadDir, {
      acceptRanges: true,
      maxAge: '1d',
    })
  );

  // Health check endpoint for Cloud Run
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      time: new Date().toISOString(),
      storage: 'ready',
    });
  });

  // Direct raw stream upload endpoint for preview environment (bypasses /api & body parsers)
  app.put('/storage/direct-upload/:sessionId', (req, res) => {
    VideoStorageService.handleDirectStreamUpload(req, res);
  });

  // API Routes
  app.use('/api', apiRoutes);

  // Guaranteed JSON 404 for any /api route: NEVER fall through to Vite SPA or static HTML handlers
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // Development vs Production Frontend Serving
  const isProduction = process.env.NODE_ENV === 'production';
  const rootDir = process.cwd();

  if (!isProduction) {
    try {
      console.log('[Server] Initializing Vite dev server in middleware mode...');
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
        root: rootDir,
      });

      app.use(vite.middlewares);
      console.log('[Server] Vite middleware mounted.');
    } catch (viteErr) {
      console.error('[Server] Failed to initialize Vite middleware, falling back to static:', viteErr);
    }
  } else {
    // Production: serve built static files from dist/client
    const clientDistPath = path.resolve(rootDir, 'dist/client');
    if (fs.existsSync(clientDistPath)) {
      // sw.js MUST never be cached by browsers
      app.get('/sw.js', (req, res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.setHeader('Content-Type', 'application/javascript');
        res.sendFile(path.join(clientDistPath, 'sw.js'));
      });

      app.use(
        express.static(clientDistPath, {
          setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html') || filePath.endsWith('sw.js')) {
              res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
            } else if (filePath.includes('/assets/')) {
              res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            }
          },
        })
      );

      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/media')) {
          return next();
        }
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.sendFile(path.join(clientDistPath, 'index.html'));
      });
    }
  }

  // Centralized Error Handling Middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Unhandled Server Error]', err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'An internal server error occurred',
    });
  });

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`  🚀 OmniPost Video Server Running on port ${config.port}`);
    console.log(`  Environment: ${config.nodeEnv}`);
    console.log(`  Public Media Base URL: ${config.publicBaseUrl}/media`);
    console.log(`====================================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
