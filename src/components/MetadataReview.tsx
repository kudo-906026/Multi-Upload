import React, { useState, useEffect } from 'react';
import {
  Youtube,
  Instagram,
  Sparkles,
  Send,
  Clock,
  AlertTriangle,
  X,
  Check,
  Plus,
} from 'lucide-react';
import {
  Platform,
  AIAnalysisResult,
  YouTubePublishPayload,
  InstagramPublishPayload,
  PlatformPreset,
  PlatformAuthStatus,
  VideoMetadata,
} from '@shared/types';
import { YouTubeStudioForm, YouTubeStudioFormState } from './studio/YouTubeStudioForm';
import { InstagramReelsForm, InstagramReelsFormState } from './studio/InstagramReelsForm';

interface MetadataReviewProps {
  selectedPlatforms: Platform[];
  onTogglePlatform?: (platform: Platform) => void;
  aiResult: AIAnalysisResult | null;
  video?: VideoMetadata | null;
  onPublish: (payloads: {
    youtubePayload?: YouTubePublishPayload;
    instagramPayload?: InstagramPublishPayload;
    selectedAccounts?: {
      youtubeAccountId?: string;
      instagramAccountId?: string;
    };
    isScheduled?: boolean;
    scheduledPublishTime?: string;
    scheduledTimeZone?: string;
    youtubeScheduledPublishTime?: string;
    youtubeScheduledTimeZone?: string;
    instagramScheduledPublishTime?: string;
    instagramScheduledTimeZone?: string;
  }) => Promise<void> | void;
  isPublishing: boolean;
  presets: PlatformPreset[];
  authStatus?: PlatformAuthStatus | null;
  onOpenAccounts?: () => void;
  trendContext?: {
    topic: string;
    hashtags: string[];
    title?: string;
    keywords?: string[];
    scheduledSlot?: { date: string; time: string; timeZone?: string };
  } | null;
}

export const MetadataReview: React.FC<MetadataReviewProps> = ({
  selectedPlatforms,
  onTogglePlatform,
  aiResult,
  video,
  onPublish,
  isPublishing,
  presets,
  authStatus,
  onOpenAccounts,
  trendContext,
}) => {
  // Top-level Studio Tab: 'youtube' vs 'instagram'
  const [activePlatformTab, setActivePlatformTab] = useState<Platform>('youtube');
  const [publishError, setPublishError] = useState<string | null>(null);

  const youtubeAccounts = authStatus?.youtube.accounts || [];
  const instagramAccounts = authStatus?.instagram.accounts || [];

  const defaultYtAccount = youtubeAccounts.find((a) => a.isDefault) || youtubeAccounts[0];
  const defaultIgAccount = instagramAccounts.find((a) => a.isDefault) || instagramAccounts[0];

  const browserTz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  })();

  const tomorrowDateStr = (() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  })();

  // ==============================================================
  // ISOLATED YOUTUBE STUDIO FORM STATE
  // ==============================================================
  const [ytState, setYtState] = useState<YouTubeStudioFormState>({
    title: '',
    description: '',
    tags: [],
    category: '1',
    privacy: 'public',
    madeForKids: false,
    language: 'en',
    playlist: '',
    commentsSetting: 'allow_all',
    thumbnailUrl: null,
    scheduled: false,
    scheduleDate: tomorrowDateStr,
    scheduleTime: '18:00',
    scheduleTimeZone: browserTz,
    includedInPost: selectedPlatforms.includes('youtube'),
    selectedAccountId: defaultYtAccount?.id || '',
  });

  // ==============================================================
  // ISOLATED INSTAGRAM REELS FORM STATE (NO TITLE FIELD)
  // ==============================================================
  const [igState, setIgState] = useState<InstagramReelsFormState>({
    caption: '',
    hashtags: [],
    shareToFeed: true,
    location: '',
    collaborators: [],
    tagPeople: [],
    coverType: 'frame',
    coverFrameSec: 0,
    coverImageUrl: null,
    altText: '',
    scheduled: false,
    scheduleDate: tomorrowDateStr,
    scheduleTime: '18:00',
    scheduleTimeZone: browserTz,
    includedInPost: selectedPlatforms.includes('instagram'),
    selectedAccountId: defaultIgAccount?.id || '',
  });

  // Keep included state synced with parent selectedPlatforms
  useEffect(() => {
    setYtState((prev) => ({
      ...prev,
      includedInPost: selectedPlatforms.includes('youtube'),
    }));
    setIgState((prev) => ({
      ...prev,
      includedInPost: selectedPlatforms.includes('instagram'),
    }));
  }, [selectedPlatforms]);

  // Set default account IDs when accounts load
  useEffect(() => {
    if (defaultYtAccount && !ytState.selectedAccountId) {
      setYtState((prev) => ({ ...prev, selectedAccountId: defaultYtAccount.id }));
    }
    if (defaultIgAccount && !igState.selectedAccountId) {
      setIgState((prev) => ({ ...prev, selectedAccountId: defaultIgAccount.id }));
    }
  }, [defaultYtAccount, defaultIgAccount]);

  // Initialize fields once when Gemini analysis completes
  useEffect(() => {
    if (aiResult) {
      if (aiResult.youtube) {
        setYtState((prev) => ({
          ...prev,
          title: aiResult.youtube.title || prev.title,
          description: aiResult.youtube.description || prev.description,
          tags: aiResult.youtube.tags && aiResult.youtube.tags.length > 0 ? aiResult.youtube.tags : prev.tags,
          category: aiResult.youtube.categoryId || prev.category,
        }));
      }

      if (aiResult.instagram) {
        setIgState((prev) => ({
          ...prev,
          caption: aiResult.instagram.caption || prev.caption,
          hashtags: aiResult.instagram.hashtags && aiResult.instagram.hashtags.length > 0 ? aiResult.instagram.hashtags : prev.hashtags,
          location: aiResult.instagram.suggestedLocation || prev.location,
          collaborators: aiResult.instagram.suggestedCollaborators || prev.collaborators,
        }));
      }
    }
  }, [aiResult]);

  // Handle slot recommendation from Analytics or Content Planner
  useEffect(() => {
    if (trendContext?.scheduledSlot) {
      const slot = trendContext.scheduledSlot;
      setYtState((prev) => ({
        ...prev,
        scheduled: true,
        scheduleDate: slot.date,
        scheduleTime: slot.time,
        scheduleTimeZone: slot.timeZone || browserTz,
      }));
      setIgState((prev) => ({
        ...prev,
        scheduled: true,
        scheduleDate: slot.date,
        scheduleTime: slot.time,
        scheduleTimeZone: slot.timeZone || browserTz,
      }));
    }
  }, [trendContext]);

  // ==============================================================
  // CROSS-PLATFORM COPY ACTIONS
  // ==============================================================
  const handleCopyFromInstagramToYouTube = () => {
    // Copy Instagram caption to YouTube description & Instagram hashtags to YouTube tags
    setYtState((prev) => {
      const igCaption = igState.caption;
      const igHashtags = igState.hashtags.map((h) => h.replace(/^#/, ''));
      const combinedTags = Array.from(new Set([...prev.tags, ...igHashtags])).slice(0, 15);

      return {
        ...prev,
        description: igCaption ? `${igCaption}\n\n#Shorts ${igState.hashtags.join(' ')}` : prev.description,
        tags: combinedTags,
      };
    });
  };

  const handleCopyFromYouTubeToInstagram = () => {
    // Copy YouTube title as hook + description into Instagram caption & YouTube tags to Instagram hashtags
    setIgState((prev) => {
      const hook = ytState.title ? `${ytState.title}\n\n` : '';
      const body = ytState.description ? `${ytState.description.slice(0, 1800)}\n\n` : '';
      const tagsToHashtags = ytState.tags.slice(0, 5).map((t) => (t.startsWith('#') ? t : `#${t.replace(/\s+/g, '')}`));

      return {
        ...prev,
        caption: `${hook}${body}`.trim(),
        hashtags: tagsToHashtags.length > 0 ? tagsToHashtags : prev.hashtags,
      };
    });
  };

  // Toggle platform from tab bar
  const handleTogglePlatformInclusion = (platform: Platform) => {
    if (onTogglePlatform) {
      onTogglePlatform(platform);
    } else {
      if (platform === 'youtube') {
        setYtState((prev) => ({ ...prev, includedInPost: !prev.includedInPost }));
      } else {
        setIgState((prev) => ({ ...prev, includedInPost: !prev.includedInPost }));
      }
    }
  };

  // ==============================================================
  // FINAL DISPATCH: POST TO ONE OR BOTH PLATFORMS
  // ==============================================================
  const handlePublishClick = async () => {
    setPublishError(null);

    const isYtIncluded = ytState.includedInPost;
    const isIgIncluded = igState.includedInPost;

    if (!isYtIncluded && !isIgIncluded) {
      setPublishError('Please include at least one platform (YouTube or Instagram) to publish.');
      return;
    }

    // Validation for YouTube
    if (isYtIncluded) {
      if (!ytState.title.trim()) {
        setPublishError('YouTube title cannot be empty.');
        setActivePlatformTab('youtube');
        return;
      }
      if (ytState.title.length > 100) {
        setPublishError(`YouTube title exceeds 100 characters (${ytState.title.length}/100).`);
        setActivePlatformTab('youtube');
        return;
      }
      const tagsTotalChars = ytState.tags.join(',').length;
      if (tagsTotalChars > 500) {
        setPublishError(`YouTube tags exceed 500 characters total (${tagsTotalChars}/500).`);
        setActivePlatformTab('youtube');
        return;
      }
    }

    // Validation for Instagram
    if (isIgIncluded) {
      if (!igState.caption.trim() && igState.hashtags.length === 0) {
        setPublishError('Instagram Reels caption cannot be empty.');
        setActivePlatformTab('instagram');
        return;
      }
      if (igState.caption.length > 2200) {
        setPublishError(`Instagram caption exceeds 2200 characters (${igState.caption.length}/2200).`);
        setActivePlatformTab('instagram');
        return;
      }
    }

    // Construct payloads
    let youtubePayload: YouTubePublishPayload | undefined;
    let instagramPayload: InstagramPublishPayload | undefined;

    const isAnyScheduled = (isYtIncluded && ytState.scheduled) || (isIgIncluded && igState.scheduled);

    let ytScheduledIso: string | undefined;
    if (isYtIncluded && ytState.scheduled && ytState.scheduleDate && ytState.scheduleTime) {
      ytScheduledIso = new Date(`${ytState.scheduleDate}T${ytState.scheduleTime}:00`).toISOString();
    }

    let igScheduledIso: string | undefined;
    if (isIgIncluded && igState.scheduled && igState.scheduleDate && igState.scheduleTime) {
      igScheduledIso = new Date(`${igState.scheduleDate}T${igState.scheduleTime}:00`).toISOString();
    }

    if (isYtIncluded) {
      let finalTitle = ytState.title.trim();
      const isShorts = (video?.durationSec || 45) <= 180;
      if (isShorts && !finalTitle.toLowerCase().includes('#shorts')) {
        finalTitle = `${finalTitle} #Shorts`.slice(0, 100);
      }

      youtubePayload = {
        title: finalTitle,
        description: ytState.description.trim(),
        tags: ytState.tags,
        privacyStatus: ytState.scheduled ? 'private' : ytState.privacy,
        categoryId: ytState.category,
        madeForKids: ytState.madeForKids,
        scheduledPublishTime: ytScheduledIso,
        language: ytState.language,
        playlist: ytState.playlist || undefined,
        commentsSetting: ytState.commentsSetting,
        customThumbnailUrl: ytState.thumbnailUrl || undefined,
        isShorts,
      };
    }

    if (isIgIncluded) {
      instagramPayload = {
        caption: igState.caption.trim(),
        hashtags: igState.hashtags,
        shareToFeed: igState.shareToFeed,
        location: igState.location.trim() || undefined,
        collaborators: igState.collaborators.length > 0 ? igState.collaborators : undefined,
        tagPeople: igState.tagPeople.length > 0 ? igState.tagPeople : undefined,
        coverImageUrl: igState.coverType === 'upload' && igState.coverImageUrl ? igState.coverImageUrl : undefined,
        thumbOffsetMs: igState.coverType === 'frame' ? Math.round(igState.coverFrameSec * 1000) : undefined,
        altText: igState.altText || undefined,
      };
    }

    try {
      await onPublish({
        youtubePayload,
        instagramPayload,
        selectedAccounts: {
          youtubeAccountId: isYtIncluded ? ytState.selectedAccountId || undefined : undefined,
          instagramAccountId: isIgIncluded ? igState.selectedAccountId || undefined : undefined,
        },
        isScheduled: isAnyScheduled,
        scheduledPublishTime: ytScheduledIso || igScheduledIso,
        scheduledTimeZone: ytState.scheduleTimeZone || igState.scheduleTimeZone,
        youtubeScheduledPublishTime: ytScheduledIso,
        youtubeScheduledTimeZone: ytState.scheduleTimeZone,
        instagramScheduledPublishTime: igScheduledIso,
        instagramScheduledTimeZone: igState.scheduleTimeZone,
      });
    } catch (err: any) {
      setPublishError(err.message || 'Publishing failed. Please check your credentials and try again.');
    }
  };

  const isBothIncluded = ytState.includedInPost && igState.includedInPost;
  const isOnlyYouTube = ytState.includedInPost && !igState.includedInPost;
  const isOnlyInstagram = !ytState.includedInPost && igState.includedInPost;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner: Recognized Character & Series from Gemini */}
      {aiResult && (aiResult.recognizedCharacter || aiResult.recognizedSeries) && (
        <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-black border border-neutral-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-red-600 via-pink-600 to-purple-600 rounded-xl text-white shrink-0 shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-pink-400">
                  Gemini Dual-Platform Intelligence
                </span>
                {aiResult.editStyle && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {aiResult.editStyle}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-white mt-0.5">
                Recognized: <span className="text-red-300">{aiResult.recognizedCharacter || 'Protagonist'}</span> in{' '}
                <span className="text-purple-300">{aiResult.recognizedSeries || 'Universe'}</span>
              </p>
            </div>
          </div>

          <div className="text-xs text-neutral-400">
            One video upload, analyzed once. Tailored SEO for YouTube and viral hooks for Instagram below.
          </div>
        </div>
      )}

      {/* Publish Error Notification */}
      {publishError && (
        <div className="p-4 bg-red-950/90 border border-red-800 rounded-2xl text-xs text-red-200 flex items-start justify-between gap-3 shadow-xl">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-red-300 text-sm">Cannot Publish Video</strong>
              <p className="mt-0.5 text-xs text-red-200">{publishError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPublishError(null)}
            className="p-1 text-red-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* TWO SEPARATE APPS TAB BAR: YOUTUBE VS INSTAGRAM                */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-950 border border-neutral-800 rounded-2xl p-2.5 shadow-xl">
        <div className="flex items-center gap-2">
          {/* TAB 1: YOUTUBE STUDIO */}
          <button
            type="button"
            onClick={() => setActivePlatformTab('youtube')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
              activePlatformTab === 'youtube'
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/40 ring-1 ring-red-500'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Youtube className="w-4 h-4" />
            <span>YouTube Studio</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                ytState.includedInPost
                  ? activePlatformTab === 'youtube'
                    ? 'bg-black/40 text-red-100'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'bg-neutral-800 text-neutral-500'
              }`}
            >
              {ytState.includedInPost ? 'Included' : 'Off'}
            </span>
          </button>

          {/* TAB 2: INSTAGRAM REELS */}
          <button
            type="button"
            onClick={() => setActivePlatformTab('instagram')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
              activePlatformTab === 'instagram'
                ? 'bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white shadow-lg shadow-pink-900/40 ring-1 ring-pink-500'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Instagram className="w-4 h-4" />
            <span>Instagram Reels</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                igState.includedInPost
                  ? activePlatformTab === 'instagram'
                    ? 'bg-black/40 text-pink-100'
                    : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                  : 'bg-neutral-800 text-neutral-500'
              }`}
            >
              {igState.includedInPost ? 'Included' : 'Off'}
            </span>
          </button>
        </div>

        {/* Quick Summary of target platforms */}
        <div className="flex items-center gap-2 text-xs text-neutral-400 px-3 py-1">
          <span>Active targets:</span>
          {isBothIncluded && <span className="font-bold text-white">YouTube & Instagram</span>}
          {isOnlyYouTube && <span className="font-bold text-red-400">YouTube only</span>}
          {isOnlyInstagram && <span className="font-bold text-pink-400">Instagram only</span>}
          {!isBothIncluded && !isOnlyYouTube && !isOnlyInstagram && (
            <span className="font-bold text-amber-400">No platforms selected</span>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* FULL SUB-APP RENDERING: YOUTUBE STUDIO OR INSTAGRAM REELS      */}
      {/* ============================================================== */}
      {activePlatformTab === 'youtube' && (
        <YouTubeStudioForm
          state={ytState}
          onChange={setYtState}
          video={video}
          accounts={youtubeAccounts}
          presets={presets}
          onCopyFromInstagram={handleCopyFromInstagramToYouTube}
          isPublishing={isPublishing}
        />
      )}

      {activePlatformTab === 'instagram' && (
        <InstagramReelsForm
          state={igState}
          onChange={setIgState}
          video={video}
          accounts={instagramAccounts}
          presets={presets}
          suggestedHashtags={aiResult?.instagram?.hashtags}
          onCopyFromYouTube={handleCopyFromYouTubeToInstagram}
          isPublishing={isPublishing}
        />
      )}

      {/* ============================================================== */}
      {/* FINAL STICKY ACTION BAR: ONE "POST TO BOTH" OR SINGLE POST     */}
      {/* ============================================================== */}
      <div className="sticky bottom-0 z-30 p-4 bg-neutral-950/95 backdrop-blur-md border border-neutral-800 rounded-2xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {ytState.includedInPost && (
              <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center border-2 border-black shadow-md">
                <Youtube className="w-4 h-4" />
              </div>
            )}
            {igState.includedInPost && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-600 to-purple-600 text-white flex items-center justify-center border-2 border-black shadow-md">
                <Instagram className="w-4 h-4" />
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Ready to Launch:</span>
              <span className="text-neutral-300">
                {isBothIncluded
                  ? 'Both Platforms (YouTube & Instagram)'
                  : isOnlyYouTube
                  ? 'YouTube Shorts Only'
                  : isOnlyInstagram
                  ? 'Instagram Reels Only'
                  : 'Select at least one platform above'}
              </span>
            </div>

            <div className="text-[11px] text-neutral-400 mt-0.5 flex flex-wrap items-center gap-2">
              {ytState.includedInPost && ytState.scheduled && (
                <span className="font-mono text-red-400">
                  YT: {ytState.scheduleDate} @ {ytState.scheduleTime}
                </span>
              )}
              {igState.includedInPost && igState.scheduled && (
                <span className="font-mono text-pink-400">
                  IG: {igState.scheduleDate} @ {igState.scheduleTime}
                </span>
              )}
              {!ytState.scheduled && !igState.scheduled && (
                <span>Immediate publishing with full metadata integrity</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button: Post to Both / Post to YouTube / Post to Instagram */}
        <button
          type="button"
          onClick={handlePublishClick}
          disabled={isPublishing || (!ytState.includedInPost && !igState.includedInPost)}
          className={`inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-sm text-white shadow-xl transition-all ${
            isPublishing || (!ytState.includedInPost && !igState.includedInPost)
              ? 'bg-neutral-800 cursor-not-allowed opacity-50'
              : isBothIncluded
              ? 'bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:from-red-500 hover:via-pink-500 hover:to-purple-500 shadow-pink-900/30 active:scale-95'
              : isOnlyYouTube
              ? 'bg-red-600 hover:bg-red-500 shadow-red-900/30 active:scale-95'
              : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 shadow-pink-900/30 active:scale-95'
          }`}
        >
          {isPublishing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Publishing Video...</span>
            </>
          ) : !ytState.includedInPost && !igState.includedInPost ? (
            <span>Select a Platform</span>
          ) : isBothIncluded ? (
            <>
              <Send className="w-4 h-4" />
              <span>Post to both</span>
            </>
          ) : isOnlyYouTube ? (
            <>
              <Youtube className="w-4 h-4" />
              <span>{ytState.scheduled ? 'Schedule YouTube' : 'Post to YouTube'}</span>
            </>
          ) : (
            <>
              <Instagram className="w-4 h-4" />
              <span>{igState.scheduled ? 'Schedule Instagram' : 'Post to Instagram'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
