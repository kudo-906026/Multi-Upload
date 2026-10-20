import React, { useState } from 'react';
import {
  Check,
  Edit2,
  Plus,
  X,
  Sparkles,
  Film,
  Users,
  Smile,
  FileText,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { AIAnalysisResult, ConfidenceLevel, DetectedEntity, VideoDetections } from '@shared/types';

interface DetectedEntitiesChipsProps {
  analysisResult: AIAnalysisResult;
  onUpdateAnalysis: (updated: AIAnalysisResult) => void;
}

export const DetectedEntitiesChips: React.FC<DetectedEntitiesChipsProps> = ({
  analysisResult,
  onUpdateAnalysis,
}) => {
  const [detections, setDetections] = useState<VideoDetections>(analysisResult.detections);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newCharInput, setNewCharInput] = useState('');
  const [showAddChar, setShowAddChar] = useState(false);
  const [newTextInput, setNewTextInput] = useState('');
  const [showAddText, setShowAddText] = useState(false);
  const [hasAppliedNotice, setHasAppliedNotice] = useState(false);

  // Sync if analysisResult changes from parent
  React.useEffect(() => {
    if (analysisResult.detections) {
      setDetections(analysisResult.detections);
    }
  }, [analysisResult]);

  const getConfidenceBadge = (confidence: ConfidenceLevel) => {
    switch (confidence) {
      case 'high':
        return (
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
            high
          </span>
        );
      case 'medium':
        return (
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
            medium
          </span>
        );
      case 'low':
        return (
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 font-semibold">
            low
          </span>
        );
      case 'unsure':
      default:
        return (
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold flex items-center gap-0.5">
            <HelpCircle className="w-2.5 h-2.5" />
            unsure
          </span>
        );
    }
  };

  const applyDetectionsToMetadata = (updatedDetections: VideoDetections) => {
    const updated = { ...analysisResult, detections: updatedDetections };

    const confirmedSeries =
      updatedDetections.series.value !== 'unsure' && updatedDetections.series.value.trim().length > 0
        ? updatedDetections.series.value.trim()
        : '';

    const confirmedChars = updatedDetections.characters
      .map((c) => c.value.trim())
      .filter((v) => v !== 'unsure' && v.length > 0);

    const confirmedStyle =
      updatedDetections.editStyle.value !== 'unsure' && updatedDetections.editStyle.value.trim().length > 0
        ? updatedDetections.editStyle.value.trim()
        : '';

    const confirmedMood =
      updatedDetections.mood.value !== 'unsure' && updatedDetections.mood.value.trim().length > 0
        ? updatedDetections.mood.value.trim()
        : '';

    const charStr = confirmedChars.join(', ');
    const mainChar = confirmedChars[0] || '';

    // Update YouTube Metadata with confirmed names
    if (updated.youtube) {
      let ytTitle = updated.youtube.title || '';
      if (mainChar && confirmedSeries) {
        ytTitle = `${mainChar} Unleashed 🥶 | ${confirmedSeries} 4K Edit #Shorts`;
      } else if (mainChar) {
        ytTitle = `${mainChar} Peak Moment | 4K Edit #Shorts`;
      } else if (confirmedSeries) {
        ytTitle = `${confirmedSeries} Best Moments | 4K Edit #Shorts`;
      }
      updated.youtube.title = ytTitle;

      // Ensure confirmed names in YouTube tags
      const currentTags = new Set(updated.youtube.tags.map((t) => t.toLowerCase()));
      const tagsToAdd: string[] = [];
      if (mainChar && !currentTags.has(mainChar.toLowerCase())) tagsToAdd.push(mainChar.toLowerCase());
      if (confirmedSeries && !currentTags.has(confirmedSeries.toLowerCase())) tagsToAdd.push(confirmedSeries.toLowerCase());
      if (confirmedStyle && !currentTags.has(confirmedStyle.toLowerCase())) tagsToAdd.push(confirmedStyle.toLowerCase());
      updated.youtube.tags = [...updated.youtube.tags, ...tagsToAdd];

      // Ensure confirmed hashtags
      const ytHashtags = new Set(updated.youtube.hashtags);
      if (confirmedSeries) ytHashtags.add(`#${confirmedSeries.replace(/\s+/g, '')}`);
      if (mainChar) ytHashtags.add(`#${mainChar.replace(/\s+/g, '')}`);
      ytHashtags.add('#Shorts');
      updated.youtube.hashtags = Array.from(ytHashtags);
    }

    // Update Instagram Metadata with confirmed names
    if (updated.instagram) {
      let igCaption = updated.instagram.caption || '';
      if (mainChar || confirmedSeries) {
        const entityLabel = [mainChar, confirmedSeries].filter(Boolean).join(' in ');
        igCaption = `${entityLabel} hits different every single time 🔥\n\nDrop your favorite scene in the comments & save this Reel! ⚔️\n.\n${updated.instagram.hashtags?.join(' ') || ''}`;
      }
      updated.instagram.caption = igCaption;

      const igHashtags = new Set(updated.instagram.hashtags || []);
      if (confirmedSeries) igHashtags.add(`#${confirmedSeries.toLowerCase().replace(/\s+/g, '')}`);
      if (mainChar) igHashtags.add(`#${mainChar.toLowerCase().replace(/\s+/g, '')}`);
      igHashtags.add('#reelsviral');
      igHashtags.add('#animeedit');
      updated.instagram.hashtags = Array.from(igHashtags).slice(0, 5);
    }

    if (mainChar) updated.recognizedCharacter = mainChar;
    if (confirmedSeries) updated.recognizedSeries = confirmedSeries;
    if (confirmedStyle) updated.editStyle = confirmedStyle;
    if (confirmedMood) updated.mood = confirmedMood;

    onUpdateAnalysis(updated);
    setHasAppliedNotice(true);
    setTimeout(() => setHasAppliedNotice(false), 4000);
  };

  const handleConfirmSingle = (field: 'series' | 'editStyle' | 'mood', entity: DetectedEntity) => {
    const next = {
      ...detections,
      [field]: { ...entity, confirmed: true },
    };
    setDetections(next);
    applyDetectionsToMetadata(next);
  };

  const handleConfirmCharacter = (index: number) => {
    const chars = [...detections.characters];
    chars[index] = { ...chars[index], confirmed: true };
    const next = { ...detections, characters: chars };
    setDetections(next);
    applyDetectionsToMetadata(next);
  };

  const handleConfirmText = (index: number) => {
    const texts = [...detections.onScreenText];
    texts[index] = { ...texts[index], confirmed: true };
    const next = { ...detections, onScreenText: texts };
    setDetections(next);
    applyDetectionsToMetadata(next);
  };

  const startEdit = (key: string, currentValue: string) => {
    setEditingKey(key);
    setEditValue(currentValue === 'unsure' ? '' : currentValue);
  };

  const saveEdit = (key: string) => {
    const clean = editValue.trim() || 'unsure';
    const isUnsure = clean === 'unsure';
    let next: VideoDetections = { ...detections };

    if (key === 'series') {
      next.series = { value: clean, confidence: isUnsure ? 'unsure' : 'high', confirmed: !isUnsure };
    } else if (key === 'editStyle') {
      next.editStyle = { value: clean, confidence: isUnsure ? 'unsure' : 'high', confirmed: !isUnsure };
    } else if (key === 'mood') {
      next.mood = { value: clean, confidence: isUnsure ? 'unsure' : 'high', confirmed: !isUnsure };
    } else if (key.startsWith('char-')) {
      const idx = parseInt(key.replace('char-', ''), 10);
      const chars = [...next.characters];
      chars[idx] = { value: clean, confidence: isUnsure ? 'unsure' : 'high', confirmed: !isUnsure };
      next.characters = chars;
    } else if (key.startsWith('text-')) {
      const idx = parseInt(key.replace('text-', ''), 10);
      const texts = [...next.onScreenText];
      texts[idx] = { value: clean, confidence: isUnsure ? 'unsure' : 'high', confirmed: !isUnsure };
      next.onScreenText = texts;
    }

    setDetections(next);
    setEditingKey(null);
    applyDetectionsToMetadata(next);
  };

  const handleAddCharacter = () => {
    if (!newCharInput.trim()) return;
    const chars = detections.characters.filter((c) => c.value !== 'unsure');
    chars.push({ value: newCharInput.trim(), confidence: 'high', confirmed: true });
    const next = { ...detections, characters: chars };
    setDetections(next);
    setNewCharInput('');
    setShowAddChar(false);
    applyDetectionsToMetadata(next);
  };

  const handleRemoveCharacter = (index: number) => {
    let chars = detections.characters.filter((_, i) => i !== index);
    if (chars.length === 0) {
      chars = [{ value: 'unsure', confidence: 'unsure', confirmed: false }];
    }
    const next = { ...detections, characters: chars };
    setDetections(next);
    applyDetectionsToMetadata(next);
  };

  const handleAddText = () => {
    if (!newTextInput.trim()) return;
    const texts = detections.onScreenText.filter((t) => t.value !== 'unsure');
    texts.push({ value: newTextInput.trim(), confidence: 'high', confirmed: true });
    const next = { ...detections, onScreenText: texts };
    setDetections(next);
    setNewTextInput('');
    setShowAddText(false);
    applyDetectionsToMetadata(next);
  };

  const handleRemoveText = (index: number) => {
    let texts = detections.onScreenText.filter((_, i) => i !== index);
    if (texts.length === 0) {
      texts = [{ value: 'unsure', confidence: 'unsure', confirmed: false }];
    }
    const next = { ...detections, onScreenText: texts };
    setDetections(next);
    applyDetectionsToMetadata(next);
  };

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Detected Entities (Confidence Rated)
          </h3>
          <span className="text-[11px] text-slate-400">
            Confirm or edit chips before posting
          </span>
        </div>
        {hasAppliedNotice && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2.5 py-1 rounded-lg animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Applied to title, caption, and hashtags!</span>
          </div>
        )}
      </div>

      {/* Chips Grid */}
      <div className="space-y-3">
        {/* 1. Series */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs font-bold text-slate-400 w-28 shrink-0 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-indigo-400" />
            Series:
          </span>
          {editingKey === 'series' ? (
            <div className="flex items-center gap-1.5 flex-1 max-w-sm">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="Type correct series name..."
                autoFocus
                className="bg-slate-900 border border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-white flex-1 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => saveEdit('series')}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setEditingKey(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  detections.series.confirmed
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                    : detections.series.value === 'unsure'
                    ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className="font-semibold">
                  {detections.series.value === 'unsure' ? 'Unsure (Series)' : detections.series.value}
                </span>
                {getConfidenceBadge(detections.series.confidence)}
                <button
                  type="button"
                  onClick={() => startEdit('series', detections.series.value)}
                  className="p-0.5 text-slate-400 hover:text-white transition-colors"
                  title="Edit Series Name"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                {!detections.series.confirmed && detections.series.value !== 'unsure' && (
                  <button
                    type="button"
                    onClick={() => handleConfirmSingle('series', detections.series)}
                    className="ml-1 px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold inline-flex items-center gap-0.5"
                    title="Confirm Name"
                  >
                    <Check className="w-3 h-3" />
                    Confirm
                  </button>
                )}
                {detections.series.confirmed && (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 ml-1">
                    <Check className="w-3 h-3" /> Confirmed
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. Characters */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-2">
          <span className="text-xs font-bold text-slate-400 w-28 shrink-0 flex items-center gap-1.5 pt-1.5">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            Characters:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            {detections.characters.map((char, idx) => {
              const editKey = `char-${idx}`;
              if (editingKey === editKey) {
                return (
                  <div key={idx} className="flex items-center gap-1.5 max-w-xs">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="Character name..."
                      autoFocus
                      className="bg-slate-900 border border-purple-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => saveEdit(editKey)}
                      className="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingKey(null)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                    char.confirmed
                      ? 'bg-purple-950/60 border-purple-500/50 text-purple-200'
                      : char.value === 'unsure'
                      ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                      : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span className="font-semibold">
                    {char.value === 'unsure' ? 'Unsure (Character)' : char.value}
                  </span>
                  {getConfidenceBadge(char.confidence)}
                  <button
                    type="button"
                    onClick={() => startEdit(editKey, char.value)}
                    className="p-0.5 text-slate-400 hover:text-white transition-colors"
                    title="Edit Name"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  {!char.confirmed && char.value !== 'unsure' && (
                    <button
                      type="button"
                      onClick={() => handleConfirmCharacter(idx)}
                      className="ml-1 px-1.5 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold inline-flex items-center gap-0.5"
                    >
                      <Check className="w-3 h-3" />
                      Confirm
                    </button>
                  )}
                  {char.confirmed && (
                    <span className="text-[10px] text-purple-400 font-bold flex items-center gap-0.5 ml-1">
                      <Check className="w-3 h-3" /> Confirmed
                    </span>
                  )}
                  {detections.characters.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCharacter(idx)}
                      className="p-0.5 text-slate-500 hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {showAddChar ? (
              <div className="flex items-center gap-1 max-w-xs">
                <input
                  type="text"
                  value={newCharInput}
                  onChange={(e) => setNewCharInput(e.target.value)}
                  placeholder="Add character..."
                  autoFocus
                  className="bg-slate-900 border border-purple-500 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCharacter()}
                />
                <button
                  type="button"
                  onClick={handleAddCharacter}
                  className="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddChar(false)}
                  className="p-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddChar(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-xs transition-all"
              >
                <Plus className="w-3 h-3" />
                <span>Add Character</span>
              </button>
            )}
          </div>
        </div>

        {/* 3. Edit Style */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs font-bold text-slate-400 w-28 shrink-0 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Edit Style:
          </span>
          {editingKey === 'editStyle' ? (
            <div className="flex items-center gap-1.5 flex-1 max-w-sm">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="Style name..."
                autoFocus
                className="bg-slate-900 border border-amber-500 rounded-lg px-2.5 py-1 text-xs text-white flex-1 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => saveEdit('editStyle')}
                className="p-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setEditingKey(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  detections.editStyle.confirmed
                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                    : detections.editStyle.value === 'unsure'
                    ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className="font-semibold">
                  {detections.editStyle.value === 'unsure' ? 'Unsure (Style)' : detections.editStyle.value}
                </span>
                {getConfidenceBadge(detections.editStyle.confidence)}
                <button
                  type="button"
                  onClick={() => startEdit('editStyle', detections.editStyle.value)}
                  className="p-0.5 text-slate-400 hover:text-white"
                  title="Edit Style"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                {!detections.editStyle.confirmed && detections.editStyle.value !== 'unsure' && (
                  <button
                    type="button"
                    onClick={() => handleConfirmSingle('editStyle', detections.editStyle)}
                    className="ml-1 px-1.5 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold inline-flex items-center gap-0.5"
                  >
                    <Check className="w-3 h-3" />
                    Confirm
                  </button>
                )}
                {detections.editStyle.confirmed && (
                  <span className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5 ml-1">
                    <Check className="w-3 h-3" /> Confirmed
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. Mood */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs font-bold text-slate-400 w-28 shrink-0 flex items-center gap-1.5">
            <Smile className="w-3.5 h-3.5 text-pink-400" />
            Mood:
          </span>
          {editingKey === 'mood' ? (
            <div className="flex items-center gap-1.5 flex-1 max-w-sm">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="Mood..."
                autoFocus
                className="bg-slate-900 border border-pink-500 rounded-lg px-2.5 py-1 text-xs text-white flex-1 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => saveEdit('mood')}
                className="p-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setEditingKey(null)}
                className="p-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  detections.mood.confirmed
                    ? 'bg-pink-950/60 border-pink-500/50 text-pink-200'
                    : detections.mood.value === 'unsure'
                    ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className="font-semibold">
                  {detections.mood.value === 'unsure' ? 'Unsure (Mood)' : detections.mood.value}
                </span>
                {getConfidenceBadge(detections.mood.confidence)}
                <button
                  type="button"
                  onClick={() => startEdit('mood', detections.mood.value)}
                  className="p-0.5 text-slate-400 hover:text-white"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                {!detections.mood.confirmed && detections.mood.value !== 'unsure' && (
                  <button
                    type="button"
                    onClick={() => handleConfirmSingle('mood', detections.mood)}
                    className="ml-1 px-1.5 py-0.5 rounded bg-pink-600 hover:bg-pink-500 text-white text-[10px] font-bold inline-flex items-center gap-0.5"
                  >
                    <Check className="w-3 h-3" />
                    Confirm
                  </button>
                )}
                {detections.mood.confirmed && (
                  <span className="text-[10px] text-pink-400 font-bold flex items-center gap-0.5 ml-1">
                    <Check className="w-3 h-3" /> Confirmed
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 5. On-Screen Text */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-2">
          <span className="text-xs font-bold text-slate-400 w-28 shrink-0 flex items-center gap-1.5 pt-1.5">
            <FileText className="w-3.5 h-3.5 text-teal-400" />
            On-Screen Text:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            {detections.onScreenText.map((txt, idx) => {
              const editKey = `text-${idx}`;
              if (editingKey === editKey) {
                return (
                  <div key={idx} className="flex items-center gap-1.5 max-w-xs">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="On-screen text..."
                      autoFocus
                      className="bg-slate-900 border border-teal-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => saveEdit(editKey)}
                      className="p-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingKey(null)}
                      className="p-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                    txt.confirmed
                      ? 'bg-teal-950/60 border-teal-500/50 text-teal-200'
                      : txt.value === 'unsure'
                      ? 'bg-slate-900/40 border-slate-800 text-slate-400'
                      : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                >
                  <span className="font-semibold">
                    {txt.value === 'unsure' ? 'None / Unsure' : `"${txt.value}"`}
                  </span>
                  {txt.value !== 'unsure' && getConfidenceBadge(txt.confidence)}
                  <button
                    type="button"
                    onClick={() => startEdit(editKey, txt.value)}
                    className="p-0.5 text-slate-400 hover:text-white"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  {!txt.confirmed && txt.value !== 'unsure' && (
                    <button
                      type="button"
                      onClick={() => handleConfirmText(idx)}
                      className="ml-1 px-1.5 py-0.5 rounded bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-bold inline-flex items-center gap-0.5"
                    >
                      <Check className="w-3 h-3" />
                      Confirm
                    </button>
                  )}
                  {txt.confirmed && (
                    <span className="text-[10px] text-teal-400 font-bold flex items-center gap-0.5 ml-1">
                      <Check className="w-3 h-3" /> Confirmed
                    </span>
                  )}
                  {detections.onScreenText.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveText(idx)}
                      className="p-0.5 text-slate-500 hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {showAddText ? (
              <div className="flex items-center gap-1 max-w-xs">
                <input
                  type="text"
                  value={newTextInput}
                  onChange={(e) => setNewTextInput(e.target.value)}
                  placeholder="Add on-screen text..."
                  autoFocus
                  className="bg-slate-900 border border-teal-500 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
                />
                <button
                  type="button"
                  onClick={handleAddText}
                  className="p-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddText(false)}
                  className="p-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddText(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-xs transition-all"
              >
                <Plus className="w-3 h-3" />
                <span>Add Text</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
