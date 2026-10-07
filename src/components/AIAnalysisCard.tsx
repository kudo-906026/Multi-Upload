import React, { useState } from 'react';
import { Sparkles, Globe, TrendingUp, Compass, CheckCircle2, ChevronDown, RefreshCw } from 'lucide-react';
import { AIAnalysisResult, VideoMetadata, AITone } from '@shared/types';
import { ApiClient } from '../api';

interface AIAnalysisCardProps {
  video: VideoMetadata | null;
  onAnalysisComplete: (result: AIAnalysisResult) => void;
  analysisResult: AIAnalysisResult | null;
}

export const AIAnalysisCard: React.FC<AIAnalysisCardProps> = ({
  video,
  onAnalysisComplete,
  analysisResult,
}) => {
  const [topicHint, setTopicHint] = useState('');
  const [selectedTone, setSelectedTone] = useState<AITone>('viral_hook');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunAnalysis = async () => {
    if (!video) return;
    setErrorMsg(null);
    setIsAnalyzing(true);

    try {
      const result = await ApiClient.analyzeVideo({
        filename: video.originalName,
        titleHint: topicHint.trim() || undefined,
        tone: selectedTone,
      });
      onAnalysisComplete(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'AI analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const tones: { id: AITone; label: string; desc: string }[] = [
    { id: 'viral_hook', label: '⚡ High Energy & Viral', desc: 'Maximum CTR and retention hooks' },
    { id: 'informative', label: '📚 Informative & Tech', desc: 'Clear educational breakdown' },
    { id: 'casual', label: '☕ Casual & Humorous', desc: 'Relatable and conversational' },
    { id: 'storytelling', label: '🎬 Cinematic & Aesthetic', desc: 'Narrative and emotional resonance' },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              2
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Gemini AI Trend Analysis with Google Search Grounding
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Grounding Active
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gemini searches live web trends to uncover current viral hashtags, high-CTR hooks, and platform-specific keywords.
          </p>
        </div>

        {analysisResult && (
          <div className="flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Analysis Generated</span>
          </div>
        )}
      </div>

      {/* Input Prompts & Tones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Video Subject / Topic Context (Optional)
          </label>
          <input
            type="text"
            value={topicHint}
            onChange={(e) => setTopicHint(e.target.value)}
            placeholder="e.g. Quick recipe, travel vlog in Tokyo, tech review, workout tip..."
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
              <span>Searching Google & Generating Grounded Content...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>
                {analysisResult ? 'Re-Analyze with Live Trends' : 'Analyze Video with Gemini & Google Search Grounding'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Grounded Trends & Insights Preview */}
      {analysisResult && (
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

          {/* Key Insights */}
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
