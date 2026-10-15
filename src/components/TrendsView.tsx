import React, { useState, useEffect } from 'react';
import {
  Flame,
  Search,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Hash,
  Music,
  Scissors,
  ArrowRight,
  Globe,
  Youtube,
  BarChart2,
  Check,
  Clock,
  AlertCircle,
  ExternalLink,
  Layers,
  Tag,
  Key,
  Play,
  Share2,
  Copy,
  ChevronRight,
  Award,
  Zap,
} from 'lucide-react';
import {
  NicheTrendReport,
  TrendingShortVideo,
  RankedKeyword,
  RankedHashtag,
  TitleIdea,
} from '@shared/types';
import { ApiClient } from '../api';

interface TrendsViewProps {
  onUseTrendInStudio: (topic: string, hashtags: string[], title?: string, keywords?: string[]) => void;
}

const PRESET_NICHES = [
  { id: 'anime edits (amv)', label: '⛩️ Anime edits (AMV)', query: 'anime edit' },
  { id: 'marvel edits', label: '🛡️ Marvel edits', query: 'marvel edit' },
  { id: 'manhwa edits', label: '👑 Manhwa edits', query: 'manhwa edit' },
  { id: 'gaming edits', label: '🎮 Gaming Velocity', query: 'gaming velocity edit' },
  { id: 'cinema edits', label: '🎬 Cinema Aesthetic', query: 'cinematic movie edit' },
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

export const TrendsView: React.FC<TrendsViewProps> = ({ onUseTrendInStudio }) => {
  const [selectedNiche, setSelectedNiche] = useState('anime edits (amv)');
  const [customNicheInput, setCustomNicheInput] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('US');

  const [activeFinderTab, setActiveFinderTab] = useState<'keywords' | 'hashtags' | 'titles'>('keywords');
  const [report, setReport] = useState<NicheTrendReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success feedback state
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [usedFeedback, setUsedFeedback] = useState<string | null>(null);

  const fetchTrends = async (niche: string, region: string, refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      const data = await ApiClient.getTrends({
        niche,
        region,
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
    fetchTrends(selectedNiche, selectedRegion, false);
  }, [selectedNiche, selectedRegion]);

  const handleCustomNicheSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customNicheInput.trim()) return;
    setSelectedNiche(customNicheInput.trim().toLowerCase());
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(text);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  // Sends keyword to Studio
  const handleUseKeywordInStudio = (kw: RankedKeyword) => {
    onUseTrendInStudio(kw.keyword, [`#${kw.keyword.replace(/\s+/g, '')}`], undefined, [kw.keyword]);
    setUsedFeedback(`Sent keyword "${kw.keyword}" to Studio!`);
    setTimeout(() => setUsedFeedback(null), 3000);
  };

  // Sends hashtag to Studio
  const handleUseHashtagInStudio = (h: RankedHashtag) => {
    onUseTrendInStudio(h.hashtag, [h.hashtag]);
    setUsedFeedback(`Sent hashtag "${h.hashtag}" to Studio!`);
    setTimeout(() => setUsedFeedback(null), 3000);
  };

  // Sends title idea to Studio
  const handleUseTitleInStudio = (t: TitleIdea) => {
    onUseTrendInStudio(t.title, ['#Shorts', `#${selectedNiche.split(' ')[0]}`], t.title);
    setUsedFeedback(`Sent title "${t.title}" to Studio!`);
    setTimeout(() => setUsedFeedback(null), 3000);
  };

  // Sends video card to Studio
  const handleUseVideoInStudio = (video: TrendingShortVideo) => {
    onUseTrendInStudio(video.title, video.tags || ['#Shorts'], video.title, video.tags);
    setUsedFeedback(`Sent video metadata to Studio!`);
    setTimeout(() => setUsedFeedback(null), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 shrink-0">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">
                Shorts Viral Radar & Trend Intelligence
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                YouTube Data API v3
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time trending Shorts, embedded video players, search-grounded hashtags, and one-click transfer to Studio
            </p>
          </div>
        </div>

        {/* Refresh & Cache TTL Indicator */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {report && (
            <div className="text-right text-[11px] text-slate-400 hidden sm:block">
              <div className="flex items-center gap-1 text-slate-300">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>1-Hour Quota Cache</span>
              </div>
              <span>Updated: {new Date(report.lastUpdated).toLocaleTimeString()}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => fetchTrends(selectedNiche, selectedRegion, true)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-red-400' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Trends'}</span>
          </button>
        </div>
      </div>

      {/* Preset Niches & Region Selector Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Preset Edit Niches (YouTube Shorts):
          </label>

          {/* Region Selector */}
          <div className="flex items-center gap-2">
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

        {/* Niche Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {PRESET_NICHES.map((n) => {
            const isSelected = selectedNiche.toLowerCase() === n.id.toLowerCase();
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setSelectedNiche(n.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white border-red-500 shadow-md ring-1 ring-red-400/40'
                    : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                {n.label}
              </button>
            );
          })}

          {/* Custom Search Input */}
          <form onSubmit={handleCustomNicheSubmit} className="flex items-center gap-2 ml-auto w-full sm:w-auto">
            <input
              type="text"
              value={customNicheInput}
              onChange={(e) => setCustomNicheInput(e.target.value)}
              placeholder="Search custom niche (e.g. phonk, boxing)..."
              className="w-full sm:w-56 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
              title="Search niche"
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
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs flex items-center gap-2 text-emerald-200 animate-fade-in shadow-lg">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{usedFeedback} Open Studio tab to see your fields ready!</span>
        </div>
      )}

      {/* SECTION 1: NICHE BREAKDOWN: TRENDING TITLES, CHARACTERS, EDIT STYLES, & SONGS */}
      {report?.breakdown && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/50 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white capitalize">
                Trending Right Now in {report.niche} ({selectedRegion})
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">Search-grounded live analysis</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {/* Trending Series & Titles */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Youtube className="w-3.5 h-3.5" />
                Trending Titles & Series
              </span>
              <div className="flex flex-wrap gap-1.5">
                {report.breakdown.trendingTitles.map((title) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() =>
                      onUseTrendInStudio(title, [`#${title.replace(/\s+/g, '')}`], `${title} Peak Aura Edit #Shorts`)
                    }
                    className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-indigo-300 text-xs font-medium transition-colors text-left"
                    title="Click to use in Studio"
                  >
                    + {title}
                  </button>
                ))}
              </div>
            </div>

            {/* Trending Characters */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Award className="w-3.5 h-3.5" />
                Dominant Characters
              </span>
              <div className="flex flex-wrap gap-1.5">
                {report.breakdown.trendingCharacters.map((char) => (
                  <button
                    key={char}
                    type="button"
                    onClick={() =>
                      onUseTrendInStudio(char, [`#${char.replace(/\s+/g, '')}`], `${char} Being An Absolute Menace 🥶 #Shorts`)
                    }
                    className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 text-xs font-medium transition-colors text-left"
                    title="Click to use in Studio"
                  >
                    + {char}
                  </button>
                ))}
              </div>
            </div>

            {/* Trending Edit Styles */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Scissors className="w-3.5 h-3.5" />
                Trending Edit Styles
              </span>
              <div className="space-y-1.5">
                {report.breakdown.trendingEditStyles.slice(0, 3).map((st) => (
                  <div
                    key={st}
                    className="text-xs text-slate-300 bg-slate-900 px-2 py-1 rounded-md border border-slate-800 truncate"
                  >
                    ⚡ {st}
                  </div>
                ))}
              </div>
            </div>

            {/* Top Songs & Audio */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <span className="text-xs font-bold text-pink-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Music className="w-3.5 h-3.5" />
                Top Songs & Audio
              </span>
              <div className="space-y-1.5">
                {report.breakdown.topSongs.slice(0, 3).map((song) => (
                  <div
                    key={song.name}
                    className="text-xs text-pink-200 bg-pink-950/30 border border-pink-900/40 px-2 py-1 rounded-md truncate flex items-center justify-between"
                  >
                    <span className="truncate">🎵 {song.name}</span>
                    {song.vibe && <span className="text-[10px] text-pink-400 shrink-0 ml-1">{song.vibe}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: EMBEDDED YOUTUBE SHORTS VIDEO CARDS (NO DOWNLOAD, EMBEDDED PLAYER) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-500" />
              <span>Real Top YouTube Shorts</span>
              <span className="text-xs font-normal text-slate-400">
                (Embedded players • Query: "{report?.niche || selectedNiche}")
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Fetched via YouTube Data API v3 with chart=mostPopular & search.list videoDuration=short
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 animate-pulse">
                <div className="w-full aspect-[9/16] bg-slate-800 rounded-xl" />
                <div className="h-4 bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {(report?.videos || []).map((video) => (
              <div
                key={video.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between transition-all group"
              >
                {/* Embedded YouTube Iframe Player (No video download) */}
                <div className="w-full aspect-[9/16] bg-black relative overflow-hidden">
                  <iframe
                    src={video.embedUrl}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                    loading="lazy"
                  />
                </div>

                {/* Video Info Card Body */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold text-white line-clamp-2 group-hover:text-red-400 transition-colors">
                      {video.title}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-medium truncate">{video.channelTitle}</span>
                      <span className="shrink-0">{video.age}</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-mono text-slate-300">
                      <Flame className="w-3 h-3 text-red-500" />
                      <span>{video.viewCount}</span>
                    </div>
                  </div>

                  {/* Actions: Use in Studio & Watch */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleUseVideoInStudio(video)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Use in Studio</span>
                    </button>

                    <a
                      href={video.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors"
                      title="Open on YouTube"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: THE THREE FINDERS (KEYWORDS, HASHTAGS, TITLE IDEAS) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>Three Trend Finders for Studio</span>
            </h2>
            <p className="text-xs text-slate-400">
              Extracted from top Shorts & ranked with Gemini and Google Search grounding
            </p>
          </div>

          {/* Finder Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveFinderTab('keywords')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeFinderTab === 'keywords'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Ranked Keywords</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFinderTab('hashtags')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeFinderTab === 'hashtags'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Ranked Hashtags</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFinderTab('titles')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeFinderTab === 'titles'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>High-CTR Title Ideas</span>
            </button>
          </div>
        </div>

        {/* FINDER 1: RANKED KEYWORDS */}
        {activeFinderTab === 'keywords' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Extracted from top Shorts titles and tags, ordered by volume:</span>
              <button
                type="button"
                onClick={() => {
                  const allKw = (report?.keywords || []).map((k) => k.keyword);
                  onUseTrendInStudio(selectedNiche, [], undefined, allKw);
                  setUsedFeedback('Applied all top keywords to Studio tags!');
                }}
                className="text-indigo-400 hover:text-indigo-300 font-bold"
              >
                + Apply All Top Keywords to Studio
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(report?.keywords || []).map((kw) => (
                <div
                  key={kw.keyword}
                  className="bg-slate-950/70 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-3 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-0.5 truncate">
                    <span className="text-xs font-bold text-white block truncate">{kw.keyword}</span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>Volume: {kw.searchVolumeScore}/100</span>
                      <span>•</span>
                      <span>In {kw.frequency} top Shorts</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUseKeywordInStudio(kw)}
                    className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1"
                  >
                    <span>Use</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FINDER 2: GROUNDED HASHTAGS */}
        {activeFinderTab === 'hashtags' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Ranked with Gemini 2.5 Flash and real-time search discovery:</span>
              <button
                type="button"
                onClick={() => {
                  const allH = (report?.hashtags || []).map((h) => h.hashtag);
                  onUseTrendInStudio(selectedNiche, allH);
                  setUsedFeedback('Applied all top hashtags to Studio!');
                }}
                className="text-pink-400 hover:text-pink-300 font-bold"
              >
                + Apply All Top Hashtags to Studio
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(report?.hashtags || []).map((h) => (
                <div
                  key={h.hashtag}
                  className="bg-slate-950/70 border border-slate-800 hover:border-pink-500/50 rounded-xl p-3 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-0.5 truncate">
                    <span className="text-xs font-bold text-pink-300 block truncate">{h.hashtag}</span>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{h.trendingReason}</p>
                    <span className="text-[10px] font-mono text-pink-400">Virality Score: {h.viralityScore}/100</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUseHashtagInStudio(h)}
                    className="px-2.5 py-1 bg-pink-600/20 hover:bg-pink-600 text-pink-300 hover:text-white rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1"
                  >
                    <span>Use</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FINDER 3: HIGH-CTR TITLE IDEAS */}
        {activeFinderTab === 'titles' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-400">
              Algorithmic title ideas designed for peak CTR on YouTube Shorts & Instagram Reels:
            </div>

            <div className="space-y-2.5">
              {(report?.titleIdeas || []).map((idea) => (
                <div
                  key={idea.id}
                  className="bg-slate-950/70 border border-slate-800 hover:border-amber-500/50 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{idea.title}</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {idea.estimatedCtrScore}% CTR
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">Strategy: {idea.hookStrategy}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUseTitleInStudio(idea)}
                    className="px-4 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Use in Studio</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
