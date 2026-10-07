import React, { useState, useEffect } from 'react';
import { Sliders, Youtube, Instagram, Save, Check, Plus, X, Sparkles, Database } from 'lucide-react';
import { Platform, PlatformPreset, PrivacyStatus, AITone } from '@shared/types';
import { ApiClient } from '../api';

interface PresetsManagerProps {
  presets: PlatformPreset[];
  onPresetsUpdated: (presets: PlatformPreset[]) => void;
}

export const PresetsManager: React.FC<PresetsManagerProps> = ({
  presets,
  onPresetsUpdated,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('youtube');
  const [activePreset, setActivePreset] = useState<PlatformPreset | null>(null);
  const [newHashtag, setNewHashtag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  useEffect(() => {
    const p = presets.find((item) => item.platform === selectedPlatform);
    if (p) {
      setActivePreset({ ...p });
    }
  }, [selectedPlatform, presets]);

  const handleAddHashtag = () => {
    if (!activePreset || !newHashtag.trim()) return;
    const formatted = newHashtag.trim().startsWith('#')
      ? newHashtag.trim()
      : `#${newHashtag.trim()}`;

    if (!activePreset.fixedHashtags.includes(formatted)) {
      setActivePreset({
        ...activePreset,
        fixedHashtags: [...activePreset.fixedHashtags, formatted],
      });
      setNewHashtag('');
    }
  };

  const handleRemoveHashtag = (tag: string) => {
    if (!activePreset) return;
    setActivePreset({
      ...activePreset,
      fixedHashtags: activePreset.fixedHashtags.filter((t) => t !== tag),
    });
  };

  const handleSave = async () => {
    if (!activePreset) return;
    setIsSaving(true);
    setSaveSuccessMsg(false);

    try {
      const saved = await ApiClient.savePreset(activePreset);
      const updatedList = presets.map((p) => (p.platform === saved.platform ? saved : p));
      onPresetsUpdated(updatedList);
      setSaveSuccessMsg(true);
      setTimeout(() => setSaveSuccessMsg(false), 3000);
    } catch (err: any) {
      alert(`Failed to save preset: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!activePreset) {
    return <div className="text-center p-8 text-slate-400">Loading presets...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">
                Platform Preset Settings
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
                <Database className="w-3 h-3" />
                Persistent Store
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Configure your default hashtags, description footers, privacy, and tone preferences.
              When publishing, OmniPost automatically merges these presets with Gemini AI output.
            </p>
          </div>

          {/* Platform Tab Buttons */}
          <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setSelectedPlatform('youtube')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedPlatform === 'youtube'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Youtube className="w-3.5 h-3.5" />
              <span>YouTube</span>
            </button>

            <button
              onClick={() => setSelectedPlatform('instagram')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedPlatform === 'instagram'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Instagram className="w-3.5 h-3.5" />
              <span>Instagram Reels</span>
            </button>
          </div>
        </div>

        {/* Preset Form */}
        <div className="mt-6 space-y-5">
          {/* Preset Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Preset Profile Name
            </label>
            <input
              type="text"
              value={activePreset.name}
              onChange={(e) => setActivePreset({ ...activePreset, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          {/* Fixed Hashtags */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Fixed Always-Included Hashtags (Merged with AI output without duplicates)
            </label>
            <div className="flex flex-wrap gap-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800 min-h-14 items-center">
              {activePreset.fixedHashtags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs bg-indigo-950/50 text-indigo-300 border border-indigo-800/60"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveHashtag(tag)}
                    className="text-indigo-400 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="flex items-center space-x-1 min-w-[140px] flex-1">
                <input
                  type="text"
                  value={newHashtag}
                  onChange={(e) => setNewHashtag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddHashtag();
                    }
                  }}
                  placeholder="+ Type hashtag and press Enter..."
                  className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none px-2 py-1 w-full"
                />
                <button
                  type="button"
                  onClick={handleAddHashtag}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Description Footer */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Description Footer (Appended to video descriptions)
              </label>
              <div className="flex space-x-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setActivePreset({
                      ...activePreset,
                      descriptionFooter: `\n\n━━━━━━━━━━━━━━━━━━━━━━\n🔔 Subscribe to the channel!\n🌐 Links: https://linktr.ee/creator\n💼 Business: creator@brand.com`,
                    })
                  }
                  className="text-[10px] text-indigo-400 hover:underline"
                >
                  Insert Links Template
                </button>
              </div>
            </div>
            <textarea
              rows={4}
              value={activePreset.descriptionFooter}
              onChange={(e) =>
                setActivePreset({ ...activePreset, descriptionFooter: e.target.value })
              }
              placeholder="e.g. Subscribe to the channel, links to store, social handles..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 leading-relaxed font-mono"
            />
          </div>

          {/* Platform Specific Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Default Privacy Visibility
              </label>
              <select
                value={activePreset.privacy}
                onChange={(e) =>
                  setActivePreset({ ...activePreset, privacy: e.target.value as PrivacyStatus })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Default Tone Style
              </label>
              <select
                value={activePreset.tone}
                onChange={(e) =>
                  setActivePreset({ ...activePreset, tone: e.target.value as AITone })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="viral_hook">High Energy & Viral</option>
                <option value="informative">Informative & Tech</option>
                <option value="casual">Casual & Humorous</option>
                <option value="storytelling">Cinematic & Aesthetic</option>
              </select>
            </div>

            {selectedPlatform === 'youtube' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Default YouTube Category
                </label>
                <select
                  value={activePreset.category}
                  onChange={(e) => setActivePreset({ ...activePreset, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="28">28 - Science & Tech</option>
                  <option value="22">22 - People & Blogs</option>
                  <option value="24">24 - Entertainment</option>
                  <option value="27">27 - Education</option>
                  <option value="20">20 - Gaming</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Instagram Reels Options
                </label>
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="presetFeed"
                    checked={activePreset.shareToFeed}
                    onChange={(e) =>
                      setActivePreset({ ...activePreset, shareToFeed: e.target.checked })
                    }
                    className="w-4 h-4 accent-pink-600 rounded"
                  />
                  <label htmlFor="presetFeed" className="text-xs text-slate-300 cursor-pointer">
                    Share to Profile Grid Feed by default
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="pt-4 flex items-center justify-between border-t border-slate-800">
            {saveSuccessMsg ? (
              <span className="text-xs text-emerald-400 flex items-center space-x-1.5">
                <Check className="w-4 h-4" />
                <span>Preset saved successfully to persistent database!</span>
              </span>
            ) : (
              <span className="text-xs text-slate-500">
                Last updated: {new Date(activePreset.updatedAt).toLocaleTimeString()}
              </span>
            )}

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 flex items-center space-x-2 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Preset'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
