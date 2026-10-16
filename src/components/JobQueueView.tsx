import React, { useState, useEffect } from 'react';
import {
  History,
  RotateCcw,
  ExternalLink,
  Youtube,
  Instagram,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  ChevronDown,
  ChevronUp,
  Calendar,
  Edit2,
  Trash2,
  X,
  Save,
  Globe,
  Film,
  Sparkles,
} from 'lucide-react';
import { PublishJob, Platform, PlatformJobResult, ScheduledPost } from '@shared/types';
import { ApiClient } from '../api';

interface JobQueueViewProps {
  jobs: PublishJob[];
  onRefreshJobs: () => void;
}

const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: '🇺🇸 New York (ET)' },
  { value: 'America/Chicago', label: '🇺🇸 Chicago (CT)' },
  { value: 'America/Denver', label: '🇺🇸 Denver (MT)' },
  { value: 'America/Los_Angeles', label: '🇺🇸 Los Angeles (PT)' },
  { value: 'Europe/London', label: '🇬🇧 London (GMT/BST)' },
  { value: 'Europe/Paris', label: '🇫🇷 Paris (CET)' },
  { value: 'Europe/Berlin', label: '🇩🇪 Berlin (CET)' },
  { value: 'Asia/Tokyo', label: '🇯🇵 Tokyo (JST)' },
  { value: 'Asia/Seoul', label: '🇰🇷 Seoul (KST)' },
  { value: 'Asia/Kolkata', label: '🇮🇳 India (IST)' },
  { value: 'Australia/Sydney', label: '🇦🇺 Sydney (AEST)' },
  { value: 'UTC', label: '🌐 UTC' },
];

export const JobQueueView: React.FC<JobQueueViewProps> = ({ jobs, onRefreshJobs }) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'scheduled'>('queue');
  const [retryingKeys, setRetryingKeys] = useState<Record<string, boolean>>({});
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [retryError, setRetryError] = useState<string | null>(null);

  // Scheduled posts state
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);
  const [scheduledError, setScheduledError] = useState<string | null>(null);
  const [scheduledSuccessMsg, setScheduledSuccessMsg] = useState<string | null>(null);

  // Reschedule / Edit Modal state
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleTz, setRescheduleTz] = useState('UTC');
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const loadScheduledPosts = async () => {
    setIsLoadingScheduled(true);
    setScheduledError(null);
    try {
      const data = await ApiClient.getScheduledPosts();
      setScheduledPosts(data);
    } catch (err: any) {
      setScheduledError(err.message || 'Failed to load scheduled posts');
    } finally {
      setIsLoadingScheduled(false);
    }
  };

  useEffect(() => {
    loadScheduledPosts();
  }, []);

  const handleRetry = async (jobId: string, platform: Platform) => {
    const key = `${jobId}-${platform}`;
    setRetryingKeys((prev) => ({ ...prev, [key]: true }));
    setRetryError(null);

    try {
      await ApiClient.retryJobPlatform(jobId, platform);
      onRefreshJobs();
    } catch (err: any) {
      setRetryError(`Retry failed for ${platform === 'youtube' ? 'YouTube' : 'Instagram'}: ${err.message || 'Network error'}`);
    } finally {
      setRetryingKeys((prev) => ({ ...prev, [key]: false }));
    }
  };

  const toggleLogs = (jobId: string) => {
    setExpandedLogs((prev) => ({ ...prev, [jobId]: !prev[jobId] }));
  };

  const handleOpenEdit = (post: ScheduledPost) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditCaption(post.payload?.instagram?.caption || post.payload?.youtube?.description || '');
    const dateObj = new Date(post.runAt);
    setRescheduleDate(dateObj.toISOString().split('T')[0]);
    const hh = String(dateObj.getUTCHours()).padStart(2, '0');
    const mm = String(dateObj.getUTCMinutes()).padStart(2, '0');
    setRescheduleTime(`${hh}:${mm}`);
    setRescheduleTz(post.timeZone || 'UTC');
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;
    setIsSavingEdit(true);
    setScheduledError(null);

    try {
      const newIso = new Date(`${rescheduleDate}T${rescheduleTime}:00Z`).toISOString();
      await ApiClient.updateScheduledPost(editingPost.id, {
        title: editTitle,
        caption: editCaption,
        runAt: newIso,
        timeZone: rescheduleTz,
      });

      setScheduledSuccessMsg(`Updated scheduled post: "${editTitle}"`);
      setTimeout(() => setScheduledSuccessMsg(null), 3000);
      setEditingPost(null);
      loadScheduledPosts();
    } catch (err: any) {
      setScheduledError(err.message || 'Failed to update scheduled post');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCancelPost = async (id: string, title: string) => {
    if (!confirm(`Cancel scheduled post "${title}"? Held video in storage will be removed.`)) {
      return;
    }

    try {
      await ApiClient.cancelScheduledPost(id);
      setScheduledSuccessMsg(`Cancelled scheduled post "${title}"`);
      setTimeout(() => setScheduledSuccessMsg(null), 3000);
      loadScheduledPosts();
    } catch (err: any) {
      setScheduledError(err.message || 'Failed to cancel scheduled post');
    }
  };

  const formatScheduledTime = (isoString: string, tz: string) => {
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })} at ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (${tz})`;
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (status: PublishJob['overallStatus']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>All Published</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-950/60 text-indigo-300 border border-indigo-800 flex items-center gap-1.5 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>Publishing In Progress</span>
          </span>
        );
      case 'partial_failure':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/60 text-amber-300 border border-amber-800 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Partial (1 Platform Failed)</span>
          </span>
        );
      case 'failed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-950/60 text-red-300 border border-red-800 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
            Queued
          </span>
        );
    }
  };

  const renderPlatformCard = (
    jobId: string,
    platform: Platform,
    result: PlatformJobResult | undefined
  ) => {
    if (!result) return null;

    const isRetrying = retryingKeys[`${jobId}-${platform}`];
    const isYoutube = platform === 'youtube';

    return (
      <div
        className={`rounded-xl p-4 border transition-all ${
          result.status === 'published'
            ? 'bg-slate-950/80 border-emerald-800/50'
            : result.status === 'failed'
            ? 'bg-slate-950/80 border-red-800/50'
            : 'bg-slate-950/80 border-indigo-800/50'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {isYoutube ? (
              <Youtube className="w-5 h-5 text-red-500" />
            ) : (
              <Instagram className="w-5 h-5 text-pink-500" />
            )}
            <span className="text-xs font-bold text-white capitalize">{platform}</span>
          </div>

          <div>
            {result.status === 'published' && (
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/60">
                Live Online
              </span>
            )}
            {result.status === 'failed' && (
              <span className="text-[11px] font-bold text-red-400 bg-red-950/50 px-2 py-0.5 rounded border border-red-800/60">
                Failed
              </span>
            )}
            {result.status === 'uploading' && (
              <span className="text-[11px] font-bold text-indigo-400 bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-800/60">
                Processing {result.progress}%
              </span>
            )}
          </div>
        </div>

        {/* Status Stage / Error */}
        <p className="text-xs text-slate-300 mb-3 truncate">
          {result.error ? (
            <span className="text-red-300 flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{result.error}</span>
            </span>
          ) : (
            <span>{result.stage || 'Executing...'}</span>
          )}
        </p>

        {/* Action button */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-900">
          {result.url ? (
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              <span>View Live Post</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : <div />}

          {result.status === 'failed' && (
            <button
              type="button"
              onClick={() => handleRetry(jobId, platform)}
              disabled={isRetrying}
              className="inline-flex items-center space-x-1 px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-200 border border-red-500/30 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            >
              <RotateCcw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Retrying...' : 'Retry'}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top Header Card with Tabs */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              Publishing Queue & Scheduled Posts
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Live progress tracker, background cron runner & scheduled post manager.
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'queue'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Queued & Live ({jobs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scheduled')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'scheduled'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Scheduled ({scheduledPosts.filter((p) => p.status === 'scheduled').length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onRefreshJobs();
              loadScheduledPosts();
            }}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            title="Refresh"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {retryError && (
        <div className="p-4 bg-red-950/80 border border-red-800 rounded-2xl text-xs text-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{retryError}</span>
          </div>
          <button type="button" onClick={() => setRetryError(null)} className="text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {scheduledSuccessMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{scheduledSuccessMsg}</span>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 1: SCHEDULED POSTS LIST                                      */}
      {/* ================================================================ */}
      {activeTab === 'scheduled' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Upcoming scheduled releases. Instagram posts will be triggered automatically via background cron (<code className="text-indigo-300">/api/cron/tick</code>).
            </span>
          </div>

          {scheduledPosts.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto text-slate-500">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">No Scheduled Posts Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                In Studio, choose "Schedule" instead of "Post Now" to set a release date and time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {scheduledPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg space-y-4 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {post.thumbnailUrl ? (
                        <img
                          src={post.thumbnailUrl}
                          alt="Thumb"
                          className="w-12 h-16 object-cover rounded-lg border border-slate-700"
                        />
                      ) : (
                        <div className="w-12 h-16 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500">
                          <Film className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          {post.platform === 'youtube' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-950/50 px-2 py-0.5 rounded border border-red-800/50">
                              <Youtube className="w-3.5 h-3.5" />
                              YouTube
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-400 bg-pink-950/50 px-2 py-0.5 rounded border border-pink-800/50">
                              <Instagram className="w-3.5 h-3.5" />
                              Instagram Reel
                            </span>
                          )}

                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              post.status === 'completed'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : post.status === 'publishing'
                                ? 'bg-indigo-950 text-indigo-300 border border-indigo-800 animate-pulse'
                                : post.status === 'failed'
                                ? 'bg-red-950 text-red-300 border border-red-800'
                                : post.status === 'cancelled'
                                ? 'bg-slate-800 text-slate-400'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {post.status}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white mt-1 line-clamp-1">{post.title}</h3>
                        <p className="text-xs text-amber-300/90 flex items-center gap-1.5 mt-0.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>{formatScheduledTime(post.runAt, post.timeZone)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {post.status === 'scheduled' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(post)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Edit2 className="w-3 h-3 text-indigo-400" />
                            <span>Edit / Reschedule</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCancelPost(post.id, post.title)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/50 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                        </>
                      )}

                      {post.resultUrl && (
                        <a
                          href={post.resultUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          <span>View Post</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {post.lastError && (
                    <div className="p-2.5 bg-red-950/40 border border-red-800/50 rounded-xl text-xs text-red-300">
                      <strong>Last Error:</strong> {post.lastError} (Retry count: {post.retryCount}/{post.maxRetries})
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 2: ACTIVE QUEUES & PUBLISHING HISTORY                        */}
      {/* ================================================================ */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto text-slate-500">
                <History className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">No Publishing Jobs Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Upload a video in the Studio and click "Publish" to send it to YouTube & Instagram.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl space-y-4 transition-all"
                >
                  {/* Job Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 font-bold shrink-0">
                        {job.video?.originalName ? job.video.originalName.slice(0, 2).toUpperCase() : 'VD'}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white line-clamp-1">
                          {job.metadata?.youtube?.title || job.metadata?.instagram?.caption || job.video?.originalName || 'Untitled Video'}
                        </h3>
                        <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                          <span>{new Date(job.createdAt).toLocaleString()}</span>
                          <span>&bull;</span>
                          <span>{job.targetPlatforms.join(' & ')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 self-end sm:self-auto">
                      {getStatusBadge(job.overallStatus)}
                      <button
                        type="button"
                        onClick={() => toggleLogs(job.id)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        title="Toggle Execution Logs"
                      >
                        {expandedLogs[job.id] ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Platform Result Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {job.targetPlatforms.includes('youtube') &&
                      renderPlatformCard(job.id, 'youtube', job.platformResults.youtube)}
                    {job.targetPlatforms.includes('instagram') &&
                      renderPlatformCard(job.id, 'instagram', job.platformResults.instagram)}
                  </div>

                  {/* Execution Event Log Drawer */}
                  {expandedLogs[job.id] && (
                    <div className="bg-black/80 rounded-xl p-3 border border-slate-800/90 space-y-1 font-mono text-[11px]">
                      <div className="flex items-center space-x-1.5 text-slate-400 border-b border-slate-800 pb-1 mb-1">
                        <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Execution Event Log (Job ID: {job.id.slice(0, 8)})</span>
                      </div>
                      {Object.values(job.platformResults)
                        .flatMap((r) => r?.logs || [])
                        .map((logLine, lIdx) => (
                          <div
                            key={lIdx}
                            className={`leading-relaxed ${
                              logLine.includes('ERROR')
                                ? 'text-red-400'
                                : logLine.includes('Live on')
                                ? 'text-emerald-400 font-bold'
                                : 'text-slate-400'
                            }`}
                          >
                            {logLine}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* EDIT / RESCHEDULE MODAL                                           */}
      {/* ================================================================ */}
      {editingPost && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Edit & Reschedule Post</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Title / Hook</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Caption / Description</label>
                <textarea
                  rows={4}
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">New Date</label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">New Time (UTC)</label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Time Zone</label>
                <select
                  value={rescheduleTz}
                  onChange={(e) => setRescheduleTz(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/30"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingEdit ? 'Saving...' : 'Save & Reschedule'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
