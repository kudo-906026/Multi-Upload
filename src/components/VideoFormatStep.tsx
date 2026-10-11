import React, { useState, useRef, useEffect } from 'react';
import {
  Scissors,
  Maximize2,
  Crop,
  Layers,
  Palette,
  AlertTriangle,
  Check,
  RotateCcw,
  Sparkles,
  Youtube,
  Instagram,
  Play,
  Pause,
  Sliders,
  CheckCircle2,
  Film,
} from 'lucide-react';
import {
  Platform,
  VideoMetadata,
  VideoFormatSettings,
  AspectRatioOption,
  FormatMode,
  CropFocusPoint,
  PlatformFormatSettings,
} from '@shared/types';
import { ApiClient } from '../api';

interface VideoFormatStepProps {
  video: VideoMetadata;
  selectedPlatforms: Platform[];
  onFormatApplied: (formattedVideo: VideoMetadata) => void;
}

const ASPECT_OPTIONS: { id: AspectRatioOption; label: string; desc: string; ratioClass: string }[] = [
  { id: '9:16', label: '9:16', desc: 'Shorts & Reels', ratioClass: 'aspect-[9/16]' },
  { id: '1:1', label: '1:1', desc: 'Square Post', ratioClass: 'aspect-square' },
  { id: '4:5', label: '4:5', desc: 'Portrait Feed', ratioClass: 'aspect-[4/5]' },
  { id: '16:9', label: '16:9', desc: 'Landscape / Widescreen', ratioClass: 'aspect-video' },
  { id: 'original', label: 'Original', desc: 'Source Dimensions', ratioClass: 'aspect-auto' },
];

export const VideoFormatStep: React.FC<VideoFormatStepProps> = ({
  video,
  selectedPlatforms,
  onFormatApplied,
}) => {
  const [separatePerPlatform, setSeparatePerPlatform] = useState(false);
  const [activePlatformTab, setActivePlatformTab] = useState<Platform>(
    selectedPlatforms[0] || 'youtube'
  );

  // Default format setting
  const defaultDuration = video.durationSec || 60;

  const [commonFormat, setCommonFormat] = useState<VideoFormatSettings>({
    aspectRatio: '9:16',
    mode: 'crop',
    focusPoint: { x: 50, y: 50 },
    solidBgColor: '#000000',
    trimStartSec: 0,
    trimEndSec: defaultDuration,
  });

  const [platformFormats, setPlatformFormats] = useState<PlatformFormatSettings>({
    youtube: {
      aspectRatio: '9:16',
      mode: 'crop',
      focusPoint: { x: 50, y: 50 },
      solidBgColor: '#000000',
      trimStartSec: 0,
      trimEndSec: Math.min(180, defaultDuration),
    },
    instagram: {
      aspectRatio: '9:16',
      mode: 'crop',
      focusPoint: { x: 50, y: 50 },
      solidBgColor: '#000000',
      trimStartSec: 0,
      trimEndSec: Math.min(90, defaultDuration),
    },
  });

  const [isApplying, setIsApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState(0);
  const [applySuccess, setApplySuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Video preview player
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Get active format based on platform or common
  const currentFormat: VideoFormatSettings = separatePerPlatform
    ? (activePlatformTab === 'youtube' ? platformFormats.youtube : platformFormats.instagram) || commonFormat
    : commonFormat;

  const updateCurrentFormat = (patch: Partial<VideoFormatSettings>) => {
    if (separatePerPlatform) {
      if (activePlatformTab === 'youtube') {
        setPlatformFormats((prev) => ({
          ...prev,
          youtube: { ...(prev.youtube || commonFormat), ...patch },
        }));
      } else {
        setPlatformFormats((prev) => ({
          ...prev,
          instagram: { ...(prev.instagram || commonFormat), ...patch },
        }));
      }
    } else {
      setCommonFormat((prev) => ({ ...prev, ...patch }));
    }
  };

  // Dragging focus point logic
  const focusPadRef = useRef<HTMLDivElement>(null);
  const [isDraggingFocus, setIsDraggingFocus] = useState(false);

  const handleFocusPadPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!focusPadRef.current) return;
    const rect = focusPadRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
    updateCurrentFormat({ focusPoint: { x, y } });
  };

  // Video time tracking and trimming seek
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const handleTimeUpdate = () => {
      setCurrentTime(v.currentTime);
      const end = currentFormat.trimEndSec || defaultDuration;
      const start = currentFormat.trimStartSec || 0;
      if (v.currentTime >= end) {
        v.currentTime = start;
      }
    };

    v.addEventListener('timeupdate', handleTimeUpdate);
    return () => v.removeEventListener('timeupdate', handleTimeUpdate);
  }, [currentFormat.trimEndSec, currentFormat.trimStartSec, defaultDuration]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.pause();
      setIsPlaying(false);
    } else {
      v.play();
      setIsPlaying(true);
    }
  };

  // Trim duration and platform limit calculations
  const trimStart = currentFormat.trimStartSec || 0;
  const trimEnd = currentFormat.trimEndSec || defaultDuration;
  const trimmedDuration = Math.max(1, trimEnd - trimStart);

  const hasShortsWarning =
    selectedPlatforms.includes('youtube') &&
    (!separatePerPlatform || activePlatformTab === 'youtube') &&
    trimmedDuration > 180;

  const hasReelsWarning =
    selectedPlatforms.includes('instagram') &&
    (!separatePerPlatform || activePlatformTab === 'instagram') &&
    trimmedDuration > 90;

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Apply changes with FFmpeg on backend
  const handleApplyFormat = async () => {
    try {
      setIsApplying(true);
      setErrorMsg(null);
      setApplySuccess(false);
      setApplyProgress(20);

      const formatToApply = separatePerPlatform
        ? (activePlatformTab === 'youtube' ? platformFormats.youtube : platformFormats.instagram) || commonFormat
        : commonFormat;

      setApplyProgress(45);

      const updated = await ApiClient.formatVideo({
        videoId: video.id,
        format: formatToApply,
        platformFormats: separatePerPlatform ? platformFormats : undefined,
        originalPath: video.storagePath,
      });

      setApplyProgress(100);
      setApplySuccess(true);

      const mergedVideo: VideoMetadata = {
        ...video,
        publicUrl: updated.publicUrl,
        storagePath: updated.storagePath,
        width: updated.width,
        height: updated.height,
        durationSec: updated.durationSec,
        formatSettings: formatToApply,
        platformFormats: separatePerPlatform ? platformFormats : undefined,
      };

      onFormatApplied(mergedVideo);
      setTimeout(() => setApplySuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to apply video formatting with FFmpeg');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-6 shadow-xl space-y-5 sm:space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-indigo-400" />
              <span>Aspect Ratio Adjuster & Trimmer</span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Reframe video for 9:16 Shorts/Reels, 1:1, or 4:5 with smart Crop, Blurred Background, or Color Bars.
          </p>
        </div>

        {/* Separate per platform toggle */}
        <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setSeparatePerPlatform(false)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              !separatePerPlatform ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Same for all
          </button>
          <button
            type="button"
            onClick={() => setSeparatePerPlatform(true)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              separatePerPlatform ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Different per platform
          </button>
        </div>
      </div>

      {/* Platform Switcher if separate */}
      {separatePerPlatform && (
        <div className="flex items-center space-x-2 p-1 bg-slate-950 rounded-xl border border-slate-800 w-fit">
          <button
            type="button"
            onClick={() => setActivePlatformTab('youtube')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activePlatformTab === 'youtube'
                ? 'bg-red-950/60 text-red-300 border border-red-800/60'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Youtube className="w-3.5 h-3.5 text-red-500" />
            <span>YouTube Shorts Ratio</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePlatformTab('instagram')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activePlatformTab === 'instagram'
                ? 'bg-pink-950/60 text-pink-300 border border-pink-800/60'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Instagram className="w-3.5 h-3.5 text-pink-500" />
            <span>Instagram Reels Ratio</span>
          </button>
        </div>
      )}

      {/* Main Grid: Controls on left, Live Preview on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Aspect Ratio Options */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Aspect Ratio
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ASPECT_OPTIONS.map((opt) => {
                const isSelected = currentFormat.aspectRatio === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateCurrentFormat({ aspectRatio: opt.id })}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <span className="font-bold text-xs sm:text-sm text-white">{opt.label}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Format Mode Options (Only if not original) */}
          {currentFormat.aspectRatio !== 'original' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Framing & Fit Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Crop */}
                <button
                  type="button"
                  onClick={() => updateCurrentFormat({ mode: 'crop' })}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    currentFormat.mode === 'crop'
                      ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    <Crop className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-bold text-white">Crop</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Fills frame, adjustable focal point.
                  </span>
                </button>

                {/* Blurred background */}
                <button
                  type="button"
                  onClick={() => updateCurrentFormat({ mode: 'fit_blurred' })}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    currentFormat.mode === 'fit_blurred'
                      ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs font-bold text-white">Blurred Fit</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Preserves entire video with frosted blur background.
                  </span>
                </button>

                {/* Solid color */}
                <button
                  type="button"
                  onClick={() => updateCurrentFormat({ mode: 'fit_solid' })}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    currentFormat.mode === 'fit_solid'
                      ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    <Palette className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Solid Bars</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Letterbox/pillarbox with custom color bars.
                  </span>
                </button>
              </div>

              {/* Mode-specific detail controls */}
              {currentFormat.mode === 'crop' && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">Draggable Focus Point</span>
                    <span className="font-mono text-indigo-400 text-[11px]">
                      X: {currentFormat.focusPoint?.x ?? 50}% • Y: {currentFormat.focusPoint?.y ?? 50}%
                    </span>
                  </div>

                  {/* 2D Interactive Focus Pad */}
                  <div
                    ref={focusPadRef}
                    onPointerDown={(e) => {
                      setIsDraggingFocus(true);
                      handleFocusPadPointer(e);
                    }}
                    onPointerMove={(e) => {
                      if (isDraggingFocus) handleFocusPadPointer(e);
                    }}
                    onPointerUp={() => setIsDraggingFocus(false)}
                    className="relative w-full h-24 bg-slate-900 border border-slate-700 rounded-lg cursor-crosshair overflow-hidden select-none touch-none"
                  >
                    {/* Grid lines */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                      <div className="border-r border-b border-slate-400" />
                      <div className="border-r border-b border-slate-400" />
                      <div className="border-b border-slate-400" />
                      <div className="border-r border-b border-slate-400" />
                      <div className="border-r border-b border-slate-400" />
                      <div className="border-b border-slate-400" />
                      <div className="border-r border-slate-400" />
                      <div className="border-r border-slate-400" />
                      <div />
                    </div>

                    {/* Focus Reticle */}
                    <div
                      className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-400 bg-indigo-500/40 shadow-md flex items-center justify-center pointer-events-none"
                      style={{
                        left: `${currentFormat.focusPoint?.x ?? 50}%`,
                        top: `${currentFormat.focusPoint?.y ?? 50}%`,
                      }}
                    >
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                  </div>

                  {/* Quick Position Presets */}
                  <div className="flex items-center justify-between gap-1 text-[10px]">
                    <span className="text-slate-500">Quick focus:</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => updateCurrentFormat({ focusPoint: { x: 50, y: 15 } })}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        Top / Face
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCurrentFormat({ focusPoint: { x: 50, y: 50 } })}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        Center
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCurrentFormat({ focusPoint: { x: 50, y: 85 } })}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        Bottom
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {currentFormat.mode === 'fit_solid' && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-300">Bar Color:</span>
                  <div className="flex items-center space-x-2">
                    {['#000000', '#0F172A', '#1E293B', '#FFFFFF'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updateCurrentFormat({ solidBgColor: color })}
                        className={`w-6 h-6 rounded-full border ${
                          currentFormat.solidBgColor === color
                            ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950'
                            : 'border-slate-700'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                    <input
                      type="color"
                      value={currentFormat.solidBgColor || '#000000'}
                      onChange={(e) => updateCurrentFormat({ solidBgColor: e.target.value })}
                      className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                      title="Choose custom color"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Trim Start & End Sliders */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
                <Scissors className="w-3.5 h-3.5 text-indigo-400" />
                <span>Trim Video Duration</span>
              </div>
              <span className="font-mono text-indigo-300 text-xs">
                {formatSeconds(trimStart)} — {formatSeconds(trimEnd)} ({trimmedDuration.toFixed(1)}s total)
              </span>
            </div>

            {/* Start slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Start Cut: {formatSeconds(trimStart)}</span>
                <span className="text-slate-500">0:00</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(1, trimEnd - 1)}
                step="0.5"
                value={trimStart}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  updateCurrentFormat({ trimStartSec: val });
                  if (videoRef.current) videoRef.current.currentTime = val;
                }}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* End slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>End Cut: {formatSeconds(trimEnd)}</span>
                <span className="text-slate-500">{formatSeconds(defaultDuration)}</span>
              </div>
              <input
                type="range"
                min={trimStart + 1}
                max={defaultDuration}
                step="0.5"
                value={trimEnd}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  updateCurrentFormat({ trimEndSec: val });
                  if (videoRef.current) videoRef.current.currentTime = val;
                }}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Platform Max Length Warnings */}
            {hasShortsWarning && (
              <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-lg text-amber-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>YouTube Shorts limit:</strong> Maximum allowed length is 3 minutes (180s). Current selection is {Math.round(trimmedDuration)}s. Please trim under 180s.
                </span>
              </div>
            )}

            {hasReelsWarning && (
              <div className="p-2.5 bg-pink-950/40 border border-pink-800/60 rounded-lg text-pink-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-pink-400 shrink-0" />
                <span>
                  <strong>Instagram Reels limit:</strong> Maximum allowed length is 90 seconds. Current selection is {Math.round(trimmedDuration)}s. Please trim under 90s.
                </span>
              </div>
            )}
          </div>

          {/* Action Button: Apply with FFmpeg */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={isApplying}
              onClick={handleApplyFormat}
              className="flex-1 flex items-center justify-center space-x-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white shadow-lg shadow-indigo-600/30 active:scale-98 transition-all disabled:opacity-50"
            >
              {isApplying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing format with FFmpeg ({applyProgress}%)...</span>
                </>
              ) : applySuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Format applied successfully!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Apply {currentFormat.aspectRatio} Format with FFmpeg</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setCommonFormat({
                  aspectRatio: 'original',
                  mode: 'crop',
                  focusPoint: { x: 50, y: 50 },
                  solidBgColor: '#000000',
                  trimStartSec: 0,
                  trimEndSec: defaultDuration,
                });
              }}
              className="px-3 py-3 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors flex items-center space-x-1.5"
              title="Reset all crop and trim modifications to original video master"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full text-center mb-2 flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-indigo-400" />
              Live Aspect Preview
            </span>
            <span className="font-mono text-indigo-400 font-bold">
              {currentFormat.aspectRatio} ({currentFormat.mode})
            </span>
          </div>

          {/* Aspect Container */}
          <div className="w-full max-w-[280px] sm:max-w-[320px] bg-black rounded-2xl overflow-hidden border-2 border-indigo-500/40 shadow-2xl relative flex items-center justify-center">
            {/* The Outer Frame dynamically shapes to the target Aspect Ratio */}
            <div
              className={`w-full relative overflow-hidden bg-black transition-all ${
                currentFormat.aspectRatio === '9:16'
                  ? 'aspect-[9/16]'
                  : currentFormat.aspectRatio === '1:1'
                  ? 'aspect-square'
                  : currentFormat.aspectRatio === '4:5'
                  ? 'aspect-[4/5]'
                  : currentFormat.aspectRatio === '16:9'
                  ? 'aspect-video'
                  : 'aspect-[9/16]'
              }`}
            >
              {/* Blurred background if mode === 'fit_blurred' */}
              {currentFormat.mode === 'fit_blurred' && currentFormat.aspectRatio !== 'original' && (
                <video
                  src={video.publicUrl}
                  className="absolute inset-0 w-full h-full object-cover blur-xl scale-125 opacity-70 pointer-events-none"
                  muted
                  playsInline
                  loop
                />
              )}

              {/* Solid color background if mode === 'fit_solid' */}
              {currentFormat.mode === 'fit_solid' && currentFormat.aspectRatio !== 'original' && (
                <div
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ backgroundColor: currentFormat.solidBgColor || '#000000' }}
                />
              )}

              {/* Main Video Stream */}
              <video
                ref={videoRef}
                src={video.publicUrl}
                playsInline
                loop
                onClick={togglePlay}
                className={`relative w-full h-full cursor-pointer z-10 transition-all ${
                  currentFormat.aspectRatio === 'original'
                    ? 'object-contain'
                    : currentFormat.mode === 'crop'
                    ? 'object-cover'
                    : 'object-contain'
                }`}
                style={
                  currentFormat.mode === 'crop' && currentFormat.aspectRatio !== 'original'
                    ? {
                        objectPosition: `${currentFormat.focusPoint?.x ?? 50}% ${currentFormat.focusPoint?.y ?? 50}%`,
                      }
                    : undefined
                }
              />

              {/* Overlay Play/Pause Button */}
              <button
                type="button"
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/50 backdrop-blur text-white flex items-center justify-center z-20 hover:scale-105 transition-all opacity-80 hover:opacity-100"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              {/* Aspect Ratio Badge Overlay */}
              <div className="absolute top-2.5 left-2.5 z-20 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur text-[10px] font-mono text-white border border-white/20">
                {currentFormat.aspectRatio}
              </div>

              {/* Mode Badge */}
              <div className="absolute top-2.5 right-2.5 z-20 px-2 py-0.5 rounded-full bg-indigo-950/80 backdrop-blur text-[10px] font-semibold text-indigo-300 border border-indigo-500/40">
                {currentFormat.mode}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 mt-2 text-center max-w-xs">
            Tap video to play/pause preview. FFmpeg will render exact aspect resolution on export while preserving original file.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VideoFormatStep;
