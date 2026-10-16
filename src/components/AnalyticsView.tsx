import React, { useState, useEffect } from 'react';
import {
  BarChart2,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Clock,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Youtube,
  Instagram,
  CheckCircle2,
  ShieldAlert,
  ArrowUpRight,
  Flame,
  Award,
  Zap,
} from 'lucide-react';
import { AnalyticsOverview, VideoAnalytics, BestTimeSlot, PlatformAuthStatus } from '@shared/types';
import { ApiClient } from '../api';

interface AnalyticsViewProps {
  authStatus?: PlatformAuthStatus | null;
  onNavigateToStudioWithSlot: (slot: { date: string; time: string; timeZone: string; title?: string }) => void;
  onOpenAccounts: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  authStatus,
  onNavigateToStudioWithSlot,
  onOpenAccounts,
}) => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<{ day: string; hour: number; score: number } | null>(null);
  const [chartMetric, setChartMetric] = useState<'total' | 'youtube' | 'instagram'>('total');

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const loadAnalytics = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      const data = refresh
        ? await ApiClient.refreshAnalytics(userTimeZone)
        : await ApiClient.getAnalytics(userTimeZone);
      setOverview(data);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setErrorMsg(err.message || 'Failed to load video analytics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const needsReauthForAnalytics =
    (authStatus?.youtube.authenticated && !overview?.hasAnalyticsScope.youtube) ||
    (authStatus?.instagram.authenticated && !overview?.hasAnalyticsScope.instagram);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // Convert weekday index (0-6) into next upcoming calendar date YYYY-MM-DD
  const getNextDateForDay = (dayIndex: number) => {
    const today = new Date();
    const currentDay = today.getDay();
    let diff = dayIndex - currentDay;
    if (diff <= 0) diff += 7; // Next occurrence
    const target = new Date(today.getTime() + diff * 24 * 60 * 60 * 1000);
    return target.toISOString().split('T')[0];
  };

  const handleScheduleSlotClick = (slot: BestTimeSlot) => {
    const targetDate = getNextDateForDay(slot.dayOfWeek);
    onNavigateToStudioWithSlot({
      date: targetDate,
      time: slot.formattedTime,
      timeZone: overview?.bestTimes.timeZone || userTimeZone,
      title: `Viral Edit Peak Slot (${slot.dayName} ${slot.formattedTime})`,
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 shrink-0">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              Video Analytics & Viral Retention Intelligence
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Performance metrics, watch time retention, and algorithmic best time to post.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            Timezone: {userTimeZone}
          </span>
          <button
            type="button"
            onClick={() => loadAnalytics(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>

      {/* Reconnect Banner for Analytics Scopes */}
      {needsReauthForAnalytics && (
        <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-indigo-950/70 border border-amber-800/80 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300 shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Reconnect Account to Enable Deep Analytics
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Your connection needs additional read-only permissions (
                <code className="text-amber-300 font-mono">yt-analytics.readonly</code> /{' '}
                <code className="text-pink-300 font-mono">instagram_business_manage_insights</code>) to pull watch time retention and audience activity.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAccounts}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/30 shrink-0 self-start sm:self-auto"
          >
            Reconnect for Full Stats
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-950/80 border border-red-800 rounded-2xl text-xs text-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION 1: KEY PERFORMANCE METRICS OVERVIEW */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Views */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Views</span>
            <Eye className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {formatNumber(overview?.totalViews || 0)}
          </div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Across Shorts & Reels</span>
          </div>
        </div>

        {/* Total Likes */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Likes</span>
            <Heart className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {formatNumber(overview?.totalLikes || 0)}
          </div>
          <div className="text-[10px] text-slate-400">Audience appreciation</div>
        </div>

        {/* Comments */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Comments</span>
            <MessageCircle className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {formatNumber(overview?.totalComments || 0)}
          </div>
          <div className="text-[10px] text-slate-400">Community engagement</div>
        </div>

        {/* Shares & Saves */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Shares & Saves</span>
            <Bookmark className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {formatNumber(overview?.totalSharesSaves || 0)}
          </div>
          <div className="text-[10px] text-amber-400">Virality multiplier</div>
        </div>

        {/* Avg Engagement Rate */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-lg col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Avg Engagement</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-purple-300 font-mono">
            {overview?.avgEngagementRate || 0}%
          </div>
          <div className="text-[10px] text-purple-400">Industry avg: 4.8%</div>
        </div>
      </div>

      {/* SECTION 2: CHARTS & PLATFORM COMPARISON */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Views Over Time Interactive SVG Chart */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span>Views Growth Over Time (Last 14 Days)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Daily view velocity distribution</p>
            </div>

            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setChartMetric('total')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  chartMetric === 'total' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                Combined
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('youtube')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  chartMetric === 'youtube' ? 'bg-red-600 text-white' : 'text-slate-400'
                }`}
              >
                YouTube
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('instagram')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  chartMetric === 'instagram' ? 'bg-pink-600 text-white' : 'text-slate-400'
                }`}
              >
                Instagram
              </button>
            </div>
          </div>

          {/* SVG Line / Bar visualization */}
          <div className="h-56 w-full flex items-end gap-2 pt-6 pb-2 px-2">
            {(overview?.viewsOverTime || []).map((pt, idx) => {
              const val =
                chartMetric === 'total'
                  ? pt.totalViews
                  : chartMetric === 'youtube'
                  ? pt.youtubeViews
                  : pt.instagramViews;

              const maxVal = Math.max(...(overview?.viewsOverTime || []).map((p) => p.totalViews), 1000);
              const heightPct = Math.max(10, Math.min(100, Math.round((val / maxVal) * 100)));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 border border-slate-700 text-white text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-10 font-mono">
                    {pt.date}: {formatNumber(val)} views
                  </div>

                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-lg transition-all ${
                      chartMetric === 'youtube'
                        ? 'bg-red-500/80 group-hover:bg-red-400'
                        : chartMetric === 'instagram'
                        ? 'bg-pink-500/80 group-hover:bg-pink-400'
                        : 'bg-gradient-to-t from-indigo-600 to-purple-500 group-hover:from-indigo-500 group-hover:to-purple-400'
                    }`}
                  />
                  <span className="text-[9px] text-slate-500 font-mono truncate w-full text-center">
                    {pt.date.split('-')[2]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* YouTube vs Instagram Distribution Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Platform Share Comparison</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Where your edits perform best</p>
          </div>

          <div className="space-y-4">
            {/* YouTube Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Youtube className="w-4 h-4 text-red-500" />
                  YouTube Shorts
                </span>
                <span className="font-mono text-slate-300 font-bold">
                  {formatNumber(overview?.youtubeViews || 0)} views
                </span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  style={{
                    width: `${
                      overview?.totalViews
                        ? Math.round(((overview.youtubeViews || 0) / overview.totalViews) * 100)
                        : 50
                    }%`,
                  }}
                  className="h-full bg-red-600 rounded-full"
                />
              </div>
            </div>

            {/* Instagram Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Instagram className="w-4 h-4 text-pink-500" />
                  Instagram Reels
                </span>
                <span className="font-mono text-slate-300 font-bold">
                  {formatNumber(overview?.instagramViews || 0)} views
                </span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  style={{
                    width: `${
                      overview?.totalViews
                        ? Math.round(((overview.instagramViews || 0) / overview.totalViews) * 100)
                        : 50
                    }%`,
                  }}
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-400 leading-relaxed">
            💡 <strong>Algorithmic Insight:</strong>{' '}
            {overview && overview.youtubeViews > overview.instagramViews
              ? 'YouTube Shorts is currently driving higher search discovery and long-tail views for your video format.'
              : 'Instagram Reels is yielding faster initial save velocity and higher direct profile follow conversions.'}
          </div>
        </div>
      </div>

      {/* SECTION 3: BEST TIME TO POST (HEATMAP & TOP 3 SLOTS) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">
                Best Time to Post Heatmap (Weekday &times; Hour)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Analyzed from your past upload performance + Instagram active audience metrics.
            </p>
          </div>

          {overview?.bestTimes.isLowConfidence && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/50 border border-amber-800 text-amber-300 rounded-xl text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>
                Low confidence note: Under 20 videos analyzed ({overview.bestTimes.totalVideosAnalyzed}/20). Post more to sharpen accuracy.
              </span>
            </div>
          )}
        </div>

        {/* Top 3 Best Slots Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(overview?.bestTimes.topSlots || []).map((slot, sIdx) => (
            <div
              key={sIdx}
              className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20 border border-amber-500/30 rounded-2xl p-4 shadow-lg flex flex-col justify-between space-y-3 relative group"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 uppercase tracking-wider font-mono">
                    Top Slot #{sIdx + 1}
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-400">{slot.score}/100 Score</span>
                </div>
                <h3 className="text-sm font-bold text-white">
                  {slot.dayName} at {slot.formattedTime}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">{slot.rationale}</p>
              </div>

              {/* One-Tap "Schedule at this time" Button */}
              <button
                type="button"
                onClick={() => handleScheduleSlotClick(slot)}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/30 transition-all active:scale-95"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Schedule at this time</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* 7 Days x 24 Hours Heatmap Grid */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Hourly Activity Matrix (Midnight to 11 PM UTC/Local):</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px]">Cold</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded bg-slate-950 border border-slate-800" />
                <div className="w-3 h-3 rounded bg-indigo-950" />
                <div className="w-3 h-3 rounded bg-indigo-700" />
                <div className="w-3 h-3 rounded bg-amber-600" />
                <div className="w-3 h-3 rounded bg-amber-400" />
              </div>
              <span className="text-[10px] font-bold text-amber-400">Peak Viral</span>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="min-w-[700px] space-y-1.5">
              {/* Hour Labels */}
              <div className="grid grid-cols-25 text-[10px] font-mono text-slate-500 pl-20">
                {Array.from({ length: 24 }, (_, h) => (
                  <span key={h} className="text-center">
                    {h % 3 === 0 ? (h >= 12 ? `${h % 12 || 12}p` : `${h || 12}a`) : ''}
                  </span>
                ))}
              </div>

              {/* 7 Weekday Rows */}
              {(overview?.bestTimes.heatmap || []).map((row) => (
                <div key={row.day} className="flex items-center gap-2">
                  <span className="w-20 text-xs font-bold text-slate-300 truncate">{row.dayName}</span>
                  <div className="flex-1 grid grid-cols-24 gap-1">
                    {row.hourlyScores.map((score, h) => {
                      let bgClass = 'bg-slate-950/80';
                      if (score > 85) bgClass = 'bg-amber-400 text-slate-950 font-bold';
                      else if (score > 70) bgClass = 'bg-amber-600 text-white';
                      else if (score > 55) bgClass = 'bg-indigo-700 text-white';
                      else if (score > 35) bgClass = 'bg-indigo-950 text-indigo-300';

                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setSelectedHeatmapCell({ day: row.dayName, hour: h, score })}
                          title={`${row.dayName} ${h}:00 - Activity Score: ${score}/100`}
                          className={`h-7 rounded text-[9px] flex items-center justify-center transition-transform hover:scale-110 hover:ring-2 hover:ring-amber-400 cursor-pointer ${bgClass}`}
                        >
                          {score >= 80 ? score : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedHeatmapCell && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-white">
                  Selected: {selectedHeatmapCell.day} at {selectedHeatmapCell.hour % 12 || 12}:00{' '}
                  {selectedHeatmapCell.hour >= 12 ? 'PM' : 'AM'}
                </span>
                <span className="text-amber-400 ml-2 font-mono font-bold">
                  Score: {selectedHeatmapCell.score}/100
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                  const dayIdx = dayNames.indexOf(selectedHeatmapCell.day);
                  const period = selectedHeatmapCell.hour >= 12 ? 'PM' : 'AM';
                  const formatted = `${selectedHeatmapCell.hour % 12 || 12}:00 ${period}`;
                  handleScheduleSlotClick({
                    dayOfWeek: dayIdx >= 0 ? dayIdx : 0,
                    dayName: selectedHeatmapCell.day,
                    hour: selectedHeatmapCell.hour,
                    formattedTime: formatted,
                    score: selectedHeatmapCell.score,
                    rationale: 'Custom selected slot from heatmap',
                    audienceActivityScore: selectedHeatmapCell.score,
                    platform: 'all',
                  });
                }}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold"
              >
                Schedule at this time
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: TOP 10 PERFORMING VIDEOS TABLE */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400" />
              <span>Top 10 Video Leaderboard</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked by views, retention rate, and algorithmic saves
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3"># Video</th>
                <th className="py-3 px-3">Platform</th>
                <th className="py-3 px-3">Views</th>
                <th className="py-3 px-3">Engagement</th>
                <th className="py-3 px-3">Watch Time</th>
                <th className="py-3 px-3">Retention</th>
                <th className="py-3 px-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {(overview?.top10Videos || []).map((video, idx) => (
                <tr key={video.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-slate-500 w-4">{idx + 1}</span>
                      {video.thumbnailUrl && (
                        <img
                          src={video.thumbnailUrl}
                          alt="thumb"
                          className="w-10 h-14 object-cover rounded-lg border border-slate-700 shrink-0"
                        />
                      )}
                      <div>
                        <h4 className="font-bold text-white line-clamp-1 max-w-xs">{video.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          {video.character && (
                            <span className="text-indigo-300 font-medium">⚡ {video.character}</span>
                          )}
                          {video.series && <span>• {video.series}</span>}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    {video.platform === 'youtube' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-950/50 px-2 py-0.5 rounded border border-red-800/50">
                        <Youtube className="w-3 h-3" />
                        YouTube
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-400 bg-pink-950/50 px-2 py-0.5 rounded border border-pink-800/50">
                        <Instagram className="w-3 h-3" />
                        Reels
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3 font-mono font-bold text-white">
                    {formatNumber(video.views)}
                  </td>

                  <td className="py-3 px-3 font-mono font-semibold text-emerald-300">
                    {video.engagementRate}%
                  </td>

                  <td className="py-3 px-3 font-mono text-slate-300">
                    {video.watchTimeHours ? `${video.watchTimeHours} hrs` : '--'}
                  </td>

                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono text-[11px] font-bold border border-indigo-800">
                      {video.avgRetentionPercent || 75}%
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    {video.videoUrl ? (
                      <a
                        href={video.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 inline-flex items-center"
                        title="View Live Video"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
