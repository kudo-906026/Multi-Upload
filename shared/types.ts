export type Platform = 'youtube' | 'instagram';

export type PrivacyStatus = 'public' | 'unlisted' | 'private';

export type AITone = 'viral_hook' | 'informative' | 'casual' | 'storytelling' | 'humorous';

export interface PlatformPreset {
  id: string;
  userId?: string;
  platform: Platform;
  name: string;
  genre?: 'anime' | 'marvel' | 'manhwa' | 'gaming' | 'cinematic' | 'custom';
  titleTemplate?: string; // e.g. "{character} | {series} Edit 🔥 [{edit_style}] #Shorts"
  descriptionTemplate?: string;
  captionTemplate?: string;
  fixedHashtags?: string[];
  descriptionFooter: string;
  tags?: string[]; // YouTube niche search tags
  category: string; // YouTube category ID (e.g. '1' = Film & Animation, '24' = Entertainment)
  privacy: PrivacyStatus;
  tone: AITone;
  shareToFeed: boolean; // For Instagram Reels
  madeForKids?: boolean; // For YouTube
  language?: string; // For YouTube (e.g. 'en')
  defaultLocation?: string; // For Instagram Reels
  collaborators?: string[]; // For Instagram Reels
  hashtagLimit?: number; // Configurable Instagram hashtag limit setting (default 5)
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
  language?: string;
  isShorts?: boolean;
  scheduledPublishTime?: string;
}

export interface InstagramGeneratedContent {
  caption: string;
  hashtags: string[];
  recommendedAudio: string;
  hookSentence: string;
  altText?: string;
  suggestedLocation?: string;
  suggestedCollaborators?: string[];
  coverFrameOffsetSec?: number;
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

export interface TrendingShortVideo {
  id: string;
  title: string;
  channelTitle: string;
  channelId?: string;
  viewCount: string;
  publishedAt: string;
  age: string;
  thumbnailUrl: string;
  embedUrl: string;
  videoUrl: string;
  tags?: string[];
  description?: string;
}

export interface RankedKeyword {
  keyword: string;
  searchVolumeScore: number; // 1 - 100
  frequency: number; // count in top videos
  relevance: string;
  searchVolume?: string | number;
  difficultyScore?: number;
}

export interface RankedHashtag {
  hashtag: string;
  viralityScore: number; // 1 - 100
  trendingReason: string;
}

export interface TitleIdea {
  id: string;
  title: string;
  targetPlatform: 'youtube' | 'instagram' | 'both';
  hookStrategy: string;
  estimatedCtrScore: number; // 1 - 100
}

export interface NicheBreakdown {
  trendingTitles: string[]; // trending anime, manhwa, marvel series/titles
  trendingCharacters: string[]; // trending characters
  trendingEditStyles: string[]; // trending edit styles
  topSongs: { name: string; artist?: string; vibe?: string }[];
  topHashtags: string[];
  topKeywords: string[];
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
  videos: TrendingShortVideo[];
  keywords: RankedKeyword[];
  hashtags: RankedHashtag[];
  titleIdeas: TitleIdea[];
  breakdown: NicheBreakdown;
  items: TrendItem[];
}

export interface AIAnalysisResult {
  topic: string;
  detectedTone: string;
  recognizedCharacter?: string; // Character recognized by Gemini (e.g. Gojo Satoru, Sung Jin-woo, Spider-Man)
  recognizedSeries?: string; // Series recognized by Gemini (e.g. Jujutsu Kaisen, Solo Leveling, Marvel MCU)
  editStyle?: string; // Edit style recognized by Gemini (e.g. Phonk Velocity, 4K HDR Flow, Cinematic Beat Sync)
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
  url?: string;
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
  scheduledPublishTime?: string; // ISO 8601 string if scheduled (requires privacyStatus = 'private')
  language?: string; // Default video language (e.g. 'en')
  customThumbnailUrl?: string; // Base64 data URL or uploaded URL
  isShorts?: boolean; // Flagged as YouTube Short
  playlist?: string; // Target playlist name or ID
  commentsSetting?: 'allow_all' | 'hold_inappropriate' | 'disabled';
}

export interface InstagramPublishPayload {
  caption: string;
  hashtags: string[];
  shareToFeed: boolean;
  altText?: string;
  location?: string; // Location name / ID
  collaborators?: string[]; // Collaborator usernames
  tagPeople?: string[]; // Tagged user handles
  coverImageUrl?: string; // Custom cover image data URL or public URL
  thumbOffsetMs?: number; // Video frame offset in ms for Reel cover
}

export interface PlatformLimitsSettings {
  youtube: {
    maxTitleLength: number;
    maxDescriptionLength: number;
    maxTagsLength: number;
    displayHashtagsCount: number;
    maxShortsDurationSec: number;
  };
  instagram: {
    maxCaptionLength: number;
    recommendedHashtagsLimit: number;
    maxHashtagsLimit: number;
    maxDurationSec: number;
    audioNotice: string;
  };
}

export const VERIFIED_PLATFORM_LIMITS: PlatformLimitsSettings = {
  youtube: {
    maxTitleLength: 100,
    maxDescriptionLength: 5000,
    maxTagsLength: 500,
    displayHashtagsCount: 3,
    maxShortsDurationSec: 180, // YouTube extended Shorts limit to 3 minutes
  },
  instagram: {
    maxCaptionLength: 2200,
    recommendedHashtagsLimit: 5, // Meta/Instagram officially recommends 3-5 hashtags for reach
    maxHashtagsLimit: 30,
    maxDurationSec: 90, // Reels standard duration up to 90s, API allows up to 15m
    audioNotice: 'Audio is extracted directly from the video file container on Instagram Reels API.',
  },
};

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
  hasAnalyticsScope?: boolean;
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
  dailyLimit: number;
  analyzeUsed: number;
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
    hasAnalyticsScope?: boolean;
    accounts: ConnectedAccount[];
  };
  instagram: {
    configured: boolean;
    authenticated: boolean;
    username?: string;
    tokenDaysRemaining?: number;
    needsRefresh: boolean;
    hasAnalyticsScope?: boolean;
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

// ==========================================
// SCHEDULING TYPES
// ==========================================
export type ScheduledPostStatus = 'scheduled' | 'publishing' | 'completed' | 'failed' | 'cancelled';

export interface ScheduledPost {
  id: string;
  userId: string;
  platform: Platform;
  runAt: string; // ISO string (UTC)
  timeZone: string; // e.g. "America/New_York", "UTC"
  status: ScheduledPostStatus;
  videoStoragePath?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  title: string;
  payload: {
    youtube?: YouTubePublishPayload;
    instagram?: InstagramPublishPayload;
  };
  selectedAccountId?: string;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  resultPostId?: string;
  resultUrl?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// ==========================================
// ANALYTICS & STATS TYPES
// ==========================================
export interface VideoAnalytics {
  id: string;
  userId?: string;
  platform: Platform;
  videoId: string;
  title: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  watchTimeHours?: number;
  avgRetentionPercent?: number;
  first48hViews?: number;
  first48hEngagementRate?: number;
  tags?: string[];
  description?: string;
  character?: string;
  series?: string;
  editStyle?: string;
  musicAudio?: string;
  durationSeconds?: number;
  engagementRate: number; // (likes + comments + shares + saves) / views * 100
}

export interface BestTimeSlot {
  dayOfWeek: number; // 0 = Sun, 1 = Mon ... 6 = Sat
  dayName: string; // "Monday", "Tuesday", etc.
  hour: number; // 0 - 23
  formattedTime: string; // "6:00 PM"
  score: number; // 1 - 100
  rationale: string;
  audienceActivityScore: number;
  platform: 'all' | 'youtube' | 'instagram';
}

export interface BestTimeAnalysis {
  timeZone: string;
  totalVideosAnalyzed: number;
  isLowConfidence: boolean; // True if < 20 videos analyzed
  topSlots: BestTimeSlot[];
  heatmap: {
    day: number; // 0 - 6
    dayName: string;
    hourlyScores: number[]; // 24 numbers (0 - 100)
  }[];
}

export interface AnalyticsOverview {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalSharesSaves: number;
  avgEngagementRate: number;
  youtubeViews: number;
  instagramViews: number;
  viewsOverTime: {
    date: string;
    youtubeViews: number;
    instagramViews: number;
    totalViews: number;
  }[];
  top10Videos: VideoAnalytics[];
  bestTimes: BestTimeAnalysis;
  hasAnalyticsScope: {
    youtube: boolean;
    instagram: boolean;
  };
  lastSyncedAt: string;
}

// ==========================================
// CONTENT PLANNER TYPES ("WHAT TO UPLOAD NEXT")
// ==========================================
export interface ContentIdea {
  id: string;
  title: string;
  suggestedDay?: string; // e.g. "Day 2 (Saturday)"
  suggestedDate?: string; // YYYY-MM-DD
  timeSlot?: string; // e.g. "6:30 PM"
  platform: 'both' | 'youtube' | 'instagram';
  character?: string;
  series?: string;
  editStyle?: string;
  soundVibe?: string;
  hookStrategy?: string;
  suggestedHashtags?: string[];
  hashtags: string[];
  suggestedSlot: {
    date: string;
    time: string;
    timeZone?: string;
    dayName?: string;
  };
  estimatedViewsRange?: string;
  hookConcept?: string;
}

export interface WinningFormulaPatterns {
  series?: string[];
  characters?: string[];
  editStyles?: string[];
  optimalLengthSec?: number | string;
  audioTrends?: string[];
  keyTakeaways?: string[];
  analysisSampleCount: number;
  avgRetentionPercent: number;
  topSeries: string[];
  topCharacters: string[];
  dominantEditStyle: string;
  bestAudioTracks: string[];
  advice: string;
}

export interface CalendarDayItem {
  weekNumber: number; // 1 or 2
  dayName: string;
  date: string;
  isPeakDay?: boolean;
  scheduledPost?: ScheduledPost;
  suggestedIdea?: {
    title: string;
    time: string;
    character?: string;
    id?: string;
  };
}

export interface ContentPlannerReport {
  niche: string;
  patterns: WinningFormulaPatterns;
  ideas: ContentIdea[];
  weeklyCalendar: CalendarDayItem[];
  generatedAt: string;
}

