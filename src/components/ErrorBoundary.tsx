import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ShieldAlert, Key, Sparkles, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isClearing: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isClearing: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      isClearing: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[OmniPost ErrorBoundary Caught Fatal Error]:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReload = async () => {
    this.setState({ isClearing: true });
    try {
      // 1. Delete all Service Worker CacheStorage caches
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
        console.log('[ErrorBoundary] Wiped', cacheKeys.length, 'caches from CacheStorage.');
      }

      // 2. Unregister all active Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
        console.log('[ErrorBoundary] Unregistered', registrations.length, 'Service Workers.');
      }

      // 3. Clear storage
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('[ErrorBoundary] Cache clearing notice:', e);
    }

    // 4. Force hard reload from server, busting any residual browser memory cache
    const cleanUrl = window.location.origin + window.location.pathname + '?reload=' + Date.now();
    window.location.replace(cleanUrl);
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || 'An unexpected application load error occurred.';
      const isChunkOrDeployError =
        errorMessage.toLowerCase().includes('dynamically imported module') ||
        errorMessage.toLowerCase().includes('chunk') ||
        errorMessage.toLowerCase().includes('failed to fetch') ||
        errorMessage.toLowerCase().includes('loading chunk') ||
        errorMessage.toLowerCase().includes('mime type') ||
        errorMessage.toLowerCase().includes('syntaxerror') ||
        errorMessage.toLowerCase().includes('script error');

      const isConfigError =
        errorMessage.toLowerCase().includes('config') ||
        errorMessage.toLowerCase().includes('supabase') ||
        errorMessage.toLowerCase().includes('environment') ||
        errorMessage.toLowerCase().includes('key');

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 selection:bg-indigo-500 selection:text-white">
          <div className="max-w-xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
            {/* Header Icon */}
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {isChunkOrDeployError ? 'New Version Detected' : 'Application Load Notice'}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isChunkOrDeployError
                    ? 'A recent deployment updated files that conflicted with cached resources.'
                    : 'The application caught an unexpected error and prevented a blank screen.'}
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-4 text-xs space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Detected Issue</span>
              </div>
              <p className="text-amber-200 font-mono break-words leading-relaxed text-xs sm:text-sm">
                {errorMessage}
              </p>
            </div>

            {/* Helpful instructions for Chunk / Cache conflicts */}
            {isChunkOrDeployError && (
              <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-2xl p-4 text-xs space-y-2 text-indigo-200">
                <div className="flex items-center space-x-1.5 font-semibold text-indigo-300">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Stale Cache Recovery</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  The Service Worker was holding onto an older version of the app. Clicking{' '}
                  <strong className="text-white">Clear cache and reload</strong> below will instantly wipe the old
                  cache and download the latest application build.
                </p>
              </div>
            )}

            {/* Helpful instructions for configuration issues */}
            {isConfigError && (
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 text-xs space-y-2 text-slate-300">
                <div className="flex items-center space-x-1.5 font-semibold text-indigo-400">
                  <Key className="w-3.5 h-3.5" />
                  <span>How to resolve on Render / Host</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                  <li>
                    Open your <strong className="text-white">Render Dashboard</strong> &rarr; Web Service &rarr;{' '}
                    <strong className="text-white">Environment</strong>.
                  </li>
                  <li>
                    Ensure <strong className="text-white">SUPABASE_URL</strong> and{' '}
                    <strong className="text-white">SUPABASE_ANON_KEY</strong> are provided.
                  </li>
                  <li>Save changes and allow Render 30–60 seconds to restart the service.</li>
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleClearAndReload}
                disabled={this.state.isClearing}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2"
              >
                {this.state.isClearing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{this.state.isClearing ? 'Clearing cache & reloading...' : 'Clear cache and reload'}</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="py-3 px-4 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload</span>
              </button>
            </div>

            {/* Technical Stack (Collapsible) */}
            {this.state.error?.stack && (
              <details className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                <summary className="cursor-pointer hover:text-slate-400 transition-colors select-none">
                  View Technical Stack Trace
                </summary>
                <pre className="mt-2 p-3 bg-black/60 rounded-xl overflow-x-auto text-[10px] font-mono text-slate-400 leading-normal border border-slate-800/60 max-h-40">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
