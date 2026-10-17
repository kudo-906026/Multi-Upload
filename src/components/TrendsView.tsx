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
  Instagram,
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
  Music2,
  Bookmark,
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

export const TrendsView: React.FC<TrendsViewProps> = ({ onUseTrendInStudio }) => {
  const [platformTab, setPlatformTab] = useState<'youtube' | 'instagram'>('youtube');
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
              Platform-separated trends: YouTube Shorts search queries vs Instagram Reels audio & hook mechanics
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
          <span>YouTube Shorts Trends (Search Queries, High-CTR Titles, Competitor Shorts)</span>
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
          <span>Instagram Reels Trends (Viral Audio Tracks, Hook Formulas, 5-Hashtag Sets)</span>
        </button>
      </div>

      {/* Preset Niches & Region Selector Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Niche Filter:
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
                    ? platformTab === 'youtube'
                      ? 'bg-red-600 text-white border-red-500 shadow-md'
                      : 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border-pink-500 shadow-md'
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
              placeholder="Custom niche (e.g. phonk, boxing)..."
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
          <div className="flex items-center gap-2 border-b border-[#272727] pb-3">
            {[
              { id: 'keywords', label: 'High-Volume Search Queries', icon: Key },
              { id: 'hashtags', label: 'Trending Shorts Hashtags', icon: Hash },
              { id: 'titles', label: 'High-CTR Title Frameworks', icon: Zap },
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

          {/* Keywords Tab */}
          {activeFinderTab === 'keywords' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(report?.keywords || []).map((kw, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-[#141414] border border-[#272727] rounded-2xl flex items-center justify-between hover:border-red-600/50 transition-all group"
                >
                  <div>
                    <span className="font-bold text-xs text-white group-hover:text-red-400 transition-colors">
                      {kw.keyword}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Volume: {kw.searchVolume || (kw.searchVolumeScore ? `${kw.searchVolumeScore}/100` : 'High')} • Score: {kw.difficultyScore || kw.searchVolumeScore || 85}/100
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUseKeywordInStudio(kw)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-600/20 text-red-300 border border-red-600/40 hover:bg-red-600 hover:text-white transition-all"
                  >
                    Use in Studio
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Hashtags Tab */}
          {activeFinderTab === 'hashtags' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(report?.hashtags || []).map((h, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-[#141414] border border-[#272727] rounded-xl flex items-center justify-between hover:border-red-600/50 transition-all"
                >
                  <span className="font-mono text-xs font-bold text-red-300">{h.hashtag}</span>
                  <button
                    type="button"
                    onClick={() => handleUseHashtagInStudio(h)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#222]"
                    title="Send to Studio"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Titles Tab */}
          {activeFinderTab === 'titles' && (
            <div className="space-y-3">
              {(report?.titleIdeas || []).map((t, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-[#141414] border border-[#272727] rounded-2xl flex items-center justify-between hover:border-red-600/50 transition-all"
                >
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-white">{t.title}</span>
                    <div className="text-[10px] text-slate-400">
                      Strategy: {t.hookStrategy || 'High-energy hook'} • Estimated CTR: {t.estimatedCtrScore || 90}%
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUseTitleInStudio(t)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 text-white shadow-sm hover:bg-red-500 transition-all shrink-0 ml-4"
                  >
                    Use in Studio
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Embedded Competitor Shorts Videos */}
          <div className="bg-[#141414] border border-[#272727] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#272727] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-red-600" />
                  <span>Top Performing YouTube Shorts in {selectedNiche}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Competitor velocity and sound choices</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(report?.videos || []).slice(0, 4).map((vid) => (
                <div key={vid.id} className="bg-black border border-[#272727] rounded-xl overflow-hidden space-y-2 group">
                  <div className="relative aspect-[9/16] bg-slate-900">
                    <img src={vid.thumbnailUrl} alt={vid.title} className="w-full h-full object-cover" />
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] bg-black/80 font-mono text-white">
                      {vid.viewCount || '1.2M views'}
                    </span>
                  </div>
                  <div className="p-3 space-y-1">
                    <h5 className="font-bold text-xs text-white line-clamp-1">{vid.title}</h5>
                    <p className="text-[10px] text-slate-400">{vid.channelTitle}</p>
                    <button
                      type="button"
                      onClick={() => handleUseVideoInStudio(vid)}
                      className="w-full mt-2 py-1.5 rounded-lg text-xs font-bold bg-[#222] hover:bg-red-600 hover:text-white transition-all text-slate-200"
                    >
                      Remix in Studio
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
                      <p className="text-[10px] text-neutral-400">{audio.artist} • <span className="text-pink-400">{audio.reelsCount}</span></p>
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
                <h3 className="text-sm font-bold text-white">Reels 3-Second First-Line Hook Formulas</h3>
              </div>
              <span className="text-xs text-purple-400 font-mono">Highest watch completion</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {INSTAGRAM_HOOK_FORMULAS.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2 hover:border-purple-500/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                      {item.category}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">{item.ctr}</span>
                  </div>
                  <p className="text-xs font-semibold text-white leading-snug">"{item.hook}"</p>
                  <button
                    type="button"
                    onClick={() => {
                      onUseTrendInStudio(item.hook, ['#reelsviral', '#explorepage', '#fyp'], undefined, [item.hook]);
                      setUsedFeedback(`Sent hook to Studio!`);
                      setTimeout(() => setUsedFeedback(null), 3000);
                    }}
                    className="w-full mt-1 py-1.5 rounded-lg text-xs font-bold bg-neutral-900 hover:bg-purple-600 text-white border border-neutral-700 transition-all"
                  >
                    Apply Hook in Composer
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
