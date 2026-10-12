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
  SmartKeywordsResult,
} from '@shared/types';

const BASE_URL = '/api';

/**
 * Robust fetch wrapper that always checks response.ok and Content-Type before parsing JSON.
 * Throws clean, informative error messages if the server returns HTML (e.g. 404/500 proxy error)
 * preventing "Unexpected token '<', "<!DOCTYPE "... is not valid JSON".
 */
async function safeFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (netErr: any) {
    throw new Error(`Network error connecting to ${url}: ${netErr.message || 'Server unreachable'}`);
  }

  const contentType = res.headers.get('content-type') || '';

  // Validate that the server returned JSON
  if (!contentType.includes('application/json')) {
    const rawText = await res.text();
    const preview = rawText.slice(0, 160).replace(/\s+/g, ' ').trim();
    if (!res.ok) {
      throw new Error(
        `Server error HTTP ${res.status} (${res.statusText || 'Error'}), expected JSON but got ${
          contentType || 'non-JSON'
        }: "${preview}"`
      );
    }
    throw new Error(
      `Invalid server response: expected JSON but received ${contentType || 'non-JSON'} (HTTP ${
        res.status
      }): "${preview}"`
    );
  }

  let json: ApiResponse<T>;
  try {
    json = await res.json();
  } catch (parseErr: any) {
    throw new Error(`Failed to parse JSON response (HTTP ${res.status}): ${parseErr.message}`);
  }

  if (!res.ok || json.success === false) {
    const message = json.error || json.message || `Request failed with HTTP status ${res.status}`;
    throw new Error(message);
  }

  return json;
}

/**
 * Uploads a file directly to a signed storage URL using raw PUT with live progress tracking.
 * For Supabase Storage and cloud hosts, this sends the file directly to storage so the server
 * never receives the video file, avoiding bandwidth and memory limits.
 */
function uploadFileDirectly(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number, stage: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 95));
        const uploadedMB = (event.loaded / (1024 * 1024)).toFixed(1);
        const totalMB = (event.total / (1024 * 1024)).toFixed(1);
        onProgress(percent, `Uploading directly to storage: ${uploadedMB}MB / ${totalMB}MB (${percent}%)...`);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(98, 'Direct storage upload complete! Finalizing...');
        resolve();
      } else {
        const preview = (xhr.responseText || '').slice(0, 150);
        reject(new Error(`Direct storage upload failed with HTTP status ${xhr.status}: ${preview}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during direct video storage upload. Please check connectivity and retry.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Direct storage upload timed out. Please retry.'));
    };

    xhr.send(file);
  });
}

export class ApiClient {
  static async getAuthStatus(): Promise<PlatformAuthStatus> {
    const res = await safeFetch<PlatformAuthStatus>(`${BASE_URL}/auth/status`);
    if (!res.data) throw new Error(res.error || 'Failed to fetch auth status');
    return res.data;
  }

  static async getAccounts(platform?: Platform): Promise<ConnectedAccount[]> {
    const url = platform ? `${BASE_URL}/accounts?platform=${platform}` : `${BASE_URL}/accounts`;
    const res = await safeFetch<ConnectedAccount[]>(url);
    if (!res.data) throw new Error(res.error || 'Failed to fetch accounts');
    return res.data;
  }

  static async disconnectAccount(id: string): Promise<void> {
    await safeFetch<void>(`${BASE_URL}/accounts/${id}`, { method: 'DELETE' });
  }

  static async setDefaultAccount(id: string): Promise<void> {
    await safeFetch<void>(`${BASE_URL}/accounts/${id}/default`, { method: 'POST' });
  }

  static async getYouTubeAuthUrl(): Promise<string> {
    const res = await safeFetch<{ url: string }>(`${BASE_URL}/auth/youtube/url`);
    if (!res.data) throw new Error(res.error || 'Failed to get YouTube auth URL');
    return res.data.url;
  }

  static async exchangeYouTubeCode(code: string): Promise<ConnectedAccount> {
    const res = await safeFetch<ConnectedAccount>(`${BASE_URL}/auth/youtube/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!res.data) throw new Error(res.error || 'Failed to connect YouTube account');
    return res.data;
  }

  static async getInstagramAuthUrl(): Promise<string> {
    const res = await safeFetch<{ url: string }>(`${BASE_URL}/auth/instagram/url`);
    if (!res.data) throw new Error(res.error || 'Failed to get Instagram auth URL');
    return res.data.url;
  }

  static async exchangeInstagramCode(code: string): Promise<ConnectedAccount> {
    const res = await safeFetch<ConnectedAccount>(`${BASE_URL}/auth/instagram/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!res.data) throw new Error(res.error || 'Failed to connect Instagram account');
    return res.data;
  }

  static async refreshInstagramAccount(id: string): Promise<{ daysRemaining: number }> {
    const res = await safeFetch<{ daysRemaining: number }>(`${BASE_URL}/auth/instagram/${id}/refresh`, {
      method: 'POST',
    });
    if (!res.data) throw new Error(res.error || 'Failed to refresh Instagram account token');
    return res.data;
  }

  static async refreshInstagramToken(id?: string): Promise<{ daysRemaining: number }> {
    const url = id ? `${BASE_URL}/auth/instagram/${id}/refresh` : `${BASE_URL}/auth/instagram/refresh`;
    const res = await safeFetch<{ daysRemaining: number }>(url, { method: 'POST' });
    if (!res.data) throw new Error(res.error || 'Failed to refresh Instagram token');
    return res.data;
  }

  /**
   * Resumable direct-to-storage video upload supporting up to 1 GB.
   * Uploads directly to Supabase Storage (public bucket) via signed upload URLs.
   * The backend server NEVER receives the video file directly, saving bandwidth and memory.
   */
  static async uploadVideo(
    file: File,
    onProgress?: (percent: number, stage: string) => void
  ): Promise<VideoMetadata> {
    if (onProgress) onProgress(5, 'Requesting signed resumable upload URL...');

    // 1. Initialize signed resumable session
    const initRes = await safeFetch<{
      sessionId: string;
      uploadUrl: string;
      isSupabase?: boolean;
      gcsUploadUrl?: string;
      isGcs?: boolean;
    }>(`${BASE_URL}/upload/resumable/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalName: file.name,
        totalSize: file.size,
        mimeType: file.type || 'video/mp4',
      }),
    });

    if (!initRes.data || !initRes.data.uploadUrl) {
      throw new Error(initRes.error || 'Failed to acquire upload URL');
    }

    const { sessionId, uploadUrl, isSupabase, isGcs } = initRes.data;

    if (onProgress) {
      onProgress(
        10,
        isSupabase
          ? 'Uploading directly to Supabase Storage (signed URL)...'
          : isGcs
          ? 'Uploading directly to cloud storage...'
          : 'Uploading directly to storage...'
      );
    }

    // 2. Direct upload via PUT to signed URL (server never receives file bytes)
    await uploadFileDirectly(uploadUrl, file, onProgress);

    // 3. Finalize upload session on backend
    if (onProgress) onProgress(98, 'Finalizing video metadata and probing media...');

    const finishRes = await safeFetch<{ isComplete: boolean; video: VideoMetadata }>(
      `${BASE_URL}/upload/resumable/finish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          originalName: file.name,
          totalSize: file.size,
          mimeType: file.type || 'video/mp4',
        }),
      }
    );

    if (!finishRes.data?.video) {
      throw new Error(finishRes.error || 'Failed to finalize uploaded video record');
    }

    if (onProgress) onProgress(100, 'Upload complete!');
    return finishRes.data.video;
  }

  static async getConversionStatus(videoId: string): Promise<ConversionProgress> {
    const res = await safeFetch<ConversionProgress>(`${BASE_URL}/conversion/${videoId}`);
    if (!res.data) throw new Error(res.error || 'Failed to fetch conversion status');
    return res.data;
  }

  static async formatVideo(params: {
    videoId: string;
    format: VideoFormatSettings;
    platformFormats?: PlatformFormatSettings;
    originalPath?: string;
  }): Promise<VideoMetadata> {
    const res = await safeFetch<VideoMetadata>(`${BASE_URL}/video/${params.videoId}/format`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.data) throw new Error(res.error || 'Failed to adjust video format');
    return res.data;
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

    const res = await safeFetch<NicheTrendReport>(`${BASE_URL}/trends?${query.toString()}`);
    if (!res.data) throw new Error(res.error || 'Failed to fetch trends');
    return res.data;
  }

  static async analyzeVideo(params: {
    filename: string;
    titleHint?: string;
    descriptionHint?: string;
    tone?: string;
  }): Promise<AIAnalysisResult> {
    const res = await safeFetch<AIAnalysisResult>(`${BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.data) throw new Error(res.error || 'Failed to analyze video');
    return res.data;
  }

  static async generateSmartKeywords(params: {
    title?: string;
    description?: string;
    topic?: string;
    videoFilename?: string;
  }): Promise<SmartKeywordsResult> {
    const res = await safeFetch<SmartKeywordsResult>(`${BASE_URL}/smart-keywords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.data) throw new Error(res.error || 'Failed to generate smart keywords');
    return res.data;
  }

  static async getPresets(): Promise<PlatformPreset[]> {
    const res = await safeFetch<PlatformPreset[]>(`${BASE_URL}/presets`);
    if (!res.data) throw new Error(res.error || 'Failed to fetch presets');
    return res.data;
  }

  static async savePreset(preset: Partial<PlatformPreset> & { platform: Platform }): Promise<PlatformPreset> {
    const res = await safeFetch<PlatformPreset>(`${BASE_URL}/presets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preset),
    });
    if (!res.data) throw new Error(res.error || 'Failed to save preset');
    return res.data;
  }

  static async mergePreset(
    aiOutput: AIAnalysisResult,
    platform: Platform
  ): Promise<{ youtube?: YouTubePublishPayload; instagram?: InstagramPublishPayload }> {
    const res = await safeFetch<{ youtube?: YouTubePublishPayload; instagram?: InstagramPublishPayload }>(
      `${BASE_URL}/presets/merge`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiOutput, platform }),
      }
    );
    if (!res.data) throw new Error(res.error || 'Failed to merge preset');
    return res.data;
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
    const res = await safeFetch<PublishJob>(`${BASE_URL}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.data) throw new Error(res.error || 'Failed to initiate publish job');
    return res.data;
  }

  static async getJobs(): Promise<PublishJob[]> {
    const res = await safeFetch<PublishJob[]>(`${BASE_URL}/jobs`);
    if (!res.data) throw new Error(res.error || 'Failed to fetch jobs');
    return res.data;
  }

  static async getJob(id: string): Promise<PublishJob> {
    const res = await safeFetch<PublishJob>(`${BASE_URL}/jobs/${id}`);
    if (!res.data) throw new Error(res.error || 'Failed to fetch job');
    return res.data;
  }

  static async retryJobPlatform(jobId: string, platform: Platform): Promise<PublishJob> {
    const res = await safeFetch<PublishJob>(`${BASE_URL}/jobs/${jobId}/retry/${platform}`, {
      method: 'POST',
    });
    if (!res.data) throw new Error(res.error || 'Failed to retry platform');
    return res.data;
  }
}
