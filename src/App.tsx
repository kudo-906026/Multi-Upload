import React, { useState, useEffect, useRef } from 'react';
import { Video, Flame, History, Users, Settings, Sparkles, Loader2, AlertTriangle, RefreshCw, Key, CheckCircle2, X } from 'lucide-react';
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
import { AnalyticsView } from './components/AnalyticsView';
import { ContentPlannerView } from './components/ContentPlannerView';
import { DownloadAppModal } from './components/DownloadAppModal';
import { BottomTabBar, TabId } from './components/BottomTabBar';
import { UpdateNotification } from './components/UpdateNotification';
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
  ContentIdea,
} from '@shared/types';
import { ApiClient } from './api';
import {
  getCurrentUser,
  signOutUser,
  getSupabase,
  loadRuntimeConfig,
  resetConfigState,
} from './supabase';

export const App: React.FC = () => {
  // Authentication & Configuration state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [aiQuota, setAiQuota] = useState<AIUsageQuota | null>(null);

  // App navigation & data state
  const [activeTab, setActiveTab] = useState<TabId>('create');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['youtube', 'instagram']);
  const [currentVideo, setCurrentVideo] = useState<VideoMetadata | null>(null);
  const [trendContext, setTrendContext] = useState<{
    topic: string;
    hashtags: string[];
    title?: string;
    keywords?: string[];
    scheduledSlot?: { date: string; time: string; timeZone: string; title?: string };
  } | null>(null);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [presets, setPresets] = useState<PlatformPreset[]>([]);
  const [jobs, setJobs] = useState<PublishJob[]>([]);
  const [authStatus, setAuthStatus] = useState<PlatformAuthStatus | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // OAuth Feedback Notice (surfaces real Google or Meta error messages / missing permission notices)
  const [oauthNotice, setOauthNotice] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    missingPermissions?: string[];
    platform?: 'youtube' | 'instagram';
  } | null>(null);

  // Download & PWA Modal state
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const initAuth = async () => {
    setIsAuthChecking(true);
    setConfigError(null);

    try {
      const { client, error } = await loadRuntimeConfig();
      if (error || !client) {
        setConfigError(error || 'Config missing: SUPABASE_ANON_KEY');
        setIsAuthChecking(false);
        return;
      }

      const user = await getCurrentUser();
      if (user && user.email) {
        setCurrentUser({ id: user.id, email: user.email });
      } else {
        setCurrentUser(null);
      }
    } catch (err: any) {
      console.error('[AppInit Error]:', err);
      setConfigError(err.message || 'Config initialization error');
    } finally {
      setIsAuthChecking(false);
    }
  };

  // Initialize runtime config and check current user session
  useEffect(() => {
    let isMounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    async function bootstrap() {
      setIsAuthChecking(true);
      setConfigError(null);

      try {
        const { client, error } = await loadRuntimeConfig();
        if (!isMounted) return;

        if (error || !client) {
          setConfigError(error || 'Config missing: SUPABASE_ANON_KEY');
          setIsAuthChecking(false);
          return;
        }

        const user = await getCurrentUser();
        if (!isMounted) return;

        if (user && user.email) {
          setCurrentUser({ id: user.id, email: user.email });
        } else {
          setCurrentUser(null);
        }

        // Listen to Supabase auth state changes
        const { data } = client.auth.onAuthStateChange((_event, session) => {
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
        authSubscription = data.subscription;
      } catch (err: any) {
        console.error('[AppInit Fatal]:', err);
        if (isMounted) {
          setConfigError(err.message || 'Failed to initialize app configuration');
        }
      } finally {
        if (isMounted) setIsAuthChecking(false);
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const handleRetryConfig = () => {
    resetConfigState();
    initAuth();
  };

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

  // Handle OAuth callback parameters (error messages, connected notices, and missing permissions)
  useEffect(() => {
    if (!currentUser) return;

    try {
      const searchParams = new URLSearchParams(window.location.search);
      const authError = searchParams.get('auth_error');
      const connected = searchParams.get('connected');
      const missing = searchParams.get('missing');
      const platformParam = (searchParams.get('platform') as 'youtube' | 'instagram') || undefined;

      if (authError) {
        setOauthNotice({
          type: 'error',
          message: decodeURIComponent(authError),
          platform: platformParam,
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (connected) {
        const platformName = connected === 'youtube' ? 'YouTube' : 'Instagram';
        if (missing) {
          const missingList = decodeURIComponent(missing).split(',').filter(Boolean);
          setOauthNotice({
            type: 'warning',
            message: `${platformName} connected successfully, but missing required permissions: ${missingList.join(', ')}. Full analytics requires all requested permissions.`,
            missingPermissions: missingList,
            platform: connected as 'youtube' | 'instagram',
          });
        } else {
          setOauthNotice({
            type: 'success',
            message: `Successfully connected ${platformName} channel with full analytics permissions!`,
            platform: connected as 'youtube' | 'instagram',
          });
        }
        window.history.replaceState({}, document.title, window.location.pathname);
        loadInitialData();
      }
    } catch (e) {
      console.warn('OAuth URL param parsing notice:', e);
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
    isScheduled?: boolean;
    scheduledPublishTime?: string;
    scheduledTimeZone?: string;
    youtubeScheduledPublishTime?: string;
    youtubeScheduledTimeZone?: string;
    instagramScheduledPublishTime?: string;
    instagramScheduledTimeZone?: string;
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
        isScheduled: payloads.isScheduled,
        scheduledPublishTime: payloads.scheduledPublishTime,
        scheduledTimeZone: payloads.scheduledTimeZone,
        youtubeScheduledPublishTime: payloads.youtubeScheduledPublishTime,
        youtubeScheduledTimeZone: payloads.youtubeScheduledTimeZone,
        instagramScheduledPublishTime: payloads.instagramScheduledPublishTime,
        instagramScheduledTimeZone: payloads.instagramScheduledTimeZone,
      });

      if (job) {
        setJobs([job, ...jobs]);
      }
      setActiveTab('queue');
    } catch (err: any) {
      console.error('[Publishing failed]:', err);
      throw err;
    } finally {
      setIsPublishing(false);
    }
  };

  // If configuration is missing or invalid, display visible warning card instead of blank screen
  if (configError) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-indigo-500 selection:text-white">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Configuration Required</h1>
              <p className="text-xs text-slate-400 mt-0.5">Missing environment variable</p>
            </div>
          </div>

          <div className="p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs space-y-1">
            <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Status</div>
            <div className="font-mono text-amber-200 text-xs sm:text-sm font-semibold break-words">
              {configError}
            </div>
          </div>

          <div className="text-xs text-slate-300 space-y-2 bg-slate-950/80 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center space-x-1.5 font-semibold text-indigo-400">
              <Key className="w-3.5 h-3.5" />
              <span>How to fix in Render</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Open your <strong>Render Dashboard</strong> &rarr; Web Service &rarr; <strong>Environment</strong>. Ensure <strong>SUPABASE_URL</strong> and <strong>SUPABASE_ANON_KEY</strong> (or your <strong>omnipost</strong> group) are linked.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRetryConfig}
            className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Check Configuration Again</span>
          </button>
        </div>
      </div>
    );
  }

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
      {/* PWA / Service Worker Update Available Notification Banner */}
      <UpdateNotification />

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
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8 pb-24 sm:pb-8">
        {/* Real OAuth Status / Error Feedback Banner */}
        {oauthNotice && (
          <div
            className={`p-4 rounded-2xl border shadow-xl flex items-start justify-between gap-3 animate-fade-in ${
              oauthNotice.type === 'error'
                ? 'bg-red-950/80 border-red-800 text-red-200'
                : oauthNotice.type === 'warning'
                ? 'bg-amber-950/80 border-amber-800 text-amber-200'
                : 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                  oauthNotice.type === 'error'
                    ? 'bg-red-500/20 text-red-400'
                    : oauthNotice.type === 'warning'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {oauthNotice.type === 'error' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : oauthNotice.type === 'warning' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    {oauthNotice.type === 'error'
                      ? 'OAuth Authorization Notice'
                      : oauthNotice.type === 'warning'
                      ? 'Missing Permissions Detected'
                      : 'Account Connected'}
                  </h3>
                  {oauthNotice.missingPermissions && oauthNotice.missingPermissions.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                      Missing: {oauthNotice.missingPermissions.join(', ')}
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-slate-200 font-medium">
                  {oauthNotice.message}
                </p>
                {oauthNotice.type === 'warning' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('accounts')}
                    className="text-[11px] font-bold text-amber-300 hover:text-amber-200 underline mt-1 inline-block"
                  >
                    Go to Accounts to Reconnect &rarr;
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOauthNotice(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
              title="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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
                  onTogglePlatform={handleTogglePlatform}
                  aiResult={aiResult}
                  video={currentVideo}
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
            onUseTrendInStudio={(topic, hashtags, title, keywords) => {
              setTrendContext({ topic, hashtags, title, keywords });
              setActiveTab('create');
            }}
          />
        )}

        {/* TAB 3: Analytics & Best Time to Post */}
        {activeTab === 'analytics' && (
          <AnalyticsView
            authStatus={authStatus}
            onNavigateToStudioWithSlot={(slot) => {
              setTrendContext({
                topic: slot.title || 'Scheduled Post',
                title: slot.title,
                hashtags: ['#viral', '#shorts', '#reels'],
                scheduledSlot: slot,
              });
              setActiveTab('create');
            }}
            onOpenAccounts={() => setActiveTab('accounts')}
          />
        )}

        {/* TAB 4: Content Planner (What to upload next) */}
        {activeTab === 'planner' && (
          <ContentPlannerView
            onOpenDraftInStudio={(idea) => {
              setTrendContext({
                topic: idea.character ? `${idea.character} Edit` : idea.title,
                title: idea.title,
                hashtags: idea.hashtags,
                keywords: idea.character ? [idea.character, idea.editStyle || 'edit'].filter(Boolean) : undefined,
                scheduledSlot: {
                  date: idea.suggestedSlot.date,
                  time: idea.suggestedSlot.time,
                  timeZone: idea.suggestedSlot.timeZone || 'UTC',
                  title: idea.title,
                },
              });
              setActiveTab('create');
            }}
            onOpenScheduleSlotInStudio={(slot) => {
              setTrendContext({
                topic: slot.title,
                title: slot.title,
                hashtags: ['#viral', '#shorts', '#reels'],
                scheduledSlot: slot,
              });
              setActiveTab('create');
            }}
          />
        )}

        {/* TAB 5: Presets Manager */}
        {activeTab === 'presets' && (
          <PresetsManager
            presets={presets}
            onPresetsUpdated={(newPresets) => setPresets(newPresets)}
            onBackToStudio={() => setActiveTab('create')}
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

      {/* Modern Mobile Bottom Tab Bar (Studio, Trends, Queue, Accounts) */}
      <BottomTabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeJobsCount={activeJobsCount}
        authStatus={authStatus}
      />

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
