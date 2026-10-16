import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  RotateCcw,
  Zap,
  Target,
  Flame,
  Award,
  ArrowRight,
  TrendingUp,
  Sliders,
  CheckCircle2,
  FileEdit,
  Music2,
  Layers,
  User,
  Film,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { ContentPlannerReport, ContentIdea, WinningFormulaPatterns, CalendarDayItem } from '@shared/types';
import { ApiClient } from '../api';

interface ContentPlannerViewProps {
  onOpenDraftInStudio: (idea: ContentIdea) => void;
  onOpenScheduleSlotInStudio: (slot: { date: string; time: string; timeZone: string; title: string }) => void;
}

const PRESET_NICHES = [
  { id: 'anime edits (amv)', label: '⛩️ Anime Edits (AMV)' },
  { id: 'marvel edits', label: '⚡ Marvel Edits' },
  { id: 'manhwa edits', label: '🗡️ Manhwa Edits' },
  { id: 'gaming edits', label: '🎮 Gaming Edits' },
];

export const ContentPlannerView: React.FC<ContentPlannerViewProps> = ({
  onOpenDraftInStudio,
  onOpenScheduleSlotInStudio,
}) => {
  const [selectedNiche, setSelectedNiche] = useState('anime edits (amv)');
  const [customNiche, setCustomNiche] = useState('');
  const [report, setReport] = useState<ContentPlannerReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<1 | 2>(1);

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const loadPlan = async (forceGenerate = false) => {
    const nicheToUse = customNiche.trim() || selectedNiche;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (forceGenerate) {
      setIsGenerating(true);
    } else {
      setIsLoading(true);
    }

    try {
      const data = forceGenerate
        ? await ApiClient.generateContentPlan(nicheToUse, userTimeZone)
        : await ApiClient.getContentPlan(nicheToUse, userTimeZone);
      setReport(data);
      if (forceGenerate) {
        setSuccessMsg('Gemini synthesized your top performance stats & niche trends into 10 new viral ideas!');
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    } catch (err: any) {
      console.error('Error in content planner:', err);
      setErrorMsg(err.message || 'Failed to generate content plan');
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    loadPlan(false);
  }, [selectedNiche]);

  const handleApplyDraft = (idea: ContentIdea) => {
    onOpenDraftInStudio(idea);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Top Banner / Strategy Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-900/60 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-tr from-indigo-600 to-pink-600 rounded-2xl text-white shadow-lg shadow-indigo-600/30 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">
                AI Content Planner: What to Upload Next
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Gemini 2.5 Flash
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Trained on your best & worst performing videos cross-referenced with live YouTube & Instagram niche trends.
            </p>
          </div>
        </div>

        {/* Niche Controls & Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            {PRESET_NICHES.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  setCustomNiche('');
                  setSelectedNiche(n.id);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedNiche === n.id && !customNiche
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => loadPlan(true)}
            disabled={isGenerating || isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-pink-600/20 disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Analyzing...' : 'Generate 10 New Ideas'}</span>
          </button>
        </div>
      </div>

      {/* Safety Notice: Only suggests, never auto-posts */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong className="text-slate-200">Non-Autonomous Safety:</strong> OmniPost only generates suggestions and drafts. It will <strong>never auto-post</strong> without your review.
          </span>
        </div>
        <span className="hidden sm:inline text-[11px] font-mono text-slate-500">
          Timezone: {userTimeZone}
        </span>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-800 text-emerald-200 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION 1: WINNING FORMULA PATTERNS */}
      {report?.patterns && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Your Channel's Winning Formula ({report.patterns.analysisSampleCount} videos analyzed)
                </h2>
                <p className="text-xs text-slate-400">
                  Shared DNA among your top 20% highest-retention videos
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800">
              Avg Retention: ~{report.patterns.avgRetentionPercent || 78}%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
            {/* Top Series */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px]">
                <Film className="w-3.5 h-3.5 text-indigo-400" />
                <span>Top Series & Anime</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {report.patterns.topSeries.map((s: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-indigo-950/70 text-indigo-300 font-medium border border-indigo-800/60"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Top Characters */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px]">
                <User className="w-3.5 h-3.5 text-pink-400" />
                <span>Peak Retention Characters</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {report.patterns.topCharacters.map((c: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-pink-950/70 text-pink-300 font-medium border border-pink-800/60"
                  >
                    ⚡ {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Edit Style & Length */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px]">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Style & Sweetspot Length</span>
              </div>
              <div className="font-bold text-white text-xs pt-1">
                {report.patterns.dominantEditStyle || 'Velocity Beat Sync'}
              </div>
              <div className="text-[11px] text-cyan-300 font-mono">
                Optimal: {report.patterns.optimalLengthSec || '18-24 seconds'}
              </div>
            </div>

            {/* Trending Audio */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px]">
                <Music2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Winning Audio Hook</span>
              </div>
              <div className="text-white text-xs font-semibold line-clamp-2 pt-1">
                {report.patterns.bestAudioTracks?.[0] || 'Phonk Bass Drop / Slowed+Reverb'}
              </div>
            </div>
          </div>

          {/* Actionable Advice */}
          {report.patterns.advice && (
            <div className="p-3 bg-indigo-950/40 border border-indigo-900/60 rounded-xl text-xs text-indigo-200 flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Gemini Production Tip: </strong>
                {report.patterns.advice}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: 10 SPECIFIC IDEAS FOR NEXT 2 WEEKS */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-pink-500" />
              <span>10 Next-Upload Recommendations (Next 14 Days)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              High-CTR concepts ready to open directly into Studio with prefilled titles, hashtags, and prime time slots.
            </p>
          </div>
          <span className="text-xs text-slate-400">
            Showing <strong className="text-white">{report?.ideas?.length || 0}</strong> viral formulas
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <RotateCcw className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
            <p className="text-xs">Generating 10 viral video concepts with Gemini...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(report?.ideas || []).map((idea: ContentIdea, index: number) => (
              <div
                key={idea.id || index}
                className="bg-slate-950 border border-slate-800/90 hover:border-indigo-600/60 rounded-2xl p-4.5 flex flex-col justify-between space-y-3.5 transition-all hover:shadow-xl group"
              >
                <div className="space-y-2.5">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-500 text-xs">#{index + 1}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          idea.platform === 'youtube'
                            ? 'bg-red-950/80 text-red-300 border border-red-800/80'
                            : idea.platform === 'instagram'
                            ? 'bg-pink-950/80 text-pink-300 border border-pink-800/80'
                            : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/80'
                        }`}
                      >
                        {idea.platform === 'both' ? 'YouTube & Reels' : idea.platform}
                      </span>
                      {idea.character && (
                        <span className="text-[11px] text-amber-300 font-semibold">
                          ⚡ {idea.character}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono font-semibold">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{idea.estimatedViewsRange || '50K - 120K'}</span>
                    </div>
                  </div>

                  {/* Title Hook */}
                  <h3 className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">
                    {idea.title}
                  </h3>

                  {/* Hook concept */}
                  {idea.hookConcept && (
                    <p className="text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                      <strong className="text-slate-300">Hook: </strong>
                      {idea.hookConcept}
                    </p>
                  )}

                  {/* Hashtags */}
                  <div className="flex flex-wrap gap-1">
                    {idea.hashtags.slice(0, 6).map((tag: string, tIdx: number) => (
                      <span
                        key={tIdx}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800"
                      >
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </span>
                    ))}
                    {idea.hashtags.length > 6 && (
                      <span className="text-[10px] text-slate-500 self-center">
                        +{idea.hashtags.length - 6} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Card Controls: Time Slot + Open in Studio */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="font-mono text-[11px]">
                      {idea.suggestedSlot.date} • {idea.suggestedSlot.time}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyDraft(idea)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 shrink-0"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    <span>Open in Studio</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: WEEKLY CONTENT CALENDAR */}
      {report?.weeklyCalendar && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <span>Two-Week Content Calendar</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Strategic release schedule mapped to your audience's peak algorithmic activity
              </p>
            </div>

            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedWeek(1)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  selectedWeek === 1 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Week 1
              </button>
              <button
                type="button"
                onClick={() => setSelectedWeek(2)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  selectedWeek === 2 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Week 2
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {report.weeklyCalendar
              .filter((day: CalendarDayItem) => (selectedWeek === 1 ? day.weekNumber === 1 : day.weekNumber === 2))
              .map((day: CalendarDayItem, idx: number) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex flex-col justify-between space-y-2.5 min-h-[140px] ${
                    day.isPeakDay
                      ? 'bg-indigo-950/30 border-indigo-500/40 ring-1 ring-indigo-500/20'
                      : 'bg-slate-950 border-slate-800/80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{day.dayName}</span>
                      {day.isPeakDay && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          PEAK
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">{day.date}</div>
                  </div>

                  {day.suggestedIdea ? (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-white line-clamp-2">
                        {day.suggestedIdea.title}
                      </div>
                      <div className="text-[10px] text-indigo-400 font-mono">
                        ⏰ {day.suggestedIdea.time}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onOpenScheduleSlotInStudio({
                            date: day.date,
                            time: day.suggestedIdea?.time || '18:00',
                            timeZone: userTimeZone,
                            title: day.suggestedIdea?.title || `Shorts Draft for ${day.dayName}`,
                          })
                        }
                        className="w-full text-center py-1 bg-slate-900 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-slate-800 hover:border-indigo-500"
                      >
                        Create Draft
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-[10px] text-slate-500">
                      Rest / Prep Day
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
