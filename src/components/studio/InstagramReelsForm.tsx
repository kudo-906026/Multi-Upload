import React, { useState, useId } from 'react';
import {
  Instagram,
  Upload,
  Check,
  Plus,
  X,
  MapPin,
  Users,
  Tag,
  Hash,
  AtSign,
  AlertTriangle,
  Info,
  Calendar,
  Clock,
  Globe,
  Sliders,
  Copy,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Music2,
  Grid3X3,
  Smartphone,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ConnectedAccount,
  PlatformPreset,
  VideoMetadata,
  VERIFIED_PLATFORM_LIMITS,
} from '@shared/types';

export interface InstagramReelsFormState {
  caption: string;
  hashtags: string[];
  shareToFeed: boolean;
  location: string;
  collaborators: string[];
  tagPeople: string[];
  coverType: 'frame' | 'upload';
  coverFrameSec: number;
  coverImageUrl: string | null;
  altText: string;
  scheduled: boolean;
  scheduleDate: string;
  scheduleTime: string;
  scheduleTimeZone: string;
  includedInPost: boolean;
  selectedAccountId: string;
}

interface InstagramReelsFormProps {
  state: InstagramReelsFormState;
  onChange: (updater: (prev: InstagramReelsFormState) => InstagramReelsFormState) => void;
  video?: VideoMetadata | null;
  accounts: ConnectedAccount[];
  presets: PlatformPreset[];
  suggestedHashtags?: string[];
  onCopyFromYouTube: () => void;
  isPublishing?: boolean;
}

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

const POPULAR_LOCATIONS = [
  'Tokyo, Japan',
  'Seoul, South Korea',
  'New York, New York',
  'Los Angeles, California',
  'London, United Kingdom',
  'Paris, France',
];

const QUICK_CHIPS = [
  { label: '#reels', type: 'hashtag' },
  { label: '#reelsviral', type: 'hashtag' },
  { label: '#animeedit', type: 'hashtag' },
  { label: '#amvedit', type: 'hashtag' },
  { label: '#explorepage', type: 'hashtag' },
  { label: '@creator', type: 'mention' },
  { label: '@animespotlight', type: 'mention' },
];

export const InstagramReelsForm: React.FC<InstagramReelsFormProps> = ({
  state,
  onChange,
  video,
  accounts,
  presets,
  suggestedHashtags = [],
  onCopyFromYouTube,
  isPublishing,
}) => {
  const [previewTab, setPreviewTab] = useState<'reels' | 'grid'>('reels');
  const [newCollabInput, setNewCollabInput] = useState('');
  const [newTagPersonInput, setNewTagPersonInput] = useState('');
  const [customHashtagInput, setCustomHashtagInput] = useState('');
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const [presetNotice, setPresetNotice] = useState<string | null>(null);

  const coverUploadInputId = useId();

  const currentAccount = accounts.find((a) => a.id === state.selectedAccountId) || accounts[0];
  const username = currentAccount?.handle?.replace(/^@/, '') || currentAccount?.name?.toLowerCase().replace(/\s+/g, '_') || 'creator';
  const avatarUrl = currentAccount?.avatarUrl;

  const durationSec = video?.durationSec || 30;

  const handleAddHashtag = (tagToAdd: string) => {
    const formatted = tagToAdd.trim().startsWith('#') ? tagToAdd.trim() : `#${tagToAdd.trim()}`;
    if (!state.hashtags.includes(formatted)) {
      onChange((prev) => ({
        ...prev,
        hashtags: [...prev.hashtags, formatted],
      }));
    }
  };

  const handleRemoveHashtag = (tagToRemove: string) => {
    onChange((prev) => ({
      ...prev,
      hashtags: prev.hashtags.filter((h) => h !== tagToRemove),
    }));
  };

  const handleInsertChipIntoCaption = (chip: string) => {
    onChange((prev) => ({
      ...prev,
      caption: prev.caption ? `${prev.caption} ${chip}` : chip,
    }));
  };

  const handleAddCollaborator = () => {
    const raw = newCollabInput.trim();
    if (!raw) return;
    const formatted = raw.startsWith('@') ? raw : `@${raw}`;
    if (!state.collaborators.includes(formatted)) {
      onChange((prev) => ({ ...prev, collaborators: [...prev.collaborators, formatted] }));
      setNewCollabInput('');
    }
  };

  const handleRemoveCollaborator = (collab: string) => {
    onChange((prev) => ({
      ...prev,
      collaborators: prev.collaborators.filter((c) => c !== collab),
    }));
  };

  const handleAddTagPerson = () => {
    const raw = newTagPersonInput.trim();
    if (!raw) return;
    const formatted = raw.startsWith('@') ? raw : `@${raw}`;
    if (!state.tagPeople.includes(formatted)) {
      onChange((prev) => ({ ...prev, tagPeople: [...prev.tagPeople, formatted] }));
      setNewTagPersonInput('');
    }
  };

  const handleRemoveTagPerson = (person: string) => {
    onChange((prev) => ({
      ...prev,
      tagPeople: prev.tagPeople.filter((p) => p !== person),
    }));
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChange((prev) => ({
        ...prev,
        coverImageUrl: reader.result as string,
        coverType: 'upload',
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;

    onChange((prev) => ({
      ...prev,
      caption: preset.captionTemplate || prev.caption,
      hashtags: preset.fixedHashtags && preset.fixedHashtags.length > 0 ? preset.fixedHashtags : prev.hashtags,
      shareToFeed: preset.shareToFeed !== undefined ? preset.shareToFeed : prev.shareToFeed,
      location: preset.defaultLocation || prev.location,
      collaborators: preset.collaborators || prev.collaborators,
    }));

    setPresetNotice(`Applied Instagram preset "${preset.name}"!`);
    setTimeout(() => setPresetNotice(null), 3000);
  };

  const handleTriggerCopy = () => {
    onCopyFromYouTube();
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 3000);
  };

  return (
    <div className="rounded-2xl border border-neutral-800 bg-black text-slate-100 shadow-2xl overflow-hidden animate-fade-in">
      {/* ============================================================== */}
      {/* INSTAGRAM HEADER BAR (Instagram Gradient Accents)              */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 bg-neutral-950 border-b border-neutral-800 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-0.5 flex items-center justify-center shadow-lg shadow-pink-900/20">
            <div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center">
              <Instagram className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                <span>Instagram Reels Composer</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300 border border-pink-500/40">
                  Reels Only (No Title)
                </span>
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Clean, title-free Reels composer with frame scrubber, collaborator tagging & feed sharing
            </p>
          </div>
        </div>

        {/* Top Actions: Account Selector + Copy from YT + Include Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Account selector */}
          {accounts.length > 0 && (
            <select
              value={state.selectedAccountId}
              onChange={(e) => onChange((prev) => ({ ...prev, selectedAccountId: e.target.value }))}
              className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  📸 {acc.name} ({acc.handle || '@account'})
                </option>
              ))}
            </select>
          )}

          {/* Copy from YouTube Button */}
          <button
            type="button"
            onClick={handleTriggerCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-slate-200 transition-all active:scale-95 shadow-sm"
            title="Import title hook, description & hashtags from YouTube tab"
          >
            <Copy className="w-3.5 h-3.5 text-red-400" />
            <span>Copy from YouTube</span>
          </button>

          {/* Include Instagram in Post Toggle */}
          <button
            type="button"
            onClick={() => onChange((prev) => ({ ...prev, includedInPost: !prev.includedInPost }))}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              state.includedInPost
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border-pink-500 shadow-md shadow-pink-900/30'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            {state.includedInPost ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Posting to Instagram</span>
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
          <span>Imported YouTube title and description into your Instagram Reels caption!</span>
        </div>
      )}

      {/* Preset Notice */}
      {presetNotice && (
        <div className="px-6 py-2.5 bg-pink-950/80 border-b border-pink-800 text-xs text-pink-200 flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-pink-400" />
          <span>{presetNotice}</span>
        </div>
      )}

      {/* Audio Warning Callout */}
      <div className="px-6 py-3 bg-gradient-to-r from-purple-950/40 via-neutral-900 to-pink-950/40 border-b border-neutral-800 flex items-start sm:items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
          <Music2 className="w-4 h-4" />
        </div>
        <div className="text-xs">
          <strong className="text-white block font-bold">Audio Track Information:</strong>
          <span className="text-neutral-400">
            {VERIFIED_PLATFORM_LIMITS.instagram.audioNotice} Any background music or voiceover in your edited video will automatically be published as "Original Audio".
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2-COLUMN WORKSPACE: COMPOSER + INSTAGRAM PREVIEWS              */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        {/* LEFT COLUMN: REELS COMPOSER (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Presets dropdown for Instagram */}
          {presets.filter((p) => p.platform === 'instagram').length > 0 && (
            <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800">
              <span className="text-xs text-neutral-300 font-semibold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-pink-400" />
                <span>Instagram Presets:</span>
              </span>
              <select
                onChange={(e) => {
                  if (e.target.value) handleApplyPreset(e.target.value);
                }}
                defaultValue=""
                className="bg-black border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
              >
                <option value="">Apply Preset...</option>
                {presets
                  .filter((p) => p.platform === 'instagram')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Reel Cover Picker / Frame Scrubber */}
          <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Cover Photo</span>
                  <span className="text-[10px] text-neutral-400 font-normal">(Reels Cover & Profile Grid)</span>
                </label>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Select a frame from your video or upload an image from your gallery.
                </p>
              </div>

              <div className="flex items-center bg-black p-0.5 rounded-lg border border-neutral-800">
                <button
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, coverType: 'frame' }))}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                    state.coverType === 'frame'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Scrub Video
                </button>
                <button
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, coverType: 'upload' }))}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                    state.coverType === 'upload'
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Upload Image
                </button>
              </div>
            </div>

            {state.coverType === 'frame' ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span>Scrub frame position:</span>
                  <span className="font-mono text-pink-400 font-bold">{state.coverFrameSec.toFixed(1)}s / {durationSec}s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={durationSec}
                  step="0.5"
                  value={state.coverFrameSec}
                  onChange={(e) => onChange((prev) => ({ ...prev, coverFrameSec: parseFloat(e.target.value) }))}
                  className="w-full accent-pink-500 bg-neutral-800 h-2 rounded-lg cursor-pointer"
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 pt-1">
                {state.coverImageUrl ? (
                  <img
                    src={state.coverImageUrl}
                    alt="Custom Cover"
                    className="w-16 h-24 object-cover rounded-lg border border-pink-500/50 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-24 rounded-lg bg-neutral-900 border border-dashed border-neutral-700 flex flex-col items-center justify-center text-neutral-500">
                    <Upload className="w-4 h-4 mb-1" />
                    <span className="text-[8px]">9:16</span>
                  </div>
                )}
                <div>
                  <input
                    id={coverUploadInputId}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor={coverUploadInputId}
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5 text-pink-400" />
                    <span>Upload Custom Cover</span>
                  </label>
                  <p className="text-[10px] text-neutral-500 mt-1">Recommended: 1080x1920 (9:16 aspect ratio)</p>
                </div>
              </div>
            )}
          </div>

          {/* Single Caption Box (Max 2200 characters) - NO TITLE FIELD */}
          <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Write a caption...</span>
                  <span className="text-[10px] text-neutral-400 font-normal">(No title field on Instagram)</span>
                </label>
              </div>
              <span
                className={`text-[11px] font-mono ${
                  state.caption.length > VERIFIED_PLATFORM_LIMITS.instagram.maxCaptionLength
                    ? 'text-red-400 font-bold'
                    : 'text-neutral-400'
                }`}
              >
                {state.caption.length}/{VERIFIED_PLATFORM_LIMITS.instagram.maxCaptionLength}
              </span>
            </div>

            <textarea
              rows={6}
              value={state.caption}
              maxLength={2200}
              onChange={(e) => onChange((prev) => ({ ...prev, caption: e.target.value }))}
              placeholder="Hook your audience in the first line! Add line breaks, call-to-actions, and tags..."
              className="w-full bg-black border border-neutral-800 focus:border-pink-500 rounded-xl p-3.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-pink-500 transition-all leading-relaxed font-sans"
            />

            {/* Quick Hashtag & @Mention Chips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                Quick Insert Chips:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleInsertChipIntoCaption(chip.label)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-neutral-900 border border-neutral-800 hover:border-pink-500/50 text-neutral-300 hover:text-white transition-all active:scale-95"
                  >
                    {chip.type === 'hashtag' ? <Hash className="w-3 h-3 text-pink-400" /> : <AtSign className="w-3 h-3 text-purple-400" />}
                    <span>{chip.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Curated Instagram Hashtags Section (5 recommended limit) */}
          <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-pink-400" />
                  <span>Hashtags for Explore & Reels algorithm</span>
                </label>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Meta officially recommends 3–5 high-relevance hashtags for maximum distribution.
                </p>
              </div>
              <span className="text-[11px] font-mono text-pink-400 font-bold">
                {state.hashtags.length} / {VERIFIED_PLATFORM_LIMITS.instagram.recommendedHashtagsLimit} recommended
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={customHashtagInput}
                onChange={(e) => setCustomHashtagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    if (customHashtagInput.trim()) {
                      handleAddHashtag(customHashtagInput);
                      setCustomHashtagInput('');
                    }
                  }
                }}
                placeholder="Add hashtag (press Enter)..."
                className="flex-1 bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (customHashtagInput.trim()) {
                    handleAddHashtag(customHashtagInput);
                    setCustomHashtagInput('');
                  }
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700"
              >
                Add
              </button>
            </div>

            {/* Active Hashtag Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {state.hashtags.map((h) => (
                <span
                  key={h}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-pink-950/40 border border-pink-800/60 text-pink-200"
                >
                  <span>{h}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveHashtag(h)}
                    className="text-pink-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Location & Tag People */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Location Input */}
            <div className="space-y-1 p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800">
              <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-pink-400" />
                <span>Add Location</span>
              </label>
              <input
                type="text"
                value={state.location}
                onChange={(e) => onChange((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="e.g. Tokyo, Japan"
                list="popular-locations-list"
                className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
              <datalist id="popular-locations-list">
                {POPULAR_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
            </div>

            {/* Tag People */}
            <div className="space-y-1 p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800">
              <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-purple-400" />
                <span>Tag People</span>
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newTagPersonInput}
                  onChange={(e) => setNewTagPersonInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTagPerson();
                    }
                  }}
                  placeholder="@handle..."
                  className="flex-1 bg-black border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={handleAddTagPerson}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-neutral-900 border border-neutral-700 text-white"
                >
                  Tag
                </button>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {state.tagPeople.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-neutral-900 border border-neutral-700 text-purple-300"
                  >
                    <span>{p}</span>
                    <button type="button" onClick={() => handleRemoveTagPerson(p)}>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Collaborators */}
          <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-pink-400" />
                <span>Invite Collaborators</span>
              </label>
              <span className="text-[10px] text-neutral-400">Co-authors shown in header</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCollabInput}
                onChange={(e) => setNewCollabInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCollaborator();
                  }
                }}
                placeholder="Enter Instagram username (e.g. @animespotlight)..."
                className="flex-1 bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
              <button
                type="button"
                onClick={handleAddCollaborator}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-neutral-900 border border-neutral-700 text-white"
              >
                Invite
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {state.collaborators.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-pink-950/40 border border-pink-800/60 text-pink-200"
                >
                  <span>{c}</span>
                  <button type="button" onClick={() => handleRemoveCollaborator(c)}>
                    <X className="w-3 h-3 text-pink-400" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* "Also share to feed" Toggle */}
          <div className="flex items-center justify-between p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
            <div>
              <span className="text-xs font-bold text-white block">Also share to Feed</span>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Display this Reel on your main profile grid and in your followers' home feeds.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={state.shareToFeed}
                onChange={(e) => onChange((prev) => ({ ...prev, shareToFeed: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-purple-600"></div>
            </label>
          </div>

          {/* Schedule Controls for Instagram */}
          <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <span className="text-xs font-bold text-white block">Publish Timing</span>
                <p className="text-[11px] text-neutral-400 mt-0.5">Post immediately or defer via automated cron job.</p>
              </div>
              <div className="flex items-center bg-black p-0.5 rounded-lg border border-neutral-800">
                <button
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, scheduled: false }))}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    !state.scheduled
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Post Now
                </button>
                <button
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, scheduled: true }))}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    state.scheduled
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Schedule
                </button>
              </div>
            </div>

            {state.scheduled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 animate-fade-in">
                <div>
                  <label className="text-[10px] font-semibold text-neutral-400">Date</label>
                  <input
                    type="date"
                    value={state.scheduleDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => onChange((prev) => ({ ...prev, scheduleDate: e.target.value }))}
                    className="w-full bg-black border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-neutral-400">Time</label>
                  <input
                    type="time"
                    value={state.scheduleTime}
                    onChange={(e) => onChange((prev) => ({ ...prev, scheduleTime: e.target.value }))}
                    className="w-full bg-black border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-neutral-400">Timezone</label>
                  <select
                    value={state.scheduleTimeZone}
                    onChange={(e) => onChange((prev) => ({ ...prev, scheduleTimeZone: e.target.value }))}
                    className="w-full bg-black border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: INSTAGRAM PREVIEWS (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Preview Mode Switcher */}
          <div className="flex items-center justify-between bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            <span className="text-[11px] font-bold text-neutral-400 px-2 uppercase tracking-wider">
              Instagram Preview:
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPreviewTab('reels')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  previewTab === 'reels'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Full Reel</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('grid')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  previewTab === 'grid'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>Grid Crop (1:1)</span>
              </button>
            </div>
          </div>

          {/* -------------------------------------------------------- */}
          {/* PREVIEW 1: FULL-SCREEN REELS PLAYER                      */}
          {/* -------------------------------------------------------- */}
          {previewTab === 'reels' && (
            <div className="relative mx-auto w-full max-w-[290px] aspect-[9/16] rounded-3xl bg-black border-4 border-neutral-800 overflow-hidden shadow-2xl flex flex-col justify-between p-4 text-white animate-fade-in select-none">
              {/* Video background */}
              {state.coverImageUrl || video?.publicUrl ? (
                <img
                  src={state.coverImageUrl || video?.publicUrl}
                  alt="Reel Cover"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 via-neutral-950 to-black" />
              )}

              {/* Gradient Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40 pointer-events-none" />

              {/* Top Bar: Reels Header */}
              <div className="relative z-10 flex items-center justify-between text-xs pt-1">
                <span className="font-bold text-sm tracking-tight drop-shadow">Reels</span>
                <span className="text-xs drop-shadow">📸</span>
              </div>

              {/* Right Side Actions: Heart, Comment, Share, Bookmark, Audio */}
              <div className="relative z-10 self-end flex flex-col items-center gap-3 pb-8 text-center text-xs">
                {/* Like */}
                <div className="flex flex-col items-center">
                  <Heart className="w-6 h-6 text-white drop-shadow hover:text-red-500 cursor-pointer transition-colors" />
                  <span className="text-[10px] font-bold mt-1 drop-shadow">48.2K</span>
                </div>

                {/* Comment */}
                <div className="flex flex-col items-center">
                  <MessageCircle className="w-6 h-6 text-white drop-shadow hover:text-neutral-300 cursor-pointer transition-colors" />
                  <span className="text-[10px] font-bold mt-1 drop-shadow">1,204</span>
                </div>

                {/* Share/Send */}
                <div className="flex flex-col items-center">
                  <Send className="w-6 h-6 text-white drop-shadow hover:text-neutral-300 cursor-pointer transition-colors -rotate-45" />
                  <span className="text-[10px] font-bold mt-1 drop-shadow">15.9K</span>
                </div>

                {/* Bookmark */}
                <div className="flex flex-col items-center">
                  <Bookmark className="w-6 h-6 text-white drop-shadow hover:text-neutral-300 cursor-pointer transition-colors" />
                </div>

                {/* Audio Disc Album */}
                <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-white/30 flex items-center justify-center overflow-hidden">
                  <Music2 className="w-4 h-4 text-pink-400" />
                </div>
              </div>

              {/* Bottom Caption & Audio Bar */}
              <div className="relative z-10 space-y-2 pb-1">
                {/* Username + Follow */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-0.5">
                    <div className="w-full h-full bg-black rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                      ) : (
                        username.charAt(0).toUpperCase()
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold drop-shadow">@{username}</span>
                  <button
                    type="button"
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-white/60 bg-transparent text-white"
                  >
                    Follow
                  </button>
                </div>

                {/* Location indicator */}
                {state.location && (
                  <div className="text-[10px] text-neutral-300 flex items-center gap-1 drop-shadow">
                    <MapPin className="w-3 h-3 text-pink-400" />
                    <span>{state.location}</span>
                  </div>
                )}

                {/* Caption with Expand/Collapse */}
                <div className="text-xs leading-relaxed drop-shadow">
                  <p className={captionExpanded ? '' : 'line-clamp-2'}>
                    {state.caption || 'Write a viral caption with hooks, line breaks & tags...'}
                  </p>
                  {state.caption && state.caption.length > 70 && (
                    <button
                      type="button"
                      onClick={() => setCaptionExpanded(!captionExpanded)}
                      className="text-[10px] text-neutral-400 font-bold hover:text-white mt-0.5"
                    >
                      {captionExpanded ? 'less' : '...more'}
                    </button>
                  )}
                </div>

                {/* Hashtag List */}
                {state.hashtags.length > 0 && (
                  <div className="text-[11px] font-medium text-pink-300 drop-shadow line-clamp-1">
                    {state.hashtags.join(' ')}
                  </div>
                )}

                {/* Audio label */}
                <div className="flex items-center gap-1.5 text-[10px] text-white/90 drop-shadow truncate">
                  <Music2 className="w-3 h-3 text-pink-400 shrink-0" />
                  <span className="truncate">Original audio - {username} • Phonk Drift</span>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* PREVIEW 2: PROFILE GRID CROP (1:1 SQUARE)                */}
          {/* -------------------------------------------------------- */}
          {previewTab === 'grid' && (
            <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3 animate-fade-in text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Instagram Profile Grid Preview (1:1 Center Crop)
                </span>
                <span className="text-[10px] text-pink-400 font-mono">Square Feed Crop</span>
              </div>

              {/* 3x3 Mockup Grid */}
              <div className="grid grid-cols-3 gap-1 bg-black p-2 rounded-xl border border-neutral-800">
                {/* Active Reel cell (top-left) */}
                <div className="relative aspect-square bg-neutral-900 rounded overflow-hidden border-2 border-pink-500 shadow-lg">
                  {state.coverImageUrl || video?.publicUrl ? (
                    <img
                      src={state.coverImageUrl || video?.publicUrl}
                      alt="Grid cover"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600">
                      <Instagram className="w-5 h-5" />
                    </div>
                  )}
                  <span className="absolute top-1 right-1">
                    <Instagram className="w-3 h-3 text-white drop-shadow" />
                  </span>
                  <div className="absolute bottom-1 left-1 flex items-center gap-0.5 text-[9px] text-white font-bold drop-shadow">
                    <Eye className="w-2.5 h-2.5" />
                    <span>New</span>
                  </div>
                </div>

                {/* Dummy previous posts for realistic profile look */}
                <div className="aspect-square bg-neutral-900 rounded overflow-hidden flex items-center justify-center text-neutral-700">
                  <span className="text-[9px]">Post 2</span>
                </div>
                <div className="aspect-square bg-neutral-900 rounded overflow-hidden flex items-center justify-center text-neutral-700">
                  <span className="text-[9px]">Post 3</span>
                </div>
                <div className="aspect-square bg-neutral-900 rounded overflow-hidden flex items-center justify-center text-neutral-700">
                  <span className="text-[9px]">Post 4</span>
                </div>
                <div className="aspect-square bg-neutral-900 rounded overflow-hidden flex items-center justify-center text-neutral-700">
                  <span className="text-[9px]">Post 5</span>
                </div>
                <div className="aspect-square bg-neutral-900 rounded overflow-hidden flex items-center justify-center text-neutral-700">
                  <span className="text-[9px]">Post 6</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-black border border-neutral-800 text-[10px] text-neutral-400">
                📱 <strong>Grid Composition Tip:</strong> Instagram crops 9:16 Reels into a 1:1 center square on your profile. Ensure characters and text overlays are vertically centered.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
