import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';

export class SupabaseService {
  private static client: SupabaseClient | null = null;
  private static bucketEnsured = false;

  static isConfigured(): boolean {
    return Boolean(config.supabase.url && config.supabase.key);
  }

  static getClient(): SupabaseClient | null {
    if (!this.isConfigured()) return null;
    if (!this.client) {
      try {
        this.client = createClient(config.supabase.url, config.supabase.key, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });
        console.log(`[SupabaseService] Initialized client for ${config.supabase.url}`);
      } catch (err: any) {
        console.error('[SupabaseService] Client initialization error:', err.message);
        return null;
      }
    }
    return this.client;
  }

  /**
   * Ensures the public video storage bucket exists.
   */
  static async ensureBucket(): Promise<void> {
    if (this.bucketEnsured) return;
    const client = this.getClient();
    if (!client) return;

    try {
      const bucketName = config.supabase.bucket;
      const { data: buckets, error } = await client.storage.listBuckets();
      if (!error && buckets) {
        const found = buckets.some((b) => b.name === bucketName);
        if (!found) {
          const { error: createErr } = await client.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 1024 * 1024 * 1024, // 1 GB
          });
          if (createErr) {
            console.warn(`[SupabaseService] Notice creating bucket "${bucketName}":`, createErr.message);
          } else {
            console.log(`[SupabaseService] Created public bucket "${bucketName}".`);
          }
        }
      }
      this.bucketEnsured = true;
    } catch (err: any) {
      console.warn('[SupabaseService] ensureBucket check:', err.message);
    }
  }

  /**
   * Generates a signed upload URL in Supabase Storage so the browser uploads directly.
   */
  static async createSignedUploadUrl(
    fileName: string
  ): Promise<{
    uploadUrl: string;
    publicUrl: string;
    path: string;
    token: string;
  } | null> {
    const client = this.getClient();
    if (!client) return null;

    await this.ensureBucket();

    const bucketName = config.supabase.bucket;
    const filePath = `raw/${fileName}`;

    try {
      const { data, error } = await client.storage
        .from(bucketName)
        .createSignedUploadUrl(filePath);

      if (error || !data) {
        console.error('[SupabaseService] Failed to create signed upload URL:', error?.message);
        return null;
      }

      // Compute public URL
      const { data: pubData } = client.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      // In Supabase, data.signedUrl can be relative or absolute
      let fullUploadUrl = data.signedUrl;
      if (fullUploadUrl.startsWith('http://') || fullUploadUrl.startsWith('https://')) {
        // already absolute URL
      } else if (fullUploadUrl.startsWith('/storage/v1')) {
        fullUploadUrl = `${config.supabase.url}${fullUploadUrl}`;
      } else if (fullUploadUrl.startsWith('/')) {
        fullUploadUrl = `${config.supabase.url}/storage/v1${fullUploadUrl}`;
      } else {
        fullUploadUrl = `${config.supabase.url}/storage/v1/${fullUploadUrl}`;
      }

      return {
        uploadUrl: fullUploadUrl,
        publicUrl: pubData.publicUrl,
        path: filePath,
        token: data.token,
      };
    } catch (err: any) {
      console.error('[SupabaseService] Error in createSignedUploadUrl:', err.message);
      return null;
    }
  }

  /**
   * Deletes a video file from Supabase Storage automatically after it is posted.
   */
  static async deleteFile(filePath: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const bucketName = config.supabase.bucket;
      const cleanPath = filePath.replace(/^[/\\]+/, '');
      const { error } = await client.storage.from(bucketName).remove([cleanPath]);
      if (error) {
        console.warn(`[SupabaseService] Failed to delete file "${cleanPath}" from storage:`, error.message);
        return false;
      }
      console.log(`[SupabaseService] Successfully deleted posted video "${cleanPath}" from Supabase Storage.`);
      return true;
    } catch (err: any) {
      console.error('[SupabaseService] Error deleting file:', err.message);
      return false;
    }
  }

  /**
   * Downloads a video file from Supabase Storage to local path for FFmpeg processing.
   */
  static async downloadFile(filePath: string): Promise<Buffer | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const bucketName = config.supabase.bucket;
      const cleanPath = filePath.replace(/^[/\\]+/, '');
      const { data, error } = await client.storage.from(bucketName).download(cleanPath);
      if (error || !data) {
        console.error(`[SupabaseService] Download error for "${cleanPath}":`, error?.message);
        return null;
      }
      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err: any) {
      console.error('[SupabaseService] Download exception:', err.message);
      return null;
    }
  }
}
