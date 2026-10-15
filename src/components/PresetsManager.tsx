import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Youtube,
  Instagram,
  Save,
  Check,
  Plus,
  X,
  Sparkles,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  Tag,
  Hash,
  Globe,
  Film,
  Info,
  MapPin,
  Users,
  Shield,
  Layers,
} from 'lucide-react';
import { Platform, PlatformPreset, PrivacyStatus, AITone } from '@shared/types';
import { ApiClient } from '../api';

interface PresetsManagerProps {
  presets: PlatformPreset[];
  onPresetsUpdated: (presets: PlatformPreset[]) => void;
  onBackToStudio?: () => void;
}

const YOUTUBE_CATEGORIES = [
  { id: '1', name: 'Film & Animation (Recommended for Anime/Marvel edits)' },
  { id: '24', name: 'Entertainment (Pop culture, trends, shows)' },
  { id: '20', name: 'Gaming (Gameplay, velocity edits, montages)' },
  { id: '10', name: 'Music (Music videos, remix edits)' },
  { id: '22', name: 'People & Blogs (Vlogs, reactions, creators)' },
  { id: '23', name: 'Comedy (Memes, funny edits)' },
  { id: '26', name: 'Howto & Style (Tutorials, editing tutorials)' },
  { id: '28', name: 'Science & Technology (Tech breakdowns, software)' },
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

export const PresetsManager: React.FC<PresetsManagerProps> = ({
  presets,
  onPresetsUpdated,
  onBackToStudio,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('youtube');
  const [activePresetId, setActivePresetId] = useState<string>('');
  const [activePreset, setActivePreset] = useState<PlatformPreset | null>(null);

  // Form input state
  const [newTag, setNewTag] = useState('');
  const [newHashtag, setNewHashtag] = useState('');
  const [newCollab, setNewCollab] = useState('');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter presets for current platform
  const platformPresets = presets.filter((p) => p.platform === selectedPlatform);

  // Sync selected preset when platform changes or presets update
  useEffect(() => {
    if (platformPresets.length > 0) {
      const match = platformPresets.find((p) => p.id === activePresetId) || platformPresets[0];
      setActivePresetId(match.id);
      setActivePreset({ ...match });
    }
  }, [selectedPlatform, presets]);

  const handleSelectPreset = (preset: PlatformPreset) => {
    setActivePresetId(preset.id);
    setActivePreset({ ...preset });
    setErrorMsg(null);
  };

  const handleCreateNewPreset = () => {
    const isYt = selectedPlatform === 'youtube';
    const newId = `custom-${selectedPlatform}-${Date.now()}`;
    const fresh: PlatformPreset = {
      id: newId,
      platform: selectedPlatform,
      name: `Custom ${isYt ? 'YouTube' : 'Instagram'} Preset`,
      genre: 'custom',
      titleTemplate: isYt ? '{character} | {series} Edit ⚡ [{edit_style}] #Shorts' : undefined,
      descriptionTemplate: isYt
        ? 'Epic edit of {character} from {series}!\n\nAnime/Movie: {series}\nCharacter: {character}\nStyle: {edit_style}'
        : undefined,
      captionTemplate: !isYt
        ? '{character} is honestly terrifying 🥶 Who is beating them in {series}?\n\nAudio: Trending Phonk\nVisuals: {series} - {character}'
        : undefined,
      fixedHashtags: isYt ? [] : ['#reels', '#reelsviral', '#explorepage'],
      tags: isYt ? ['shorts', 'viral', 'edit'] : [],
      descriptionFooter: isYt
        ? '\n\n━━━━━━━━━━━━━━━━━━━━━━\n🔔 Subscribe for daily edits: https://youtube.com/@channel'
        : '\n\n---\n📌 Save this Reel & follow for daily drops!',
      category: '1',
      privacy: 'public',
      tone: 'viral_hook',
      shareToFeed: true,
      madeForKids: false,
      language: 'en',
      defaultLocation: !isYt ? 'Tokyo, Japan' : undefined,
      collaborators: [],
      hashtagLimit: 5,
      updatedAt: new Date().toISOString(),
    };
    setActivePresetId(newId);
    setActivePreset(fresh);
    setErrorMsg(null);
  };

  // Tag manipulation for YouTube
  const handleAddTag = () => {
    if (!activePreset || !newTag.trim()) return;
    const clean = newTag.trim().replace(/^#/, '');
    const currentTags = activePreset.tags || [];
    if (!currentTags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setActivePreset({
        ...activePreset,
        tags: [...currentTags, clean],
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!activePreset) return;
    setActivePreset({
      ...activePreset,
      tags: (activePreset.tags || []).filter((t) => t !== tagToRemove),
    });
  };

  // Hashtag manipulation for Instagram
  const handleAddHashtag = () => {
    if (!activePreset || !newHashtag.trim()) return;
    const formatted = newHashtag.trim().startsWith('#') ? newHashtag.trim() : `#${newHashtag.trim()}`;
    const current = activePreset.fixedHashtags || [];
    if (!current.some((h) => h.toLowerCase() === formatted.toLowerCase())) {
      setActivePreset({
        ...activePreset,
        fixedHashtags: [...current, formatted],
      });
      setNewHashtag('');
    }
  };

  const handleRemoveHashtag = (hashToRemove: string) => {
    if (!activePreset) return;
    setActivePreset({
      ...activePreset,
      fixedHashtags: (activePreset.fixedHashtags || []).filter((h) => h !== hashToRemove),
    });
  };

  // Collaborators manipulation for Instagram
  const handleAddCollaborator = () => {
    if (!activePreset || !newCollab.trim()) return;
    const clean = newCollab.trim().startsWith('@') ? newCollab.trim() : `@${newCollab.trim()}`;
    const current = activePreset.collaborators || [];
    if (!current.includes(clean)) {
      setActivePreset({
        ...activePreset,
        collaborators: [...current, clean],
      });
      setNewCollab('');
    }
  };

  const handleRemoveCollaborator = (handle: string) => {
    if (!activePreset) return;
    setActivePreset({
      ...activePreset,
      collaborators: (activePreset.collaborators || []).filter((c) => c !== handle),
    });
  };

  // Insert variable tag helper
  const handleInsertVariable = (variable: string, field: 'title' | 'description' | 'caption') => {
    if (!activePreset) return;
    if (field === 'title') {
      setActivePreset({
        ...activePreset,
        titleTemplate: (activePreset.titleTemplate || '') + variable,
      });
    } else if (field === 'description') {
      setActivePreset({
        ...activePreset,
        descriptionTemplate: (activePreset.descriptionTemplate || '') + variable,
      });
    } else if (field === 'caption') {
      setActivePreset({
        ...activePreset,
        captionTemplate: (activePreset.captionTemplate || '') + variable,
      });
    }
  };

  const handleSave = async () => {
    if (!activePreset) return;
    setIsSaving(true);
    setSaveSuccessMsg(false);
    setErrorMsg(null);

    try {
      const saved = await ApiClient.savePreset(activePreset);
      const exists = presets.some((p) => p.id === saved.id);
      const updatedList = exists
        ? presets.map((p) => (p.id === saved.id ? saved : p))
        : [...presets, saved];

      onPresetsUpdated(updatedList);
      setSaveSuccessMsg(true);
      setTimeout(() => setSaveSuccessMsg(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save preset settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Compute total tag characters for YouTube (500 char limit)
  const totalTagChars = (activePreset?.tags || []).join(',').length;

  if (!activePreset) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <Sliders className="w-8 h-8 text-indigo-400 animate-pulse mb-3" />
        <p className="text-sm font-medium">Loading upload presets...</p>
      </div>
    );
  }

  const isYouTube = selectedPlatform === 'youtube';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top Header & Back to Studio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          {onBackToStudio && (
            <button
              type="button"
              onClick={onBackToStudio}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center justify-center"
              title="Return to Studio"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Upload Presets & Defaults
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Real API Fields
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure ready-made anime, Marvel, manhwa, and custom upload templates for each platform
            </p>
          </div>
        </div>

        {/* Platform Selector */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setSelectedPlatform('youtube')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isYouTube
                ? 'bg-red-500/20 text-red-300 border border-red-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Youtube className="w-4 h-4 text-red-400" />
            YouTube Shorts
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlatform('instagram')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !isYouTube
                ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300 border border-pink-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Instagram className="w-4 h-4 text-pink-400" />
            Instagram Reels
          </button>
        </div>
      </div>

      {/* Preset Library Selection Carousel / Pills */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Select Preset to Edit ({platformPresets.length} available)
          </label>
          <button
            type="button"
            onClick={handleCreateNewPreset}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Custom Preset
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {platformPresets.map((p) => {
            const isSelected = p.id === activePreset.id;
            let badgeBg = 'bg-slate-800 text-slate-300 border-slate-700';
            if (p.genre === 'anime') badgeBg = 'bg-purple-950/40 text-purple-300 border-purple-800/60';
            if (p.genre === 'marvel') badgeBg = 'bg-red-950/40 text-red-300 border-red-800/60';
            if (p.genre === 'manhwa') badgeBg = 'bg-amber-950/40 text-amber-300 border-amber-800/60';
            if (p.genre === 'gaming') badgeBg = 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60';

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center gap-2 ${
                  isSelected
                    ? isYouTube
                      ? 'bg-red-500/15 border-red-500/60 text-white shadow-md ring-1 ring-red-500/40'
                      : 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500/60 text-white shadow-md ring-1 ring-pink-500/40'
                    : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                }`}
              >
                <span>{p.name}</span>
                {p.genre && p.genre !== 'custom' && (
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md border ${badgeBg}`}>
                    {p.genre}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error / Success Notifications */}
      {errorMsg && (
        <div className="p-3.5 bg-red-950/80 border border-red-800 rounded-xl text-xs flex items-center justify-between text-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="p-1 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs flex items-center gap-2 text-emerald-200">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Preset "{activePreset.name}" successfully saved! Ready to apply in Studio.</span>
        </div>
      )}

      {/* Preset Name & Genre Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Preset Display Name</label>
            <input
              type="text"
              value={activePreset.name}
              onChange={(e) => setActivePreset({ ...activePreset, name: e.target.value })}
              placeholder="e.g. Anime Edit (4K HDR / Phonk)"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Preset Genre / Category</label>
            <select
              value={activePreset.genre || 'custom'}
              onChange={(e) => setActivePreset({ ...activePreset, genre: e.target.value as any })}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="anime">Anime Edit (AMV / Phonk)</option>
              <option value="marvel">Marvel Edit (MCU / Cinematic)</option>
              <option value="manhwa">Manhwa / Webtoon Edit</option>
              <option value="gaming">Gaming & Velocity Montage</option>
              <option value="cinematic">Cinematic Aesthetic</option>
              <option value="custom">Custom Creator Style</option>
            </select>
          </div>
        </div>

        {/* Dynamic Variable Insertion Quick-Chips */}
        <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-indigo-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Dynamic AI Variable Placeholders (Auto-filled by Gemini from video detection):
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleInsertVariable('{character}', isYouTube ? 'title' : 'caption')}
              className="px-2.5 py-1 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 rounded-lg text-indigo-300 transition-colors font-mono text-[11px]"
              title="Click to insert {character} placeholder"
            >
              + {'{character}'} <span className="text-slate-400 font-sans">(e.g. Gojo Satoru, Spider-Man)</span>
            </button>
            <button
              type="button"
              onClick={() => handleInsertVariable('{series}', isYouTube ? 'title' : 'caption')}
              className="px-2.5 py-1 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 rounded-lg text-purple-300 transition-colors font-mono text-[11px]"
              title="Click to insert {series} placeholder"
            >
              + {'{series}'} <span className="text-slate-400 font-sans">(e.g. Jujutsu Kaisen, Marvel MCU)</span>
            </button>
            <button
              type="button"
              onClick={() => handleInsertVariable('{edit_style}', isYouTube ? 'title' : 'caption')}
              className="px-2.5 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 rounded-lg text-cyan-300 transition-colors font-mono text-[11px]"
              title="Click to insert {edit_style} placeholder"
            >
              + {'{edit_style}'} <span className="text-slate-400 font-sans">(e.g. 4K HDR Phonk Velocity)</span>
            </button>
          </div>
        </div>
      </div>

      {/* PLATFORM FORM: YOUTUBE SHORTS */}
      {isYouTube && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Youtube className="w-5 h-5 text-red-500" />
            <h2 className="text-sm font-bold text-white">YouTube Upload Screen Fields</h2>
          </div>

          {/* 1. Title Template & Counter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <label className="text-slate-300">Title Template</label>
              <span
                className={`font-mono text-[11px] ${
                  (activePreset.titleTemplate || '').length > 100 ? 'text-red-400 font-bold' : 'text-slate-400'
                }`}
              >
                {(activePreset.titleTemplate || '').length}/100 characters
              </span>
            </div>
            <input
              type="text"
              value={activePreset.titleTemplate || ''}
              maxLength={100}
              onChange={(e) => setActivePreset({ ...activePreset, titleTemplate: e.target.value })}
              placeholder="{character} | {series} Edit ⚡ [{edit_style}] #Shorts"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <p className="text-[11px] text-slate-400">
              Must be under 100 characters. Includes '#Shorts' for YouTube Shorts shelf qualification.
            </p>
          </div>

          {/* 2. Description Template & Footer (5000 chars) */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <label className="text-slate-300">Description Body Template</label>
                <span className="font-mono text-[11px] text-slate-400">
                  {((activePreset.descriptionTemplate || '') + (activePreset.descriptionFooter || '')).length}/5000 characters
                </span>
              </div>
              <textarea
                rows={4}
                value={activePreset.descriptionTemplate || ''}
                onChange={(e) => setActivePreset({ ...activePreset, descriptionTemplate: e.target.value })}
                placeholder="Witness {character} at absolute peak power in this {series} edit!..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-red-400" />
                Description Permanent Footer (Social links, disclaimers, credits)
              </label>
              <textarea
                rows={3}
                value={activePreset.descriptionFooter || ''}
                onChange={(e) => setActivePreset({ ...activePreset, descriptionFooter: e.target.value })}
                placeholder="━━━━━━━━━━━━━━━━━━━━━━&#10;🔔 Subscribe: https://youtube.com/@channel&#10;🎨 Edited in After Effects"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
              />
            </div>
          </div>

          {/* 3. Tags (500 character counter) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <label className="text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                YouTube Search Tags (Niche ranking tags)
              </label>
              <span
                className={`font-mono text-[11px] ${
                  totalTagChars > 500 ? 'text-red-400 font-bold' : 'text-slate-400'
                }`}
              >
                {totalTagChars}/500 characters used
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 p-3 bg-slate-950/70 border border-slate-800 rounded-xl min-h-[48px]">
              {(activePreset.tags || []).map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 text-slate-200 rounded-lg text-xs font-medium"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="text-slate-400 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {(activePreset.tags || []).length === 0 && (
                <span className="text-xs text-slate-500 py-1">No tags added yet. Type below and press Enter.</span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add YouTube tag (e.g. anime edit, 4k amv, gojo satoru)..."
                className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
              >
                Add Tag
              </button>
            </div>
          </div>

          {/* 4. Category & Language Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">YouTube Category</label>
              <select
                value={activePreset.category || '1'}
                onChange={(e) => setActivePreset({ ...activePreset, category: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {YOUTUBE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                Default Video Language
              </label>
              <select
                value={activePreset.language || 'en'}
                onChange={(e) => setActivePreset({ ...activePreset, language: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Visibility & Made for Kids */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Default Visibility</label>
              <div className="grid grid-cols-3 gap-2">
                {(['public', 'unlisted', 'private'] as PrivacyStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setActivePreset({ ...activePreset, privacy: st })}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold capitalize border transition-all ${
                      activePreset.privacy === st
                        ? 'bg-red-500/20 border-red-500/50 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                Audience (COPPA Compliance)
              </label>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="madeForKids"
                    checked={activePreset.madeForKids === false}
                    onChange={() => setActivePreset({ ...activePreset, madeForKids: false })}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span>No, not made for kids (Standard)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="madeForKids"
                    checked={activePreset.madeForKids === true}
                    onChange={() => setActivePreset({ ...activePreset, madeForKids: true })}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span>Yes, made for kids</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLATFORM FORM: INSTAGRAM REELS */}
      {!isYouTube && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Instagram className="w-5 h-5 text-pink-500" />
            <h2 className="text-sm font-bold text-white">Instagram Reels Upload Screen Fields</h2>
          </div>

          {/* 1. Caption Template & 2200 char counter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <label className="text-slate-300">Caption Template</label>
              <span
                className={`font-mono text-[11px] ${
                  (activePreset.captionTemplate || '').length > 2200 ? 'text-red-400 font-bold' : 'text-slate-400'
                }`}
              >
                {((activePreset.captionTemplate || '') + (activePreset.descriptionFooter || '')).length}/2200 characters
              </span>
            </div>
            <textarea
              rows={4}
              value={activePreset.captionTemplate || ''}
              onChange={(e) => setActivePreset({ ...activePreset, captionTemplate: e.target.value })}
              placeholder="{character} is built different 🥶 Who could actually stand a chance against them in {series}?..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500 font-sans"
            />
          </div>

          {/* 2. Caption Footer */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Caption Footer (Permanent signature)</label>
            <textarea
              rows={2}
              value={activePreset.descriptionFooter || ''}
              onChange={(e) => setActivePreset({ ...activePreset, descriptionFooter: e.target.value })}
              placeholder="---\n🔥 Follow for daily edits & manga panels!\n📌 Save this Reel so you don't lose it"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono"
            />
          </div>

          {/* 3. Hashtag Limit Setting (Verified with Google Search Grounding) */}
          <div className="p-4 bg-slate-950/70 border border-pink-500/20 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-pink-400" />
                  Instagram Hashtag Limit Setting
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Verified via Google Search grounding: Instagram now officially recommends a maximum of{' '}
                  <strong className="text-pink-300">5 hashtags</strong> per post or Reel.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={activePreset.hashtagLimit || 5}
                  onChange={(e) =>
                    setActivePreset({
                      ...activePreset,
                      hashtagLimit: Math.max(1, Math.min(30, parseInt(e.target.value, 10) || 5)),
                    })
                  }
                  className="w-16 bg-slate-900 border border-pink-500/30 rounded-xl px-2.5 py-1.5 text-center text-sm font-bold text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <span className="text-xs text-slate-400">max tags</span>
              </div>
            </div>

            {/* Fixed Hashtags Manager */}
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-300">Preset Niche Hashtags</label>
                <span className="text-slate-400 text-[11px]">
                  {(activePreset.fixedHashtags || []).length} / {activePreset.hashtagLimit || 5} selected
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 p-3 bg-slate-900/60 border border-slate-800 rounded-xl min-h-[44px]">
                {(activePreset.fixedHashtags || []).map((h) => (
                  <span
                    key={h}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-950/40 border border-pink-800/40 text-pink-300 rounded-lg text-xs font-medium"
                  >
                    {h}
                    <button
                      type="button"
                      onClick={() => handleRemoveHashtag(h)}
                      className="text-pink-400 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newHashtag}
                  onChange={(e) => setNewHashtag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddHashtag())}
                  placeholder="Add hashtag (e.g. #animeedit, #reelsviral)..."
                  className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <button
                  type="button"
                  onClick={handleAddHashtag}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
                >
                  Add Tag
                </button>
              </div>
            </div>
          </div>

          {/* 4. Share to Feed Toggle & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-pink-400" />
                Default Tagged Location
              </label>
              <input
                type="text"
                value={activePreset.defaultLocation || ''}
                onChange={(e) => setActivePreset({ ...activePreset, defaultLocation: e.target.value })}
                placeholder="e.g. Tokyo, Japan or New York, NY"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Feed Distribution</label>
              <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Also share to Feed</div>
                  <div className="text-[10px] text-slate-400">Shows in profile grid and main feed</div>
                </div>
                <input
                  type="checkbox"
                  checked={activePreset.shareToFeed}
                  onChange={(e) => setActivePreset({ ...activePreset, shareToFeed: e.target.checked })}
                  className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 bg-slate-900 border-slate-700 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 5. Collaborators */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              Default Collaborator Handles
            </label>
            <div className="flex flex-wrap gap-1.5 p-3 bg-slate-950/70 border border-slate-800 rounded-xl min-h-[44px]">
              {(activePreset.collaborators || []).map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-950/40 border border-purple-800/40 text-purple-300 rounded-lg text-xs font-medium"
                >
                  {c}
                  <button
                    type="button"
                    onClick={() => handleRemoveCollaborator(c)}
                    className="text-purple-400 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {(activePreset.collaborators || []).length === 0 && (
                <span className="text-xs text-slate-500 py-1">No default collaborators configured.</span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newCollab}
                onChange={(e) => setNewCollab(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCollaborator())}
                placeholder="Add collaborator username (e.g. @animespotlight, @marvelstudios)..."
                className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <button
                type="button"
                onClick={handleAddCollaborator}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Button Bar */}
      <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="text-xs text-slate-400">
          Last updated:{' '}
          <span className="text-slate-300 font-mono">
            {new Date(activePreset.updatedAt || Date.now()).toLocaleTimeString()}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all ${
            isYouTube
              ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
              : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 shadow-pink-600/30'
          } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Saving Preset...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Preset</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
