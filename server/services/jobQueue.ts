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
        console.warn('[JobQueueService] Failed to parse jobs history, starting fresh:', err);
      }
    }
  }

  private static persist(): void {
    try {
      const list = Array.from(this.jobs.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      fs.writeFileSync(JOBS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[JobQueueService] Error persisting jobs:', err);
    }
  }

  static getAll(): PublishJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  static getJob(id: string): PublishJob | undefined {
    return this.jobs.get(id);
  }

  /**
   * Creates a new publishing job and starts asynchronous execution.
   */
  static createJob(params: {
    video: VideoMetadata;
    targetPlatforms: Platform[];
    youtubePayload?: YouTubePublishPayload;
    instagramPayload?: InstagramPublishPayload;
  }): PublishJob {
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
      video: params.video,
      targetPlatforms: params.targetPlatforms,
      metadata: {
        youtube: params.youtubePayload,
        instagram: params.instagramPayload,
      },
      platformResults,
      createdAt: now,
      overallStatus: 'queued',
    };

    this.jobs.set(jobId, job);
    this.persist();

    // Start background processing
    this.processJob(jobId);

    return job;
  }

  /**
   * Executes the publishing process for all selected platforms concurrently.
   * If one platform fails, the other platform continues and can still succeed!
   */
  private static async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.overallStatus = 'in_progress';
    this.persist();

    const tasks: Promise<void>[] = [];

    if (job.targetPlatforms.includes('youtube') && job.metadata.youtube && job.platformResults.youtube?.status !== 'published') {
      tasks.push(this.executeYouTubePublish(jobId));
    }

    if (job.targetPlatforms.includes('instagram') && job.metadata.instagram && job.platformResults.instagram?.status !== 'published') {
      tasks.push(this.executeInstagramPublish(jobId));
    }

    await Promise.allSettled(tasks);

    // Update overall status
    const currentJob = this.jobs.get(jobId);
    if (currentJob) {
      const results = Object.values(currentJob.platformResults).filter(Boolean) as PlatformJobResult[];
      const allPublished = results.every((r) => r.status === 'published');
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
      this.persist();
    }
  }

  private static async executeYouTubePublish(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !job.metadata.youtube || !job.platformResults.youtube) return;

    const ytResult = job.platformResults.youtube;
    ytResult.status = 'uploading';
    ytResult.lastUpdated = new Date().toISOString();
    this.persist();

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
          this.persist();
        }
      );

      ytResult.status = 'published';
      ytResult.progress = 100;
      ytResult.stage = 'Published successfully!';
      ytResult.publishedUrl = res.url;
      ytResult.externalId = res.videoId;
      ytResult.logs.push(`[${new Date().toLocaleTimeString()}] Live on YouTube: ${res.url}`);
    } catch (err: any) {
      console.error(`[JobQueue] YouTube upload failed for job ${jobId}:`, err);
      ytResult.status = 'failed';
      ytResult.error = err.message || 'Unknown YouTube publishing error';
      ytResult.stage = `Failed: ${ytResult.error}`;
      ytResult.logs.push(`[${new Date().toLocaleTimeString()}] ERROR: ${ytResult.error}`);
    }

    ytResult.lastUpdated = new Date().toISOString();
    this.persist();
  }

  private static async executeInstagramPublish(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !job.metadata.instagram || !job.platformResults.instagram) return;

    const igResult = job.platformResults.instagram;
    igResult.status = 'uploading';
    igResult.lastUpdated = new Date().toISOString();
    this.persist();

    try {
      const res = await InstagramService.publishReel(
        job.video.publicUrl,
        job.metadata.instagram,
        (progress, stage) => {
          igResult.progress = progress;
          igResult.stage = stage;
          igResult.status = progress < 30 ? 'uploading' : 'processing';
          igResult.lastUpdated = new Date().toISOString();
          igResult.logs.push(`[${new Date().toLocaleTimeString()}] ${stage}`);
          this.persist();
        }
      );

      igResult.status = 'published';
      igResult.progress = 100;
      igResult.stage = 'Published successfully!';
      igResult.publishedUrl = res.url;
      igResult.externalId = res.mediaId;
      igResult.logs.push(`[${new Date().toLocaleTimeString()}] Live on Instagram Reels: ${res.url}`);
    } catch (err: any) {
      console.error(`[JobQueue] Instagram publish failed for job ${jobId}:`, err);
      igResult.status = 'failed';
      igResult.error = err.message || 'Unknown Instagram publishing error';
      igResult.stage = `Failed: ${igResult.error}`;
      igResult.logs.push(`[${new Date().toLocaleTimeString()}] ERROR: ${igResult.error}`);
    }

    igResult.lastUpdated = new Date().toISOString();
    this.persist();
  }

  /**
   * Retries a specific failed platform for a job without re-uploading the other.
   */
  static async retryPlatform(jobId: string, platform: Platform): Promise<PublishJob> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const platformResult = job.platformResults[platform];
    if (!platformResult) {
      throw new Error(`Platform ${platform} is not part of this job`);
    }

    if (platformResult.status === 'published') {
      throw new Error(`Platform ${platform} is already successfully published.`);
    }

    platformResult.retryCount++;
    platformResult.status = 'pending';
    platformResult.progress = 0;
    platformResult.error = undefined;
    platformResult.stage = `Retry #${platformResult.retryCount} initiated`;
    platformResult.logs.push(`[${new Date().toLocaleTimeString()}] Retry #${platformResult.retryCount} started`);
    job.overallStatus = 'in_progress';
    this.persist();

    if (platform === 'youtube') {
      this.executeYouTubePublish(jobId).then(() => this.updateJobOverallStatus(jobId));
    } else {
      this.executeInstagramPublish(jobId).then(() => this.updateJobOverallStatus(jobId));
    }

    return job;
  }

  private static updateJobOverallStatus(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const results = Object.values(job.platformResults).filter(Boolean) as PlatformJobResult[];
    const allPublished = results.every((r) => r.status === 'published');
    const allFailed = results.every((r) => r.status === 'failed');
    const anyFailed = results.some((r) => r.status === 'failed');

    if (allPublished) {
      job.overallStatus = 'completed';
    } else if (allFailed) {
      job.overallStatus = 'failed';
    } else if (anyFailed) {
      job.overallStatus = 'partial_failure';
    } else {
      job.overallStatus = 'in_progress';
    }
    this.persist();
  }
}

// Initialize on module load
JobQueueService.init();
