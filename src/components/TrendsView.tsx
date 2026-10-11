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
} from 'lucide-react';
import { NicheTrendReport, TrendItem } from '@shared/types';
import { ApiClient } from '../api';

interface TrendsViewProps {
  onUseTrendInStudio: (topic: string, hashtags: string[]) => void;
}

const PRESET_NICHES = [
  { id: 'gaming', label: '🎮 Gaming' },
  { id: 'anime', label: '⛩️ Anime' },
  { id: 'fitness', label: '💪 Fitness' },
  { id: 'comedy', label: '😂 Comedy' },
  { id: 'tech', label: '🚀 Tech' },
  { id: 'food', label: '🍳 Food' },
  { id: 'music', label: '🎵 Music' },
  { id: 'finance', label: '📈 Finance' },
  { id: 'lifestyle', label: '✨ Lifestyle' },
  { id: 'beauty', label: '💄 Beauty' },
];

const REGIONS = [
  { code: 'US', label: '🇺🇸 United States' },
  { code: 'GB', label: '🇬🇧 United Kingdom' },
  { code: 'CA', label: '🇨🇦 Canada' },
  { code: 'IN', label: '🇮🇳 India' },
  { code: 'JP', label: '🇯🇵 Japan' },
  { code: 'BR', label: '🇧🇷 Brazil' },
  { code: 'DE', label: '🇩🇪 Germany' },
  { code: 'KR', label: '🇰🇷 South Korea' },
];

export const TrendsView: React.FC<TrendsViewProps> = ({ onUseTrendInStudio }) => {
  const [selectedNiche, setSelectedNiche] = useState('tech');
  const [customNicheInput, setCustomNicheInput] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('US');

  const [report, setReport] = useState<NicheTrendReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [appliedTrendTopic, setAppliedTrendTopic] = useState<string | null>(null);

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
      setErrorMsg(err.message || 'Failed to fetch trending topics');
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

  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const handleUseTrend = (item: TrendItem) => {
    setAppliedTrendTopic(item.topic);
    onUseTrendInStudio(item.topic, item.suggestedHashtags);
    setTimeout(() => setAppliedTrendTopic(null), 3000);
  };

  const formatLastUpdated = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in w-full max-w-full overflow-x-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-purple-950/50 to-slate-900 border border-indigo-500/30 rounded-2xl p-4 sm:p-7 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Viral Trend Finder
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                Gemini + YouTube Data API
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Real-time viral topics, sound aesthetics, editing styles, and hashtags powered by Gemini with Google Search grounding.
            </p>
          </div>

          {/* Refresh & Cache Info */}
          <div className="flex items-center space-x-3 shrink-0">
            {report && (
              <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Updated: {formatLastUpdated(report.lastUpdated)} (1h cache)</span>
              </div>
            )}

            <button
              type="button"
              disabled={isLoading || isRefreshing}
              onClick={() => fetchTrends(selectedNiche, selectedRegion, true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-50"
              title="Force refresh trends from Gemini Search Grounding"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Trends</span>
              <span className="sm:hidden">Refresh</span>
            </button>
          </div>
        </div>

        {/* Niche & Region Selector */}
        <div className="pt-2 border-t border-slate-800/80 space-y-3">
          {/* Preset Chips */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs text-slate-400 mr-1 font-semibold">Niches:</span>
            {PRESET_NICHES.map((niche) => {
              const isSelected = selectedNiche.toLowerCase() === niche.id;
              return (
                <button
                  key={niche.id}
                  type="button"
                  onClick={() => setSelectedNiche(niche.id)}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {niche.label}
                </button>
              );
            })}
          </div>

          {/* Custom Niche Search & Region Dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <form onSubmit={handleCustomNicheSubmit} className="flex-1 flex items-center relative">
              <input
                type="text"
                placeholder="Or type any custom niche (e.g. Mechanical Keyboards, AI Tools)..."
                value={customNicheInput}
                onChange={(e) => setCustomNicheInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-20 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
              <button
                type="submit"
                className="absolute right-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-colors"
              >
                Search
              </button>
            </form>

            <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
              <Globe className="w-4 h-4 text-indigo-400 shrink-0" />
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
              >
                {REGIONS.map((r) => (
                  <option key={r.code} value={r.code} className="bg-slate-900 text-white">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Applied toast notification */}
      {appliedTrendTopic && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center justify-between animate-fade-in shadow-lg">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Applied <strong>"{appliedTrendTopic}"</strong> to Studio! Upload your video to auto-ground metadata.
            </span>
          </div>
          <span className="font-semibold text-emerald-400 text-[11px]">Ready in Studio</span>
        </div>
      )}

      {/* Error State */}
      {errorMsg && (
        <div className="p-4 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 animate-pulse"
            >
              <div className="h-5 bg-slate-800 rounded-lg w-3/4" />
              <div className="h-16 bg-slate-800 rounded-xl" />
              <div className="h-8 bg-slate-800 rounded-xl w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Trend Cards Grid */}
      {!isLoading && report && report.items && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
              <span>Trending in</span>
              <span className="text-indigo-400 capitalize">"{report.niche}"</span>
              <span className="text-slate-500">({report.items.length} viral insights)</span>
            </h2>
            <span className="text-[11px] text-slate-500">Region: {report.region}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.items.map((item, idx) => {
              const diffBadgeColor =
                item.difficulty === 'Low'
                  ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60'
                  : item.difficulty === 'Medium'
                  ? 'bg-amber-950/50 text-amber-300 border-amber-800/60'
                  : 'bg-rose-950/50 text-rose-300 border-rose-800/60';

              return (
                <div
                  key={item.id || idx}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 group"
                >
                  {/* Card Header: Topic & Difficulty */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 border border-indigo-500/30">
                          #{idx + 1}
                        </span>
                        <h3 className="font-bold text-white text-sm sm:text-base leading-snug group-hover:text-indigo-300 transition-colors">
                          {item.topic}
                        </h3>
                      </div>

                      {/* Difficulty & Competition Badge */}
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${diffBadgeColor}`}
                        >
                          {item.difficulty} Comp
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 font-mono">
                          {item.searchInterest}/100 🔥
                        </span>
                      </div>
                    </div>

                    {/* Why It's Trending */}
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/70">
                      {item.whyTrending}
                    </p>
                  </div>

                  {/* Creative Suggestions (Edit Style & Audio) */}
                  <div className="space-y-2 text-xs">
                    {/* Suggested Edit Style */}
                    <div className="flex items-start space-x-2 text-slate-300">
                      <Scissors className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] font-semibold text-indigo-300 block">
                          Suggested Edit Style:
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.suggestedEditStyle}
                        </span>
                      </div>
                    </div>

                    {/* Suggested Sound / Audio */}
                    <div className="flex items-start space-x-2 text-slate-300">
                      <Music className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] font-semibold text-pink-300 block">
                          Trending Audio Style:
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.suggestedAudioStyle}
                        </span>
                      </div>
                    </div>

                    {/* YouTube Reference if available */}
                    {item.youtubeTrendingReference && (
                      <div className="p-2.5 bg-red-950/20 border border-red-800/40 rounded-xl text-[11px] text-slate-300 space-y-1">
                        <div className="flex items-center space-x-1 text-red-400 font-semibold">
                          <Youtube className="w-3.5 h-3.5" />
                          <span>YouTube Trending Proof:</span>
                        </div>
                        <p className="font-medium text-white line-clamp-1">
                          {item.youtubeTrendingReference.title}
                        </p>
                        <p className="text-slate-400 text-[10px]">
                          Channel: {item.youtubeTrendingReference.channelTitle}
                          {item.youtubeTrendingReference.viewCount
                            ? ` • ${Number(item.youtubeTrendingReference.viewCount).toLocaleString()} views`
                            : ''}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Hashtags Pills */}
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">
                      Viral Hashtags:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {item.suggestedHashtags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleCopyTag(tag)}
                          className="px-2 py-0.5 rounded-lg text-[11px] bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-indigo-500/20 font-mono transition-colors"
                          title="Click to copy hashtag"
                        >
                          {copiedTag === tag ? '✓ Copied' : tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card Bottom: "Use in Studio" Primary CTA */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">
                      Competition Score: <strong className="text-slate-300">{item.competitionScore}/10</strong>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleUseTrend(item)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Use in Studio</span>
                      <ArrowRight className="w-3 h-3 ml-0.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendsView;
