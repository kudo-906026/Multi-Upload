import React, { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
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

  const handleLoadSampleVideo = () => {
    const sampleVideo: VideoMetadata = {
      id: 'demo-sample-01',
      originalName: 'epic_creator_behind_the_scenes.mp4',
      size: 14850000,
      mimeType: 'video/mp4',
      publicUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      storagePath: 'sample.mp4',
      durationSec: 15,
      width: 1080,
      height: 1920,
    };
    setCurrentVideo(sampleVideo);

    const sampleAnalysis: AIAnalysisResult = {
      topic: 'Cinematic Behind The Scenes Creation',
      detectedTone: 'High Energy & Viral',
      keyInsights: [
        'High engagement potential in visual storytelling and quick transitions',
        'Audience retention peaks when the hook delivers within the first 2.5 seconds',
        'Search volume for creator tutorials is currently elevated (+48% this week)',
      ],
      groundedTrends: [
        {
          query: 'trending creator behind the scenes 2026',
          trendingKeywords: ['#behindthescenes', '#creatorspotlight', '#viraltrends', '#cinematic'],
          contextNote: 'Discovered spike in mobile search interest and short-form video engagement',
        },
        {
          query: 'high retention hooks for vertical video',
          trendingKeywords: ['#reelsviral', '#youtubeshorts', '#filmmaking', '#trendingreels'],
          contextNote: 'Algorithm currently favoring content under 45 seconds with strong initial audio hook',
        },
      ],
      youtube: {
        title: 'How We Shot This EPIC Creator Moment in 60s! #Shorts',
        description: 'Here is the step-by-step breakdown of how we produced this shot!\n\n👇 Drop your questions in the comments below\n🔔 Subscribe for daily creator breakdowns!\n\n#Shorts #Creator #Viral #Filmmaking #Trending',
        tags: ['creator behind the scenes', 'cinematic tutorial', 'shorts', 'viral shorts', 'trending now'],
        hashtags: ['#Shorts', '#Creator', '#Viral', '#Trending'],
        categoryId: '28',
        categoryName: 'Science & Technology',
      },
      instagram: {
        hookSentence: 'Stop scrolling! You won’t believe the setup behind this shot 👀',
        caption: 'Wait until the end... ✨ Here is the exact lighting and camera trick we used.\n\nSave this for your next video shoot! 🚀\n.\n.\nWhat do you think? Let me know below! 👇',
        hashtags: ['#behindthescenes', '#reels', '#reelsinstagram', '#explorepage', '#trendingreels', '#filmmaker', '#viralreels'],
        recommendedAudio: 'Trending Synthwave Groove (118 BPM)',
      },
      predictedGrowth: [
        { day: 1, label: 'Day 1', youtubeViews: 2400, instagramViews: 4100, searchInterest: 52 },
        { day: 2, label: 'Day 2', youtubeViews: 7800, instagramViews: 11500, searchInterest: 78 },
        { day: 3, label: 'Day 3', youtubeViews: 21500, instagramViews: 26800, searchInterest: 96 },
        { day: 5, label: 'Day 5', youtubeViews: 38200, instagramViews: 39400, searchInterest: 85 },
        { day: 7, label: 'Day 7', youtubeViews: 51600, instagramViews: 48900, searchInterest: 74 },
        { day: 14, label: 'Day 14', youtubeViews: 72400, instagramViews: 61200, searchInterest: 64 },
        { day: 30, label: 'Day 30', youtubeViews: 98500, instagramViews: 74600, searchInterest: 58 },
      ],
      analyzedAt: new Date().toISOString(),
    };
    setAiResult(sampleAnalysis);
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
          <div className="space-y-6 animate-fade-in">
            {/* Quick Demo Exploration Banner */}
            {!currentVideo && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-purple-950/50 to-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center space-x-3.5 text-center sm:text-left">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
                    <Sparkles className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
                      Instant Live Preview Mode
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                        Ready
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300">
                      Explore the D3.js trend growth curves, Gemini grounding, and YouTube/Instagram phone mockups without uploading a file.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLoadSampleVideo}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white text-xs font-extrabold shadow-lg shadow-indigo-600/30 whitespace-nowrap active:scale-95 transition-all"
                >
                  🎬 Load Demo Video & AI Trends
                </button>
              </div>
            )}

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
              onLoadSampleVideo={handleLoadSampleVideo}
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
