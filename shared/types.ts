export type Platform = 'youtube' | 'instagram';

export type PrivacyStatus = 'public' | 'unlisted' | 'private';

export type AITone = 'viral_hook' | 'informative' | 'casual' | 'storytelling' | 'humorous';

export interface PlatformPreset {
  id: string;
  platform: Platform;
  name: string;
  fixedHashtags: string[];
  descriptionFooter: string;
  category: string; // YouTube category ID (e.g. '28' = Science & Technology)
  privacy: PrivacyStatus;
  tone: AITone;
  shareToFeed: boolean; // For Instagram Reels
  updatedAt: string;
}

export interface GroundedTrend {
  query: string;
  trendingKeywords: string[];
  contextNote?: string;
}

export interface YouTubeGeneratedContent {
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  categoryId: string;
  categoryName: string;
}

export interface InstagramGeneratedContent {
  caption: string;
  hashtags: string[];
  recommendedAudio: string;
  hookSentence: string;
}

export interface GrowthDataPoint {
  day: number;
  label: string; // e.g. "Day 1", "Day 3", "Day 7", "Day 14", "Day 30"
  youtubeViews: number;
  instagramViews: number;
  searchInterest: number; // 0 - 100
}

export interface AIAnalysisResult {
  topic: string;
  detectedTone: string;
  keyInsights: string[];
  groundedTrends: GroundedTrend[];
  youtube: YouTubeGeneratedContent;
  instagram: InstagramGeneratedContent;
  predictedGrowth?: GrowthDataPoint[];
  analyzedAt: string;
}

export interface VideoMetadata {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  publicUrl: string;
  storagePath: string;
  durationSec?: number;
  width?: number;
  height?: number;
  createdAt: string;
}

export type PlatformPostStatus = 'pending' | 'uploading' | 'processing' | 'published' | 'failed';

export interface PlatformJobResult {
  platform: Platform;
  status: PlatformPostStatus;
  progress: number; // 0 - 100
  stage: string;
  publishedUrl?: string;
  externalId?: string;
  error?: string;
  retryCount: number;
  lastUpdated: string;
  logs: string[];
}

export interface YouTubePublishPayload {
  title: string;
  description: string;
  tags: string[];
  privacyStatus: PrivacyStatus;
  categoryId: string;
  madeForKids: boolean;
}

export interface InstagramPublishPayload {
  caption: string;
  hashtags: string[];
  shareToFeed: boolean;
}

export interface PublishJob {
  id: string;
  video: VideoMetadata;
  targetPlatforms: Platform[];
  metadata: {
    youtube?: YouTubePublishPayload;
    instagram?: InstagramPublishPayload;
  };
  platformResults: {
    youtube?: PlatformJobResult;
    instagram?: PlatformJobResult;
  };
  createdAt: string;
  completedAt?: string;
  overallStatus: 'queued' | 'in_progress' | 'completed' | 'partial_failure' | 'failed';
}

export interface PlatformAuthStatus {
  youtube: {
    configured: boolean;
    authenticated: boolean;
    channelTitle?: string;
    tokenExpiry?: string;
    needsReauth: boolean;
  };
  instagram: {
    configured: boolean;
    authenticated: boolean;
    username?: string;
    tokenDaysRemaining?: number;
    needsRefresh: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
