import React, { useState } from 'react';
import {
  X,
  Download,
  Smartphone,
  Monitor,
  Github,
  Terminal,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Layers,
  PackageCheck,
} from 'lucide-react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallPwa: () => void;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallPwa,
}) => {
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [activeTab, setActiveTab] = useState<'apk' | 'pwa' | 'github' | 'docker'>('apk');

  if (!isOpen) return null;

  const dockerCommand = `docker run -d -p 8080:8080 -e GEMINI_API_KEY="your_api_key" ghcr.io/malakardilip170/omnipost-video:latest`;

  const copyDockerCommand = () => {
    navigator.clipboard.writeText(dockerCommand);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Download & Install OmniPost App
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  Capacitor Android Native
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Native Android APK, standalone packages, and PWA options.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'apk'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <PackageCheck className="w-4 h-4 text-emerald-300" />
            <span>Android APK (Native)</span>
          </button>

          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'pwa'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>PWA Install</span>
          </button>

          <button
            onClick={() => setActiveTab('github')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'github'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Github className="w-4 h-4" />
            <span>Release Archive</span>
          </button>

          <button
            onClick={() => setActiveTab('docker')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'docker'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Self-Host</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-6">
          {/* TAB 0: Native Android APK */}
          {activeTab === 'apk' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <PackageCheck className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-sm text-white">Native Android APK Build</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-semibold">
                    Capacitor Native Engine
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  The application is configured as a native Android project using <strong>Capacitor</strong>. Our automated GitHub Actions workflow (<code className="text-emerald-400 font-mono">.github/workflows/build-android-apk.yml</code>) builds the debug APK automatically on every push!
                </p>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="font-semibold text-white flex items-center justify-between">
                    <span>Download Options:</span>
                    <span className="text-[11px] text-slate-400 font-mono">com.omnipost.video</span>
                  </div>
                  <ul className="text-slate-400 space-y-1 text-[11px] list-disc list-inside">
                    <li><strong>GitHub Actions Artifacts:</strong> Download <code className="text-slate-200">omnipost-video-latest.apk</code> from the latest run under the <strong>Actions</strong> tab.</li>
                    <li><strong>GitHub Releases:</strong> Download the pre-built APK directly from the <strong>Releases</strong> section.</li>
                    <li><strong>Local Build:</strong> Run <code className="text-emerald-400">npm run cap:build</code> to build with your local Android SDK.</li>
                  </ul>
                </div>

                <div className="pt-1">
                  <a
                    href="https://github.com/malakardilip170"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 active:scale-95"
                  >
                    <Github className="w-4 h-4" />
                    <span>View GitHub Repo & Download APK Artifact</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: PWA Native App */}
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-950/30 border border-indigo-800/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5 justify-center sm:justify-start">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    One-Tap Install (Standalone Mobile & Desktop App)
                  </h4>
                  <p className="text-xs text-slate-300">
                    Runs with standalone windowing, home screen icon, and zero browser address bar distractions.
                  </p>
                </div>

                {deferredPrompt ? (
                  <button
                    onClick={onInstallPwa}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 hover:opacity-95 text-white text-xs font-extrabold shadow-lg shadow-indigo-600/30 whitespace-nowrap active:scale-95"
                  >
                    Install App Now
                  </button>
                ) : (
                  <div className="text-[11px] text-slate-400 font-mono bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
                    Ready to Add
                  </div>
                )}
              </div>

              {/* Instructions for iOS & Android / Chrome */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-white flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-pink-400" />
                    <span>iOS / Safari Installation</span>
                  </div>
                  <ol className="text-slate-400 space-y-1.5 list-decimal list-inside text-[11px]">
                    <li>Tap the <strong>Share</strong> button (box with upward arrow).</li>
                    <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                    <li>Tap <strong>Add</strong> in the top-right corner.</li>
                  </ol>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-white flex items-center space-x-2">
                    <Monitor className="w-4 h-4 text-indigo-400" />
                    <span>Android / Chrome Desktop</span>
                  </div>
                  <ol className="text-slate-400 space-y-1.5 list-decimal list-inside text-[11px]">
                    <li>Tap the <strong>Three dots (⋮)</strong> menu in Chrome.</li>
                    <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                    <li>Launch instantly from your phone app drawer or dock.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GitHub Releases */}
          {activeTab === 'github' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Github className="w-5 h-5 text-white" />
                    <span className="font-bold text-sm text-white">GitHub Automated Releases</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                    GitHub Actions CI/CD
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Every version tag (e.g. <code className="text-amber-400">v1.0.0</code>) triggers our automated GitHub Release workflow which builds, tests, and attaches standalone production packages and APKs.
                </p>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span className="font-mono text-white">omnipost-video-v1.0.0-standalone.tar.gz</span>
                    </div>
                    <span className="text-slate-400 text-[11px]">Production Bundle</span>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <a
                    href="/api/download/app"
                    download="omnipost-video-v1.0.0-standalone.tar.gz"
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white text-xs font-extrabold transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download App Release Package (.tar.gz)</span>
                  </a>

                  <a
                    href="https://github.com/malakardilip170"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center justify-center space-x-2 border border-slate-700"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View GitHub Releases & Repository</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Docker & Container */}
          {activeTab === 'docker' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Run the fully packaged application anywhere with Docker with a single command:
              </p>

              <div className="relative">
                <pre className="bg-black/90 p-4 rounded-xl border border-slate-800 text-xs font-mono text-indigo-300 overflow-x-auto leading-relaxed">
                  {dockerCommand}
                </pre>

                <button
                  onClick={copyDockerCommand}
                  className="absolute right-3 top-3 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1.5 transition-colors border border-slate-700"
                >
                  {copiedCommand ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Cloud Run / VPS Ready</span>
                </div>
                <p className="text-[11px]">
                  Includes built-in multi-stage Dockerfile, docker-compose.yml, and automated Cloud Run deployment workflow.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
