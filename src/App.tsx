import React, { useState, useEffect, useRef } from 'react';
import { Video, Flame, History, Users, Settings } from 'lucide-react';
import { Header } from './components/Header';
import { VideoUploader } from './components/VideoUploader';
import { VideoFormatStep } from './components/VideoFormatStep';
import { TrendsView } from './components/TrendsView';
import { AIAnalysisCard } from './components/AIAnalysisCard';
import { MetadataReview } from './components/MetadataReview';
import { PresetsManager } from './components/PresetsManager';
import { JobQueueView } from './components/JobQueueView';
import { PlatformSettingsModal } from './components/PlatformSettingsModal';
import { AccountsView } from './components/AccountsView';
import { DownloadAppModal } from './components/DownloadAppModal';
import {
  Platform,
  VideoMetadata,
  AIAnalysisResult,
  PlatformPreset,
  PublishJob,
  PlatformAuthStatus,
  YouTubePublishPayload,
  InstagramPublishPayload,
} from '@shared/types';
import { ApiClient } from './api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'trends' | 'presets' | 'queue' | 'accounts' | 'settings'>('create');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['youtube', 'instagram']);
  const [currentVideo, setCurrentVideo] = useState<VideoMetadata | null>(null);
  const [trendContext, setTrendContext] = useState<{ topic: string; hashtags: string[] } | null>(null);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [presets, setPresets] = useState<PlatformPreset[]>([]);
  const [jobs, setJobs] = useState<PublishJob[]>([]);
  const [authStatus, setAuthStatus] = useState<PlatformAuthStatus | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Download & PWA Modal state
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Capture beforeinstallprompt for PWA native install
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
      }
      setDeferredPrompt(null);
    }
  };

  // Load initial data
  const loadInitialData = async () => {
    try {
      const [presetsData, jobsData, authData] = await Promise.all([
        ApiClient.getPresets(),
        ApiClient.getJobs(),
        ApiClient.getAuthStatus(),
      ]);
      setPresets(presetsData);
      setJobs(jobsData);
      setAuthStatus(authData);
    } catch (err) {
      console.error('Error loading initial app data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Poll jobs when any job is in progress
  useEffect(() => {
    const hasActiveJobs = jobs.some(
      (j) => j.overallStatus === 'in_progress' || j.overallStatus === 'queued'
    );

    if (hasActiveJobs) {
      pollingRef.current = setInterval(async () => {
        try {
          const updatedJobs = await ApiClient.getJobs();
          setJobs(updatedJobs);
        } catch (err) {
          console.error('Job polling error:', err);
        }
      }, 2500);
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [jobs]);

  const handleTogglePlatform = (platform: Platform) => {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  const handlePublish = async (payloads: {
    youtubePayload?: YouTubePublishPayload;
    instagramPayload?: InstagramPublishPayload;
    selectedAccounts?: {
      youtubeAccountId?: string;
      instagramAccountId?: string;
    };
  }) => {
    if (!currentVideo) return;
    setIsPublishing(true);

    try {
      const newJob = await ApiClient.publishJob({
        video: currentVideo,
        targetPlatforms: selectedPlatforms,
        selectedAccounts: payloads.selectedAccounts,
        youtubePayload: payloads.youtubePayload,
        instagramPayload: payloads.instagramPayload,
      });

      setJobs([newJob, ...jobs]);
      // Switch to Queue tab to see real-time progress
      setActiveTab('queue');
    } catch (err: any) {
      alert(`Publish failed: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const activeJobsCount = jobs.filter(
    (j) => j.overallStatus === 'in_progress' || j.overallStatus === 'queued'
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden w-full max-w-full">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        authStatus={authStatus}
        activeJobsCount={activeJobsCount}
        onRefreshAuth={loadInitialData}
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
        isPwaInstallable={Boolean(deferredPrompt)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-8 pb-20 sm:pb-8 space-y-6 sm:space-y-8">
        {activeTab === 'create' && (
          <div className="space-y-6 sm:space-y-8 animate-fade-in w-full max-w-full">
            {/* Step 1: Video Uploader & Platform Choice */}
            <VideoUploader
              onVideoUploaded={(video) => setCurrentVideo(video)}
              selectedPlatforms={selectedPlatforms}
              onTogglePlatform={handleTogglePlatform}
              currentVideo={currentVideo}
              onClearVideo={() => {
                setCurrentVideo(null);
                setAiResult(null);
              }}
              authStatus={authStatus}
              onOpenAccounts={() => setActiveTab('accounts')}
            />

            {/* Step 2: Aspect Ratio Adjuster & Trimmer */}
            {currentVideo && (
              <VideoFormatStep
                video={currentVideo}
                selectedPlatforms={selectedPlatforms}
                onFormatApplied={(formattedVideo) => setCurrentVideo(formattedVideo)}
              />
            )}

            {/* Step 3: Gemini AI Analysis with Search Grounding */}
            {currentVideo && (
              <AIAnalysisCard
                video={currentVideo}
                onAnalysisComplete={(result) => setAiResult(result)}
                analysisResult={aiResult}
                trendContext={trendContext}
              />
            )}

            {/* Step 4: Review, Edit & Publish */}
            {currentVideo && (
              <MetadataReview
                selectedPlatforms={selectedPlatforms}
                aiResult={aiResult}
                onPublish={handlePublish}
                isPublishing={isPublishing}
                presets={presets}
                authStatus={authStatus}
                onOpenAccounts={() => setActiveTab('accounts')}
                trendContext={trendContext}
              />
            )}
          </div>
        )}

        {activeTab === 'trends' && (
          <TrendsView
            onUseTrendInStudio={(topic, hashtags) => {
              setTrendContext({ topic, hashtags });
              setActiveTab('create');
            }}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountsView
            authStatus={authStatus}
            onRefresh={loadInitialData}
          />
        )}

        {activeTab === 'presets' && (
          <PresetsManager
            presets={presets}
            onPresetsUpdated={(updated) => setPresets(updated)}
          />
        )}

        {activeTab === 'queue' && (
          <JobQueueView
            jobs={jobs}
            onRefreshJobs={async () => {
              const updated = await ApiClient.getJobs();
              setJobs(updated);
            }}
          />
        )}

        {activeTab === 'settings' && (
          <PlatformSettingsModal
            authStatus={authStatus}
            onRefreshAuth={loadInitialData}
          />
        )}
      </main>

      {/* Mobile Sticky Bottom Tab Bar (Visible under 640px) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around">
        {/* Studio Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
            activeTab === 'create' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Video className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Studio</span>
        </button>

        {/* Trends Tab (Separate bottom tab next to Studio) */}
        <button
          type="button"
          onClick={() => setActiveTab('trends')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
            activeTab === 'trends' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Trends</span>
        </button>

        {/* Queue Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`relative flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
            activeTab === 'queue' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Queue</span>
          {activeJobsCount > 0 && (
            <span className="absolute top-1 right-2 w-3.5 h-3.5 rounded-full bg-pink-500 text-white text-[8px] font-bold flex items-center justify-center">
              {activeJobsCount}
            </span>
          )}
        </button>

        {/* Accounts Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
            activeTab === 'accounts' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Accounts</span>
        </button>

        {/* Settings Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
            activeTab === 'settings' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Settings</span>
        </button>
      </nav>

      {/* Download / Install App Modal */}
      <DownloadAppModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallPwa={handleInstallPwa}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-black/40 py-6 text-center text-xs text-slate-500 mb-12 sm:mb-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>OmniPost Video &copy; 2026 • Powered by Gemini AI & Google Search Grounding</span>
          <span>YouTube Data API v3 • Meta Instagram Graph API</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
