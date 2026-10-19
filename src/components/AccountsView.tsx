import React, { useState } from 'react';
import {
  Youtube,
  Instagram,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  Key,
  Users,
  Sparkles,
  Info,
} from 'lucide-react';
import { ConnectedAccount, PlatformAuthStatus } from '@shared/types';
import { ApiClient } from '../api';

interface AccountsViewProps {
  authStatus: PlatformAuthStatus | null;
  onRefresh: () => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({ authStatus, onRefresh }) => {
  const [connectingPlatform, setConnectingPlatform] = useState<'youtube' | 'instagram' | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Manual code exchange modal for headless or popup flow
  const [showCodeModal, setShowCodeModal] = useState<'youtube' | 'instagram' | null>(null);
  const [manualCode, setManualCode] = useState('');

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConnectYouTube = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      setConnectingPlatform('youtube');
      const url = await ApiClient.getYouTubeAuthUrl();
      // Open in current window or popup
      window.location.href = url;
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initiate Google OAuth. Ensure GOOGLE_CLIENT_ID is set.');
      setConnectingPlatform(null);
    }
  };

  const handleConnectInstagram = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      setConnectingPlatform('instagram');
      const url = await ApiClient.getInstagramAuthUrl();
      window.location.href = url;
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initiate Meta OAuth. Ensure META_APP_ID is set.');
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (account: ConnectedAccount) => {
    if (!window.confirm(`Disconnect "${account.name}" (${account.handle || account.platform})? Stored tokens will be permanently deleted.`)) {
      return;
    }

    setActionLoadingId(account.id);
    try {
      await ApiClient.disconnectAccount(account.id);
      setSuccessMsg(`Disconnected "${account.name}".`);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to disconnect account');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRefreshInstagramToken = async (account: ConnectedAccount) => {
    setActionLoadingId(account.id);
    setErrorMsg(null);
    try {
      const res = await ApiClient.refreshInstagramAccount(account.id);
      setSuccessMsg(`Refreshed token for "${account.name}"! ${res.daysRemaining} days remaining.`);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to refresh Instagram token');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSetDefault = async (account: ConnectedAccount) => {
    setActionLoadingId(account.id);
    try {
      await ApiClient.setDefaultAccount(account.id);
      setSuccessMsg(`"${account.name}" set as default for ${account.platform}.`);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to set default account');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleManualCodeSubmit = async () => {
    if (!manualCode.trim() || !showCodeModal) return;
    setActionLoadingId('manual-exchange');
    setErrorMsg(null);

    try {
      if (showCodeModal === 'youtube') {
        const acc = await ApiClient.exchangeYouTubeCode(manualCode.trim());
        setSuccessMsg(`Successfully connected YouTube channel: "${acc.name}"!`);
      } else {
        const acc = await ApiClient.exchangeInstagramCode(manualCode.trim());
        setSuccessMsg(`Successfully connected Instagram account: "${acc.name}"!`);
      }
      setShowCodeModal(null);
      setManualCode('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to exchange authorization code');
    } finally {
      setActionLoadingId(null);
    }
  };

  const youtubeAccounts = authStatus?.youtube.accounts || [];
  const instagramAccounts = authStatus?.instagram.accounts || [];
  const devConfig = authStatus?.developerConfig;

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Top Banner & Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/80 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/25">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Connected Creator Accounts
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Connect multiple YouTube channels and Instagram Professional accounts using standard OAuth.
              Tokens are stored AES-256-GCM encrypted on the backend and never exposed to the browser.
            </p>
          </div>

          {/* Action Connect Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleConnectYouTube}
              disabled={connectingPlatform === 'youtube'}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-600/25 transition-all active:scale-95 disabled:opacity-50"
            >
              <Youtube className="w-4 h-4" />
              <span>Connect YouTube</span>
              <Plus className="w-3.5 h-3.5 opacity-80" />
            </button>

            <button
              type="button"
              onClick={handleConnectInstagram}
              disabled={connectingPlatform === 'instagram'}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-pink-600/25 transition-all active:scale-95 disabled:opacity-50"
            >
              <Instagram className="w-4 h-4" />
              <span>Connect Instagram</span>
              <Plus className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mt-4 p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <div className="flex-1">{errorMsg}</div>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex-1">{successMsg}</div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Security Assurance Badge */}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-400 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/60">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero-Token Exposure Client Policy</span>
          </div>
          <span>•</span>
          <span>Google OAuth 2.0 (Offline Refresh Tokens)</span>
          <span>•</span>
          <span>Meta Long-Lived Token Auto-Renewal (60-day)</span>
        </div>
      </div>

      {/* SECTION 1: YouTube Channels */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center">
              <Youtube className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              YouTube Channels ({youtubeAccounts.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {youtubeAccounts.length > 0 ? 'Multiple channels supported' : 'No channels connected'}
          </span>
        </div>

        {youtubeAccounts.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-red-600/10 text-red-400 flex items-center justify-center mx-auto">
              <Youtube className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">No YouTube Channels Connected</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Connect your YouTube channel with Google OAuth to enable automated YouTube Shorts uploads with tags, descriptions, and custom categories.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleConnectYouTube}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
              >
                Connect YouTube Channel
              </button>
              <button
                type="button"
                onClick={() => setShowCodeModal('youtube')}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
              >
                Paste Auth Code
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {youtubeAccounts.map((account) => (
              <div
                key={account.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-xl space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3.5">
                    {account.avatarUrl ? (
                      <img
                        src={account.avatarUrl}
                        alt={account.name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-red-500/30"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-base">
                        {account.name.charAt(0)}
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-white truncate max-w-[180px]">
                          {account.name}
                        </h3>
                        {account.isDefault && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        {account.handle || `@channel_${account.platformAccountId.slice(-4)}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {account.hasAnalyticsScope ? (
                      <span className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Full Stats Active</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConnectYouTube}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1 transition-all"
                        title="Reconnect to grant yt-analytics.readonly"
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>Missing: {account.missingPermissions?.join(', ') || 'yt-analytics.readonly'} (Reconnect)</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 block">Channel ID:</span>
                    <span className="font-mono text-[11px] text-slate-300">{account.platformAccountId}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!account.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(account)}
                        disabled={actionLoadingId === account.id}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all border border-slate-700"
                      >
                        Set Default
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDisconnect(account)}
                      disabled={actionLoadingId === account.id}
                      className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 transition-all border border-red-800/40"
                      title="Disconnect YouTube Channel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Instagram Accounts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-pink-600/20 text-pink-400 flex items-center justify-center">
              <Instagram className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Instagram Professional Accounts ({instagramAccounts.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {instagramAccounts.length > 0 ? 'Multiple accounts supported' : 'No accounts connected'}
          </span>
        </div>

        {instagramAccounts.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-600/10 text-pink-400 flex items-center justify-center mx-auto">
              <Instagram className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">No Instagram Accounts Connected</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Connect your Instagram Professional (Creator / Business) account via Instagram Login for Reels publishing with custom audio and hashtags.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleConnectInstagram}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white text-xs font-bold transition-all shadow-md active:scale-95"
              >
                Connect Instagram Account
              </button>
              <button
                type="button"
                onClick={() => setShowCodeModal('instagram')}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
              >
                Paste Auth Code
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {instagramAccounts.map((account) => (
              <div
                key={account.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-xl space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3.5">
                    {account.avatarUrl ? (
                      <img
                        src={account.avatarUrl}
                        alt={account.name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-pink-500/30"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white font-bold flex items-center justify-center text-base">
                        {account.name.charAt(0)}
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-white truncate max-w-[180px]">
                          {account.name}
                        </h3>
                        {account.isDefault && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-pink-400 font-mono">
                        {account.handle || `@instagram_${account.platformAccountId.slice(-4)}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="flex flex-col items-end gap-1">
                      {account.hasAnalyticsScope ? (
                        <span className="text-[10px] px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20 font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Full Insights Active</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleConnectInstagram}
                          className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1 transition-all"
                          title="Reconnect to grant instagram_business_manage_insights"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <span>Missing: {account.missingPermissions?.join(', ') || 'insights'} (Reconnect)</span>
                        </button>
                      )}
                    </div>
                    {account.tokenDaysRemaining !== undefined && (
                      <div className="text-[10px] text-slate-400 block font-mono">
                        {account.tokenDaysRemaining}d remaining
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 block">Instagram ID:</span>
                    <span className="font-mono text-[11px] text-slate-300">{account.platformAccountId}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleRefreshInstagramToken(account)}
                      disabled={actionLoadingId === account.id}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all border border-slate-700 flex items-center space-x-1"
                      title="Extend token for 60 more days"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${actionLoadingId === account.id ? 'animate-spin' : ''}`} />
                      <span>Renew</span>
                    </button>

                    {!account.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(account)}
                        disabled={actionLoadingId === account.id}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all border border-slate-700"
                      >
                        Default
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDisconnect(account)}
                      disabled={actionLoadingId === account.id}
                      className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 transition-all border border-red-800/40"
                      title="Disconnect Instagram Account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: Developer App Credentials & Exact Redirect URIs */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Key className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">
              Developer App Configuration & Exact Redirect URIs
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800 font-mono">
            Standard Developer Setup
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          To enable 1-click in-app login, register these exact Authorized Redirect URIs in the{' '}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline inline-flex items-center gap-1 font-semibold"
          >
            Google Cloud Console <ExternalLink className="w-3 h-3" />
          </a>{' '}
          and{' '}
          <a
            href="https://developers.facebook.com/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-400 hover:underline inline-flex items-center gap-1 font-semibold"
          >
            Meta for Developers Portal <ExternalLink className="w-3 h-3" />
          </a>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Google URI Card */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Youtube className="w-3.5 h-3.5 text-red-500" />
                Google OAuth Redirect URI
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${devConfig?.googleConfigured ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                {devConfig?.googleConfigured ? 'GOOGLE_CLIENT_ID Active' : 'Missing Client ID'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-slate-200">
              <span className="truncate">{devConfig?.googleRedirectUri || 'https://.../api/auth/youtube/callback'}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(devConfig?.googleRedirectUri || '', 'google-uri')}
                className="p-1 rounded text-slate-400 hover:text-white"
                title="Copy Google Redirect URI"
              >
                {copiedField === 'google-uri' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Add under: <em>APIs & Services &gt; Credentials &gt; OAuth 2.0 Client IDs &gt; Authorized redirect URIs</em>
            </p>
          </div>

          {/* Meta URI Card */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5 text-pink-500" />
                Meta / Instagram Redirect URI
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${devConfig?.metaConfigured ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                {devConfig?.metaConfigured ? 'META_APP_ID Active' : 'Missing App ID'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-slate-200">
              <span className="truncate">{devConfig?.metaRedirectUri || 'https://.../api/auth/instagram/callback'}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(devConfig?.metaRedirectUri || '', 'meta-uri')}
                className="p-1 rounded text-slate-400 hover:text-white"
                title="Copy Meta Redirect URI"
              >
                {copiedField === 'meta-uri' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Add under: <em>Meta App &gt; Instagram API with Instagram Login &gt; Settings &gt; Valid OAuth Redirect URIs</em> (No Facebook Page or App Domains required)
            </p>
          </div>
        </div>
      </div>

      {/* Manual Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-slate-100 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Exchange {showCodeModal === 'youtube' ? 'YouTube' : 'Instagram'} Authorization Code
            </h3>
            <p className="text-xs text-slate-400">
              If your OAuth redirect URL returned a code in the browser URL bar (<code>?code=...</code>), paste the code here to finalize the connection.
            </p>

            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Paste 4/0A... authorization code"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCodeModal(null);
                  setManualCode('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualCodeSubmit}
                disabled={!manualCode.trim() || actionLoadingId === 'manual-exchange'}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white disabled:opacity-50"
              >
                {actionLoadingId === 'manual-exchange' ? 'Exchanging...' : 'Connect Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
