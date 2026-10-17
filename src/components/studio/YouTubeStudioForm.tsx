import React, { useState, useId } from 'react';
import {
  Youtube,
  Sparkles,
  Upload,
  Check,
  Plus,
  X,
  Layers,
  Calendar,
  Clock,
  Globe,
  Lock,
  Eye,
  EyeOff,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Share2,
  Disc,
  Search,
  Copy,
  ChevronRight,
  Shield,
  HelpCircle,
  FolderPlus,
  MessageCircle,
} from 'lucide-react';
import {
  PrivacyStatus,
  ConnectedAccount,
  PlatformPreset,
  VideoMetadata,
  VERIFIED_PLATFORM_LIMITS,
} from '@shared/types';

export interface YouTubeStudioFormState {
  title: string;
  description: string;
  tags: string[];
  category: string;
  privacy: PrivacyStatus;
  madeForKids: boolean;
  language: string;
  playlist: string;
  commentsSetting: 'allow_all' | 'hold_inappropriate' | 'disabled';
  thumbnailUrl: string | null;
  scheduled: boolean;
  scheduleDate: string;
  scheduleTime: string;
  scheduleTimeZone: string;
  includedInPost: boolean;
  selectedAccountId: string;
}

interface YouTubeStudioFormProps {
  state: YouTubeStudioFormState;
  onChange: (updater: (prev: YouTubeStudioFormState) => YouTubeStudioFormState) => void;
  video?: VideoMetadata | null;
  accounts: ConnectedAccount[];
  presets: PlatformPreset[];
  onCopyFromInstagram: () => void;
  isPublishing?: boolean;
}

const YOUTUBE_CATEGORIES = [
  { id: '1', name: 'Film & Animation (Recommended for Anime/AMV/Cinema)' },
  { id: '24', name: 'Entertainment (Pop culture, trends, shows)' },
  { id: '20', name: 'Gaming (Gameplay, velocity edits, montages)' },
  { id: '10', name: 'Music (Music videos, remix tracks)' },
  { id: '22', name: 'People & Blogs (Vlogs, reactions, creators)' },
  { id: '23', name: 'Comedy (Memes, funny edits)' },
  { id: '26', name: 'Howto & Style (Editing tutorials, presets)' },
  { id: '28', name: 'Science & Technology (Tech breakdowns, AI)' },
  { id: '17', name: 'Sports (Athletics, sports highlights)' },
];

const LANGUAGES = [
  { code: 'en', label: 'English (en)' },
  { code: 'ja', label: 'Japanese (ja)' },
  { code: 'ko', label: 'Korean (ko)' },
  { code: 'es', label: 'Spanish (es)' },
  { code: 'fr', label: 'French (fr)' },
  { code: 'hi', label: 'Hindi (hi)' },
  { code: 'de', label: 'German (de)' },
  { code: 'pt', label: 'Portuguese (pt)' },
];

const PLAYLIST_SUGGESTIONS = [
  'Viral Anime Edits 2026',
  '4K Phonk Velocity Shorts',
  'Marvel Cinematic Universe',
  'Weekly Trend Highlights',
  'Character Lore & Edits',
];

const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: '🇺🇸 New York (ET)' },
  { value: 'America/Chicago', label: '🇺🇸 Chicago (CT)' },
  { value: 'America/Denver', label: '🇺🇸 Denver (MT)' },
  { value: 'America/Los_Angeles', label: '🇺🇸 Los Angeles (PT)' },
  { value: 'Europe/London', label: '🇬🇧 London (GMT/BST)' },
  { value: 'Europe/Paris', label: '🇫🇷 Paris (CET)' },
  { value: 'Asia/Tokyo', label: '🇯🇵 Tokyo (JST)' },
  { value: 'Asia/Kolkata', label: '🇮🇳 India (IST)' },
  { value: 'UTC', label: '🌐 UTC' },
];

export const YouTubeStudioForm: React.FC<YouTubeStudioFormProps> = ({
  state,
  onChange,
  video,
  accounts,
  presets,
  onCopyFromInstagram,
  isPublishing,
}) => {
  const [activeStep, setActiveStep] = useState<'details' | 'audience' | 'visibility'>('details');
  const [previewTab, setPreviewTab] = useState<'shorts' | 'search'>('shorts');
  const [newTagInput, setNewTagInput] = useState('');
  const [copyToast, setCopyToast] = useState(false);
  const [presetNotice, setPresetNotice] = useState<string | null>(null);

  const thumbnailInputId = useId();

  const currentAccount = accounts.find((a) => a.id === state.selectedAccountId) || accounts[0];
  const channelTitle = currentAccount?.name || 'Creator Channel';
  const channelAvatar = currentAccount?.avatarUrl;

  const tagsTotalChars = state.tags.join(',').length;

  // Extract top 3 hashtags for display above the title (official YouTube Shorts feature)
  const extractedHashtags = (
    state.description.match(/#[a-zA-Z0-9_]+/g) || ['#Shorts', '#Viral', '#Trending']
  ).slice(0, 3);

  const handleAddTag = () => {
    const raw = newTagInput.trim().replace(/^#/, '');
    if (!raw) return;
    const prospective = [...state.tags, raw].join(',').length;
    if (prospective > VERIFIED_PLATFORM_LIMITS.youtube.maxTagsLength) return;

    if (!state.tags.includes(raw)) {
      onChange((prev) => ({ ...prev, tags: [...prev.tags, raw] }));
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChange((prev) => ({ ...prev, thumbnailUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;

    onChange((prev) => ({
      ...prev,
      title: preset.titleTemplate ? preset.titleTemplate.replace(/{edit_style}/g, '4K HDR Velocity') : prev.title,
      description: preset.descriptionTemplate
        ? `${preset.descriptionTemplate}\n\n${preset.descriptionFooter || ''}`.trim().slice(0, 5000)
        : prev.description,
      tags: preset.tags && preset.tags.length > 0 ? Array.from(new Set([...preset.tags, ...prev.tags])) : prev.tags,
      category: preset.category || prev.category,
      privacy: preset.privacy || prev.privacy,
      madeForKids: preset.madeForKids !== undefined ? preset.madeForKids : prev.madeForKids,
      language: preset.language || prev.language,
    }));

    setPresetNotice(`Applied YouTube preset "${preset.name}"!`);
    setTimeout(() => setPresetNotice(null), 3000);
  };

  const handleTriggerCopy = () => {
    onCopyFromInstagram();
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 3000);
  };

  return (
    <div className="rounded-2xl border border-[#272727] bg-[#0f0f0f] text-slate-100 shadow-2xl overflow-hidden animate-fade-in">
      {/* ============================================================== */}
      {/* YOUTUBE STUDIO HEADER BAR                                      */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 bg-[#181818] border-b border-[#272727]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-600/40 flex items-center justify-center text-red-500 shadow-sm">
            <Youtube className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                <span>YouTube Studio</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 text-white uppercase tracking-wider">
                  Shorts
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Stepped publishing flow with native YouTube Shorts SEO, COPPA & privacy controls
            </p>
          </div>
        </div>

        {/* Top Actions: Account Selector + Copy from IG + Include Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Channel selector */}
          {accounts.length > 0 && (
            <select
              value={state.selectedAccountId}
              onChange={(e) => onChange((prev) => ({ ...prev, selectedAccountId: e.target.value }))}
              className="bg-[#0f0f0f] border border-[#333] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  📺 {acc.name}
                </option>
              ))}
            </select>
          )}

          {/* Copy from Instagram Button */}
          <button
            type="button"
            onClick={handleTriggerCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#222] hover:bg-[#2a2a2a] border border-[#383838] text-slate-200 transition-all active:scale-95 shadow-sm"
            title="Import caption & tags from the Instagram tab"
          >
            <Copy className="w-3.5 h-3.5 text-pink-400" />
            <span>Copy from Instagram</span>
          </button>

          {/* Include YouTube in Post Toggle */}
          <button
            type="button"
            onClick={() => onChange((prev) => ({ ...prev, includedInPost: !prev.includedInPost }))}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              state.includedInPost
                ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30'
                : 'bg-[#181818] border-[#383838] text-slate-400 hover:text-slate-200'
            }`}
          >
            {state.includedInPost ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Posting to YouTube</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Excluded (Click to Add)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Copy Toast Notification */}
      {copyToast && (
        <div className="px-6 py-2.5 bg-emerald-950/80 border-b border-emerald-800 text-xs text-emerald-200 flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Synced caption and hashtags from Instagram into YouTube description and search tags!</span>
        </div>
      )}

      {/* Preset Notice */}
      {presetNotice && (
        <div className="px-6 py-2.5 bg-red-950/80 border-b border-red-800 text-xs text-red-200 flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-red-400" />
          <span>{presetNotice}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* YOUTUBE STUDIO STEPPING TABS                                   */}
      {/* ============================================================== */}
      <div className="flex items-center border-b border-[#272727] bg-[#141414] px-6">
        {[
          { id: 'details', label: '1. Details' },
          { id: 'audience', label: '2. Audience (COPPA)' },
          { id: 'visibility', label: '3. Visibility & Schedule' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveStep(tab.id as any)}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeStep === tab.id
                ? 'border-red-600 text-red-400 bg-red-600/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}

        {/* Preset Selector shortcut */}
        {presets.filter((p) => p.platform === 'youtube').length > 0 && (
          <div className="ml-auto flex items-center gap-2 py-2">
            <span className="text-[11px] text-slate-400 hidden md:inline">Preset:</span>
            <select
              onChange={(e) => {
                if (e.target.value) handleApplyPreset(e.target.value);
              }}
              defaultValue=""
              className="bg-[#0f0f0f] border border-[#333] rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
            >
              <option value="">Apply Preset...</option>
              {presets
                .filter((p) => p.platform === 'youtube')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 2-COLUMN STUDIO WORKSPACE: FORM + LIVE PREVIEWS                 */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        {/* LEFT COLUMN: STEPPED FORM FIELDS (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* -------------------------------------------------------- */}
          {/* STEP 1: DETAILS                                          */}
          {/* -------------------------------------------------------- */}
          {activeStep === 'details' && (
            <div className="space-y-4 animate-fade-in">
              {/* Title Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">
                    Title (required) <span className="text-red-500">*</span>
                  </label>
                  <span
                    className={`text-[11px] font-mono ${
                      state.title.length > VERIFIED_PLATFORM_LIMITS.youtube.maxTitleLength
                        ? 'text-red-400 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {state.title.length}/{VERIFIED_PLATFORM_LIMITS.youtube.maxTitleLength}
                  </span>
                </div>
                <input
                  type="text"
                  value={state.title}
                  maxLength={100}
                  onChange={(e) => onChange((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Gojo Being An Absolute Menace 🥶 | Jujutsu Kaisen 4K Edit #Shorts"
                  className="w-full bg-[#181818] border border-[#333] focus:border-red-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all font-medium"
                />
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span>Hashtags above title on Shorts:</span>
                  <span className="text-blue-400 font-medium">{extractedHashtags.join(' ')}</span>
                </div>
              </div>

              {/* Description Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">Description</label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {state.description.length}/{VERIFIED_PLATFORM_LIMITS.youtube.maxDescriptionLength}
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={state.description}
                  maxLength={5000}
                  onChange={(e) => onChange((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Tell viewers about your Short, include lore background, music credits, and relevant hashtags..."
                  className="w-full bg-[#181818] border border-[#333] focus:border-red-500 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all leading-relaxed font-sans"
                />
              </div>

              {/* Thumbnail Picker */}
              <div className="space-y-2 p-4 bg-[#181818] rounded-xl border border-[#272727]">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span>Thumbnail</span>
                      <span className="text-[10px] text-slate-400 font-normal">(Shorts cover or custom image)</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Select what viewers will see before tapping on your video.
                    </p>
                  </div>
                  {state.thumbnailUrl && (
                    <button
                      type="button"
                      onClick={() => onChange((prev) => ({ ...prev, thumbnailUrl: null }))}
                      className="text-[11px] text-red-400 hover:text-red-300"
                    >
                      Clear custom
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  {state.thumbnailUrl ? (
                    <img
                      src={state.thumbnailUrl}
                      alt="Thumbnail preview"
                      className="w-20 h-28 object-cover rounded-lg border border-[#383838]"
                    />
                  ) : (
                    <div className="w-20 h-28 rounded-lg bg-[#242424] border border-dashed border-[#444] flex flex-col items-center justify-center text-slate-500">
                      <Upload className="w-5 h-5 mb-1" />
                      <span className="text-[9px]">Frame</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <input
                      id={thumbnailInputId}
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor={thumbnailInputId}
                      className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2a2a2a] hover:bg-[#333] text-white border border-[#444] transition-all"
                    >
                      <Upload className="w-3.5 h-3.5 text-red-400" />
                      <span>Upload custom thumbnail</span>
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Standard: 1080x1920 (9:16 Shorts) or 1280x720 (16:9). Under 2MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Playlist & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Playlist Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FolderPlus className="w-3.5 h-3.5 text-red-400" />
                    <span>Playlist</span>
                  </label>
                  <input
                    type="text"
                    value={state.playlist}
                    onChange={(e) => onChange((prev) => ({ ...prev, playlist: e.target.value }))}
                    placeholder="e.g. Anime Edits 2026"
                    list="youtube-playlist-suggestions"
                    className="w-full bg-[#181818] border border-[#333] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <datalist id="youtube-playlist-suggestions">
                    {PLAYLIST_SUGGESTIONS.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </div>

                {/* Category Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-red-400" />
                    <span>Category</span>
                  </label>
                  <select
                    value={state.category}
                    onChange={(e) => onChange((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-[#181818] border border-[#333] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    {YOUTUBE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Language Selection */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-red-400" />
                  <span>Video Language</span>
                </label>
                <select
                  value={state.language}
                  onChange={(e) => onChange((prev) => ({ ...prev, language: e.target.value }))}
                  className="w-full bg-[#181818] border border-[#333] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hidden Search Tags (Strict 500-character counter) */}
              <div className="space-y-2 p-4 bg-[#181818] rounded-xl border border-[#272727]">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-200">Tags</label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tags can be useful if people commonly misspell your video topic. Otherwise, tags play a minimal role.
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-mono ${
                      tagsTotalChars > VERIFIED_PLATFORM_LIMITS.youtube.maxTagsLength
                        ? 'text-red-400 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {tagsTotalChars}/{VERIFIED_PLATFORM_LIMITS.youtube.maxTagsLength} chars
                  </span>
                </div>

                {/* Tag Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Add tag (press Enter or comma)..."
                    className="flex-1 bg-[#0f0f0f] border border-[#333] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-[#2a2a2a] hover:bg-[#333] text-white border border-[#444]"
                  >
                    Add
                  </button>
                </div>

                {/* Tag Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {state.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-[#242424] border border-[#383838] text-slate-200"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* STEP 2: AUDIENCE (COPPA)                                 */}
          {/* -------------------------------------------------------- */}
          {activeStep === 'audience' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 bg-[#181818] rounded-xl border border-[#272727] space-y-3">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Audience: Is this video made for kids? (required)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Regardless of your location, you’re legally required to comply with the Children’s Online Privacy
                      Protection Act (COPPA) and other laws. You’re required to tell us whether your videos are made for kids.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#272727]">
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] cursor-pointer hover:border-slate-600 transition-all">
                    <input
                      type="radio"
                      name="ytMadeForKids"
                      checked={state.madeForKids === true}
                      onChange={() => onChange((prev) => ({ ...prev, madeForKids: true }))}
                      className="mt-0.5 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Yes, it's made for kids.</span>
                      <span className="text-[11px] text-slate-400">
                        Features like comments, personalized ads, and notifications will be disabled for this video.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] cursor-pointer hover:border-slate-600 transition-all">
                    <input
                      type="radio"
                      name="ytMadeForKids"
                      checked={state.madeForKids === false}
                      onChange={() => onChange((prev) => ({ ...prev, madeForKids: false }))}
                      className="mt-0.5 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        No, it's not made for kids. (Recommended for Edits/Shorts)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Content tailored for general and teen/adult audiences. Comments and remixing enabled.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Age restriction breakdown */}
              <div className="p-4 bg-[#181818] rounded-xl border border-[#272727] text-xs space-y-1.5 text-slate-400">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <span>Age Restriction (Advanced)</span>
                </div>
                <p className="text-[11px]">
                  Age-restricted videos are not shown to users under 18 years of age or users who are signed out. This Short
                  will be published with general access.
                </p>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* STEP 3: VISIBILITY & SCHEDULE                            */}
          {/* -------------------------------------------------------- */}
          {activeStep === 'visibility' && (
            <div className="space-y-5 animate-fade-in">
              {/* Publication Mode: Publish Now vs Schedule */}
              <div className="p-4 bg-[#181818] rounded-xl border border-[#272727] space-y-4">
                <div className="flex items-center justify-between border-b border-[#272727] pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-white">Visibility</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Choose when to publish and who can see your Short.
                    </p>
                  </div>

                  <div className="flex items-center bg-[#0f0f0f] p-1 rounded-xl border border-[#333]">
                    <button
                      type="button"
                      onClick={() => onChange((prev) => ({ ...prev, scheduled: false }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        !state.scheduled ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Save or publish
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange((prev) => ({ ...prev, scheduled: true }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        state.scheduled ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Schedule
                    </button>
                  </div>
                </div>

                {!state.scheduled ? (
                  /* Immediate Visibility Options */
                  <div className="space-y-2">
                    {[
                      {
                        id: 'public',
                        label: 'Public',
                        desc: 'Everyone can see your video. Instant push to subscriber feeds.',
                        icon: Eye,
                      },
                      {
                        id: 'unlisted',
                        label: 'Unlisted',
                        desc: 'Anyone with the video link can watch your video.',
                        icon: Globe,
                      },
                      {
                        id: 'private',
                        label: 'Private',
                        desc: 'Only you and people you choose can watch your video.',
                        icon: Lock,
                      },
                    ].map((opt) => {
                      const Icon = opt.icon;
                      const isSel = state.privacy === opt.id;
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isSel ? 'bg-red-600/10 border-red-500/50' : 'bg-[#0f0f0f] border-[#272727] hover:border-[#383838]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="ytPrivacy"
                            checked={isSel}
                            onChange={() => onChange((prev) => ({ ...prev, privacy: opt.id as PrivacyStatus }))}
                            className="mt-0.5 text-red-600 focus:ring-red-500"
                          />
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5 text-red-400" />
                              <span>{opt.label}</span>
                            </span>
                            <span className="text-[11px] text-slate-400 block">{opt.desc}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  /* Scheduled Visibility Options */
                  <div className="space-y-3 p-3.5 bg-[#0f0f0f] rounded-xl border border-[#333]">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Schedule publication</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Select a date and time to make your video public. Video is uploaded as private with YouTube's native{' '}
                      <code className="text-white">status.publishAt</code>.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400">Date</label>
                        <input
                          type="date"
                          value={state.scheduleDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => onChange((prev) => ({ ...prev, scheduleDate: e.target.value }))}
                          className="w-full bg-[#181818] border border-[#444] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400">Time</label>
                        <input
                          type="time"
                          value={state.scheduleTime}
                          onChange={(e) => onChange((prev) => ({ ...prev, scheduleTime: e.target.value }))}
                          className="w-full bg-[#181818] border border-[#444] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400">Timezone</label>
                        <select
                          value={state.scheduleTimeZone}
                          onChange={(e) => onChange((prev) => ({ ...prev, scheduleTimeZone: e.target.value }))}
                          className="w-full bg-[#181818] border border-[#444] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                        >
                          {COMMON_TIMEZONES.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Comments Settings */}
              <div className="p-4 bg-[#181818] rounded-xl border border-[#272727] space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-red-400" />
                  <span>Comments & Moderation</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'allow_all', label: 'Allow all comments' },
                    { id: 'hold_inappropriate', label: 'Hold potentially inappropriate' },
                    { id: 'disabled', label: 'Disable comments' },
                  ].map((cm) => (
                    <button
                      key={cm.id}
                      type="button"
                      onClick={() => onChange((prev) => ({ ...prev, commentsSetting: cm.id as any }))}
                      className={`p-2.5 rounded-xl text-left border transition-all text-xs ${
                        state.commentsSetting === cm.id
                          ? 'bg-red-600/15 border-red-500 text-white font-bold'
                          : 'bg-[#0f0f0f] border-[#272727] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cm.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Stepping Navigation Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-[#272727]">
            {activeStep !== 'details' ? (
              <button
                type="button"
                onClick={() => setActiveStep(activeStep === 'visibility' ? 'audience' : 'details')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#181818] hover:bg-[#222] border border-[#333] text-slate-300"
              >
                Back
              </button>
            ) : <div />}

            {activeStep !== 'visibility' && (
              <button
                type="button"
                onClick={() => setActiveStep(activeStep === 'details' ? 'audience' : 'visibility')}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-md flex items-center gap-1.5 ml-auto"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: REALISTIC YOUTUBE PREVIEWS (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Preview Tab Selector */}
          <div className="flex items-center justify-between bg-[#181818] p-1 rounded-xl border border-[#272727]">
            <span className="text-[11px] font-bold text-slate-400 px-2 uppercase tracking-wider">
              Preview Mode:
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPreviewTab('shorts')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  previewTab === 'shorts'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Shorts Player
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('search')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  previewTab === 'search'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Search Card
              </button>
            </div>
          </div>

          {/* -------------------------------------------------------- */}
          {/* PREVIEW 1: VERTICAL SHORTS PLAYER                        */}
          {/* -------------------------------------------------------- */}
          {previewTab === 'shorts' && (
            <div className="relative mx-auto w-full max-w-[290px] aspect-[9/16] rounded-3xl bg-black border-4 border-[#272727] overflow-hidden shadow-2xl flex flex-col justify-between p-4 text-white animate-fade-in select-none">
              {/* Background video thumbnail or dark mesh */}
              {state.thumbnailUrl || video?.publicUrl ? (
                <img
                  src={state.thumbnailUrl || video?.publicUrl}
                  alt="Shorts Preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-neutral-900 to-black" />
              )}

              {/* Gradient Overlays for readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40 pointer-events-none" />

              {/* Top Header: YouTube Shorts Indicator */}
              <div className="relative z-10 flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-1.5 font-bold drop-shadow">
                  <Youtube className="w-4 h-4 text-red-600" />
                  <span>Shorts</span>
                </div>
                <Search className="w-4 h-4 text-white drop-shadow" />
              </div>

              {/* Right Side Action Sidebar */}
              <div className="relative z-10 self-end flex flex-col items-center gap-3.5 pb-8 text-center text-xs">
                {/* Like Button */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all cursor-pointer">
                    <ThumbsUp className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-bold mt-0.5">24.5K</span>
                </div>

                {/* Dislike Button */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all cursor-pointer">
                    <ThumbsDown className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-bold mt-0.5">Dislike</span>
                </div>

                {/* Comments Button */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all cursor-pointer">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-bold mt-0.5">842</span>
                </div>

                {/* Share Button */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all cursor-pointer">
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-bold mt-0.5">Share</span>
                </div>

                {/* Remix / Audio Disc */}
                <div className="w-9 h-9 rounded-full bg-red-600/80 border-2 border-white/40 flex items-center justify-center animate-spin-slow">
                  <Disc className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Bottom Info: Channel, Title, 3 Hashtags, Sound */}
              <div className="relative z-10 space-y-2 pb-1">
                {/* Channel & Subscribe */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold overflow-hidden border border-white/20">
                    {channelAvatar ? (
                      <img src={channelAvatar} alt={channelTitle} className="w-full h-full object-cover" />
                    ) : (
                      channelTitle.charAt(0)
                    )}
                  </div>
                  <span className="text-xs font-bold drop-shadow">@{channelTitle.replace(/\s+/g, '')}</span>
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded-full text-[10px] font-black bg-white text-black hover:bg-slate-200 transition-all"
                  >
                    Subscribe
                  </button>
                </div>

                {/* Top 3 Hashtags above title */}
                <div className="text-[11px] font-medium text-blue-400 drop-shadow line-clamp-1">
                  {extractedHashtags.join(' ')}
                </div>

                {/* Title */}
                <p className="text-xs font-semibold text-white leading-tight line-clamp-2 drop-shadow">
                  {state.title || 'Untitled Short Title'}
                </p>

                {/* Sound Track Badge */}
                <div className="flex items-center gap-1.5 text-[10px] text-white/90 drop-shadow truncate">
                  <Disc className="w-3 h-3 text-red-400 animate-spin-slow shrink-0" />
                  <span className="truncate">Original audio - {channelTitle} • Trending Phonk</span>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* PREVIEW 2: SEARCH RESULT CARD                            */}
          {/* -------------------------------------------------------- */}
          {previewTab === 'search' && (
            <div className="p-4 bg-[#181818] rounded-2xl border border-[#272727] space-y-3 animate-fade-in text-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                YouTube Mobile Search Appearance
              </div>

              <div className="flex gap-3 bg-[#0f0f0f] p-3 rounded-xl border border-[#242424]">
                {/* Thumbnail Column */}
                <div className="relative w-28 h-36 rounded-lg bg-black overflow-hidden shrink-0 border border-[#333]">
                  {state.thumbnailUrl || video?.publicUrl ? (
                    <img
                      src={state.thumbnailUrl || video?.publicUrl}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <Youtube className="w-6 h-6" />
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[9px] font-bold bg-black/80 text-white font-mono">
                    0:45
                  </span>
                  <span className="absolute top-1 left-1 px-1 py-0.5 rounded text-[8px] font-black bg-red-600 text-white">
                    SHORTS
                  </span>
                </div>

                {/* Metadata Column */}
                <div className="flex-1 space-y-1">
                  <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                    {state.title || 'Untitled YouTube Short'}
                  </h4>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <span>{channelTitle}</span>
                    <span>•</span>
                    <span>124K views</span>
                    <span>•</span>
                    <span>2 hours ago</span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed pt-1">
                    {state.description || 'Description preview will appear here with lore keywords and viral tags...'}
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0f0f0f] border border-[#242424] text-[10px] text-slate-400">
                💡 <strong>CTR Optimization Tip:</strong> The first 40 characters of your title and your primary keyword are most prominent in mobile search results.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
