import {
  Platform,
  PlatformPreset,
  AIAnalysisResult,
  VideoMetadata,
  PublishJob,
  PlatformAuthStatus,
  ConnectedAccount,
  YouTubePublishPayload,
  InstagramPublishPayload,
  ApiResponse,
  ConversionProgress,
  VideoFormatSettings,
  PlatformFormatSettings,
  NicheTrendReport,
} from '@shared/types';

const BASE_URL = '/api';

export class ApiClient {
  static async getAuthStatus(): Promise<PlatformAuthStatus> {
    const res = await fetch(`${BASE_URL}/auth/status`);
    const json: ApiResponse<PlatformAuthStatus> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to fetch auth status');
    return json.data;
  }

  static async getAccounts(platform?: Platform): Promise<ConnectedAccount[]> {
    const url = platform ? `${BASE_URL}/accounts?platform=${platform}` : `${BASE_URL}/accounts`;
    const res = await fetch(url);
    const json: ApiResponse<ConnectedAccount[]> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to fetch accounts');
    return json.data;
  }

  static async disconnectAccount(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/accounts/${id}`, { method: 'DELETE' });
    const json: ApiResponse<void> = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to disconnect account');
  }

  static async setDefaultAccount(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/accounts/${id}/default`, { method: 'POST' });
    const json: ApiResponse<void> = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to set default account');
  }

  static async getYouTubeAuthUrl(): Promise<string> {
    const res = await fetch(`${BASE_URL}/auth/youtube/url`);
    const json: ApiResponse<{ url: string }> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to get YouTube auth URL');
    return json.data.url;
  }

  static async exchangeYouTubeCode(code: string): Promise<ConnectedAccount> {
    const res = await fetch(`${BASE_URL}/auth/youtube/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const json: ApiResponse<ConnectedAccount> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to connect YouTube account');
    return json.data;
  }

  static async getInstagramAuthUrl(): Promise<string> {
    const res = await fetch(`${BASE_URL}/auth/instagram/url`);
    const json: ApiResponse<{ url: string }> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to get Instagram auth URL');
    return json.data.url;
  }

  static async exchangeInstagramCode(code: string): Promise<ConnectedAccount> {
    const res = await fetch(`${BASE_URL}/auth/instagram/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const json: ApiResponse<ConnectedAccount> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to connect Instagram account');
    return json.data;
  }

  static async refreshInstagramAccount(id: string): Promise<{ daysRemaining: number }> {
    const res = await fetch(`${BASE_URL}/auth/instagram/${id}/refresh`, { method: 'POST' });
    const json: ApiResponse<{ daysRemaining: number }> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to refresh Instagram token');
    return json.data;
  }

  static async refreshInstagramToken(id?: string): Promise<{ daysRemaining: number }> {
    const url = id ? `${BASE_URL}/auth/instagram/${id}/refresh` : `${BASE_URL}/auth/instagram/refresh`;
    const res = await fetch(url, { method: 'POST' });
    const json: ApiResponse<{ daysRemaining: number }> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to refresh Instagram token');
    return json.data;
  }

  static async uploadVideo(
    file: File,
    onProgress?: (percent: number, stage: string) => void
  ): Promise<VideoMetadata> {
    // If file is smaller than 20MB, direct upload is fastest
    if (file.size <= 20 * 1024 * 1024) {
      if (onProgress) onProgress(30, 'Uploading video master...');
      const formData = new FormData();
      formData.append('video', file);

      const res = await fetch(`${BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      const json: ApiResponse<VideoMetadata> = await res.json();
      if (!json.success || !json.data) throw new Error(json.error || 'Failed to upload video');
      if (onProgress) onProgress(100, 'Upload complete!');
      return json.data;
    }

    // For files > 20MB up to 1GB: Use 10MB chunked resumable upload
    // defeating Cloud Run's 32MB request body ceiling
    if (onProgress) onProgress(5, 'Initializing 1GB resumable upload session...');

    const initRes = await fetch(`${BASE_URL}/upload/resumable/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalName: file.name,
        totalSize: file.size,
        mimeType: file.type || 'video/mp4',
      }),
    });

    const initJson: ApiResponse<{ sessionId: string; gcsUploadUrl?: string; chunkSize: number }> =
      await initRes.json();
    if (!initJson.success || !initJson.data) {
      throw new Error(initJson.error || 'Failed to initialize upload session');
    }

    const { sessionId, gcsUploadUrl, chunkSize = 10 * 1024 * 1024 } = initJson.data;

    // Direct GCS upload if signed resumable session URL is provided
    if (gcsUploadUrl) {
      if (onProgress) onProgress(15, 'Uploading directly to Google Cloud Storage...');
      const gcsRes = await fetch(gcsUploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'video/mp4' },
        body: file,
      });
      if (!gcsRes.ok) throw new Error(`Google Cloud Storage upload failed with status ${gcsRes.status}`);

      // Finalize on backend
      const finishRes = await fetch(`${BASE_URL}/upload/resumable/chunk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, isLastChunk: true }),
      });
      const finishJson: ApiResponse<{ isComplete: boolean; video: VideoMetadata }> = await finishRes.json();
      if (!finishJson.success || !finishJson.data?.video) {
        throw new Error(finishJson.error || 'Failed to finalize GCS upload');
      }
      if (onProgress) onProgress(100, 'Upload complete!');
      return finishJson.data.video;
    }

    // Backend Chunked Stream (10MB chunks, Cloud Run safe)
    const totalChunks = Math.ceil(file.size / chunkSize);
    let uploadedBytes = 0;
    let finalVideo: VideoMetadata | null = null;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const chunkBlob = file.slice(start, end);
      const isLastChunk = i === totalChunks - 1;

      const chunkFormData = new FormData();
      chunkFormData.append('sessionId', sessionId);
      chunkFormData.append('isLastChunk', String(isLastChunk));
      chunkFormData.append('chunk', chunkBlob, file.name);

      const chunkRes = await fetch(`${BASE_URL}/upload/resumable/chunk`, {
        method: 'POST',
        body: chunkFormData,
      });

      const chunkJson: ApiResponse<{ receivedBytes: number; isComplete: boolean; video?: VideoMetadata }> =
        await chunkRes.json();

      if (!chunkJson.success) {
        throw new Error(chunkJson.error || `Chunk ${i + 1}/${totalChunks} upload failed`);
      }

      uploadedBytes += chunkBlob.size;
      const percent = Math.min(99, Math.round((uploadedBytes / file.size) * 95));
      if (onProgress) {
        onProgress(percent, `Uploading chunk ${i + 1} of ${totalChunks} (${(uploadedBytes / 1024 / 1024).toFixed(1)}MB / ${(file.size / 1024 / 1024).toFixed(1)}MB)...`);
      }

      if (chunkJson.data?.video) {
        finalVideo = chunkJson.data.video;
      }
    }

    if (!finalVideo) {
      throw new Error('Upload finished but video record was not returned.');
    }

    if (onProgress) onProgress(100, 'Upload complete! Probing media details...');
    return finalVideo;
  }

  static async getConversionStatus(videoId: string): Promise<ConversionProgress> {
    const res = await fetch(`${BASE_URL}/conversion/${videoId}`);
    const json: ApiResponse<ConversionProgress> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to fetch conversion status');
    return json.data;
  }

  static async formatVideo(params: {
    videoId: string;
    format: VideoFormatSettings;
    platformFormats?: PlatformFormatSettings;
    originalPath?: string;
  }): Promise<VideoMetadata> {
    const res = await fetch(`${BASE_URL}/video/${params.videoId}/format`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const json: ApiResponse<VideoMetadata> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to adjust video format');
    return json.data;
  }

  static async getTrends(params?: {
    niche?: string;
    region?: string;
    refresh?: boolean;
  }): Promise<NicheTrendReport> {
    const query = new URLSearchParams();
    if (params?.niche) query.set('niche', params.niche);
    if (params?.region) query.set('region', params.region);
    if (params?.refresh) query.set('refresh', 'true');

    const res = await fetch(`${BASE_URL}/trends?${query.toString()}`);
    const json: ApiResponse<NicheTrendReport> = await res.json();
    if (!json.success || !json.data) throw new Error(json.error || 'Failed to fetch trends');
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
    selectedAccounts?: {
      youtubeAccountId?: string;
      instagramAccountId?: string;
    };
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
