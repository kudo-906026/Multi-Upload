import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { VideoUploader } from './components/VideoUploader';
import { AIAnalysisCard } from './components/AIAnalysisCard';
import { MetadataReview } from './components/MetadataReview';
import { PresetsManager } from './components/PresetsManager';
import { JobQueueView } from './components/JobQueueView';
import { PlatformSettingsModal } from './components/PlatformSettingsModal';
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
  const [activeTab, setActiveTab] = useState<'create' | 'presets' | 'queue' | 'settings'>('create');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['youtube', 'instagram']);
  const [currentVideo, setCurrentVideo] = useState<VideoMetadata | null>(null);
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
  }) => {
    if (!currentVideo) return;
    setIsPublishing(true);

    try {
      const newJob = await ApiClient.publishJob({
        video: currentVideo,
        targetPlatforms: selectedPlatforms,
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'create' && (
          <div className="space-y-8 animate-fade-in">
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
            />

            {/* Step 2: Gemini AI Analysis with Search Grounding */}
            {currentVideo && (
              <AIAnalysisCard
                video={currentVideo}
                onAnalysisComplete={(result) => setAiResult(result)}
                analysisResult={aiResult}
              />
            )}

            {/* Step 3: Review, Edit & Publish */}
            {currentVideo && (
              <MetadataReview
                selectedPlatforms={selectedPlatforms}
                aiResult={aiResult}
                onPublish={handlePublish}
                isPublishing={isPublishing}
                presets={presets}
              />
            )}
          </div>
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

      {/* Download / Install App Modal */}
      <DownloadAppModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallPwa={handleInstallPwa}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-black/40 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>OmniPost Video &copy; 2026 • Powered by Gemini AI & Google Search Grounding</span>
          <span>YouTube Data API v3 • Meta Instagram Graph API</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
