import {
  Platform,
  PlatformPreset,
  AIAnalysisResult,
  VideoMetadata,
  PublishJob,
  PlatformAuthStatus,
  YouTubePublishPayload,
  InstagramPublishPayload,
  ApiResponse,
} from '@shared/types';

const BASE_URL = '/api';

export class ApiClient {
  static async getAuthStatus(): Promise<PlatformAuthStatus> {
    const res = await fetch(`${BASE_URL}/auth/status`);
    const json: ApiResponse<PlatformAuthStatus> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to fetch auth status');
    return json.data;
  }

  static async getYouTubeAuthUrl(): Promise<string> {
    const res = await fetch(`${BASE_URL}/auth/youtube/url`);
    const json: ApiResponse<{ url: string }> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to get YouTube auth URL');
    return json.data.url;
  }

  static async refreshInstagramToken(): Promise<{ daysRemaining: number }> {
    const res = await fetch(`${BASE_URL}/auth/instagram/refresh`, { method: 'POST' });
    const json: ApiResponse<{ daysRemaining: number }> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to refresh Instagram token');
    return json.data;
  }

  static async uploadVideo(file: File): Promise<VideoMetadata> {
    const formData = new FormData();
    formData.append('video', file);

    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    const json: ApiResponse<VideoMetadata> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to upload video');
    return json.data;
  }

  static async analyzeVideo(params: {
    filename: string;
    titleHint?: string;
    descriptionHint?: string;
    tone?: string;
  }): Promise<AIAnalysisResult> {
    const res = await fetch(`${BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const json: ApiResponse<AIAnalysisResult> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to analyze video');
    return json.data;
  }

  static async getPresets(): Promise<PlatformPreset[]> {
    const res = await fetch(`${BASE_URL}/presets`);
    const json: ApiResponse<PlatformPreset[]> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to fetch presets');
    return json.data;
  }

  static async savePreset(preset: Partial<PlatformPreset> & { platform: Platform }): Promise<PlatformPreset> {
    const res = await fetch(`${BASE_URL}/presets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preset),
    });

    const json: ApiResponse<PlatformPreset> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to save preset');
    return json.data;
  }

  static async mergePreset(
    aiOutput: AIAnalysisResult,
    platform: Platform
  ): Promise<{ youtube?: YouTubePublishPayload; instagram?: InstagramPublishPayload }> {
    const res = await fetch(`${BASE_URL}/presets/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiOutput, platform }),
    });

    const json: ApiResponse<{ youtube?: YouTubePublishPayload; instagram?: InstagramPublishPayload }> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to merge preset');
    return json.data;
  }

  static async publishJob(payload: {
    video: VideoMetadata;
    targetPlatforms: Platform[];
    youtubePayload?: YouTubePublishPayload;
    instagramPayload?: InstagramPublishPayload;
  }): Promise<PublishJob> {
    const res = await fetch(`${BASE_URL}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json: ApiResponse<PublishJob> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to initiate publish job');
    return json.data;
  }

  static async getJobs(): Promise<PublishJob[]> {
    const res = await fetch(`${BASE_URL}/jobs`);
    const json: ApiResponse<PublishJob[]> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to fetch jobs');
    return json.data;
  }

  static async getJob(id: string): Promise<PublishJob> {
    const res = await fetch(`${BASE_URL}/jobs/${id}`);
    const json: ApiResponse<PublishJob> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to fetch job');
    return json.data;
  }

  static async retryJobPlatform(jobId: string, platform: Platform): Promise<PublishJob> {
    const res = await fetch(`${BASE_URL}/jobs/${jobId}/retry/${platform}`, {
      method: 'POST',
    });

    const json: ApiResponse<PublishJob> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to retry platform');
    return json.data;
  }
}
