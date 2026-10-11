import React, { useState, useEffect } from 'react';
import {
  Youtube,
  Instagram,
  Sparkles,
  Send,
  Eye,
  Sliders,
  Check,
  Plus,
  X,
  Globe,
  Lock,
  EyeOff,
  Heart,
  MessageCircle,
  Share2,
  Music,
} from 'lucide-react';
import {
  Platform,
  AIAnalysisResult,
  YouTubePublishPayload,
  InstagramPublishPayload,
  PrivacyStatus,
  PlatformPreset,
  PlatformAuthStatus,
  ConnectedAccount,
} from '@shared/types';
import { ApiClient } from '../api';

interface MetadataReviewProps {
  selectedPlatforms: Platform[];
  aiResult: AIAnalysisResult | null;
  onPublish: (payloads: {
    youtubePayload?: YouTubePublishPayload;
    instagramPayload?: InstagramPublishPayload;
    selectedAccounts?: {
      youtubeAccountId?: string;
      instagramAccountId?: string;
    };
  }) => void;
  isPublishing: boolean;
  presets: PlatformPreset[];
  authStatus?: PlatformAuthStatus | null;
  onOpenAccounts?: () => void;
  trendContext?: { topic: string; hashtags: string[] } | null;
}

export const MetadataReview: React.FC<MetadataReviewProps> = ({
  selectedPlatforms,
  aiResult,
  onPublish,
  isPublishing,
  presets,
  authStatus,
  onOpenAccounts,
  trendContext,
}) => {
  const [activePlatformTab, setActivePlatformTab] = useState<Platform>(
    selectedPlatforms[0] || 'youtube'
  );

  // Selected account state
  const youtubeAccounts = authStatus?.youtube.accounts || [];
  const instagramAccounts = authStatus?.instagram.accounts || [];

  const [selectedYtAccountId, setSelectedYtAccountId] = useState<string>('');
  const [selectedIgAccountId, setSelectedIgAccountId] = useState<string>('');

  useEffect(() => {
    if (youtubeAccounts.length > 0 && !selectedYtAccountId) {
      const def = youtubeAccounts.find((a) => a.isDefault) || youtubeAccounts[0];
      setSelectedYtAccountId(def.id);
    }
  }, [youtubeAccounts, selectedYtAccountId]);

  useEffect(() => {
    if (instagramAccounts.length > 0 && !selectedIgAccountId) {
      const def = instagramAccounts.find((a) => a.isDefault) || instagramAccounts[0];
      setSelectedIgAccountId(def.id);
    }
  }, [instagramAccounts, selectedIgAccountId]);

  const currentYtAccount = youtubeAccounts.find((a) => a.id === selectedYtAccountId) || youtubeAccounts[0];
  const currentIgAccount = instagramAccounts.find((a) => a.id === selectedIgAccountId) || instagramAccounts[0];

  // YouTube state
  const [ytTitle, setYtTitle] = useState('');
  const [ytDescription, setYtDescription] = useState('');
  const [ytTags, setYtTags] = useState<string[]>([]);
  const [newYtTag, setNewYtTag] = useState('');
  const [ytPrivacy, setYtPrivacy] = useState<PrivacyStatus>('public');
  const [ytCategory, setYtCategory] = useState('28');
  const [ytMadeForKids, setYtMadeForKids] = useState(false);

  // Instagram state
  const [igCaption, setIgCaption] = useState('');
  const [igHashtags, setIgHashtags] = useState<string[]>([]);
  const [newIgHashtag, setNewIgHashtag] = useState('');
  const [igShareToFeed, setIgShareToFeed] = useState(true);

  // Preset feedback state
  const [presetAppliedMsg, setPresetAppliedMsg] = useState<string | null>(null);

  // Populate from AI Analysis Result when ready
  useEffect(() => {
    if (aiResult) {
      if (aiResult.youtube) {
        setYtTitle(aiResult.youtube.title || '');
        setYtDescription(aiResult.youtube.description || '');
        setYtTags(aiResult.youtube.tags || []);
        setYtCategory(aiResult.youtube.categoryId || '28');
      }
      if (aiResult.instagram) {
        setIgCaption(aiResult.instagram.caption || '');
        setIgHashtags(aiResult.instagram.hashtags || []);
      }
    }
  }, [aiResult]);

  // Auto-merge trendContext hashtags and keywords when available
  useEffect(() => {
    if (trendContext && trendContext.hashtags.length > 0) {
      setIgHashtags((prev) => {
        const set = new Set(prev);
        trendContext.hashtags.forEach((h) => {
          const formatted = h.startsWith('#') ? h : `#${h}`;
          set.add(formatted);
        });
        return Array.from(set);
      });

      setYtTags((prev) => {
        const set = new Set(prev.map((t) => t.toLowerCase()));
        const updated = [...prev];
        trendContext.hashtags.forEach((h) => {
          const clean = h.replace(/^#/, '');
          if (!set.has(clean.toLowerCase())) {
            set.add(clean.toLowerCase());
            updated.push(clean);
          }
        });
        return updated;
      });
    }
  }, [trendContext]);

  // Derived candidate grounded keywords & hashtags from AI and Search Grounding
  const allGroundedKeywords = Array.from(
    new Set([
      ...(aiResult?.groundedTrends?.flatMap((t) => t.trendingKeywords) || []),
      ...(aiResult?.youtube?.tags || []),
      ...(trendContext?.hashtags?.map((h) => h.replace(/^#/, '')) || []),
    ])
  ).map((k) => k.replace(/^#/, ''));

  const allSuggestedHashtags = Array.from(
    new Set([
      ...(aiResult?.instagram?.hashtags || []),
      ...(aiResult?.youtube?.hashtags || []),
      ...(trendContext?.hashtags?.map((h) => (h.startsWith('#') ? h : `#${h}`)) || []),
      ...(aiResult?.groundedTrends?.flatMap((t) =>
        t.trendingKeywords.map((k) => (k.startsWith('#') ? k : `#${k.replace(/\s+/g, '')}`))
      ) || []),
    ])
  );

  const handleAutoAddAllGroundedKeywords = () => {
    const currentSet = new Set(ytTags.map((t) => t.toLowerCase()));
    const updated = [...ytTags];
    allGroundedKeywords.forEach((k) => {
      if (!currentSet.has(k.toLowerCase())) {
        currentSet.add(k.toLowerCase());
        updated.push(k);
      }
    });
    setYtTags(updated);
  };

  const handleAutoAddAllSuggestedHashtags = () => {
    const currentSet = new Set(igHashtags.map((h) => h.toLowerCase()));
    const updated = [...igHashtags];
    allSuggestedHashtags.forEach((h) => {
      if (!currentSet.has(h.toLowerCase())) {
        currentSet.add(h.toLowerCase());
        updated.push(h);
      }
    });
    setIgHashtags(updated);
  };

  const handleApplyPreset = (platform: Platform) => {
    const preset = presets.find((p) => p.platform === platform);
    if (!preset) return;

    if (platform === 'youtube') {
      // Append footer if not present
      if (preset.descriptionFooter && !ytDescription.includes(preset.descriptionFooter.trim())) {
        setYtDescription((prev) => prev.trim() + '\n' + preset.descriptionFooter);
      }
      // Merge fixed hashtags into tags
      const currentTagsSet = new Set(ytTags.map((t) => t.toLowerCase()));
      const updatedTags = [...ytTags];
      preset.fixedHashtags.forEach((h) => {
        const clean = h.replace(/^#/, '');
        if (!currentTagsSet.has(clean.toLowerCase())) {
          currentTagsSet.add(clean.toLowerCase());
          updatedTags.push(clean);
        }
      });
      setYtTags(updatedTags);
      setYtPrivacy(preset.privacy);
      setYtCategory(preset.category);
    } else {
      // Instagram
      if (preset.descriptionFooter && !igCaption.includes(preset.descriptionFooter.trim())) {
        setIgCaption((prev) => prev.trim() + '\n' + preset.descriptionFooter);
      }
      const currentHash = new Set(igHashtags.map((h) => h.toLowerCase()));
      const updatedHash = [...igHashtags];
      preset.fixedHashtags.forEach((h) => {
        const tag = h.startsWith('#') ? h : `#${h}`;
        if (!currentHash.has(tag.toLowerCase())) {
          currentHash.add(tag.toLowerCase());
          updatedHash.push(tag);
        }
      });
      setIgHashtags(updatedHash);
      setIgShareToFeed(preset.shareToFeed);
    }

    setPresetAppliedMsg(`Applied ${preset.name} to ${platform.toUpperCase()}`);
    setTimeout(() => setPresetAppliedMsg(null), 3000);
  };

  const handleAddYtTag = () => {
    if (newYtTag.trim() && !ytTags.includes(newYtTag.trim())) {
      setYtTags([...ytTags, newYtTag.trim()]);
      setNewYtTag('');
    }
  };

  const handleRemoveYtTag = (tagToRemove: string) => {
    setYtTags(ytTags.filter((t) => t !== tagToRemove));
  };

  const handleAddIgHashtag = () => {
    if (newIgHashtag.trim()) {
      const formatted = newIgHashtag.trim().startsWith('#')
        ? newIgHashtag.trim()
        : `#${newIgHashtag.trim()}`;
      if (!igHashtags.includes(formatted)) {
        setIgHashtags([...igHashtags, formatted]);
        setNewIgHashtag('');
      }
    }
  };

  const handleRemoveIgHashtag = (hashToRemove: string) => {
    setIgHashtags(igHashtags.filter((h) => h !== hashToRemove));
  };

  const handlePublishClick = () => {
    const payloads: {
      youtubePayload?: YouTubePublishPayload;
      instagramPayload?: InstagramPublishPayload;
    } = {};

    if (selectedPlatforms.includes('youtube')) {
      payloads.youtubePayload = {
        title: ytTitle,
        description: ytDescription,
        tags: ytTags,
        privacyStatus: ytPrivacy,
        categoryId: ytCategory,
        madeForKids: ytMadeForKids,
      };
    }

    if (selectedPlatforms.includes('instagram')) {
      payloads.instagramPayload = {
        caption: igCaption,
        hashtags: igHashtags,
        shareToFeed: igShareToFeed,
      };
    }

    onPublish({
      ...payloads,
      selectedAccounts: {
        youtubeAccountId: selectedPlatforms.includes('youtube') ? selectedYtAccountId || undefined : undefined,
        instagramAccountId: selectedPlatforms.includes('instagram') ? selectedIgAccountId || undefined : undefined,
      },
    });
  };

  if (selectedPlatforms.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-6 shadow-xl space-y-5 sm:space-y-6 w-full max-w-full">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Review & Customize Before Publishing
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Fine-tune title, description, tags, hashtags, and privacy settings per platform.
          </p>
        </div>

        {/* Platform Tabs switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedPlatforms.includes('youtube') && (
            <button
              type="button"
              onClick={() => setActivePlatformTab('youtube')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                activePlatformTab === 'youtube'
                  ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-900/30'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Youtube className="w-4 h-4 text-white" />
              <span>YouTube<span className="hidden sm:inline"> Fields</span></span>
            </button>
          )}

          {selectedPlatforms.includes('instagram') && (
            <button
              type="button"
              onClick={() => setActivePlatformTab('instagram')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                activePlatformTab === 'instagram'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border-pink-500 shadow-md shadow-pink-900/30'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Instagram className="w-4 h-4 text-white" />
              <span>Instagram<span className="hidden sm:inline"> Reels Fields</span></span>
            </button>
          )}
        </div>
      </div>

      {presetAppliedMsg && (
        <div className="p-2.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{presetAppliedMsg}</span>
          </div>
        </div>
      )}

      {/* Main Grid: Left is Form Fields, Right is Realistic Live Phone / Player Mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Fields: 7 Columns */}
        <div className="lg:col-span-7 space-y-5">
          {/* Preset Quick Actions */}
          <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center space-x-2 text-xs text-slate-300">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold">
                Preset for {activePlatformTab.toUpperCase()}:
              </span>
              <span className="text-slate-400 truncate max-w-[140px] sm:max-w-none">
                {presets.find((p) => p.platform === activePlatformTab)?.name || 'Default Preset'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleApplyPreset(activePlatformTab)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 transition-all active:scale-95 flex items-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Apply Preset</span>
            </button>
          </div>

          {/* YouTube Form Fields */}
          {activePlatformTab === 'youtube' && (
            <div className="space-y-4">
              {/* Target Channel Picker */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <Youtube className="w-4 h-4 text-red-500" />
                    <span>Post to YouTube Channel:</span>
                  </label>
                  {onOpenAccounts && (
                    <button
                      type="button"
                      onClick={onOpenAccounts}
                      className="text-[11px] text-red-400 hover:text-red-300 font-semibold transition-colors"
                    >
                      + Manage Channels
                    </button>
                  )}
                </div>

                {youtubeAccounts.length === 0 ? (
                  <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-300 flex items-center justify-between">
                    <span>No YouTube channel connected.</span>
                    {onOpenAccounts && (
                      <button
                        type="button"
                        onClick={onOpenAccounts}
                        className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-[11px]"
                      >
                        Connect Channel
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <select
                      value={selectedYtAccountId}
                      onChange={(e) => setSelectedYtAccountId(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-medium"
                    >
                      {youtubeAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.handle || acc.platformAccountId}){acc.isDefault ? ' [Default]' : ''}
                        </option>
                      ))}
                    </select>
                    {currentYtAccount && (
                      <div className="flex items-center space-x-2 px-2.5 py-1 bg-slate-900/80 rounded-lg border border-slate-800">
                        {currentYtAccount.avatarUrl ? (
                          <img
                            src={currentYtAccount.avatarUrl}
                            alt={currentYtAccount.name}
                            className="w-5 h-5 rounded-full object-cover ring-1 ring-red-500/50"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center">
                            {currentYtAccount.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-xs text-slate-300 font-medium truncate max-w-[140px]">
                          {currentYtAccount.name}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    YouTube Video Title
                  </label>
                  <span
                    className={`text-[11px] font-mono ${
                      ytTitle.length > 100 ? 'text-red-400 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {ytTitle.length}/100 chars
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={100}
                  value={ytTitle}
                  onChange={(e) => setYtTitle(e.target.value)}
                  placeholder="High-converting title for YouTube Shorts..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-medium"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  YouTube Description
                </label>
                <textarea
                  rows={6}
                  value={ytDescription}
                  onChange={(e) => setYtDescription(e.target.value)}
                  placeholder="Summary, chapters, links, and hashtags..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all leading-relaxed"
                />
              </div>

              {/* Search Tags */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    YouTube SEO Tags ({ytTags.length} keywords)
                  </label>
                  {allGroundedKeywords.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAutoAddAllGroundedKeywords}
                      className="flex items-center space-x-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                      title="Automatically populate search tags with all grounded keywords discovered by Gemini"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Auto-Add All Grounded Keywords</span>
                    </button>
                  )}
                </div>

                {allGroundedKeywords.filter((k) => !ytTags.map((t) => t.toLowerCase()).includes(k.toLowerCase())).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 mb-2">
                    <span className="text-[10px] text-slate-500">Trending picks:</span>
                    {allGroundedKeywords
                      .filter((k) => !ytTags.map((t) => t.toLowerCase()).includes(k.toLowerCase()))
                      .slice(0, 6)
                      .map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setYtTags((prev) => [...prev, k])}
                          className="px-2 py-0.5 rounded text-[10px] bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1 transition-colors"
                        >
                          <span>+ {k}</span>
                        </button>
                      ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-2 min-h-12 items-center">
                  {ytTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-slate-200 border border-slate-700"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveYtTag(tag)}
                        className="text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={newYtTag}
                    onChange={(e) => setNewYtTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        handleAddYtTag();
                      }
                    }}
                    placeholder="+ Add tag..."
                    className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none px-2 py-1 flex-1 min-w-[100px]"
                  />
                </div>
              </div>

              {/* Privacy & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Privacy Visibility
                  </label>
                  <select
                    value={ytPrivacy}
                    onChange={(e) => setYtPrivacy(e.target.value as PrivacyStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="public">Public (Visible to everyone)</option>
                    <option value="unlisted">Unlisted (Anyone with link)</option>
                    <option value="private">Private (Only you)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Category ID
                  </label>
                  <select
                    value={ytCategory}
                    onChange={(e) => setYtCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="28">28 - Science & Technology</option>
                    <option value="22">22 - People & Blogs</option>
                    <option value="24">24 - Entertainment</option>
                    <option value="27">27 - Education</option>
                    <option value="20">20 - Gaming</option>
                    <option value="26">26 - Howto & Style</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Instagram Form Fields */}
          {activePlatformTab === 'instagram' && (
            <div className="space-y-4">
              {/* Target Instagram Account Picker */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <Instagram className="w-4 h-4 text-pink-500" />
                    <span>Post to Instagram Account:</span>
                  </label>
                  {onOpenAccounts && (
                    <button
                      type="button"
                      onClick={onOpenAccounts}
                      className="text-[11px] text-pink-400 hover:text-pink-300 font-semibold transition-colors"
                    >
                      + Manage Accounts
                    </button>
                  )}
                </div>

                {instagramAccounts.length === 0 ? (
                  <div className="p-3 bg-pink-950/30 border border-pink-900/50 rounded-lg text-xs text-pink-300 flex items-center justify-between">
                    <span>No Instagram account connected.</span>
                    {onOpenAccounts && (
                      <button
                        type="button"
                        onClick={onOpenAccounts}
                        className="px-2.5 py-1 rounded bg-pink-600 hover:bg-pink-500 text-white font-bold text-[11px]"
                      >
                        Connect Account
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <select
                      value={selectedIgAccountId}
                      onChange={(e) => setSelectedIgAccountId(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500 font-medium"
                    >
                      {instagramAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.handle || acc.platformAccountId}){acc.isDefault ? ' [Default]' : ''}
                        </option>
                      ))}
                    </select>
                    {currentIgAccount && (
                      <div className="flex items-center space-x-2 px-2.5 py-1 bg-slate-900/80 rounded-lg border border-slate-800">
                        {currentIgAccount.avatarUrl ? (
                          <img
                            src={currentIgAccount.avatarUrl}
                            alt={currentIgAccount.name}
                            className="w-5 h-5 rounded-full object-cover ring-1 ring-pink-500/50"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-pink-600 text-[10px] font-bold text-white flex items-center justify-center">
                            {currentIgAccount.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-xs text-slate-300 font-medium truncate max-w-[140px]">
                          {currentIgAccount.handle || currentIgAccount.name}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Caption */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Reels Caption (Hook, Body, and Call-to-Action)
                </label>
                <textarea
                  rows={7}
                  value={igCaption}
                  onChange={(e) => setIgCaption(e.target.value)}
                  placeholder="Captivating Reels caption with emojis..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all leading-relaxed"
                />
              </div>

              {/* Hashtags */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Reels Hashtags ({igHashtags.length} tags)
                  </label>
                  {allSuggestedHashtags.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAutoAddAllSuggestedHashtags}
                      className="flex items-center space-x-1 text-[11px] text-pink-400 hover:text-pink-300 font-semibold transition-colors"
                      title="Automatically populate Reels hashtags with all viral tags discovered by Gemini and Trend Finder"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Auto-Add Viral Hashtags</span>
                    </button>
                  )}
                </div>

                {allSuggestedHashtags.filter((h) => !igHashtags.map((t) => t.toLowerCase()).includes(h.toLowerCase())).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 mb-2">
                    <span className="text-[10px] text-slate-500">Viral suggestions:</span>
                    {allSuggestedHashtags
                      .filter((h) => !igHashtags.map((t) => t.toLowerCase()).includes(h.toLowerCase()))
                      .slice(0, 8)
                      .map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setIgHashtags((prev) => [...prev, h])}
                          className="px-2 py-0.5 rounded text-[10px] bg-pink-950/50 hover:bg-pink-900/60 text-pink-300 border border-pink-500/30 flex items-center space-x-1 transition-colors"
                        >
                          <span>+ {h}</span>
                        </button>
                      ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-2 min-h-12 items-center">
                  {igHashtags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs bg-pink-950/40 text-pink-300 border border-pink-800/50"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveIgHashtag(tag)}
                        className="text-pink-400 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={newIgHashtag}
                    onChange={(e) => setNewIgHashtag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        handleAddIgHashtag();
                      }
                    }}
                    placeholder="+ Add hashtag..."
                    className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none px-2 py-1 flex-1 min-w-[120px]"
                  />
                </div>
              </div>

              {/* Share to feed toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Share to Profile Grid Feed
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Also displays Reel on main Instagram profile tab.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={igShareToFeed}
                  onChange={(e) => setIgShareToFeed(e.target.checked)}
                  className="w-4 h-4 accent-pink-600 rounded cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Live Mockup Preview: 5 Columns */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full text-center mb-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center justify-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              Live {activePlatformTab === 'youtube' ? 'YouTube Shorts' : 'Instagram Reels'} Mockup
            </span>
          </div>

          {activePlatformTab === 'youtube' ? (
            /* YouTube Shorts Mockup Card */
            <div className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-3 p-3">
              {/* Fake Video Screen */}
              <div className="w-full aspect-[9/14] bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-xl relative p-4 flex flex-col justify-between overflow-hidden border border-slate-800/80">
                {/* Top overlay */}
                <div className="flex items-center justify-between text-white/80">
                  <span className="text-xs font-bold tracking-tight">Shorts</span>
                  <div className="flex items-center space-x-1.5">
                    {ytPrivacy === 'public' && <Globe className="w-3.5 h-3.5 text-emerald-400" />}
                    {ytPrivacy === 'unlisted' && <EyeOff className="w-3.5 h-3.5 text-amber-400" />}
                    {ytPrivacy === 'private' && <Lock className="w-3.5 h-3.5 text-red-400" />}
                    <span className="text-[10px] capitalize">{ytPrivacy}</span>
                  </div>
                </div>

                {/* Right action bar */}
                <div className="absolute right-3 bottom-14 flex flex-col items-center space-y-4 text-white">
                  <div className="flex flex-col items-center">
                    <Heart className="w-5 h-5 text-white/90" />
                    <span className="text-[10px]">12.4K</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <MessageCircle className="w-5 h-5 text-white/90" />
                    <span className="text-[10px]">342</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Share2 className="w-5 h-5 text-white/90" />
                    <span className="text-[10px]">Share</span>
                  </div>
                </div>

                {/* Bottom Overlay with channel & title */}
                <div className="space-y-2 pr-12">
                  <div className="flex items-center space-x-2">
                    {currentYtAccount?.avatarUrl ? (
                      <img
                        src={currentYtAccount.avatarUrl}
                        alt="Channel Avatar"
                        className="w-6 h-6 rounded-full object-cover ring-1 ring-white/50 shrink-0"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                        {currentYtAccount?.name ? currentYtAccount.name.charAt(0) : 'Y'}
                      </div>
                    )}
                    <span className="text-xs font-semibold text-white drop-shadow truncate max-w-[130px]">
                      {currentYtAccount?.name || '@CreatorChannel'}
                    </span>
                    <button className="px-2 py-0.5 rounded-full bg-white text-black text-[10px] font-bold shrink-0">
                      Subscribe
                    </button>
                  </div>

                  <p className="text-xs font-bold text-white line-clamp-2 drop-shadow leading-snug">
                    {ytTitle || 'Your engaging YouTube Shorts title will appear here'}
                  </p>

                  <div className="flex items-center space-x-1 text-[10px] text-white/80">
                    <Music className="w-3 h-3" />
                    <span className="truncate">Original audio • Creator Beats</span>
                  </div>
                </div>
              </div>

              {/* YouTube metadata summary */}
              <div className="text-[11px] text-slate-400 px-1 space-y-1">
                <p className="line-clamp-2">{ytDescription || 'No description yet.'}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {ytTags.slice(0, 4).map((t) => (
                    <span key={t} className="text-[9px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-300">
                      #{t}
                    </span>
                  ))}
                  {ytTags.length > 4 && (
                    <span className="text-[9px] text-slate-500">+{ytTags.length - 4} more</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Instagram Reels Mockup Card */
            <div className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-3">
              <div className="w-full aspect-[9/14] bg-gradient-to-b from-purple-950/40 via-slate-950 to-black rounded-xl relative p-4 flex flex-col justify-between overflow-hidden border border-slate-800/80">
                {/* Reels Header */}
                <div className="flex items-center justify-between text-white/90">
                  <span className="text-xs font-extrabold tracking-wide">Reels</span>
                  <Instagram className="w-4 h-4 text-pink-400" />
                </div>

                {/* Right side floating icons */}
                <div className="absolute right-3 bottom-14 flex flex-col items-center space-y-4 text-white">
                  <div className="flex flex-col items-center">
                    <Heart className="w-5 h-5 text-white/90 fill-white/20" />
                    <span className="text-[10px] font-semibold">48.2K</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <MessageCircle className="w-5 h-5 text-white/90" />
                    <span className="text-[10px] font-semibold">1,029</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Share2 className="w-5 h-5 text-white/90" />
                    <span className="text-[10px] font-semibold">Share</span>
                  </div>
                </div>

                {/* Bottom Overlay with handle & caption */}
                <div className="space-y-2 pr-12">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[1.5px] shrink-0">
                      {currentIgAccount?.avatarUrl ? (
                        <img
                          src={currentIgAccount.avatarUrl}
                          alt="IG Avatar"
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[9px] font-bold text-white">
                          {currentIgAccount?.name ? currentIgAccount.name.charAt(0) : 'IG'}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-white drop-shadow truncate max-w-[130px]">
                      {currentIgAccount?.handle || currentIgAccount?.name || '@creator_reels'}
                    </span>
                    <button className="px-2 py-0.5 rounded border border-white/40 text-[10px] font-medium text-white shrink-0">
                      Follow
                    </button>
                  </div>

                  <p className="text-xs text-white/95 line-clamp-3 drop-shadow leading-snug">
                    {igCaption || 'Your viral Instagram Reels caption will appear here...'}
                  </p>

                  <div className="text-[10px] text-pink-300 font-medium line-clamp-1">
                    {igHashtags.join(' ')}
                  </div>

                  <div className="flex items-center space-x-1.5 text-[10px] text-white/80">
                    <Music className="w-3 h-3 animate-spin" />
                    <span className="truncate">Trending Sound • 84.1K Reels</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Primary Publish Button */}
      <div className="pt-2 border-t border-slate-800">
        <button
          type="button"
          disabled={isPublishing}
          onClick={handlePublishClick}
          className={`w-full py-4 px-6 rounded-2xl font-extrabold text-base flex items-center justify-center space-x-3 shadow-xl transition-all ${
            isPublishing
              ? 'bg-indigo-600/60 text-white cursor-wait'
              : 'bg-gradient-to-r from-red-600 via-purple-600 to-pink-600 hover:opacity-95 text-white active:scale-[0.99] shadow-purple-900/30'
          }`}
        >
          {isPublishing ? (
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Queuing Video & Starting Publishing Pipeline...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Send className="w-5 h-5 text-white" />
              <span>
                Publish to{' '}
                {selectedPlatforms.length === 2
                  ? 'YouTube & Instagram Reels'
                  : selectedPlatforms[0] === 'youtube'
                  ? 'YouTube Shorts'
                  : 'Instagram Reels'}
              </span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
};
