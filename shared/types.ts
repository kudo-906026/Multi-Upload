export type Platform = 'youtube' | 'instagram';

export type PrivacyStatus = 'public' | 'unlisted' | 'private';

export type AITone = 'viral_hook' | 'informative' | 'casual' | 'storytelling' | 'humorous';

export interface PlatformPreset {
  id: string;
  userId?: string;
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
  altText?: string;
}

export interface SmartKeywordsResult {
  focusKeyword: string;
  youtubeTags: string[];
  instagramAltText: string;
  primaryKeywords: string[];
  seoStrategyTip?: string;
}

export interface GrowthDataPoint {
  day: number;
  label: string; // e.g. "Day 1", "Day 3", "Day 7", "Day 14", "Day 30"
  youtubeViews: number;
  instagramViews: number;
  searchInterest: number; // 0 - 100
}

export type AspectRatioOption = '9:16' | '1:1' | '4:5' | '16:9' | 'original';

export type FormatMode = 'crop' | 'fit_blurred' | 'fit_solid';

export interface CropFocusPoint {
  x: number; // 0 to 100%
  y: number; // 0 to 100%
}

export interface VideoFormatSettings {
  aspectRatio: AspectRatioOption;
  mode: FormatMode;
  focusPoint?: CropFocusPoint; // default { x: 50, y: 50 }
  solidBgColor?: string; // default '#000000'
  trimStartSec?: number; // 0
  trimEndSec?: number; // duration
}

export interface PlatformFormatSettings {
  youtube?: VideoFormatSettings;
  instagram?: VideoFormatSettings;
  separatePerPlatform?: boolean;
}

export interface ConversionProgress {
  status: 'idle' | 'converting' | 'completed' | 'failed';
  percent: number; // 0 - 100
  stage: string;
  error?: string;
  convertedUrl?: string;
}

export interface TrendItem {
  id: string;
  topic: string;
  whyTrending: string;
  suggestedEditStyle: string;
  suggestedHashtags: string[];
  suggestedAudioStyle: string;
  difficulty: 'Low' | 'Medium' | 'High';
  competitionScore: number; // 1 - 10
  searchInterest: number; // 1 - 100
  youtubeTrendingReference?: {
    title: string;
    channelTitle: string;
    viewCount?: string;
    videoUrl?: string;
  };
}

export interface NicheTrendReport {
  niche: string;
  region: string;
  lastUpdated: string;
  cachedUntil: string;
  items: TrendItem[];
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
  formatSettings?: VideoFormatSettings;
  platformFormats?: PlatformFormatSettings;
  convertedPath?: string;
  convertedUrl?: string;
  gcsUri?: string;
  supabasePath?: string;
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
  altText?: string;
}

export interface ConnectedAccount {
  id: string;
  userId?: string;
  platform: Platform;
  name: string; // YouTube Channel Name or Instagram Name/Username
  handle?: string; // @handle or @username
  avatarUrl?: string;
  platformAccountId: string; // YouTube Channel ID or Instagram User ID
  connectedAt: string;
  expiresAt?: string; // For Instagram (ISO string)
  tokenDaysRemaining?: number; // Calculated for Instagram
  needsRefresh?: boolean;
  isDefault?: boolean;
}

export interface PublishJob {
  id: string;
  userId?: string;
  video: VideoMetadata;
  targetPlatforms: Platform[];
  selectedAccounts?: {
    youtubeAccountId?: string;
    instagramAccountId?: string;
  };
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

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

export interface AIUsageQuota {
  analyzeUsedToday: number;
  analyzeDailyLimit: number;
  trendUsedToday: number;
  trendDailyLimit: number;
  keywordsUsedToday: number;
  keywordsDailyLimit: number;
  remainingAnalyses: number;
  remainingTrends: number;
  remainingKeywords: number;
}

export interface PlatformAuthStatus {
  youtube: {
    configured: boolean;
    authenticated: boolean;
    channelTitle?: string;
    tokenExpiry?: string;
    needsReauth: boolean;
    accounts: ConnectedAccount[];
  };
  instagram: {
    configured: boolean;
    authenticated: boolean;
    username?: string;
    tokenDaysRemaining?: number;
    needsRefresh: boolean;
    accounts: ConnectedAccount[];
  };
  developerConfig?: {
    googleConfigured: boolean;
    metaConfigured: boolean;
    googleRedirectUri: string;
    metaRedirectUri: string;
    publicBaseUrl: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

