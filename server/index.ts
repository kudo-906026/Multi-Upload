import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import apiRoutes from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  // Basic Middleware
  app.use(cors());
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

  // API Routes
  app.use('/api', apiRoutes);

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
      app.use(express.static(clientDistPath));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/media')) {
          return next();
        }
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
