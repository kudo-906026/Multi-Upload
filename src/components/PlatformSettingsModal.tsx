import React, { useState } from 'react';
import {
  Youtube,
  Instagram,
  Key,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { PlatformAuthStatus, VERIFIED_PLATFORM_LIMITS } from '@shared/types';
import { ApiClient } from '../api';

interface PlatformSettingsModalProps {
  authStatus: PlatformAuthStatus | null;
  onRefreshAuth: () => void;
}

export const PlatformSettingsModal: React.FC<PlatformSettingsModalProps> = ({
  authStatus,
  onRefreshAuth,
}) => {
  const [isRefreshingIg, setIsRefreshingIg] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleConnectYouTube = async () => {
    try {
      const url = await ApiClient.getYouTubeAuthUrl();
      window.open(url, '_blank');
    } catch (err: any) {
      setFeedbackMsg(`Could not start YouTube OAuth: ${err.message}. Make sure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured.`);
    }
  };

  const handleRefreshInstagramToken = async () => {
    setIsRefreshingIg(true);
    setFeedbackMsg(null);
    try {
      const result = await ApiClient.refreshInstagramToken();
      setFeedbackMsg(`Successfully refreshed Instagram token! ${result.daysRemaining} days remaining.`);
      onRefreshAuth();
    } catch (err: any) {
      setFeedbackMsg(`Failed to refresh Instagram token: ${err.message}`);
    } finally {
      setIsRefreshingIg(false);
    }
  };

  const sampleEnv = `# Environment Variables (.env) for Render & Supabase (Free Tier)
PORT=10000
NODE_ENV=production
PUBLIC_BASE_URL=https://your-app-name.onrender.com

# 1. Supabase (Database, Auth & Video Storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SECRET_KEY=your_supabase_secret_key
SUPABASE_STORAGE_BUCKET=videos

# 2. Gemini AI (Free from Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key

# 3. Google OAuth 2.0 (YouTube Data API v3)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# 4. Meta for Developers (Instagram API with Instagram Login - No Facebook Page Needed)
META_APP_ID=your_instagram_app_id
META_APP_SECRET=your_instagram_app_secret

# 5. Token Encryption Key (AES-256-GCM)
TOKEN_ENCRYPTION_KEY=generate_a_random_32_char_key_here`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sampleEnv);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Platform Connections Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span>Platform Connections & Security Architecture</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            All API secrets and OAuth refresh tokens are stored safely on the backend server environment
            variables and are never exposed to the frontend browser. Each user connects and manages their own accounts.
          </p>
        </div>

        {feedbackMsg && (
          <div className="p-3 bg-indigo-950/60 border border-indigo-800/80 rounded-xl text-indigo-300 text-xs">
            {feedbackMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* YouTube Connection Card */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-600/10 border border-red-600/30 flex items-center justify-center text-red-500">
                  <Youtube className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">YouTube Data API v3</h3>
                  <p className="text-[11px] text-slate-400">Google OAuth 2.0 & Resumable Upload</p>
                </div>
              </div>

              {authStatus?.youtube.authenticated ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Connected
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Not Connected
                </span>
              )}
            </div>

            <div className="text-xs text-slate-300 space-y-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">Channel:</span>
                <span className="font-semibold text-white">
                  {authStatus?.youtube.channelTitle || 'No channel connected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">OAuth Scopes:</span>
                <span className="font-mono text-[9px] text-indigo-300 text-right">
                  youtube.upload, youtube.readonly, yt-analytics.readonly
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Resumable Chunking:</span>
                <span className="text-emerald-400 font-semibold">Active</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConnectYouTube}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-900/30 flex items-center justify-center space-x-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>
                {authStatus?.youtube.authenticated ? 'Reconnect YouTube Account' : 'Connect with Google OAuth'}
              </span>
            </button>
          </div>

          {/* Instagram Connection Card */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-pink-600/10 border border-pink-600/30 flex items-center justify-center text-pink-500">
                  <Instagram className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Instagram API with Instagram Login</h3>
                  <p className="text-[11px] text-slate-400">No Facebook Page needed • graph.instagram.com Reels</p>
                </div>
              </div>

              {authStatus?.instagram.authenticated ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Connected
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Not Connected
                </span>
              )}
            </div>

            <div className="text-xs text-slate-300 space-y-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-400">Account Handle:</span>
                <span className="font-semibold text-white">
                  {authStatus?.instagram.username || 'No account connected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Long-Lived Token:</span>
                <span
                  className={`font-semibold ${
                    !authStatus?.instagram.authenticated
                      ? 'text-slate-400'
                      : (authStatus?.instagram.tokenDaysRemaining ?? 60) < 15
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {authStatus?.instagram.authenticated
                    ? `${authStatus.instagram.tokenDaysRemaining ?? 60} Days Remaining`
                    : 'Not Connected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reels Flow:</span>
                <span className="text-emerald-400 font-semibold">Container + Polling + Publish</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isRefreshingIg}
              onClick={handleRefreshInstagramToken}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-95 text-white transition-all shadow-md shadow-pink-900/30 flex items-center justify-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingIg ? 'animate-spin' : ''}`} />
              <span>{isRefreshingIg ? 'Refreshing Token...' : 'Refresh 60-Day Token'}</span>
            </button>
          </div>
        </div>

        {/* Google Search Grounded Platform Limits & Algorithm Constraints */}
        <div className="pt-4 border-t border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-white">
              <Sparkles className="w-4 h-4 text-pink-400" />
              <span>Verified Platform Algorithm Limits (Google Search Grounded)</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Active Constraints
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* YouTube Shorts Limits */}
            <div className="p-4 bg-[#0f0f0f] border border-[#272727] rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                <Youtube className="w-4 h-4 text-red-500" />
                <span>YouTube Shorts Official API Constraints</span>
              </div>
              <div className="text-xs space-y-1.5 text-slate-300">
                <div className="flex justify-between py-1 border-b border-neutral-800">
                  <span className="text-slate-400">Max Title Length:</span>
                  <span className="font-mono font-bold text-white">{VERIFIED_PLATFORM_LIMITS.youtube.maxTitleLength} characters</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-800">
                  <span className="text-slate-400">Max Description Length:</span>
                  <span className="font-mono font-bold text-white">{VERIFIED_PLATFORM_LIMITS.youtube.maxDescriptionLength} characters</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-800">
                  <span className="text-slate-400">Hidden Search Tags Total:</span>
                  <span className="font-mono font-bold text-white">&lt; {VERIFIED_PLATFORM_LIMITS.youtube.maxTagsLength} characters</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-800">
                  <span className="text-slate-400">Display Hashtags in Player:</span>
                  <span className="font-mono font-bold text-white">{VERIFIED_PLATFORM_LIMITS.youtube.displayHashtagsCount} tags above title</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Max Shorts Duration:</span>
                  <span className="font-mono font-bold text-white">{VERIFIED_PLATFORM_LIMITS.youtube.maxShortsDurationSec}s (3 minutes)</span>
                </div>
              </div>
            </div>

            {/* Instagram Reels Limits */}
            <div className="p-4 bg-black border border-neutral-800 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-pink-400">
                <Instagram className="w-4 h-4 text-pink-500" />
                <span>Instagram Reels Official API Constraints</span>
              </div>
              <div className="text-xs space-y-1.5 text-slate-300">
                <div className="flex justify-between py-1 border-b border-neutral-800">
                  <span className="text-slate-400">Max Caption Length:</span>
                  <span className="font-mono font-bold text-white">{VERIFIED_PLATFORM_LIMITS.instagram.maxCaptionLength} characters</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-800">
                  <span className="text-slate-400">Recommended Hashtags:</span>
                  <span className="font-mono font-bold text-white">{VERIFIED_PLATFORM_LIMITS.instagram.recommendedHashtagsLimit} tags (algorithm sweet spot)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-800">
                  <span className="text-slate-400">Hard Hashtags Maximum:</span>
                  <span className="font-mono font-bold text-white">{VERIFIED_PLATFORM_LIMITS.instagram.maxHashtagsLimit} tags</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-800">
                  <span className="text-slate-400">Standard Reels Duration:</span>
                  <span className="font-mono font-bold text-white">Up to {VERIFIED_PLATFORM_LIMITS.instagram.maxDurationSec}s</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Audio Handling:</span>
                  <span className="text-[11px] font-medium text-amber-300">Video Container Audio</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Environment Variables Reference Guide */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-white">
              <Key className="w-4 h-4 text-indigo-400" />
              <span>Production Deployment Credentials (.env)</span>
            </div>

            <button
              onClick={copyToClipboard}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1 transition-colors"
            >
              {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedEnv ? 'Copied' : 'Copy Template'}</span>
            </button>
          </div>

          <pre className="bg-black/90 p-4 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
            {sampleEnv}
          </pre>
        </div>
      </div>
    </div>
  );
};
