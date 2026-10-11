import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Storage } from '@google-cloud/storage';
import { config } from '../config.js';
import { VideoMetadata, ConversionProgress } from '../../shared/types.js';
import { FFmpegService } from '../services/ffmpegService.js';

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
   * Initialize a 1GB resumable chunked upload session.
   * If GCS bucket is active, returns direct GCS resumable upload URL.
   * Otherwise returns internal session ID for chunk streaming (bypasses Cloud Run 32MB limit).
   */
  static async initResumableSession(params: {
    originalName: string;
    totalSize: number;
    mimeType: string;
  }): Promise<{ sessionId: string; gcsUploadUrl?: string; chunkSize: number }> {
    const id = crypto.randomUUID();
    const gcs = this.getGcs();

    if (gcs && config.gcsBucketName) {
      try {
        const ext = path.extname(params.originalName) || '.mp4';
        const file = gcs.bucket(config.gcsBucketName).file(`raw/${id}${ext}`);
        const [gcsUploadUrl] = await file.createResumableUpload({
          metadata: {
            contentType: params.mimeType,
            metadata: { originalName: params.originalName },
          },
        });
        return { sessionId: id, gcsUploadUrl, chunkSize: 16 * 1024 * 1024 };
      } catch (gcsErr) {
        console.warn('[VideoStorage] GCS createResumableUpload failed, using backend chunking:', gcsErr);
      }
    }

    const ext = path.extname(params.originalName) || '.mp4';
    const tempFilePath = path.join(CHUNKS_DIR, `${id}${ext}`);

    // Create empty file
    fs.writeFileSync(tempFilePath, Buffer.alloc(0));

    this.sessions.set(id, {
      id,
      originalName: params.originalName,
      totalSize: params.totalSize,
      mimeType: params.mimeType,
      tempFilePath,
      receivedBytes: 0,
      createdAt: Date.now(),
    });

    return {
      sessionId: id,
      chunkSize: 10 * 1024 * 1024, // 10MB default chunks (well under 32MB Cloud Run limit)
    };
  }

  /**
   * Append binary chunk to resumable upload session.
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
}
