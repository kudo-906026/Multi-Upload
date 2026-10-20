import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Globe,
  TrendingUp,
  CheckCircle2,
  RefreshCw,
  FileDown,
  AlertTriangle,
  Video,
  Layers,
  Youtube,
  Plus,
} from 'lucide-react';
import { AIAnalysisResult, VideoMetadata, AITone } from '@shared/types';
import { ApiClient } from '../api';
import { TrendGrowthChart } from './TrendGrowthChart';
import { exportTrendAnalysisPDF } from '../utils/pdfExport';
import { DetectedEntitiesChips } from './DetectedEntitiesChips';

interface AIAnalysisCardProps {
  video: VideoMetadata | null;
  onAnalysisComplete: (result: AIAnalysisResult) => void;
  analysisResult: AIAnalysisResult | null;
  trendContext?: { topic: string; hashtags: string[] } | null;
}

export const AIAnalysisCard: React.FC<AIAnalysisCardProps> = ({
  video,
  onAnalysisComplete,
  analysisResult,
  trendContext,
}) => {
  const [topicHint, setTopicHint] = useState(trendContext?.topic || '');
  const [selectedTone, setSelectedTone] = useState<AITone>('viral_hook');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync trendContext if updated externally
  useEffect(() => {
    if (trendContext?.topic) {
      setTopicHint(trendContext.topic);
    }
  }, [trendContext]);

  const handleRunAnalysis = async () => {
    if (!video) return;
    setErrorMsg(null);
    setIsAnalyzing(true);

    try {
      const descriptionHint = trendContext?.hashtags?.length
        ? `Target trending hashtags: ${trendContext.hashtags.join(' ')}`
        : undefined;

      const result = await ApiClient.analyzeVideo({
        filename: video.originalName,
        videoId: video.id,
        storagePath: video.storagePath || video.convertedPath,
        titleHint: topicHint.trim() || undefined,
        descriptionHint,
        tone: selectedTone,
      });
      onAnalysisComplete(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'AI analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddLiveKeywordToYtTags = (tag: string) => {
    if (!analysisResult) return;
    const currentTags = new Set(analysisResult.youtube.tags.map((t) => t.toLowerCase()));
    if (!currentTags.has(tag.toLowerCase())) {
      const updated = {
        ...analysisResult,
        youtube: {
          ...analysisResult.youtube,
          tags: [...analysisResult.youtube.tags, tag],
        },
      };
      onAnalysisComplete(updated);
    }
  };

  const tones: { id: AITone; label: string; desc: string }[] = [
    { id: 'viral_hook', label: '⚡ High Energy & Viral', desc: 'Maximum CTR and retention hooks' },
    { id: 'informative', label: '📚 Informative & Tech', desc: 'Clear educational breakdown' },
    { id: 'casual', label: '☕ Casual & Humorous', desc: 'Relatable and conversational' },
    { id: 'storytelling', label: '🎬 Cinematic & Aesthetic', desc: 'Narrative and emotional resonance' },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-6 shadow-xl space-y-5 sm:space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span>Gemini AI Video Watch & Trend Analysis</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0 font-medium">
                Gemini 2.5 Flash Active
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gemini watches the real video file via Files API (or keyframes fallback) and queries live YouTube search keywords to detect entities and craft viral metadata.
          </p>
        </div>

        {analysisResult && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => exportTrendAnalysisPDF(analysisResult)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white shadow-md shadow-indigo-600/30 active:scale-95 transition-all"
              title="Download executive PDF report for clients and external review"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export PDF Report</span>
            </button>

            <div className="flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1.5 rounded-xl">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Analyzed</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Prompts & Tones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          {trendContext && (
            <div className="mb-2 p-2 bg-indigo-950/60 border border-indigo-500/40 rounded-xl flex items-center justify-between text-xs text-indigo-300">
              <span className="flex items-center gap-1.5 truncate">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Trend: <strong>"{trendContext.topic}"</strong></span>
              </span>
              {trendContext.hashtags.length > 0 && (
                <span className="text-[10px] text-indigo-400 font-mono hidden sm:inline">
                  +{trendContext.hashtags.length} tags
                </span>
              )}
            </div>
          )}

          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Creator Context & Hints (Optional - Gemini watches video directly)
          </label>
          <input
            type="text"
            value={topicHint}
            onChange={(e) => setTopicHint(e.target.value)}
            placeholder="e.g. Quick recipe, travel vlog in Tokyo, anime phonk edit, clutch gameplay..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Content Delivery Tone
          </label>
          <div className="grid grid-cols-2 gap-2">
            {tones.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTone(t.id)}
                className={`text-left p-2 rounded-xl text-xs border transition-all ${
                  selectedTone === t.id
                    ? 'bg-indigo-950/60 border-indigo-500 text-white font-semibold'
                    : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>{t.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div>
        <button
          type="button"
          disabled={!video || isAnalyzing}
          onClick={handleRunAnalysis}
          className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg transition-all ${
            !video
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : isAnalyzing
              ? 'bg-indigo-600/80 text-white cursor-wait'
              : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white hover:opacity-95 shadow-indigo-600/25 active:scale-[0.99]'
          }`}
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>Uploading video to Gemini & Analyzing Visuals...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>
                {analysisResult
                  ? 'Re-Analyze Video with Gemini & YouTube Trends'
                  : 'Watch Video with Gemini & Search Grounding'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Offline Notice (Requirement 4: If AI offline and uses fallback template, show clear notice) */}
      {analysisResult && (analysisResult.isFallback || analysisResult.aiOfflineNotice) && (
        <div className="p-4 bg-amber-950/60 border border-amber-600/60 rounded-xl flex items-start gap-3 text-amber-200 animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Notice: AI is currently offline or unreachable
            </h4>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              {analysisResult.aiOfflineNotice ||
                'The app generated metadata using an intelligent fallback template. Please verify the detected series, character, and hashtag chips below to confirm your details before publishing.'}
            </p>
          </div>
        </div>
      )}

      {/* Analysis Details & Editable Chips */}
      {analysisResult && (
        <div className="space-y-4">
          {/* Video Analysis Method Badge */}
          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950/60 border border-slate-800 px-3.5 py-2 rounded-xl">
            <div className="flex items-center gap-2">
              {analysisResult.videoAnalysisMethod === 'gemini_files_api' ? (
                <>
                  <Video className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 font-medium">
                    Analysis Method: Gemini Files API (Video Stream - Low Resolution Quota Saver)
                  </span>
                </>
              ) : analysisResult.videoAnalysisMethod === 'ffmpeg_keyframes' ? (
                <>
                  <Layers className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-300 font-medium">
                    Analysis Method: 7 FFmpeg Keyframes (Inline Multimodal Fallback)
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-300 font-medium">
                    Analysis Method: Intelligent Fallback Template (Offline)
                  </span>
                </>
              )}
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {new Date(analysisResult.analyzedAt).toLocaleTimeString()}
            </span>
          </div>

          {/* Requirement 2: Editable Chips for Series, Characters, Edit Style, Mood, On-screen text */}
          {analysisResult.detections && (
            <DetectedEntitiesChips
              analysisResult={analysisResult}
              onUpdateAnalysis={onAnalysisComplete}
            />
          )}

          {/* Requirement 3: Live YouTube Search Keywords (search.list & videos.list) */}
          {analysisResult.liveKeywordData && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Youtube className="w-4 h-4 text-red-500" />
                  <span>Live YouTube Search Keywords (Top 10 Video Tags & Titles)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Cached 30m
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Click any live tag below to append it directly to your YouTube tags:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {analysisResult.liveKeywordData.topTags.map((tag, kidx) => {
                  const isAlreadyAdded = analysisResult.youtube.tags
                    .map((t) => t.toLowerCase())
                    .includes(tag.toLowerCase());
                  return (
                    <button
                      key={kidx}
                      type="button"
                      onClick={() => handleAddLiveKeywordToYtTags(tag)}
                      disabled={isAlreadyAdded}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                        isAlreadyAdded
                          ? 'bg-emerald-950/40 border border-emerald-600/40 text-emerald-300 cursor-default'
                          : 'bg-red-950/30 border border-red-800/40 text-red-300 hover:bg-red-900/50 hover:text-white cursor-pointer active:scale-95'
                      }`}
                    >
                      <span>{tag}</span>
                      {isAlreadyAdded ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Plus className="w-3 h-3 text-red-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grounded Web Trends Preview */}
          <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                <Globe className="w-4 h-4 text-blue-400" />
                <span>Grounded Web Trends Found For: "{analysisResult.topic}"</span>
              </div>
              <span className="text-[11px] text-slate-400">Tone: {analysisResult.detectedTone}</span>
            </div>

            {/* Search Grounding Queries & Keywords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {analysisResult.groundedTrends?.map((trend, idx) => (
                <div key={idx} className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs text-indigo-400 font-mono">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">"{trend.query}"</span>
                  </div>
                  {trend.contextNote && (
                    <p className="text-[11px] text-slate-400">{trend.contextNote}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {trend.trendingKeywords.map((kw, kidx) => (
                      <span
                        key={kidx}
                        className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-medium"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Strategic Insights */}
            {analysisResult.keyInsights && (
              <div className="pt-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
                  Strategic Insights for Algorithmic Reach:
                </span>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                  {analysisResult.keyInsights.map((insight, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* D3 Trend Chart */}
            {analysisResult.predictedGrowth && analysisResult.predictedGrowth.length > 0 && (
              <div className="pt-2">
                <TrendGrowthChart
                  data={analysisResult.predictedGrowth}
                  topic={analysisResult.topic}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs">
          {errorMsg}
        </div>
      )}
    </div>
  );
};
