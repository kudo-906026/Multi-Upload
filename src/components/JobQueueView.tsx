import React, { useState } from 'react';
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
} from 'lucide-react';
import { PublishJob, Platform, PlatformJobResult } from '@shared/types';
import { ApiClient } from '../api';

interface JobQueueViewProps {
  jobs: PublishJob[];
  onRefreshJobs: () => void;
}

export const JobQueueView: React.FC<JobQueueViewProps> = ({ jobs, onRefreshJobs }) => {
  const [retryingKeys, setRetryingKeys] = useState<Record<string, boolean>>({});
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  const handleRetry = async (jobId: string, platform: Platform) => {
    const key = `${jobId}-${platform}`;
    setRetryingKeys((prev) => ({ ...prev, [key]: true }));

    try {
      await ApiClient.retryJobPlatform(jobId, platform);
      onRefreshJobs();
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setRetryingKeys((prev) => ({ ...prev, [key]: false }));
    }
  };

  const toggleLogs = (jobId: string) => {
    setExpandedLogs((prev) => ({ ...prev, [jobId]: !prev[jobId] }));
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
            ? 'bg-red-950/20 border-red-800/50'
            : 'bg-slate-950/90 border-slate-800'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {isYoutube ? (
              <Youtube className="w-4 h-4 text-red-500" />
            ) : (
              <Instagram className="w-4 h-4 text-pink-500" />
            )}
            <span className="text-xs font-bold text-white capitalize">
              {isYoutube ? 'YouTube Shorts' : 'Instagram Reels'}
            </span>
          </div>

          <div>
            {result.status === 'published' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Published
              </span>
            )}
            {result.status === 'failed' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                Failed
              </span>
            )}
            {(result.status === 'uploading' || result.status === 'processing') && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {result.status.toUpperCase()} ({result.progress}%)
              </span>
            )}
            {result.status === 'pending' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                Queued
              </span>
            )}
          </div>
        </div>

        {/* Stage message */}
        <p className="text-xs text-slate-300 line-clamp-1 mb-2 font-mono">
          {result.stage || 'Waiting for slot...'}
        </p>

        {/* Progress bar */}
        {(result.status === 'uploading' || result.status === 'processing') && (
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full transition-all duration-300 ${
                isYoutube ? 'bg-red-500' : 'bg-pink-500'
              }`}
              style={{ width: `${Math.max(5, result.progress)}%` }}
            />
          </div>
        )}

        {/* Action Buttons: Live link or Retry */}
        <div className="flex items-center justify-between pt-1">
          {result.publishedUrl ? (
            <a
              href={result.publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              <span>View Live Post</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="text-[10px] text-slate-500">
              {result.status === 'failed' ? result.error : 'Pipeline in progress'}
            </span>
          )}

          {result.status === 'failed' && (
            <button
              type="button"
              disabled={isRetrying}
              onClick={() => handleRetry(jobId, platform)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-900/40 hover:bg-red-900/70 text-red-200 border border-red-700/60 flex items-center space-x-1 transition-all active:scale-95"
            >
              <RotateCcw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Retrying...' : 'Retry Platform'}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-indigo-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">
                Publishing Queue & Post History
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Real-time monitoring of YouTube Resumable uploads and Instagram Graph API Reels container status.
              If one platform encounters an issue, the other continues and can be individually retried.
            </p>
          </div>

          <button
            onClick={onRefreshJobs}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh Status</span>
          </button>
        </div>

        {/* Jobs List */}
        {jobs.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <History className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300">No publish jobs yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Head over to the Studio tab to upload a video, generate grounded trends with Gemini, and publish!
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4 transition-all hover:border-slate-700"
              >
                {/* Top Job Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
                  <div className="flex items-center space-x-3">
                    {/* Small thumbnail / icon */}
                    <div className="w-10 h-10 rounded-lg bg-black border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                      <video src={job.video.publicUrl} className="w-full h-full object-cover" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                        {job.metadata.youtube?.title || job.video.originalName}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        File: {job.video.originalName} • {(job.video.size / 1024 / 1024).toFixed(1)}MB •{' '}
                        {new Date(job.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-start sm:self-auto">
                    {getStatusBadge(job.overallStatus)}
                    <button
                      onClick={() => toggleLogs(job.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Toggle execution event logs"
                    >
                      {expandedLogs[job.id] ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Per-Platform Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {job.targetPlatforms.includes('youtube') &&
                    renderPlatformCard(job.id, 'youtube', job.platformResults.youtube)}
                  {job.targetPlatforms.includes('instagram') &&
                    renderPlatformCard(job.id, 'instagram', job.platformResults.instagram)}
                </div>

                {/* Collapsible Execution Log Console */}
                {expandedLogs[job.id] && (
                  <div className="bg-black/80 rounded-xl p-3 border border-slate-800/90 space-y-1 font-mono text-[11px]">
                    <div className="flex items-center space-x-1.5 text-slate-400 border-b border-slate-800 pb-1 mb-1">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Execution Event Log (Job ID: {job.id.slice(0, 8)})</span>
                    </div>
                    {/* Combine logs */}
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
    </div>
  );
};
