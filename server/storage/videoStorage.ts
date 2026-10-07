import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config.js';
import { VideoMetadata } from '../../shared/types.js';

// Ensure upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

export class VideoStorageService {
  /**
   * Save uploaded video buffer or move file to designated storage.
   * Generates a unique ID and accessible public URL (required for Instagram Graph API).
   */
  static async saveVideo(file: Express.Multer.File): Promise<VideoMetadata> {
    const id = crypto.randomUUID();
    const ext = path.extname(file.originalname) || '.mp4';
    const filename = `${id}${ext}`;
    const targetPath = path.join(config.uploadDir, filename);

    // If file was uploaded to a temp path via multer, copy or move it
    if (file.path && fs.existsSync(file.path)) {
      fs.copyFileSync(file.path, targetPath);
      // Clean up temp file
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        // ignore
      }
    } else if (file.buffer) {
      fs.writeFileSync(targetPath, file.buffer);
    }

    // Determine public URL
    // In production/Cloud Run or local, this serves from the /media endpoint
    const publicUrl = `${config.publicBaseUrl.replace(/\/$/, '')}/media/${filename}`;

    const metadata: VideoMetadata = {
      id,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype || 'video/mp4',
      publicUrl,
      storagePath: targetPath,
      createdAt: new Date().toISOString(),
    };

    return metadata;
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
