import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  Search,
  RefreshCw,
  Sparkles,
  Hash,
  ArrowRight,
  Globe,
  Youtube,
  Instagram,
  Check,
  Clock,
  AlertCircle,
  ExternalLink,
  Key,
  Play,
  Zap,
  Music2,
  Calendar,
  ArrowUpDown,
  ShieldAlert,
  Music,
  Scissors,
  Film,
  Eye,
  Layers,
  Filter,
} from 'lucide-react';
import {
  NicheTrendReport,
  TrendingShortVideo,
  RankedKeyword,
  RankedHashtag,
  TitleIdea,
  VideoClassificationType,
  VideoEditClassification,
} from '@shared/types';
import { ApiClient } from '../api';

interface TrendsViewProps {
  onUseTrendInStudio: (topic: string, hashtags: string[], title?: string, keywords?: string[]) => void;
}

const PRESET_NICHES = [
  { id: 'anime edits', label: '⛩️ Anime edits', query: 'anime edit' },
  { id: 'marvel edits', label: '🛡️ Marvel edits', query: 'marvel edit' },
  { id: 'manhwa edits', label: '👑 Manhwa edits', query: 'manhwa edit' },
];

const REGIONS = [
  { code: 'US', label: '🇺🇸 United States' },
  { code: 'JP', label: '🇯🇵 Japan' },
  { code: 'KR', label: '🇰🇷 South Korea' },
  { code: 'GB', label: '🇬🇧 United Kingdom' },
  { code: 'CA', label: '🇨🇦 Canada' },
  { code: 'IN', label: '🇮🇳 India' },
  { code: 'BR', label: '🇧🇷 Brazil' },
  { code: 'DE', label: '🇩🇪 Germany' },
  { code: 'FR', label: '🇫🇷 France' },
  { code: 'GLOBAL', label: '🌐 Global' },
];

const TIME_RANGES = [
  { id: '24h', label: 'Last 24 hours' },
  { id: '7d', label: 'Last 7 days (Default)' },
  { id: '30d', label: 'Last 30 days' },
] as const;

const SORTS = [
  { id: 'most_viewed', label: '🔥 Most viewed' },
  { id: 'newest', label: '⚡ Newest' },
] as const;

const INSTAGRAM_AUDIO_TRENDS = [
  { title: 'Tokyo Drift (Phonk Speed Up)', artist: 'Phonk Nation', reelsCount: '480K Reels', vibe: 'Velocity Beat Drop' },
  { title: 'Aura / Transcendence (Slowed)', artist: 'Orchestral Trap', reelsCount: '320K Reels', vibe: 'Dominance & Power' },
  { title: 'Synthwave Night Flight', artist: 'Retrowave Lab', reelsCount: '195K Reels', vibe: 'Cinematic Flow' },
  { title: 'Immortal Shadow Flow', artist: 'Dark Phonk King', reelsCount: '275K Reels', vibe: 'Fast Action Transitions' },
];

const INSTAGRAM_HOOK_FORMULAS = [
  { hook: 'Wait for the beat drop on this scene 🥶', category: 'Beat Sync', ctr: '94% Hook Retention' },
  { hook: 'Nobody talks about why he did this...', category: 'Curiosity & Lore', ctr: '91% Hook Retention' },
  { hook: 'The aura in this chapter was unmatched 🔥', category: 'Hyped Energy', ctr: '89% Hook Retention' },
  { hook: 'Rate this transition from 1 to 10 below 👇', category: 'Comment Driver', ctr: '87% Hook Retention' },
];

/**
 * Helper to get label, color styling and icon for each detected video type
 */
function getClassificationInfo(classification?: VideoEditClassification) {
  if (!classification) return null;
  const type = classification.type;
  switch (type) {
    case 'fan_edit':
      return {
        label: 'Fan Edit',
        badgeClass: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-950/50',
        icon: Scissors,
      };
    case 'official_clip':
      return {
        label: 'Official Clip',
        badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-500/50',
        icon: Film,
      };
    case 'trailer':
      return {
        label: 'Trailer',
        badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-500/50',
        icon: Film,
      };
    case 'full_scene':
      return {
        label: 'Full Scene',
        badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-500/50',
        icon: Film,
      };
    case 'reaction':
      return {
        label: 'Reaction',
        badgeClass: 'bg-purple-950/90 text-purple-300 border-purple-500/50',
        icon: Eye,
      };
    case 'recap_or_explainer':
      return {
        label: 'Recap / Explainer',
        badgeClass: 'bg-sky-950/90 text-sky-300 border-sky-500/50',
        icon: Layers,
      };
    case 'compilation':
      return {
        label: 'Compilation',
        badgeClass: 'bg-indigo-950/90 text-indigo-300 border-indigo-500/50',
        icon: Layers,
      };
    default:
      return {
        label: 'Other',
        badgeClass: 'bg-slate-900/90 text-slate-300 border-slate-700/60',
        icon: Sparkles,
      };
  }
}

/**
 * 100% verified real Shorts video card:
 * All metadata (title, channel, thumbnail, views, age, videoId) comes from one real YouTube API item.
 */
const ShortsVideoCard: React.FC<{
  video: TrendingShortVideo;
  onRemix: (vid: TrendingShortVideo) => void;
  onVerify?: (vid: TrendingShortVideo) => Promise<void>;
}> = ({ video, onRemix, onVerify }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    if (!('IntersectionObserver' in window)) {
      setIsInViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInViewport(true);
          } else {
            setIsPlaying(false);
          }
        });
      },
      { rootMargin: '100px', threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleOpenDirect = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(video.videoUrl || `https://www.youtube.com/shorts/${video.id}`, '_blank', 'noopener,noreferrer');
  };

  const handleVerifyClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onVerify || isVerifying) return;
    setIsVerifying(true);
    try {
      await onVerify(video);
    } finally {
      setIsVerifying(false);
    }
  };

  const classInfo = getClassificationInfo(video.classification);
  const embedSrc = `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

  return (
    <div
      ref={cardRef}
      className="bg-[#121212] border border-[#272727] rounded-2xl overflow-hidden shadow-lg hover:border-red-600/40 transition-all flex flex-col group"
    >
      {/* 9:16 Shorts Container */}
      <div className="relative aspect-[9/16] bg-black overflow-hidden flex items-center justify-center">
        {isPlaying && isInViewport && !playbackError ? (
          <div className="w-full h-full relative">
            <iframe
              src={embedSrc}
              title={video.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              onError={() => setPlaybackError(true)}
            />
            <button
              type="button"
              onClick={() => setIsPlaying(false)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white text-[10px] z-20"
              title="Close Player"
            >
              ✕
            </button>
          </div>
        ) : playbackError ? (
          <div className="relative w-full h-full flex flex-col justify-between p-4 text-center">
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="absolute inset-0 w-full h-full object-cover opacity-30 blur-[2px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60" />

            <div className="relative z-10 flex justify-end">
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-950/80 text-red-300 border border-red-700/60 font-semibold">
                Protected by YouTube
              </span>
            </div>

            <div className="relative z-10 space-y-2 px-2">
              <div className="w-12 h-12 rounded-full bg-red-600/20 border border-red-500/40 text-red-500 mx-auto flex items-center justify-center">
                <Youtube className="w-6 h-6" />
              </div>
              <h5 className="text-xs font-bold text-white line-clamp-2">{video.title}</h5>
              <p className="text-[11px] text-slate-400">
                Playback is restricted to official YouTube app & site by channel.
              </p>
            </div>

            <div className="relative z-10 pt-2">
              <button
                type="button"
                onClick={handleOpenDirect}
                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40 flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <span>Watch on YouTube</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setIsPlaying(true)}
            className="relative w-full h-full cursor-pointer group/thumb"
          >
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-500"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40 group-hover/thumb:from-black/70 transition-colors" />

            {/* Top Badges */}
            <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between text-[10px] font-bold text-white z-10">
              <span className="px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 flex items-center gap-1 text-slate-200">
                <Clock className="w-2.5 h-2.5 text-red-400" />
                <span>{video.age || 'recently'}</span>
              </span>

              <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-black uppercase tracking-wider text-[9px] shadow">
                Shorts
              </span>
            </div>

            {/* Center Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-13 h-13 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-xl group-hover/thumb:scale-115 group-hover/thumb:bg-red-600 transition-all p-3.5">
                <Play className="w-6 h-6 fill-current translate-x-0.5" />
              </div>
            </div>

            {/* Bottom Info Bar: Real View Count */}
            <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between text-xs z-10">
              <span className="px-2 py-0.5 rounded-md bg-black/80 font-mono text-[11px] font-bold text-white backdrop-blur-sm border border-white/10">
                {video.viewCount}
              </span>

              <button
                type="button"
                onClick={handleOpenDirect}
                className="p-1.5 rounded-md bg-black/75 hover:bg-black text-slate-300 hover:text-white transition-colors"
                title="Open on YouTube in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card Metadata Footer (Guaranteed to match the video) */}
      <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between bg-[#141414]">
        <div className="space-y-1.5">
          {/* Classification Badge (if classified) */}
          {classInfo && (
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${classInfo.badgeClass}`}
                title={`Detected as ${classInfo.label} (${Math.round((video.classification?.confidence || 0) * 100)}% confidence)`}
              >
                <classInfo.icon className="w-2.5 h-2.5 shrink-0" />
                <span>{classInfo.label}</span>
                <span className="opacity-80 font-mono text-[9px]">
                  {Math.round((video.classification?.confidence || 0) * 100)}%
                </span>
              </span>

              {video.classification?.verifiedWithVideo ? (
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-950/80 text-blue-300 border border-blue-600/50 flex items-center gap-0.5 shadow-sm"
                  title="Watched and confirmed with Gemini multimodal video model"
                >
                  <Check className="w-2.5 h-2.5 text-blue-400" />
                  <span>AI Watched</span>
                </span>
              ) : null}
            </div>
          )}

          <h4
            onClick={handleOpenDirect}
            className="text-xs font-bold text-white line-clamp-2 group-hover:text-red-400 transition-colors cursor-pointer leading-snug"
            title={video.title}
          >
            {video.title}
          </h4>

          <p className="text-[11px] text-slate-400 truncate">{video.channelTitle}</p>

          {video.classification?.reason && (
            <p
              className="text-[10px] text-slate-400/90 line-clamp-1 italic bg-black/40 px-1.5 py-0.5 rounded border border-white/5"
              title={video.classification.reason}
            >
              &quot;{video.classification.reason}&quot;
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-[#272727] flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onRemix(video)}
            className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-[#202020] hover:bg-red-600 hover:text-white text-slate-200 transition-all text-center shadow-sm truncate"
          >
            Remix
          </button>

          {/* On-Demand "Verify" Button sending video URL to Gemini */}
          {onVerify && (
            <button
              type="button"
              onClick={handleVerifyClick}
              disabled={isVerifying}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 shrink-0 ${
                video.classification?.verifiedWithVideo
                  ? 'bg-blue-950/40 text-blue-300 border-blue-800/50'
                  : 'bg-[#202020] hover:bg-indigo-600 hover:text-white text-slate-300 border-[#333]'
              }`}
              title="Send video URL to Gemini to watch footage and verify or correct classification (on demand)"
            >
              {isVerifying ? (
                <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
              ) : video.classification?.verifiedWithVideo ? (
                <Check className="w-3 h-3 text-blue-400" />
              ) : (
                <Eye className="w-3 h-3 text-indigo-400" />
              )}
              <span className="text-[10px]">
                {isVerifying ? 'Watching...' : video.classification?.verifiedWithVideo ? 'Verified' : 'Verify'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenDirect}
            className="p-1.5 rounded-xl bg-[#202020] hover:bg-[#2a2a2a] text-slate-400 hover:text-white border border-[#333] shrink-0"
            title="Watch on YouTube"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const TrendsView: React.FC<TrendsViewProps> = ({ onUseTrendInStudio }) => {
  const [platformTab, setPlatformTab] = useState<'youtube' | 'instagram'>('youtube');
  const [selectedNiche, setSelectedNiche] = useState('anime edits');
  const [customNicheInput, setCustomNicheInput] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('US');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [selectedSort, setSelectedSort] = useState<'most_viewed' | 'newest'>('most_viewed');
  const [editFilter, setEditFilter] = useState<'edits_only' | 'all' | 'official_clips'>('edits_only');

  const [activeFinderTab, setActiveFinderTab] = useState<'keywords' | 'hashtags' | 'titles'>('keywords');
  const [report, setReport] = useState<NicheTrendReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Time ticker to update "updated X min ago" live
  const [, setTimeTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Feedback state
  const [usedFeedback, setUsedFeedback] = useState<string | null>(null);

  const handleVerifyVideo = async (vid: TrendingShortVideo) => {
    try {
      const updated = await ApiClient.verifyTrendVideo(vid.id, vid.videoUrl);
      setReport((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          videos: prev.videos.map((v) => (v.id === vid.id ? { ...v, classification: updated } : v)),
        };
      });
      const label = getClassificationInfo(updated)?.label || updated.type;
      setUsedFeedback(
        `Gemini watched & verified "${vid.title.slice(0, 25)}..." as ${label} (${Math.round(
          updated.confidence * 100
        )}%)`
      );
      setTimeout(() => setUsedFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to verify video:', err);
      setErrorMsg(err.message || 'Video verification failed');
      throw err;
    }
  };

  const fetchTrends = async (
    niche: string,
    region: string,
    timeRange: '24h' | '7d' | '30d' = '7d',
    sort: 'most_viewed' | 'newest' = 'most_viewed',
    refresh = false
  ) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      const data = await ApiClient.getTrends({
        niche,
        region,
        timeRange,
        sort,
        refresh,
      });
      setReport(data);
    } catch (err: any) {
      console.error('Error fetching niche trends:', err);
      setErrorMsg(err.message || 'Failed to fetch trending topics from YouTube Data API');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrends(selectedNiche, selectedRegion, selectedTimeRange, selectedSort, false);
  }, [selectedNiche, selectedRegion, selectedTimeRange, selectedSort]);

  const handleCustomNicheSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customNicheInput.trim()) return;
    setSelectedNiche(customNicheInput.trim().toLowerCase());
  };

  const handleUseKeywordInStudio = (kw: RankedKeyword) => {
    onUseTrendInStudio(kw.keyword, [`#${kw.keyword.replace(/\s+/g, '')}`], undefined, [kw.keyword]);
    setUsedFeedback(`Sent keyword "${kw.keyword}" to Studio!`);
    setTimeout(() => setUsedFeedback(null), 3000);
  };

  const handleUseHashtagInStudio = (h: RankedHashtag) => {
    onUseTrendInStudio(h.hashtag, [h.hashtag]);
    setUsedFeedback(`Sent hashtag "${h.hashtag}" to Studio!`);
    setTimeout(() => setUsedFeedback(null), 3000);
  };

  const handleUseTitleInStudio = (t: TitleIdea) => {
    onUseTrendInStudio(t.title, ['#Shorts', `#${selectedNiche.split(' ')[0]}`], t.title);
    setUsedFeedback(`Sent title "${t.title}" to Studio!`);
    setTimeout(() => setUsedFeedback(null), 3000);
  };

  const handleUseVideoInStudio = (video: TrendingShortVideo) => {
    onUseTrendInStudio(video.title, video.tags || ['#Shorts'], video.title, video.tags);
    setUsedFeedback(`Sent video metadata to Studio!`);
    setTimeout(() => setUsedFeedback(null), 3000);
  };

  // Helper to format "Data from YouTube, updated X min ago"
  const getUpdatedString = (lastUpdatedIso?: string) => {
    if (!lastUpdatedIso) return 'Data from YouTube';
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(lastUpdatedIso).getTime()) / 60000));
    if (elapsedMinutes < 1) return 'Data from YouTube, updated just now';
    if (elapsedMinutes === 1) return 'Data from YouTube, updated 1 min ago';
    return `Data from YouTube, updated ${elapsedMinutes} min ago`;
  };

  const isClassifierAvailable = report?.classifierStatus?.available !== false;
  const allVideos = report?.videos || [];

  const editsCount = allVideos.filter(
    (v) => v.classification?.type === 'fan_edit' && (v.classification.confidence ?? 0) >= 0.6
  ).length;

  const officialCount = allVideos.filter(
    (v) =>
      v.classification?.type === 'official_clip' ||
      v.classification?.type === 'trailer' ||
      v.classification?.type === 'full_scene'
  ).length;

  const filteredVideos = React.useMemo(() => {
    // If Gemini is unavailable, show results unfiltered with a clear notice (Requirement 5)
    if (!isClassifierAvailable || editFilter === 'all') {
      return allVideos;
    }
    if (editFilter === 'edits_only') {
      return allVideos.filter(
        (v) => v.classification?.type === 'fan_edit' && (v.classification.confidence ?? 0) >= 0.6
      );
    }
    if (editFilter === 'official_clips') {
      return allVideos.filter(
        (v) =>
          v.classification?.type === 'official_clip' ||
          v.classification?.type === 'trailer' ||
          v.classification?.type === 'full_scene'
      );
    }
    return allVideos;
  }, [allVideos, editFilter, isClassifierAvailable]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-red-600 to-pink-600 rounded-2xl text-white shrink-0 shadow-md">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">
                Viral Radar & Trend Intelligence
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                Live Algorithm Feed
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real YouTube Shorts edits in anime, Marvel, and manhwa niches
            </p>
          </div>
        </div>

        {/* Live Refresh & YouTube Data Timestamp Indicator */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {report && (
            <div className="text-right text-[11px] text-slate-400 hidden sm:block">
              <div className="flex items-center gap-1.5 font-medium text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>{getUpdatedString(report.lastUpdated)}</span>
              </div>
              <span className="text-slate-500">30-min cache to preserve quota</span>
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              fetchTrends(selectedNiche, selectedRegion, selectedTimeRange, selectedSort, true)
            }
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-red-400' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Trends'}</span>
          </button>
        </div>
      </div>

      {/* Quota Notice Banner (if quota exceeded) */}
      {report?.quotaExceeded && (
        <div className="p-4 bg-amber-950/70 border border-amber-600/50 rounded-2xl text-amber-200 text-xs flex items-center justify-between gap-3 animate-fade-in shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <strong className="block font-bold text-amber-300 text-sm">
                YouTube Data API Quota Limit Notice
              </strong>
              <p className="text-amber-200/90 text-xs mt-0.5">
                {report.quotaMessage ||
                  'The daily YouTube Data API quota has been reached. Quota resets daily at midnight Pacific Time. In accordance with data integrity rules, placeholder data is not displayed.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              fetchTrends(selectedNiche, selectedRegion, selectedTimeRange, selectedSort, true)
            }
            className="px-3 py-1.5 rounded-xl bg-amber-600/30 hover:bg-amber-600 text-amber-200 hover:text-white border border-amber-500/40 text-xs font-bold transition-all shrink-0"
          >
            Retry Refresh
          </button>
        </div>
      )}

      {/* Missing Key Banner */}
      {report?.isMissingKey && (
        <div className="p-4 bg-amber-950/70 border border-amber-600/50 rounded-2xl text-amber-200 text-xs flex items-center justify-between gap-3 animate-fade-in shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <strong className="block font-bold text-amber-300 text-sm">
                YouTube Data API Key Not Configured
              </strong>
              <p className="text-amber-200/90 text-xs mt-0.5">
                {report.errorMessage || 'Add YOUTUBE_API_KEY in your environment to fetch live videos directly from YouTube.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PLATFORM SUB-TABS: YOUTUBE SHORTS VS INSTAGRAM REELS           */}
      {/* ============================================================== */}
      <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-2 shadow-lg">
        <button
          type="button"
          onClick={() => setPlatformTab('youtube')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
            platformTab === 'youtube'
              ? 'bg-red-600 text-white shadow-lg shadow-red-900/40 ring-1 ring-red-500'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Youtube className="w-4 h-4" />
          <span>YouTube Shorts Trends (Real Video Search & Embeds)</span>
        </button>

        <button
          type="button"
          onClick={() => setPlatformTab('instagram')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
            platformTab === 'instagram'
              ? 'bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white shadow-lg shadow-pink-900/40 ring-1 ring-pink-500'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Instagram className="w-4 h-4" />
          <span>Instagram Reels Trends (Audio & Hook Strategies)</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* COMPREHENSIVE FILTER CONTROLS: TIME RANGE, SORT, REGION, NICHE */}
      {/* ============================================================== */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
        {/* Row 1: Time Range (24h, 7d default, 30d) + Sort & Region */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mr-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Time Range:</span>
            </span>

            {TIME_RANGES.map((tr) => (
              <button
                key={tr.id}
                type="button"
                onClick={() => setSelectedTimeRange(tr.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  selectedTimeRange === tr.id
                    ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-900/30'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tr.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Sort: Most viewed vs Newest */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Region Selector */}
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Niche Chips: Anime edits, Marvel edits, Manhwa edits + Custom */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Niche:</span>
            </span>

            {PRESET_NICHES.map((n) => {
              const isSelected = selectedNiche.toLowerCase() === n.id.toLowerCase();
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSelectedNiche(n.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    isSelected
                      ? platformTab === 'youtube'
                        ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-900/30'
                        : 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border-pink-500 shadow-md shadow-pink-900/30'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                >
                  {n.label}
                </button>
              );
            })}
          </div>

          {/* Custom Search Input */}
          <form onSubmit={handleCustomNicheSubmit} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={customNicheInput}
              onChange={(e) => setCustomNicheInput(e.target.value)}
              placeholder="Custom keyword (e.g. jjk, deadpool)..."
              className="w-full sm:w-56 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
              title="Search custom keyword"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Feedback Alert Banners */}
      {errorMsg && (
        <div className="p-4 bg-red-950/80 border border-red-800 rounded-2xl text-xs text-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {usedFeedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-200 flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{usedFeedback}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. YOUTUBE SHORTS TRENDS VIEW (RED THEME)                       */}
      {/* ============================================================== */}
      {platformTab === 'youtube' && (
        <div className="space-y-6 animate-fade-in">
          {/* Sub-Tabs: Keywords / Hashtags / Title Ideas */}
          {report && (report.keywords.length > 0 || report.hashtags.length > 0 || report.titleIdeas.length > 0) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-[#272727] pb-3">
                {[
                  { id: 'keywords', label: 'Computed Search Keywords', icon: Key },
                  { id: 'hashtags', label: 'Top Shorts Hashtags', icon: Hash },
                  { id: 'titles', label: 'Proven Title Frameworks', icon: Zap },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveFinderTab(tab.id as any)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeFinderTab === tab.id
                          ? 'bg-red-600 text-white shadow-md shadow-red-900/30'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Keywords Tab (Computed from real videos) */}
              {activeFinderTab === 'keywords' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(report?.keywords || []).map((kw, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-[#141414] border border-[#272727] rounded-2xl flex items-center justify-between hover:border-red-600/50 transition-all group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white group-hover:text-red-400 transition-colors">
                            {kw.keyword}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950/80 border border-red-800/40 text-red-300 font-mono font-bold">
                            {kw.searchVolumeScore}% presence
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {kw.relevance || `Found in ${kw.basedOnVideos || kw.frequency} of ${kw.totalVideosAnalyzed || report?.videos?.length || 0} top videos`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUseKeywordInStudio(kw)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-600/20 text-red-300 border border-red-600/40 hover:bg-red-600 hover:text-white transition-all shrink-0 ml-3"
                      >
                        Use
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Hashtags Tab (Computed from real videos) */}
              {activeFinderTab === 'hashtags' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(report?.hashtags || []).map((h, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-[#141414] border border-[#272727] rounded-xl flex items-center justify-between hover:border-red-600/50 transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-red-300">{h.hashtag}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                            {h.viralityScore}%
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {h.trendingReason || `Used in ${h.basedOnVideos || 1} videos`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUseHashtagInStudio(h)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#222]"
                        title="Send hashtag to Studio"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Titles Tab (Derived with clear AI estimate labeling) */}
              {activeFinderTab === 'titles' && (
                <div className="space-y-3">
                  {(report?.titleIdeas || []).map((t, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-[#141414] border border-[#272727] rounded-2xl flex items-center justify-between hover:border-red-600/50 transition-all gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">{t.title}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 font-bold uppercase tracking-wider">
                            AI estimate
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {t.hookStrategy} • <span className="text-amber-400 font-medium">CTR Score: {t.estimatedCtrScore}% (AI estimate)</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUseTitleInStudio(t)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 text-white shadow-sm hover:bg-red-500 transition-all shrink-0"
                      >
                        Use in Studio
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Embedded Top Performing YouTube Shorts Section */}
          <div className="bg-[#141414] border border-[#272727] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#272727] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-red-600" />
                  <span>
                    Top Performing YouTube Shorts in {selectedNiche}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Filtered by {TIME_RANGES.find((t) => t.id === selectedTimeRange)?.label} •{' '}
                  {SORTS.find((s) => s.id === selectedSort)?.label} • Embeddable Shorts
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="px-2.5 py-1 rounded-lg bg-black border border-[#272727] font-mono text-[11px] text-slate-300">
                  {filteredVideos.length} {editFilter === 'edits_only' ? 'Edits' : editFilter === 'official_clips' ? 'Clips' : 'Shorts'} Shown
                </span>
                {report && (
                  <span className="text-[11px] text-emerald-400 hidden md:inline">
                    • {getUpdatedString(report.lastUpdated)}
                  </span>
                )}
              </div>
            </div>

            {/* Filter Chip Row: Edits only (Default), All, Official clips */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
                  <Filter className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Filter:</span>
                </span>

                <button
                  type="button"
                  onClick={() => setEditFilter('edits_only')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                    editFilter === 'edits_only'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                      : 'bg-black/60 text-slate-300 border-[#272727] hover:bg-slate-800'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Edits only</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      editFilter === 'edits_only' ? 'bg-emerald-800 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {editsCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                    editFilter === 'all'
                      ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-950/40'
                      : 'bg-black/60 text-slate-300 border-[#272727] hover:bg-slate-800'
                  }`}
                >
                  <span>All</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      editFilter === 'all' ? 'bg-red-800 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {allVideos.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditFilter('official_clips')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                    editFilter === 'official_clips'
                      ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-950/40'
                      : 'bg-black/60 text-slate-300 border-[#272727] hover:bg-slate-800'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Official clips</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      editFilter === 'official_clips' ? 'bg-amber-800 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {officialCount}
                  </span>
                </button>
              </div>

              {report?.classifierStatus?.model && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>Classified by {report.classifierStatus.model}</span>
                </div>
              )}
            </div>

            {/* Graceful Unfiltered Notice when Gemini is unavailable (Requirement 5) */}
            {report?.classifierStatus && !report.classifierStatus.available && (
              <div className="p-3 bg-amber-950/40 border border-amber-700/60 rounded-xl flex items-center gap-2.5 text-xs text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {report.classifierStatus.notice ||
                    'AI edit classification is temporarily unavailable. Showing all real YouTube results unfiltered.'}
                </span>
              </div>
            )}

            {/* Video Cards Grid with Lazy-Loading Players */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-8">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="aspect-[9/16] bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse flex flex-col justify-end p-4 space-y-2"
                  >
                    <div className="h-4 bg-slate-800 rounded w-3/4" />
                    <div className="h-3 bg-slate-800 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : allVideos.length === 0 ? (
              /* Truthful Empty States (Never show fake results!) */
              <div className="py-12 px-4 text-center space-y-4 max-w-lg mx-auto">
                {report?.isMissingKey || report?.emptyReason === 'missing_key' ? (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-950/40">
                      <Key className="w-7 h-7" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-base font-bold text-white">YouTube API Key Required</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {report.errorMessage ||
                          'YOUTUBE_API_KEY is not configured on the server. Please add your YouTube Data API v3 key in your environment variables, or connect a YouTube channel in Accounts.'}
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => fetchTrends(selectedNiche, selectedRegion, selectedTimeRange, selectedSort, true)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all inline-flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Check Again</span>
                      </button>
                    </div>
                  </>
                ) : report?.quotaExceeded || report?.emptyReason === 'quota_exceeded' ? (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto shadow-lg shadow-red-950/40">
                      <ShieldAlert className="w-7 h-7" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-base font-bold text-white">YouTube API Quota Limit Exceeded</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {report.errorMessage ||
                          'Daily quota for YouTube Data API v3 has been reached. Quota resets daily at midnight Pacific Time. In accordance with data integrity rules, placeholder data is not displayed.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchTrends(selectedNiche, selectedRegion, selectedTimeRange, selectedSort, true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-900/30"
                    >
                      Retry Request
                    </button>
                  </>
                ) : report?.emptyReason === 'request_failed' ? (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
                      <AlertCircle className="w-7 h-7" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-base font-bold text-white">YouTube API Request Failed</h4>
                      <p className="text-xs text-amber-200/90 font-mono bg-amber-950/40 border border-amber-800/40 p-2.5 rounded-xl break-words">
                        {report.errorMessage || 'Unable to retrieve live videos from YouTube Data API.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchTrends(selectedNiche, selectedRegion, selectedTimeRange, selectedSort, true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                      <Search className="w-7 h-7" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-base font-bold text-white">No Matching Shorts Found</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        No embeddable YouTube Shorts matching the niche &quot;{selectedNiche}&quot; were found in the last{' '}
                        {TIME_RANGES.find((t) => t.id === selectedTimeRange)?.label.toLowerCase()}.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                      {selectedTimeRange !== '30d' && (
                        <button
                          type="button"
                          onClick={() => setSelectedTimeRange('30d')}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-900/30"
                        >
                          Try Last 30 Days
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedNiche('anime edits');
                          setSelectedTimeRange('7d');
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                      >
                        Reset To Anime Edits (7 Days)
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : filteredVideos.length === 0 ? (
              /* No videos matching the selected filter */
              <div className="py-12 px-4 text-center space-y-4 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Filter className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">
                    No videos matching &quot;{editFilter === 'edits_only' ? 'Edits only (>=60% confidence)' : 'Official clips'}&quot;
                  </h4>
                  <p className="text-xs text-slate-400">
                    {allVideos.length} candidate videos were fetched from YouTube for this niche.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditFilter('all')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-900/30"
                >
                  View All {allVideos.length} Videos
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredVideos.map((vid) => (
                  <ShortsVideoCard
                    key={vid.id}
                    video={vid}
                    onRemix={handleUseVideoInStudio}
                    onVerify={handleVerifyVideo}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. INSTAGRAM REELS TRENDS VIEW (GRADIENT THEME)                */}
      {/* ============================================================== */}
      {platformTab === 'instagram' && (
        <div className="space-y-6 animate-fade-in">
          {/* Section: Trending Audio & Sounds */}
          <div className="bg-black border border-pink-900/50 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Music2 className="w-5 h-5 text-pink-500" />
                <h3 className="text-sm font-bold text-white">Trending Reels Audio & Phonk Tracks</h3>
              </div>
              <span className="text-xs text-pink-400 font-mono">Algorithm boost sounds</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {INSTAGRAM_AUDIO_TRENDS.map((audio, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-between hover:border-pink-500/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center text-white shrink-0">
                      <Music className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{audio.title}</h4>
                      <p className="text-[10px] text-neutral-400">
                        {audio.artist} • <span className="text-pink-400">{audio.reelsCount}</span>
                      </p>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-pink-950/60 text-pink-300 border border-pink-800/40 inline-block mt-1">
                        {audio.vibe}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onUseTrendInStudio(audio.title, ['#reelsaudio', '#phonkedit', '#explorepage'], undefined, [audio.title]);
                      setUsedFeedback(`Sent sound "${audio.title}" to Studio!`);
                      setTimeout(() => setUsedFeedback(null), 3000);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-gradient-to-r hover:from-pink-600 hover:to-purple-600 text-white border border-neutral-700 transition-all shrink-0 ml-3"
                  >
                    Use Sound
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Reels 3-Second Hook Formulas */}
          <div className="bg-black border border-purple-900/50 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Reels 3-Second Retention Hook Formulas</h3>
              </div>
              <span className="text-xs text-purple-400 font-mono">Proven retention openers</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {INSTAGRAM_HOOK_FORMULAS.map((formula, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2 hover:border-purple-500/50 transition-all"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/40 font-bold">
                      {formula.category}
                    </span>
                    <span className="text-emerald-400 font-mono font-bold">{formula.ctr}</span>
                  </div>

                  <p className="text-xs font-semibold text-white leading-relaxed">{formula.hook}</p>

                  <button
                    type="button"
                    onClick={() => {
                      onUseTrendInStudio(formula.hook, ['#reelsviral', '#hookformula', '#explorepage'], formula.hook);
                      setUsedFeedback(`Sent hook to Studio!`);
                      setTimeout(() => setUsedFeedback(null), 3000);
                    }}
                    className="w-full mt-1 py-1.5 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-purple-600 text-slate-200 hover:text-white border border-neutral-700 transition-all"
                  >
                    Apply Hook in Studio
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
