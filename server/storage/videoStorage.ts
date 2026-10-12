import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Storage } from '@google-cloud/storage';
import { config } from '../config.js';
import { VideoMetadata, ConversionProgress } from '../../shared/types.js';
import { FFmpegService } from '../services/ffmpegService.js';
import { SupabaseService } from '../services/supabaseService.js';

// Ensure upload and temp chunk directory exists
const CHUNKS_DIR = path.join(config.uploadDir, '.chunks');
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}
if (!fs.existsSync(CHUNKS_DIR)) {
  fs.mkdirSync(CHUNKS_DIR, { recursive: true });
}

interface ResumableSession {
  id: string;
  originalName: string;
  totalSize: number;
  mimeType: string;
  tempFilePath: string;
  isGcs: boolean;
  isSupabase: boolean;
  supabasePath?: string;
  publicUrl?: string;
  receivedBytes: number;
  createdAt: number;
}

export class VideoStorageService {
  private static sessions: Map<string, ResumableSession> = new Map();
  private static conversionStatus: Map<string, ConversionProgress> = new Map();
  private static gcsStorage: Storage | null = null;

  private static getGcs(): Storage | null {
    if (!config.gcsBucketName) return null;
    if (!this.gcsStorage) {
      try {
        this.gcsStorage = new Storage();
      } catch (e) {
        console.warn('[VideoStorage] GCS client initialization error:', e);
      }
    }
    return this.gcsStorage;
  }

  /**
   * Initialize a direct signed resumable upload session.
   * Prioritizes Supabase Storage (public bucket) for zero-cost hosting.
   * If GCS bucket is active, returns direct Google Cloud Storage resumable upload URL.
   * Otherwise returns internal direct stream upload endpoint for preview environment.
   */
  static async initResumableSession(params: {
    originalName: string;
    totalSize: number;
    mimeType: string;
  }): Promise<{
    sessionId: string;
    uploadUrl: string;
    publicUrl?: string;
    gcsUploadUrl?: string;
    isSupabase: boolean;
    isGcs: boolean;
    chunkSize: number;
  }> {
    const id = crypto.randomUUID();
    const ext = path.extname(params.originalName) || '.mp4';
    const fileName = `${id}${ext}`;

    // 1. Supabase Storage (Free tier, public bucket with signed upload URLs)
    if (SupabaseService.isConfigured()) {
      try {
        const supabaseSession = await SupabaseService.createSignedUploadUrl(fileName);
        if (supabaseSession) {
          this.sessions.set(id, {
            id,
            originalName: params.originalName,
            totalSize: params.totalSize,
            mimeType: params.mimeType,
            tempFilePath: '',
            isGcs: false,
            isSupabase: true,
            supabasePath: supabaseSession.path,
            publicUrl: supabaseSession.publicUrl,
            receivedBytes: 0,
            createdAt: Date.now(),
          });

          console.log(`[VideoStorage] Created Supabase Storage signed upload URL for ${fileName}`);

          return {
            sessionId: id,
            uploadUrl: supabaseSession.uploadUrl,
            publicUrl: supabaseSession.publicUrl,
            isSupabase: true,
            isGcs: false,
            chunkSize: 16 * 1024 * 1024,
          };
        }
      } catch (supaErr) {
        console.warn('[VideoStorage] Supabase createSignedUploadUrl error, falling back:', supaErr);
      }
    }

    // 2. Google Cloud Storage (legacy/optional)
    const gcs = this.getGcs();
    if (gcs && config.gcsBucketName) {
      try {
        const file = gcs.bucket(config.gcsBucketName).file(`raw/${fileName}`);
        const [gcsUploadUrl] = await file.createResumableUpload({
          metadata: {
            contentType: params.mimeType,
            metadata: { originalName: params.originalName, sessionId: id },
          },
          origin: '*',
        });

        this.sessions.set(id, {
          id,
          originalName: params.originalName,
          totalSize: params.totalSize,
          mimeType: params.mimeType,
          tempFilePath: '',
          isGcs: true,
          isSupabase: false,
          receivedBytes: 0,
          createdAt: Date.now(),
        });

        return {
          sessionId: id,
          uploadUrl: gcsUploadUrl,
          gcsUploadUrl,
          isSupabase: false,
          isGcs: true,
          chunkSize: 16 * 1024 * 1024,
        };
      } catch (gcsErr) {
        console.warn('[VideoStorage] GCS createResumableUpload failed, using direct preview streaming:', gcsErr);
      }
    }

    // 3. Preview direct streaming upload endpoint
    const tempFilePath = path.join(CHUNKS_DIR, `${id}${ext}`);
    fs.writeFileSync(tempFilePath, Buffer.alloc(0));

    this.sessions.set(id, {
      id,
      originalName: params.originalName,
      totalSize: params.totalSize,
      mimeType: params.mimeType,
      tempFilePath,
      isGcs: false,
      isSupabase: false,
      receivedBytes: 0,
      createdAt: Date.now(),
    });

    const directUploadUrl = `${config.publicBaseUrl}/storage/direct-upload/${id}`;

    return {
      sessionId: id,
      uploadUrl: directUploadUrl,
      isSupabase: false,
      isGcs: false,
      chunkSize: 16 * 1024 * 1024,
    };
  }

  /**
   * Handles raw direct stream upload in preview environment without passing through multipart /api parser.
   */
  static handleDirectStreamUpload(req: any, res: any): void {
    const { sessionId } = req.params;
    const session = this.sessions.get(sessionId);
    if (!session || !session.tempFilePath) {
      return res.status(404).json({ success: false, error: `Upload session ${sessionId} not found or expired.` });
    }

    const writeStream = fs.createWriteStream(session.tempFilePath, { flags: 'w' });
    req.pipe(writeStream);

    req.on('error', (err: any) => {
      console.error('[DirectUpload] Request stream error:', err);
      writeStream.destroy();
      res.status(500).json({ success: false, error: err.message || 'Stream upload error' });
    });

    writeStream.on('error', (err: any) => {
      console.error('[DirectUpload] File write stream error:', err);
      res.status(500).json({ success: false, error: err.message || 'File write error' });
    });

    writeStream.on('finish', () => {
      try {
        const stats = fs.statSync(session.tempFilePath);
        session.receivedBytes = stats.size;
        res.json({
          success: true,
          data: {
            sessionId,
            receivedBytes: session.receivedBytes,
            isComplete: true,
          },
        });
      } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
      }
    });
  }

  /**
   * Finalizes direct resumable session (either after direct GCS upload or direct preview stream upload).
   */
  static async finishResumableSession(params: {
    sessionId: string;
    originalName?: string;
    mimeType?: string;
    totalSize?: number;
  }): Promise<VideoMetadata> {
    const session = this.sessions.get(params.sessionId);
    const originalName = params.originalName || session?.originalName || 'video.mp4';
    const mimeType = params.mimeType || session?.mimeType || 'video/mp4';
    const ext = path.extname(originalName) || '.mp4';
    const finalFilename = `${params.sessionId}${ext}`;
    const targetPath = path.join(config.uploadDir, finalFilename);

    if (session?.isSupabase && session.supabasePath) {
      // Download from Supabase Storage for local FFmpeg probing and processing
      try {
        const fileBuffer = await SupabaseService.downloadFile(session.supabasePath);
        if (fileBuffer) {
          fs.writeFileSync(targetPath, fileBuffer);
        }
      } catch (dlErr: any) {
        console.warn('[VideoStorage] Supabase file download notice:', dlErr);
      }
    } else if (session?.isGcs && config.gcsBucketName) {
      const gcs = this.getGcs();
      if (gcs) {
        const file = gcs.bucket(config.gcsBucketName).file(`raw/${params.sessionId}${ext}`);
        try {
          await file.download({ destination: targetPath });
        } catch (dlErr: any) {
          console.warn('[VideoStorage] GCS file download failed:', dlErr);
        }
      }
    } else if (session?.tempFilePath && fs.existsSync(session.tempFilePath)) {
      if (fs.existsSync(targetPath)) {
        try { fs.unlinkSync(targetPath); } catch {}
      }
      fs.renameSync(session.tempFilePath, targetPath);
    }

    if (!fs.existsSync(targetPath)) {
      throw new Error(`Uploaded file not found on disk at ${targetPath}. Please retry.`);
    }

    this.sessions.delete(params.sessionId);
    const metadata = await this.finalizeVideoRecord(params.sessionId, originalName, targetPath, mimeType);
    if (session?.isSupabase && session.supabasePath) {
      metadata.supabasePath = session.supabasePath;
      if (session.publicUrl) {
        metadata.publicUrl = session.publicUrl;
      }
    }
    if (session?.isGcs && config.gcsBucketName) {
      metadata.gcsUri = `gs://${config.gcsBucketName}/raw/${params.sessionId}${ext}`;
    }
    return metadata;
  }

  /**
   * Append binary chunk to resumable upload session (legacy fallback).
   */
  static async appendChunk(
    sessionId: string,
    chunkBuffer: Buffer,
    isLastChunk: boolean
  ): Promise<{ receivedBytes: number; isComplete: boolean; video?: VideoMetadata }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Resumable upload session ${sessionId} not found or expired.`);
    }

    fs.appendFileSync(session.tempFilePath, chunkBuffer);
    session.receivedBytes += chunkBuffer.length;

    if (isLastChunk || session.receivedBytes >= session.totalSize) {
      // Finalize uploaded file
      const ext = path.extname(session.originalName) || '.mp4';
      const finalFilename = `${sessionId}${ext}`;
      const targetPath = path.join(config.uploadDir, finalFilename);

      fs.renameSync(session.tempFilePath, targetPath);
      this.sessions.delete(sessionId);

      const metadata = await this.finalizeVideoRecord(sessionId, session.originalName, targetPath, session.mimeType);
      return { receivedBytes: session.receivedBytes, isComplete: true, video: metadata };
    }

    return { receivedBytes: session.receivedBytes, isComplete: false };
  }

  /**
   * Standard direct multipart save (for files <= 32MB).
   */
  static async saveVideo(file: Express.Multer.File): Promise<VideoMetadata> {
    const id = crypto.randomUUID();
    const ext = path.extname(file.originalname) || '.mp4';
    const filename = `${id}${ext}`;
    const targetPath = path.join(config.uploadDir, filename);

    if (file.path && fs.existsSync(file.path)) {
      fs.copyFileSync(file.path, targetPath);
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        // ignore
      }
    } else if (file.buffer) {
      fs.writeFileSync(targetPath, file.buffer);
    }

    return await this.finalizeVideoRecord(id, file.originalname, targetPath, file.mimetype);
  }

  /**
   * Finalizes video metadata record with probe details.
   * If the video is not H.264 MP4, kicks off background FFmpeg transcoding to MP4.
   */
  static async finalizeVideoRecord(
    id: string,
    originalName: string,
    storagePath: string,
    mimeType: string
  ): Promise<VideoMetadata> {
    const stats = fs.statSync(storagePath);
    const filename = path.basename(storagePath);
    const publicUrl = `${config.publicBaseUrl.replace(/\/$/, '')}/media/${filename}`;

    const probe = await FFmpegService.probeVideo(storagePath);

    const ext = path.extname(originalName).toLowerCase();
    const isStandardMp4 = ext === '.mp4' && probe.codec === 'h264';

    const metadata: VideoMetadata = {
      id,
      originalName,
      size: stats.size,
      mimeType: mimeType || 'video/mp4',
      publicUrl,
      storagePath,
      durationSec: probe.duration,
      width: probe.width,
      height: probe.height,
      createdAt: new Date().toISOString(),
    };

    // If file is not standard H.264 MP4, auto-transcode to standard MP4 for maximum web & Instagram compatibility
    if (!isStandardMp4) {
      this.startBackgroundTranscode(metadata);
    }

    return metadata;
  }

  /**
   * Transcodes non-standard video formats to MP4 (H.264/AAC) in background,
   * tracking progress for UI polling.
   */
  static startBackgroundTranscode(video: VideoMetadata): void {
    const convertedFilename = `${video.id}_converted.mp4`;
    const convertedPath = path.join(config.uploadDir, convertedFilename);
    const convertedUrl = `${config.publicBaseUrl.replace(/\/$/, '')}/media/${convertedFilename}`;

    this.conversionStatus.set(video.id, {
      status: 'converting',
      percent: 5,
      stage: 'Starting FFmpeg MP4 conversion...',
    });

    FFmpegService.transcodeToMp4(video.storagePath, convertedPath, (percent, stage) => {
      this.conversionStatus.set(video.id, {
        status: percent >= 100 ? 'completed' : 'converting',
        percent,
        stage,
        convertedUrl,
      });
    })
      .then((res) => {
        video.convertedPath = res.outputPath;
        video.convertedUrl = convertedUrl;
        video.publicUrl = convertedUrl; // Update primary public streaming URL to the converted MP4
        video.durationSec = res.duration;
        video.width = res.width;
        video.height = res.height;

        this.conversionStatus.set(video.id, {
          status: 'completed',
          percent: 100,
          stage: 'Converted to MP4 (H.264/AAC) successfully!',
          convertedUrl,
        });
      })
      .catch((err) => {
        console.error(`[VideoStorage] Background transcode failed for ${video.id}:`, err);
        this.conversionStatus.set(video.id, {
          status: 'failed',
          percent: 0,
          stage: 'Conversion failed',
          error: err.message,
        });
      });
  }

  /**
   * Gets current transcoding progress for a video ID.
   */
  static getConversionProgress(videoId: string): ConversionProgress {
    return (
      this.conversionStatus.get(videoId) || {
        status: 'idle',
        percent: 100,
        stage: 'Ready',
      }
    );
  }

  /**
   * Retrieves path to stored video by filename or id.
   */
  static getFilePath(filename: string): string | null {
    const filePath = path.join(config.uploadDir, filename);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    return null;
  }

  /**
   * Deletes a video file from storage.
   */
  static async deleteVideo(storagePath: string): Promise<void> {
    if (fs.existsSync(storagePath)) {
      try {
        fs.unlinkSync(storagePath);
      } catch (err) {
        console.error('Failed to delete video file:', err);
      }
    }
  }

  /**
   * Automatically deletes each video from Supabase Storage and local disk after it is posted.
   */
  static async deleteVideoAfterPosting(video: VideoMetadata): Promise<void> {
    console.log(`[VideoStorage] Automatically cleaning up posted video ${video.id}...`);

    // 1. Delete from Supabase Storage public bucket
    if (video.supabasePath) {
      await SupabaseService.deleteFile(video.supabasePath);
    }

    // 2. Delete primary local file
    if (video.storagePath && fs.existsSync(video.storagePath)) {
      try {
        fs.unlinkSync(video.storagePath);
        console.log(`[VideoStorage] Deleted local master: ${video.storagePath}`);
      } catch (e: any) {
        console.warn('[VideoStorage] Error unlinking local file:', e.message);
      }
    }

    // 3. Delete converted file if distinct
    if (video.convertedPath && fs.existsSync(video.convertedPath)) {
      try {
        fs.unlinkSync(video.convertedPath);
        console.log(`[VideoStorage] Deleted local converted: ${video.convertedPath}`);
      } catch (e: any) {}
    }

    // 4. Remove any derivative formatted files
    try {
      const files = fs.readdirSync(config.uploadDir);
      files.forEach((file) => {
        if (file.startsWith(video.id)) {
          const fullPath = path.join(config.uploadDir, file);
          try {
            fs.unlinkSync(fullPath);
          } catch (e) {}
        }
      });
    } catch (e) {}

    console.log(`[VideoStorage] Cleaned up video ${video.id} from Supabase and local storage.`);
  }
}
