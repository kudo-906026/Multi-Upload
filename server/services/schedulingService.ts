import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ScheduledPost, ScheduledPostStatus, Platform } from '../../shared/types.js';
import { SupabaseService } from './supabaseService.js';
import { AccountStorageService, InstagramTokens } from './accountStorage.js';
import { InstagramService } from './instagramService.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SCHEDULED_FILE = path.join(DATA_DIR, 'scheduled_posts.json');

export class SchedulingService {
  private static localPosts: Map<string, ScheduledPost> = new Map();

  static async init(): Promise<void> {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(SCHEDULED_FILE)) {
      try {
        const raw = fs.readFileSync(SCHEDULED_FILE, 'utf-8');
        const list: ScheduledPost[] = JSON.parse(raw);
        list.forEach((p) => this.localPosts.set(p.id, p));
        console.log(`[SchedulingService] Loaded ${this.localPosts.size} cached scheduled posts.`);
      } catch (err) {
        console.warn('[SchedulingService] Failed to parse local scheduled posts:', err);
      }
    }
  }

  private static persistLocal(): void {
    try {
      const list = Array.from(this.localPosts.values());
      fs.writeFileSync(SCHEDULED_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[SchedulingService] Failed to write local scheduled posts:', err);
    }
  }

  /**
   * Creates a scheduled publishing job in Supabase (or local fallback).
   */
  static async createScheduledPost(
    userId: string,
    params: {
      platform: Platform;
      runAt: string; // ISO string
      timeZone: string;
      title: string;
      videoStoragePath?: string;
      videoUrl?: string;
      thumbnailUrl?: string;
      payload: any;
      selectedAccountId?: string;
      status?: ScheduledPostStatus;
      resultPostId?: string;
      resultUrl?: string;
    }
  ): Promise<ScheduledPost> {
    const id = `sched-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    const post: ScheduledPost = {
      id,
      userId,
      platform: params.platform,
      runAt: params.runAt,
      timeZone: params.timeZone || 'UTC',
      status: params.status || 'scheduled',
      videoStoragePath: params.videoStoragePath,
      videoUrl: params.videoUrl,
      thumbnailUrl: params.thumbnailUrl,
      title: params.title || 'Scheduled Post',
      payload: params.payload,
      selectedAccountId: params.selectedAccountId,
      retryCount: 0,
      maxRetries: 3,
      resultPostId: params.resultPostId,
      resultUrl: params.resultUrl,
      createdAt: now,
      updatedAt: now,
    };

    this.localPosts.set(id, post);
    this.persistLocal();

    // Persist to Supabase if configured
    if (SupabaseService.isConfigured()) {
      const client = SupabaseService.getClient();
      if (client) {
        try {
          const { error } = await client.from('scheduled_posts').insert({
            id: post.id,
            user_id: post.userId,
            platform: post.platform,
            run_at: post.runAt,
            time_zone: post.timeZone,
            status: post.status,
            video_storage_path: post.videoStoragePath || null,
            video_url: post.videoUrl || null,
            thumbnail_url: post.thumbnailUrl || null,
            title: post.title,
            payload: post.payload,
            selected_account_id: post.selectedAccountId || null,
            retry_count: post.retryCount,
            max_retries: post.maxRetries,
            result_post_id: post.resultPostId || null,
            result_url: post.resultUrl || null,
            created_at: post.createdAt,
            updated_at: post.updatedAt,
          });
          if (error) {
            console.warn('[SchedulingService] Supabase insert notice:', error.message);
          }
        } catch (err: any) {
          console.warn('[SchedulingService] Supabase insert error:', err.message);
        }
      }
    }

    console.log(`[SchedulingService] Created scheduled post ${id} for ${post.platform} at ${post.runAt} (${post.timeZone})`);
    return post;
  }

  /**
   * Retrieves all scheduled posts for a given user.
   */
  static async getScheduledPosts(userId: string): Promise<ScheduledPost[]> {
    if (SupabaseService.isConfigured()) {
      const client = SupabaseService.getClient();
      if (client) {
        try {
          const { data, error } = await client
            .from('scheduled_posts')
            .select('*')
            .eq('user_id', userId)
            .order('run_at', { ascending: true });

          if (!error && data) {
            return data.map((d: any) => ({
              id: d.id,
              userId: d.user_id,
              platform: d.platform as Platform,
              runAt: d.run_at,
              timeZone: d.time_zone,
              status: d.status as ScheduledPostStatus,
              videoStoragePath: d.video_storage_path,
              videoUrl: d.video_url,
              thumbnailUrl: d.thumbnail_url,
              title: d.title,
              payload: d.payload,
              selectedAccountId: d.selected_account_id,
              retryCount: d.retry_count || 0,
              maxRetries: d.max_retries || 3,
              lastError: d.last_error,
              resultPostId: d.result_post_id,
              resultUrl: d.result_url,
              createdAt: d.created_at,
              updatedAt: d.updated_at,
              completedAt: d.completed_at,
            }));
          }
        } catch (err: any) {
          console.warn('[SchedulingService] Supabase fetch error, falling back to local memory:', err.message);
        }
      }
    }

    return Array.from(this.localPosts.values())
      .filter((p) => p.userId === userId)
      .sort((a, b) => new Date(a.runAt).getTime() - new Date(b.runAt).getTime());
  }

  /**
   * Reschedules an existing post to a new runAt time & timeZone.
   */
  static async reschedule(
    userId: string,
    id: string,
    newRunAt: string,
    newTimeZone?: string
  ): Promise<ScheduledPost | null> {
    const post = this.localPosts.get(id);
    const now = new Date().toISOString();

    if (post && post.userId === userId) {
      post.runAt = newRunAt;
      if (newTimeZone) post.timeZone = newTimeZone;
      post.status = 'scheduled';
      post.updatedAt = now;
      post.lastError = undefined;
      this.persistLocal();
    }

    if (SupabaseService.isConfigured()) {
      const client = SupabaseService.getClient();
      if (client) {
        try {
          const updateData: any = {
            run_at: newRunAt,
            status: 'scheduled',
            updated_at: now,
            last_error: null,
          };
          if (newTimeZone) updateData.time_zone = newTimeZone;

          await client
            .from('scheduled_posts')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', userId);
        } catch (err: any) {
          console.warn('[SchedulingService] Supabase reschedule notice:', err.message);
        }
      }
    }

    return post || null;
  }

  /**
   * Updates title, caption, hashtags or payload of a scheduled post.
   */
  static async updateScheduledPost(
    userId: string,
    id: string,
    updates: {
      title?: string;
      caption?: string;
      hashtags?: string[];
      runAt?: string;
      timeZone?: string;
    }
  ): Promise<ScheduledPost | null> {
    const post = this.localPosts.get(id);
    const now = new Date().toISOString();

    if (post && post.userId === userId) {
      if (updates.title) post.title = updates.title;
      if (updates.runAt) post.runAt = updates.runAt;
      if (updates.timeZone) post.timeZone = updates.timeZone;
      if (updates.caption && post.payload.instagram) {
        post.payload.instagram.caption = updates.caption;
      }
      if (updates.hashtags && post.payload.instagram) {
        post.payload.instagram.hashtags = updates.hashtags;
      }
      post.updatedAt = now;
      this.persistLocal();
    }

    if (SupabaseService.isConfigured()) {
      const client = SupabaseService.getClient();
      if (client) {
        try {
          const updateData: any = { updated_at: now };
          if (updates.title) updateData.title = updates.title;
          if (updates.runAt) updateData.run_at = updates.runAt;
          if (updates.timeZone) updateData.time_zone = updates.timeZone;
          if (post?.payload) updateData.payload = post.payload;

          await client
            .from('scheduled_posts')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', userId);
        } catch (err: any) {
          console.warn('[SchedulingService] Supabase update notice:', err.message);
        }
      }
    }

    return post || null;
  }

  /**
   * Cancels a scheduled post and deletes the held video in Supabase Storage.
   */
  static async cancelScheduledPost(userId: string, id: string): Promise<boolean> {
    const post = this.localPosts.get(id);
    if (!post || post.userId !== userId) return false;

    post.status = 'cancelled';
    post.updatedAt = new Date().toISOString();
    this.persistLocal();

    // If Instagram video was being held in storage, delete it now
    if (post.videoStoragePath) {
      try {
        await SupabaseService.deleteFile(post.videoStoragePath);
      } catch (err) {
        console.warn(`[SchedulingService] Could not delete video for cancelled post ${id}:`, err);
      }
    }

    if (SupabaseService.isConfigured()) {
      const client = SupabaseService.getClient();
      if (client) {
        try {
          await client
            .from('scheduled_posts')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId);
        } catch (err: any) {
          console.warn('[SchedulingService] Supabase cancel notice:', err.message);
        }
      }
    }

    console.log(`[SchedulingService] Cancelled scheduled post ${id} for user ${userId}`);
    return true;
  }

  /**
   * Background CRON worker tick (/api/cron/tick):
   * Queries due Instagram jobs (run_at <= NOW()), publishes them, cleans up storage, and retries failures.
   */
  static async processCronTick(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    results: any[];
  }> {
    const now = new Date();
    const nowIso = now.toISOString();

    console.log(`[SchedulingService] Running cron tick at ${nowIso}...`);

    let duePosts: ScheduledPost[] = [];

    // Query due posts from Supabase or memory
    if (SupabaseService.isConfigured()) {
      const client = SupabaseService.getClient();
      if (client) {
        try {
          const { data, error } = await client
            .from('scheduled_posts')
            .select('*')
            .in('status', ['scheduled', 'failed'])
            .lte('run_at', nowIso)
            .lt('retry_count', 3);

          if (!error && data) {
            duePosts = data.map((d: any) => ({
              id: d.id,
              userId: d.user_id,
              platform: d.platform as Platform,
              runAt: d.run_at,
              timeZone: d.time_zone,
              status: d.status as ScheduledPostStatus,
              videoStoragePath: d.video_storage_path,
              videoUrl: d.video_url,
              thumbnailUrl: d.thumbnail_url,
              title: d.title,
              payload: d.payload,
              selectedAccountId: d.selected_account_id,
              retryCount: d.retry_count || 0,
              maxRetries: d.max_retries || 3,
              lastError: d.last_error,
              resultPostId: d.result_post_id,
              resultUrl: d.result_url,
              createdAt: d.created_at,
              updatedAt: d.updated_at,
              completedAt: d.completed_at,
            }));
          }
        } catch (err: any) {
          console.warn('[SchedulingService] Supabase cron query exception:', err.message);
        }
      }
    }

    // Fallback/merge with local memory
    if (duePosts.length === 0) {
      duePosts = Array.from(this.localPosts.values()).filter(
        (p) =>
          (p.status === 'scheduled' || (p.status === 'failed' && p.retryCount < p.maxRetries)) &&
          new Date(p.runAt).getTime() <= now.getTime()
      );
    }

    console.log(`[SchedulingService] Found ${duePosts.length} due posts to process.`);

    let successful = 0;
    let failed = 0;
    const results: any[] = [];

    for (const post of duePosts) {
      // Mark publishing
      post.status = 'publishing';
      post.updatedAt = new Date().toISOString();
      this.persistLocal();

      try {
        if (post.platform === 'instagram') {
          const igPayload = post.payload.instagram;
          if (!igPayload) {
            throw new Error('Missing Instagram payload in scheduled post.');
          }

          const videoUrl = post.videoUrl;
          if (!videoUrl) {
            throw new Error('Video URL missing for scheduled Instagram post.');
          }

          console.log(`[SchedulingService] Publishing scheduled Reel for user ${post.userId}: "${post.title}"`);

          const uploadResult = await InstagramService.publishReel(
            videoUrl,
            igPayload,
            (pct: number, stage: string) => {
              console.log(`[SchedulingService][${post.id}] ${pct}% - ${stage}`);
            },
            post.userId,
            post.selectedAccountId
          );

          // Success!
          post.status = 'completed';
          post.resultPostId = uploadResult.mediaId;
          post.resultUrl = uploadResult.url;
          post.completedAt = new Date().toISOString();
          post.updatedAt = post.completedAt;
          successful++;

          // Delete held video from Supabase Storage now that it's published
          if (post.videoStoragePath) {
            try {
              await SupabaseService.deleteFile(post.videoStoragePath);
              console.log(`[SchedulingService] Deleted published video file: ${post.videoStoragePath}`);
            } catch (delErr) {
              console.warn(`[SchedulingService] Notice deleting video file:`, delErr);
            }
          }

          // Record in history table
          if (SupabaseService.isConfigured()) {
            const client = SupabaseService.getClient();
            if (client) {
              await client.from('history').insert({
                id: `hist-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
                user_id: post.userId,
                platform: 'instagram',
                title: post.title,
                url: uploadResult.url,
                external_id: uploadResult.mediaId,
                published_at: post.completedAt,
                details: { scheduledPostId: post.id },
              });
            }
          }

          results.push({
            id: post.id,
            status: 'completed',
            url: uploadResult.url,
          });
        } else {
          // Non-instagram fallback
          post.status = 'completed';
          post.completedAt = new Date().toISOString();
          successful++;
          results.push({ id: post.id, status: 'completed' });
        }
      } catch (err: any) {
        console.error(`[SchedulingService] Error publishing scheduled post ${post.id}:`, err.message);
        post.retryCount = (post.retryCount || 0) + 1;
        post.lastError = err.message || 'Publishing error';
        if (post.retryCount >= post.maxRetries) {
          post.status = 'failed';
        } else {
          // Reschedule 5 minutes later for retry
          post.status = 'scheduled';
          post.runAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        }
        failed++;
        results.push({
          id: post.id,
          status: post.status,
          error: post.lastError,
          retryCount: post.retryCount,
        });
      }

      this.persistLocal();

      // Update Supabase
      if (SupabaseService.isConfigured()) {
        const client = SupabaseService.getClient();
        if (client) {
          try {
            await client
              .from('scheduled_posts')
              .update({
                status: post.status,
                retry_count: post.retryCount,
                last_error: post.lastError || null,
                result_post_id: post.resultPostId || null,
                result_url: post.resultUrl || null,
                completed_at: post.completedAt || null,
                updated_at: new Date().toISOString(),
                run_at: post.runAt,
              })
              .eq('id', post.id);
          } catch (updateErr: any) {
            console.warn('[SchedulingService] Supabase cron update exception:', updateErr.message);
          }
        }
      }
    }

    return {
      processed: duePosts.length,
      successful,
      failed,
      results,
    };
  }
}
