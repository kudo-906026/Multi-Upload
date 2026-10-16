import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  Platform,
  PublishJob,
  PlatformJobResult,
  VideoMetadata,
  YouTubePublishPayload,
  InstagramPublishPayload,
} from '../../shared/types.js';
import { YouTubeService } from './youtubeService.js';
import { InstagramService } from './instagramService.js';
import { VideoStorageService } from '../storage/videoStorage.js';
import { SupabaseService } from './supabaseService.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');

export class JobQueueService {
  private static jobs: Map<string, PublishJob> = new Map();

  static init(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(JOBS_FILE)) {
      try {
        const raw = fs.readFileSync(JOBS_FILE, 'utf-8');
        const list: PublishJob[] = JSON.parse(raw);
        list.forEach((j) => this.jobs.set(j.id, j));
        console.log(`[JobQueueService] Loaded ${this.jobs.size} historical jobs.`);
      } catch (err) {
        console.warn('[JobQueueService] Failed to parse jobs history:', err);
      }
    }
  }

  private static persistLocal(): void {
    try {
      const list = Array.from(this.jobs.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      fs.writeFileSync(JOBS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[JobQueueService] Error persisting jobs locally:', err);
    }
  }

  private static async persistToSupabase(job: PublishJob): Promise<void> {
    if (!SupabaseService.isConfigured() || !job.userId) return;
    const client = SupabaseService.getClient();
    if (!client) return;

    try {
      const { error } = await client.from('jobs').upsert({
        id: job.id,
        user_id: job.userId,
        overall_status: job.overallStatus,
        target_platforms: job.targetPlatforms,
        video: job.video,
        selected_accounts: job.selectedAccounts || null,
        metadata: job.metadata,
        platform_results: job.platformResults,
        created_at: job.createdAt,
        completed_at: job.completedAt || null,
      });

      if (error) {
        console.warn('[JobQueueService] Supabase upsert job notice:', error.message);
      }
    } catch (err: any) {
      console.warn('[JobQueueService] Supabase job persist error:', err.message);
    }
  }

  /**
   * Syncs jobs for a specific user from Supabase.
   */
  static async syncUserJobs(userId: string): Promise<void> {
    if (!SupabaseService.isConfigured() || !userId) return;
    const client = SupabaseService.getClient();
    if (!client) return;

    try {
      const { data, error } = await client
        .from('jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn(`[JobQueueService] Supabase jobs query notice for user ${userId}:`, error.message);
        return;
      }

      if (data && data.length > 0) {
        data.forEach((row: any) => {
          this.jobs.set(row.id, {
            id: row.id,
            userId: row.user_id,
            overallStatus: row.overall_status,
            targetPlatforms: row.target_platforms || [],
            video: row.video,
            selectedAccounts: row.selected_accounts || undefined,
            metadata: row.metadata || {},
            platformResults: row.platform_results || {},
            createdAt: row.created_at,
            completedAt: row.completed_at || undefined,
          });
        });
        this.persistLocal();
      }
    } catch (err: any) {
      console.warn('[JobQueueService] Supabase jobs sync error:', err.message);
    }
  }

  static async getAll(userId: string): Promise<PublishJob[]> {
    await this.syncUserJobs(userId);

    return Array.from(this.jobs.values())
      .filter((j) => j.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static getJob(userId: string, id: string): PublishJob | undefined {
    const job = this.jobs.get(id);
    if (!job || job.userId !== userId) return undefined;
    return job;
  }

  /**
   * Creates a new publishing job for the user and starts asynchronous execution.
   */
  static createJob(
    userId: string,
    params: {
      video: VideoMetadata;
      targetPlatforms: Platform[];
      selectedAccounts?: {
        youtubeAccountId?: string;
        instagramAccountId?: string;
      };
      youtubePayload?: YouTubePublishPayload;
      instagramPayload?: InstagramPublishPayload;
    }
  ): PublishJob {
    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();

    const platformResults: { youtube?: PlatformJobResult; instagram?: PlatformJobResult } = {};

    if (params.targetPlatforms.includes('youtube')) {
      platformResults.youtube = {
        platform: 'youtube',
        status: 'pending',
        progress: 0,
        stage: 'Queued for upload',
        retryCount: 0,
        lastUpdated: now,
        logs: [`[${new Date().toLocaleTimeString()}] YouTube job queued`],
      };
    }

    if (params.targetPlatforms.includes('instagram')) {
      platformResults.instagram = {
        platform: 'instagram',
        status: 'pending',
        progress: 0,
        stage: 'Queued for Instagram Reels pipeline',
        retryCount: 0,
        lastUpdated: now,
        logs: [`[${new Date().toLocaleTimeString()}] Instagram Reels job queued`],
      };
    }

    const job: PublishJob = {
      id: jobId,
      userId,
      video: params.video,
      targetPlatforms: params.targetPlatforms,
      selectedAccounts: params.selectedAccounts,
      metadata: {
        youtube: params.youtubePayload,
        instagram: params.instagramPayload,
      },
      platformResults,
      createdAt: now,
      overallStatus: 'queued',
    };

    this.jobs.set(jobId, job);
    this.persistLocal();
    this.persistToSupabase(job).catch((e) => console.warn('[JobQueueService] Notice saving job:', e));

    // Start background processing
    this.processJob(jobId);

    return job;
  }

  /**
   * Executes the publishing process for all selected platforms concurrently.
   */
  private static async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.overallStatus = 'in_progress';
    this.persistLocal();
    this.persistToSupabase(job).catch(() => {});

    const tasks: Promise<void>[] = [];

    if (
      job.targetPlatforms.includes('youtube') &&
      job.metadata.youtube &&
      job.platformResults.youtube?.status !== 'published'
    ) {
      tasks.push(this.executeYouTubePublish(jobId));
    }

    if (
      job.targetPlatforms.includes('instagram') &&
      job.metadata.instagram &&
      job.platformResults.instagram?.status !== 'published'
    ) {
      tasks.push(this.executeInstagramPublish(jobId));
    }

    await Promise.allSettled(tasks);

    // Update overall status
    const currentJob = this.jobs.get(jobId);
    if (currentJob) {
      const results = Object.values(currentJob.platformResults).filter(Boolean) as PlatformJobResult[];
      const allPublished = results.every((r) => r.status === 'published');
      const anyPublished = results.some((r) => r.status === 'published');
      const allFailed = results.every((r) => r.status === 'failed');
      const anyFailed = results.some((r) => r.status === 'failed');

      if (allPublished) {
        currentJob.overallStatus = 'completed';
      } else if (allFailed) {
        currentJob.overallStatus = 'failed';
      } else if (anyFailed) {
        currentJob.overallStatus = 'partial_failure';
      } else {
        currentJob.overallStatus = 'in_progress';
      }

      currentJob.completedAt = new Date().toISOString();
      this.persistLocal();
      this.persistToSupabase(currentJob).catch(() => {});

      // Automatically delete the uploaded video from Supabase Storage and local disk after posting
      if (anyPublished || allPublished) {
        try {
          await VideoStorageService.deleteVideoAfterPosting(currentJob.video);
        } catch (cleanupErr: any) {
          console.warn('[JobQueue] Error during automatic cleanup of posted video:', cleanupErr.message);
        }
      }
    }
  }

  private static async executeYouTubePublish(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !job.userId || !job.metadata.youtube || !job.platformResults.youtube) return;

    const ytResult = job.platformResults.youtube;
    ytResult.status = 'uploading';
    ytResult.lastUpdated = new Date().toISOString();
    this.persistLocal();

    try {
      const res = await YouTubeService.uploadVideo(
        job.video.storagePath,
        job.metadata.youtube,
        (progress, stage) => {
          ytResult.progress = progress;
          ytResult.stage = stage;
          ytResult.status = progress < 90 ? 'uploading' : 'processing';
          ytResult.lastUpdated = new Date().toISOString();
          ytResult.logs.push(`[${new Date().toLocaleTimeString()}] ${stage}`);
          this.persistLocal();
        },
        job.userId,
        job.selectedAccounts?.youtubeAccountId
      );

      ytResult.status = 'published';
      ytResult.progress = 100;
      ytResult.stage = 'Published successfully!';
      ytResult.publishedUrl = res.url;
      ytResult.url = res.url;
      ytResult.externalId = res.videoId;
      ytResult.logs.push(`[${new Date().toLocaleTimeString()}] Live on YouTube: ${res.url}`);

      // Record to history table
      this.recordHistory(job.userId, jobId, 'youtube', job.metadata.youtube.title, res.url, res.videoId);
    } catch (err: any) {
      console.error(`[JobQueue] YouTube upload failed for job ${jobId}:`, err);
      ytResult.status = 'failed';
      ytResult.error = err.message || 'Unknown YouTube publishing error';
      ytResult.stage = `Failed: ${ytResult.error}`;
      ytResult.logs.push(`[${new Date().toLocaleTimeString()}] ERROR: ${ytResult.error}`);
    }

    ytResult.lastUpdated = new Date().toISOString();
    this.persistLocal();
    this.persistToSupabase(job).catch(() => {});
  }

  private static async executeInstagramPublish(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !job.userId || !job.metadata.instagram || !job.platformResults.instagram) return;

    const igResult = job.platformResults.instagram;
    igResult.status = 'uploading';
    igResult.lastUpdated = new Date().toISOString();
    this.persistLocal();

    try {
      const res = await InstagramService.publishReel(
        job.video.publicUrl,
        job.metadata.instagram,
        (progress, stage) => {
          igResult.progress = progress;
          igResult.stage = stage;
          igResult.status = progress < 85 ? 'uploading' : 'processing';
          igResult.lastUpdated = new Date().toISOString();
          igResult.logs.push(`[${new Date().toLocaleTimeString()}] ${stage}`);
          this.persistLocal();
        },
        job.userId,
        job.selectedAccounts?.instagramAccountId
      );

      igResult.status = 'published';
      igResult.progress = 100;
      igResult.stage = 'Published successfully!';
      igResult.publishedUrl = res.url;
      igResult.url = res.url;
      igResult.externalId = res.mediaId;
      igResult.logs.push(`[${new Date().toLocaleTimeString()}] Live on Instagram: ${res.url}`);

      // Record to history table
      this.recordHistory(job.userId, jobId, 'instagram', job.metadata.instagram.caption.slice(0, 80), res.url, res.mediaId);
    } catch (err: any) {
      console.error(`[JobQueue] Instagram publish failed for job ${jobId}:`, err);
      igResult.status = 'failed';
      igResult.error = err.message || 'Unknown Instagram publishing error';
      igResult.stage = `Failed: ${igResult.error}`;
      igResult.logs.push(`[${new Date().toLocaleTimeString()}] ERROR: ${igResult.error}`);
    }

    igResult.lastUpdated = new Date().toISOString();
    this.persistLocal();
    this.persistToSupabase(job).catch(() => {});
  }

  private static async recordHistory(
    userId: string,
    jobId: string,
    platform: Platform,
    title: string,
    url?: string,
    externalId?: string
  ): Promise<void> {
    if (!SupabaseService.isConfigured() || !userId) return;
    const client = SupabaseService.getClient();
    if (!client) return;

    try {
      await client.from('history').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        job_id: jobId,
        platform,
        title,
        url: url || null,
        external_id: externalId || null,
        published_at: new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn('[JobQueueService] Notice recording publish history to Supabase:', err.message);
    }
  }

  /**
   * Retries publishing for a specific failed platform on a job.
   */
  static async retryPlatform(userId: string, jobId: string, platform: Platform): Promise<PublishJob> {
    const job = this.jobs.get(jobId);
    if (!job || job.userId !== userId) {
      throw new Error('Job not found');
    }

    const platformRes = job.platformResults[platform];
    if (!platformRes) {
      throw new Error(`Platform ${platform} not part of this job`);
    }

    platformRes.status = 'pending';
    platformRes.progress = 0;
    platformRes.stage = `Retrying ${platform} publish...`;
    platformRes.error = undefined;
    platformRes.retryCount += 1;
    platformRes.lastUpdated = new Date().toISOString();
    platformRes.logs.push(`[${new Date().toLocaleTimeString()}] Retry requested (attempt #${platformRes.retryCount})`);

    job.overallStatus = 'in_progress';
    this.persistLocal();
    this.persistToSupabase(job).catch(() => {});

    // Asynchronously execute retry
    if (platform === 'youtube') {
      this.executeYouTubePublish(jobId);
    } else if (platform === 'instagram') {
      this.executeInstagramPublish(jobId);
    }

    return job;
  }
}
