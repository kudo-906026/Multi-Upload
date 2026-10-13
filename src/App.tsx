import React, { useState, useEffect, useRef } from 'react';
import { Video, Flame, History, Users, Settings, Sparkles, Loader2 } from 'lucide-react';
import { Header } from './components/Header';
import { AuthScreen } from './components/AuthScreen';
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
  UserProfile,
  AIUsageQuota,
} from '@shared/types';
import { ApiClient } from './api';
import { getCurrentUser, signOutUser, getSupabase } from './supabase';

export const App: React.FC = () => {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [aiQuota, setAiQuota] = useState<AIUsageQuota | null>(null);

  // App navigation & data state
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

  // Initialize and check current user session
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const user = await getCurrentUser();
        if (isMounted) {
          if (user && user.email) {
            setCurrentUser({ id: user.id, email: user.email });
          } else {
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.error('Error verifying Supabase user session:', err);
      } finally {
        if (isMounted) setIsAuthChecking(false);
      }
    }

    checkAuth();

    // Listen to Supabase auth state changes
    getSupabase().then((client) => {
      if (!client || !isMounted) return;
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        if (!isMounted) return;
        if (session?.user && session.user.email) {
          setCurrentUser({ id: session.user.id, email: session.user.email });
        } else {
          setCurrentUser(null);
          setPresets([]);
          setJobs([]);
          setAuthStatus(null);
          setAiQuota(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    });

    return () => {
      isMounted = false;
    };
  }, []);

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

  // Load initial data for the authenticated user
  const loadInitialData = async () => {
    try {
      const [presetsData, jobsData, authData, quotaData] = await Promise.all([
        ApiClient.getPresets(),
        ApiClient.getJobs(),
        ApiClient.getAuthStatus(),
        ApiClient.getAIQuota().catch(() => null),
      ]);
      setPresets(presetsData);
      setJobs(jobsData);
      setAuthStatus(authData);
      if (quotaData) setAiQuota(quotaData);
    } catch (err: any) {
      console.error('Error loading initial app data:', err);
      // If 401, session has expired
      if (err.message && err.message.includes('401')) {
        handleLogout();
      }
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadInitialData();
    }
  }, [currentUser]);

  // Poll jobs when any job is in progress
  useEffect(() => {
    if (!currentUser) return;

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
  }, [jobs, currentUser]);

  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.warn('Logout notice:', err);
    }
    setCurrentUser(null);
    setPresets([]);
    setJobs([]);
    setAuthStatus(null);
    setAiQuota(null);
    setActiveTab('create');
  };

  const handleTogglePlatform = (platform: Platform) => {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  const handleAnalysisComplete = (result: AIAnalysisResult) => {
    setAiResult(result);
    // Refresh AI quota after analysis
    ApiClient.getAIQuota().then(setAiQuota).catch(() => {});
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
      const defaultYt = authStatus?.youtube.accounts?.find((a) => a.isDefault) || authStatus?.youtube.accounts?.[0];
      const defaultIg = authStatus?.instagram.accounts?.find((a) => a.isDefault) || authStatus?.instagram.accounts?.[0];

      const job = await ApiClient.publishJob({
        video: currentVideo,
        targetPlatforms: selectedPlatforms,
        selectedAccounts: {
          youtubeAccountId: payloads.selectedAccounts?.youtubeAccountId || defaultYt?.id,
          instagramAccountId: payloads.selectedAccounts?.instagramAccountId || defaultIg?.id,
        },
        youtubePayload: payloads.youtubePayload,
        instagramPayload: payloads.instagramPayload,
      });

      setJobs([job, ...jobs]);
      setActiveTab('queue');
    } catch (err: any) {
      alert(`Publishing failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // If initial auth verification is still checking
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-pink-600 to-amber-500 flex items-center justify-center shadow-xl shadow-indigo-500/20 mb-4 animate-bounce">
          <span className="text-xl">⚡</span>
        </div>
        <div className="flex items-center space-x-2 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Securing multi-user workspace...</span>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show modern AuthScreen
  if (!currentUser) {
    return (
      <AuthScreen
        onAuthSuccess={(user) => {
          setCurrentUser({ id: user.id, email: user.email });
        }}
      />
    );
  }

  const activeJobsCount = jobs.filter(
    (j) => j.overallStatus === 'in_progress' || j.overallStatus === 'queued'
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Header Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        authStatus={authStatus}
        activeJobsCount={activeJobsCount}
        user={currentUser}
        aiQuota={aiQuota}
        onRefreshAuth={loadInitialData}
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
        onLogout={handleLogout}
        isPwaInstallable={Boolean(deferredPrompt)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
        {/* TAB 1: Studio (Video Upload, Formatting & Publishing Flow) */}
        {activeTab === 'create' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Step 1: Video Upload */}
            <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-xs flex items-center justify-center text-white">1</span>
                    <span>Upload Video</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    Upload your video file (up to 1GB). Automatically stored in your private folder.
                  </p>
                </div>
              </div>
              <VideoUploader
                currentVideo={currentVideo}
                onVideoUploaded={(video) => setCurrentVideo(video)}
                onClearVideo={() => {
                  setCurrentVideo(null);
                  setAiResult(null);
                }}
                selectedPlatforms={selectedPlatforms}
                onTogglePlatform={handleTogglePlatform}
                authStatus={authStatus}
                onOpenAccounts={() => setActiveTab('accounts')}
              />
            </section>

            {/* Step 2: Aspect Ratio & Trimming */}
            {currentVideo && (
              <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-xs flex items-center justify-center text-white">2</span>
                      <span>Format & Trim for Platforms</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                      Optimize aspect ratio (9:16 Shorts/Reels, 1:1, 4:5, 16:9) with intelligent blur or crop.
                    </p>
                  </div>
                </div>
                <VideoFormatStep
                  video={currentVideo}
                  selectedPlatforms={selectedPlatforms}
                  onFormatApplied={(formattedVideo) => setCurrentVideo(formattedVideo)}
                />
              </section>
            )}

            {/* Step 3: AI Trend Research & Metadata Optimization */}
            {currentVideo && (
              <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-xs flex items-center justify-center text-white">3</span>
                      <span>AI Trend Analysis & Search Grounding</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                      Discover real-time search trends and craft viral titles, hashtags, and descriptions.
                    </p>
                  </div>
                  {aiQuota && (
                    <div className="text-xs text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 px-2.5 py-1 rounded-lg hidden sm:flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{aiQuota.remainingAnalyses} analyses left today</span>
                    </div>
                  )}
                </div>
                <AIAnalysisCard
                  video={currentVideo}
                  analysisResult={aiResult}
                  trendContext={trendContext}
                  onAnalysisComplete={handleAnalysisComplete}
                />
              </section>
            )}

            {/* Step 4: Metadata Review & Multi-Platform Publish */}
            {currentVideo && aiResult && (
              <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-xs flex items-center justify-center text-white">4</span>
                      <span>Review & Publish</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                      Preview platform mockups, refine keywords, and publish simultaneously to YouTube & Instagram.
                    </p>
                  </div>
                </div>
                <MetadataReview
                  selectedPlatforms={selectedPlatforms}
                  aiResult={aiResult}
                  presets={presets}
                  authStatus={authStatus}
                  onOpenAccounts={() => setActiveTab('accounts')}
                  trendContext={trendContext}
                  onPublish={handlePublish}
                  isPublishing={isPublishing}
                />
              </section>
            )}
          </div>
        )}

        {/* TAB 2: Trend Finder */}
        {activeTab === 'trends' && (
          <TrendsView
            onUseTrendInStudio={(topic, hashtags) => {
              setTrendContext({ topic, hashtags });
              setActiveTab('create');
            }}
          />
        )}

        {/* TAB 3: Presets Manager */}
        {activeTab === 'presets' && (
          <PresetsManager
            presets={presets}
            onPresetsUpdated={(newPresets) => setPresets(newPresets)}
          />
        )}

        {/* TAB 4: Queue & Publishing History */}
        {activeTab === 'queue' && (
          <JobQueueView
            jobs={jobs}
            onRefreshJobs={async () => {
              const updated = await ApiClient.getJobs();
              setJobs(updated);
            }}
          />
        )}

        {/* TAB 5: Connected Accounts Management */}
        {activeTab === 'accounts' && (
          <AccountsView
            authStatus={authStatus}
            onRefresh={loadInitialData}
          />
        )}

        {/* TAB 6: Settings Modal (Rendered inline when tab is selected) */}
        {activeTab === 'settings' && (
          <PlatformSettingsModal
            authStatus={authStatus}
            onRefreshAuth={loadInitialData}
          />
        )}
      </main>

      {/* Mobile Floating Bottom Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-lg flex items-center justify-around py-1.5 px-2">
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

        {/* Trends Tab */}
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
