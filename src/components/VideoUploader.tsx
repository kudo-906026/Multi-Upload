import React, { useRef, useState } from 'react';
import { UploadCloud, Check, Youtube, Instagram, Film, AlertTriangle, Sparkles, X } from 'lucide-react';
import { Platform, VideoMetadata } from '@shared/types';
import { ApiClient } from '../api';

interface VideoUploaderProps {
  onVideoUploaded: (video: VideoMetadata) => void;
  selectedPlatforms: Platform[];
  onTogglePlatform: (platform: Platform) => void;
  currentVideo: VideoMetadata | null;
  onClearVideo: () => void;
  onLoadSampleVideo?: () => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  onVideoUploaded,
  selectedPlatforms,
  onTogglePlatform,
  currentVideo,
  onClearVideo,
  onLoadSampleVideo,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndUpload = async (file: File) => {
    setErrorMsg(null);

    // Format check
    const validExtensions = ['mp4', 'mov', 'webm'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !validExtensions.includes(ext)) {
      setErrorMsg('Unsupported format. Please upload an MP4, MOV, or WebM video file.');
      return;
    }

    // Size check (max 250MB)
    const maxSize = 250 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMsg(`File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 250MB.`);
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(40);
      const metadata = await ApiClient.uploadVideo(file);
      setUploadProgress(100);
      onVideoUploaded(metadata);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload video');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUpload(e.target.files[0]);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">Select Platforms & Upload Video</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Choose where to distribute and upload your video master file.
          </p>
        </div>

        {/* Platform Selection Buttons */}
        <div className="flex items-center space-x-2">
          {/* YouTube Toggle */}
          <button
            type="button"
            onClick={() => onTogglePlatform('youtube')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
              selectedPlatforms.includes('youtube')
                ? 'bg-red-950/50 border-red-500/80 text-white shadow-md shadow-red-900/30'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <Youtube className="w-4 h-4 text-red-500" />
            <span>YouTube Shorts</span>
            {selectedPlatforms.includes('youtube') && <Check className="w-3.5 h-3.5 text-red-400" />}
          </button>

          {/* Instagram Toggle */}
          <button
            type="button"
            onClick={() => onTogglePlatform('instagram')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
              selectedPlatforms.includes('instagram')
                ? 'bg-pink-950/50 border-pink-500/80 text-white shadow-md shadow-pink-900/30'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <Instagram className="w-4 h-4 text-pink-500" />
            <span>Instagram Reels</span>
            {selectedPlatforms.includes('instagram') && <Check className="w-3.5 h-3.5 text-pink-400" />}
          </button>
        </div>
      </div>

      {selectedPlatforms.length === 0 && (
        <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-amber-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Please select at least one target platform (YouTube or Instagram Reels) above.</span>
        </div>
      )}

      {/* Upload Box or Video Preview */}
      {!currentVideo ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-950/20 scale-[0.99]'
              : 'border-slate-700 hover:border-indigo-500/70 hover:bg-slate-800/30 bg-slate-950/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              {isUploading ? (
                <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <UploadCloud className="w-7 h-7" />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm sm:text-base font-semibold text-white">
                {isUploading ? 'Uploading video master...' : 'Drop your video here, or tap to browse'}
              </p>
              <p className="text-xs text-slate-400">
                Supports MP4, MOV, or WebM up to 250MB. Vertical 9:16 recommended for Shorts & Reels.
              </p>
            </div>

            {!isUploading && onLoadSampleVideo && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLoadSampleVideo();
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/50 hover:to-purple-600/50 text-indigo-200 hover:text-white text-xs font-bold border border-indigo-500/40 transition-all flex items-center space-x-2 shadow-sm active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>🎬 Load Sample Video & Live Demo Analysis</span>
                </button>
              </div>
            )}

            {isUploading && (
              <div className="w-full max-w-xs bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                <div
                  className="bg-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-5">
          {/* Video Player */}
          <div className="relative w-full md:w-56 aspect-[9/16] max-h-72 bg-black rounded-xl overflow-hidden shadow-lg border border-slate-800 shrink-0 flex items-center justify-center">
            <video
              src={currentVideo.publicUrl}
              controls
              className="w-full h-full object-contain"
              playsInline
            />
          </div>

          {/* Video Information */}
          <div className="flex-1 space-y-3 w-full">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Film className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold text-white text-sm sm:text-base truncate max-w-xs sm:max-w-md">
                    {currentVideo.originalName}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {(currentVideo.size / (1024 * 1024)).toFixed(2)} MB • Format: {currentVideo.mimeType}
                </p>
              </div>

              <button
                onClick={onClearVideo}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Remove video and choose another"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Public URL info box for Instagram Graph API requirement */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-medium text-slate-300">Public Asset Stream URL:</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/50">
                  Ready for Meta CDN
                </span>
              </div>
              <p className="font-mono text-[11px] text-indigo-300 truncate selection:bg-indigo-500/30">
                {currentVideo.publicUrl}
              </p>
              <p className="text-[10px] text-slate-500">
                Instagram Graph API requires a publicly accessible HTTP URL to pull and transcode the video into Reels.
              </p>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
