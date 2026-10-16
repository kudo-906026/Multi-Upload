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
  Bookmark,
  Music,
  Copy,
  AlertTriangle,
  Upload,
  Calendar,
  Clock,
  Shield,
  Film,
  MapPin,
  Users,
  Image as ImageIcon,
  Layers,
  ChevronDown,
  Info,
  Smartphone,
  ExternalLink,
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
  VideoMetadata,
} from '@shared/types';
import { ApiClient } from '../api';

interface MetadataReviewProps {
  selectedPlatforms: Platform[];
  aiResult: AIAnalysisResult | null;
  video?: VideoMetadata | null;
  onPublish: (payloads: {
    youtubePayload?: YouTubePublishPayload;
    instagramPayload?: InstagramPublishPayload;
    selectedAccounts?: {
      youtubeAccountId?: string;
      instagramAccountId?: string;
    };
    isScheduled?: boolean;
    scheduledPublishTime?: string;
    scheduledTimeZone?: string;
  }) => Promise<void> | void;
  isPublishing: boolean;
  presets: PlatformPreset[];
  authStatus?: PlatformAuthStatus | null;
  onOpenAccounts?: () => void;
  trendContext?: {
    topic: string;
    hashtags: string[];
    title?: string;
    keywords?: string[];
    scheduledSlot?: { date: string; time: string; timeZone?: string };
  } | null;
}

const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: '🇺🇸 New York (ET)' },
  { value: 'America/Chicago', label: '🇺🇸 Chicago (CT)' },
  { value: 'America/Denver', label: '🇺🇸 Denver (MT)' },
  { value: 'America/Los_Angeles', label: '🇺🇸 Los Angeles (PT)' },
  { value: 'Europe/London', label: '🇬🇧 London (GMT/BST)' },
  { value: 'Europe/Paris', label: '🇫🇷 Paris (CET)' },
  { value: 'Europe/Berlin', label: '🇩🇪 Berlin (CET)' },
  { value: 'Asia/Tokyo', label: '🇯🇵 Tokyo (JST)' },
  { value: 'Asia/Seoul', label: '🇰🇷 Seoul (KST)' },
  { value: 'Asia/Kolkata', label: '🇮🇳 India (IST)' },
  { value: 'Australia/Sydney', label: '🇦🇺 Sydney (AEST)' },
  { value: 'UTC', label: '🌐 UTC' },
];

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

export const MetadataReview: React.FC<MetadataReviewProps> = ({
  selectedPlatforms,
  aiResult,
  video,
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
  const [previewMode, setPreviewMode] = useState<'form' | 'mockup' | 'split'>('form');

  // Connected accounts
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

  // ==========================================
  // YOUTUBE UPLOAD SCREEN FORM STATE
  // ==========================================
  const [ytTitle, setYtTitle] = useState('');
  const [ytDescription, setYtDescription] = useState('');
  const [ytTags, setYtTags] = useState<string[]>([]);
  const [newYtTag, setNewYtTag] = useState('');
  const [ytCategory, setYtCategory] = useState('1');
  const [ytPrivacy, setYtPrivacy] = useState<PrivacyStatus>('public');
  const [ytMadeForKids, setYtMadeForKids] = useState(false);
  const [ytLanguage, setYtLanguage] = useState('en');
  const [ytScheduled, setYtScheduled] = useState(false);
  const [ytScheduleDate, setYtScheduleDate] = useState('');
  const [ytThumbnailUrl, setYtThumbnailUrl] = useState<string | null>(null);

  // ==========================================
  // MASTER SCHEDULING CONTROLS ("Post Now / Schedule")
  // ==========================================
  const [publishingMode, setPublishingMode] = useState<'now' | 'schedule'>('now');
  const [scheduleDate, setScheduleDate] = useState<string>(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return tomorrow.toISOString().split('T')[0];
  });
  const [scheduleTime, setScheduleTime] = useState<string>('18:00'); // 6:00 PM default prime time
  const [scheduleTimeZone, setScheduleTimeZone] = useState<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  });

  // ==========================================
  // INSTAGRAM REELS UPLOAD SCREEN FORM STATE
  // ==========================================
  const [igCaption, setIgCaption] = useState('');
  const [igHashtags, setIgHashtags] = useState<string[]>([]);
  const [newIgHashtag, setNewIgHashtag] = useState('');
  const [igHashtagLimit, setIgHashtagLimit] = useState(5); // Default 5 verified with Google Search grounding
  const [igShareToFeed, setIgShareToFeed] = useState(true);
  const [igLocation, setIgLocation] = useState('');
  const [igCollaborators, setIgCollaborators] = useState<string[]>([]);
  const [newIgCollab, setNewIgCollab] = useState('');
  const [igCoverType, setIgCoverType] = useState<'frame' | 'upload'>('frame');
  const [igCoverFrameSec, setIgCoverFrameSec] = useState(0);
  const [igCoverImageUrl, setIgCoverImageUrl] = useState<string | null>(null);
  const [igAltText, setIgAltText] = useState('');

  // Preset feedback state
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetAppliedMsg, setPresetAppliedMsg] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Shorts detection: duration <= 180s (3 mins) and vertical/square aspect ratio
  const durationSec = video?.durationSec || 45;
  const isVerticalOrSquare =
    !video?.width || !video?.height || video.height >= video.width;
  const isDetectedShorts = durationSec <= 180 && isVerticalOrSquare;

  // Initialize fields from AI Analysis Result
  useEffect(() => {
    if (aiResult) {
      if (aiResult.youtube) {
        setYtTitle(aiResult.youtube.title || '');
        setYtDescription(aiResult.youtube.description || '');
        setYtTags(aiResult.youtube.tags || []);
        setYtCategory(aiResult.youtube.categoryId || '1');
        if (aiResult.youtube.language) setYtLanguage(aiResult.youtube.language);
      }
      if (aiResult.instagram) {
        setIgCaption(aiResult.instagram.caption || '');
        setIgHashtags((aiResult.instagram.hashtags || []).slice(0, igHashtagLimit));
        if (aiResult.instagram.suggestedLocation) {
          setIgLocation(aiResult.instagram.suggestedLocation);
        }
        if (aiResult.instagram.suggestedCollaborators) {
          setIgCollaborators(aiResult.instagram.suggestedCollaborators);
        }
        if (aiResult.instagram.altText) {
          setIgAltText(aiResult.instagram.altText);
        }
      }
    }
  }, [aiResult]);

  // Merge applied trend context from Trends Tab (title, hashtags, keywords)
  useEffect(() => {
    if (trendContext) {
      if (trendContext.title) {
        setYtTitle(trendContext.title.slice(0, 100));
        setIgCaption((prev) => {
          if (!prev.includes(trendContext.title!)) {
            return `${trendContext.title}\n\n${prev}`.slice(0, 2200);
          }
          return prev;
        });
      }
      if (trendContext.hashtags && trendContext.hashtags.length > 0) {
        setIgHashtags((prev) => {
          const set = new Set(prev);
          trendContext.hashtags.forEach((h) => {
            const formatted = h.startsWith('#') ? h : `#${h}`;
            set.add(formatted);
          });
          return Array.from(set).slice(0, igHashtagLimit);
        });
      }
      if (trendContext.keywords && trendContext.keywords.length > 0) {
        setYtTags((prev) => {
          const set = new Set(prev.map((t) => t.toLowerCase()));
          const updated = [...prev];
          trendContext.keywords!.forEach((k) => {
            const clean = k.replace(/^#/, '').trim();
            if (clean && !set.has(clean.toLowerCase())) {
              set.add(clean.toLowerCase());
              updated.push(clean);
            }
          });
          return updated;
        });
      }
      if (trendContext.scheduledSlot) {
        setPublishingMode('schedule');
        if (trendContext.scheduledSlot.date) {
          setScheduleDate(trendContext.scheduledSlot.date);
        }
        if (trendContext.scheduledSlot.time) {
          let t = trendContext.scheduledSlot.time;
          if (t.includes('PM') || t.includes('AM')) {
            const isPM = t.includes('PM');
            const clean = t.replace(/(AM|PM|\s)/g, '');
            const [h, m] = clean.split(':').map((x) => parseInt(x, 10));
            const hour = isPM ? (h % 12) + 12 : h % 12;
            setScheduleTime(`${String(hour).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`);
          } else {
            setScheduleTime(t);
          }
        }
        if (trendContext.scheduledSlot.timeZone) {
          setScheduleTimeZone(trendContext.scheduledSlot.timeZone);
        }
      }
      setPresetAppliedMsg(`Applied trend "${trendContext.title || trendContext.topic}" to Studio fields!`);
      setTimeout(() => setPresetAppliedMsg(null), 3000);
    }
  }, [trendContext]);

  // Compute character counts & tag lengths
  const ytTitleLength = ytTitle.length;
  const ytDescLength = ytDescription.length;
  const ytTagsTotalChars = ytTags.join(',').length;
  const igCaptionLength = (igCaption + (igHashtags.length > 0 ? `\n\n${igHashtags.join(' ')}` : '')).length;

  // YouTube tag manipulation
  const handleAddYtTag = () => {
    if (!newYtTag.trim()) return;
    const clean = newYtTag.trim().replace(/^#/, '');
    if (!ytTags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      if (ytTagsTotalChars + clean.length + 1 > 500) {
        alert('Cannot add tag: YouTube tag limit is 500 characters total across all tags.');
        return;
      }
      setYtTags([...ytTags, clean]);
      setNewYtTag('');
    }
  };

  const handleRemoveYtTag = (tag: string) => {
    setYtTags(ytTags.filter((t) => t !== tag));
  };

  // Instagram hashtag manipulation
  const handleAddIgHashtag = () => {
    if (!newIgHashtag.trim()) return;
    const formatted = newIgHashtag.trim().startsWith('#')
      ? newIgHashtag.trim()
      : `#${newIgHashtag.trim()}`;

    if (!igHashtags.some((h) => h.toLowerCase() === formatted.toLowerCase())) {
      if (igHashtags.length >= igHashtagLimit) {
        alert(`Instagram hashtag limit is set to ${igHashtagLimit}. Remove a hashtag or adjust your limit setting.`);
        return;
      }
      setIgHashtags([...igHashtags, formatted]);
      setNewIgHashtag('');
    }
  };

  const handleRemoveIgHashtag = (tag: string) => {
    setIgHashtags(igHashtags.filter((t) => t !== tag));
  };

  // Instagram collaborator manipulation
  const handleAddIgCollab = () => {
    if (!newIgCollab.trim()) return;
    const formatted = newIgCollab.trim().startsWith('@')
      ? newIgCollab.trim()
      : `@${newIgCollab.trim()}`;
    if (!igCollaborators.includes(formatted)) {
      setIgCollaborators([...igCollaborators, formatted]);
      setNewIgCollab('');
    }
  };

  const handleRemoveIgCollab = (handle: string) => {
    setIgCollaborators(igCollaborators.filter((c) => c !== handle));
  };

  // Custom thumbnail file selector
  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setYtThumbnailUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Instagram custom cover file selector
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setIgCoverImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // ==========================================
  // APPLY PRESET HANDLER
  // ==========================================
  const handleApplyPreset = (presetIdToApply: string) => {
    const preset = presets.find((p) => p.id === presetIdToApply);
    if (!preset) return;

    setSelectedPresetId(presetIdToApply);

    // Dynamic variable interpolation using Gemini recognized entities
    const character = aiResult?.recognizedCharacter || 'Protagonist';
    const series = aiResult?.recognizedSeries || 'Featured Series';
    const editStyle = aiResult?.editStyle || '4K HDR Velocity';

    const interpolate = (str: string) => {
      return str
        .replace(/{character}/g, character)
        .replace(/{series}/g, series)
        .replace(/{edit_style}/g, editStyle)
        .replace(/{editStyle}/g, editStyle);
    };

    if (preset.platform === 'youtube') {
      if (preset.titleTemplate) {
        setYtTitle(interpolate(preset.titleTemplate));
      }
      let desc = preset.descriptionTemplate ? interpolate(preset.descriptionTemplate) : ytDescription;
      if (preset.descriptionFooter && !desc.includes(preset.descriptionFooter.trim())) {
        desc = `${desc}\n\n${preset.descriptionFooter}`;
      }
      setYtDescription(desc.slice(0, 5000));

      if (preset.tags && preset.tags.length > 0) {
        const combined = Array.from(new Set([...preset.tags, ...ytTags]));
        setYtTags(combined);
      }
      if (preset.category) setYtCategory(preset.category);
      if (preset.privacy) setYtPrivacy(preset.privacy);
      if (preset.madeForKids !== undefined) setYtMadeForKids(preset.madeForKids);
      if (preset.language) setYtLanguage(preset.language);

      setPresetAppliedMsg(`Applied preset "${preset.name}" for YouTube with recognized ${character} (${series})!`);
    } else {
      let cap = preset.captionTemplate ? interpolate(preset.captionTemplate) : igCaption;
      if (preset.descriptionFooter && !cap.includes(preset.descriptionFooter.trim())) {
        cap = `${cap}\n\n${preset.descriptionFooter}`;
      }
      setIgCaption(cap.slice(0, 2200));

      if (preset.hashtagLimit) setIgHashtagLimit(preset.hashtagLimit);

      const limit = preset.hashtagLimit || igHashtagLimit || 5;
      const combinedHash = Array.from(new Set([...(preset.fixedHashtags || []), ...igHashtags])).slice(0, limit);
      setIgHashtags(combinedHash);

      if (preset.shareToFeed !== undefined) setIgShareToFeed(preset.shareToFeed);
      if (preset.defaultLocation) setIgLocation(preset.defaultLocation);
      if (preset.collaborators) setIgCollaborators(preset.collaborators);

      setPresetAppliedMsg(`Applied preset "${preset.name}" for Instagram with recognized ${character} (${series})!`);
    }

    setTimeout(() => setPresetAppliedMsg(null), 4000);
  };

  // ==========================================
  // PUBLISH CLICK VALIDATION & DISPATCH
  // ==========================================
  const handlePublishClick = async () => {
    setPublishError(null);

    // Validation
    if (selectedPlatforms.includes('youtube')) {
      if (!ytTitle.trim()) {
        setPublishError('YouTube title cannot be empty.');
        return;
      }
      if (ytTitle.length > 100) {
        setPublishError(`YouTube title exceeds 100 characters (${ytTitle.length}/100). Please shorten it.`);
        return;
      }
      if (ytTagsTotalChars > 500) {
        setPublishError(`YouTube tags exceed 500 characters total (${ytTagsTotalChars}/500). Please remove some tags.`);
        return;
      }
      if (!selectedYtAccountId && youtubeAccounts.length > 0) {
        setPublishError('Please select a YouTube channel for upload.');
        return;
      }
    }

    if (selectedPlatforms.includes('instagram')) {
      if (!igCaption.trim() && igHashtags.length === 0) {
        setPublishError('Instagram Reels caption cannot be empty.');
        return;
      }
      if (igCaptionLength > 2200) {
        setPublishError(`Instagram caption exceeds 2200 characters (${igCaptionLength}/2200).`);
        return;
      }
      if (!selectedIgAccountId && instagramAccounts.length > 0) {
        setPublishError('Please select an Instagram account for upload.');
        return;
      }
    }

    // Build real API payloads (stripping all unsupported mock fields)
    const payloads: {
      youtubePayload?: YouTubePublishPayload;
      instagramPayload?: InstagramPublishPayload;
    } = {};

    const isSched = publishingMode === 'schedule';
    const targetDateTimeIso = isSched && scheduleDate && scheduleTime
      ? new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString()
      : undefined;

    if (selectedPlatforms.includes('youtube')) {
      let finalTitle = ytTitle.trim();
      if (isDetectedShorts && !finalTitle.toLowerCase().includes('#shorts')) {
        finalTitle = `${finalTitle} #Shorts`.slice(0, 100);
      }

      payloads.youtubePayload = {
        title: finalTitle,
        description: ytDescription.trim(),
        tags: ytTags,
        privacyStatus: isSched ? 'private' : ytPrivacy,
        categoryId: ytCategory,
        madeForKids: ytMadeForKids,
        scheduledPublishTime: isSched ? targetDateTimeIso : undefined,
        language: ytLanguage,
        customThumbnailUrl: ytThumbnailUrl || undefined,
        isShorts: isDetectedShorts,
      };
    }

    if (selectedPlatforms.includes('instagram')) {
      payloads.instagramPayload = {
        caption: igCaption.trim(),
        hashtags: igHashtags,
        shareToFeed: igShareToFeed,
        location: igLocation.trim() || undefined,
        collaborators: igCollaborators.length > 0 ? igCollaborators : undefined,
        coverImageUrl: igCoverType === 'upload' && igCoverImageUrl ? igCoverImageUrl : undefined,
        thumbOffsetMs: igCoverType === 'frame' ? Math.round(igCoverFrameSec * 1000) : undefined,
        altText: igAltText || undefined,
      };
    }

    try {
      await onPublish({
        ...payloads,
        isScheduled: isSched,
        scheduledPublishTime: targetDateTimeIso,
        scheduledTimeZone: isSched ? scheduleTimeZone : undefined,
        selectedAccounts: {
          youtubeAccountId: selectedPlatforms.includes('youtube') ? selectedYtAccountId || undefined : undefined,
          instagramAccountId: selectedPlatforms.includes('instagram') ? selectedIgAccountId || undefined : undefined,
        },
      });
    } catch (err: any) {
      setPublishError(err.message || 'Publishing failed. Please check your credentials and try again.');
    }
  };

  const isYtActive = activePlatformTab === 'youtube';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner: Recognized Character & Series from Gemini */}
      {aiResult && (aiResult.recognizedCharacter || aiResult.recognizedSeries) && (
        <div className="bg-gradient-to-r from-indigo-950/70 via-purple-950/50 to-slate-900 border border-indigo-800/60 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/40 rounded-xl text-indigo-300 shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Gemini Video Intelligence
                </span>
                {aiResult.editStyle && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {aiResult.editStyle}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-white mt-0.5">
                Recognized: <span className="text-indigo-200">{aiResult.recognizedCharacter || 'Protagonist'}</span> in{' '}
                <span className="text-purple-200">{aiResult.recognizedSeries || 'Universe'}</span>
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400">
            Auto-filled titles, lore descriptions & hashtags. Everything is fully editable below.
          </div>
        </div>
      )}

      {/* Preset Feedback Message */}
      {presetAppliedMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs flex items-center gap-2 text-emerald-200 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{presetAppliedMsg}</span>
        </div>
      )}

      {/* Publish Error Notification */}
      {publishError && (
        <div className="p-4 bg-red-950/90 border border-red-800 rounded-2xl text-xs text-red-200 flex items-start justify-between gap-3 shadow-xl">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-red-300 text-sm">Cannot Publish Video</strong>
              <p className="mt-0.5 text-xs text-red-200">{publishError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPublishError(null)}
            className="p-1 text-red-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Platform Tabs & Apply Preset Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
        {/* Platform Selector Buttons */}
        <div className="flex items-center gap-2">
          {selectedPlatforms.includes('youtube') && (
            <button
              type="button"
              onClick={() => setActivePlatformTab('youtube')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isYtActive
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm ring-1 ring-red-500/30'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Youtube className="w-4 h-4 text-red-500" />
              <span>YouTube Shorts Form</span>
              {isDetectedShorts && (
                <span className="text-[10px] bg-red-500/30 text-red-200 px-1.5 py-0.2 rounded font-mono">
                  Shorts
                </span>
              )}
            </button>
          )}

          {selectedPlatforms.includes('instagram') && (
            <button
              type="button"
              onClick={() => setActivePlatformTab('instagram')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                !isYtActive
                  ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300 border border-pink-500/40 shadow-sm ring-1 ring-pink-500/30'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Instagram className="w-4 h-4 text-pink-500" />
              <span>Instagram Reels Form</span>
            </button>
          )}
        </div>

        {/* Apply Preset Dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-300">Apply Preset:</span>
          </div>

          <select
            value={selectedPresetId}
            onChange={(e) => {
              if (e.target.value) handleApplyPreset(e.target.value);
            }}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Choose Ready-Made Preset --</option>
            {presets
              .filter((p) => p.platform === activePlatformTab)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.genre ? `(${p.genre})` : ''}
                </option>
              ))}
          </select>

          {/* View Mode Switcher */}
          <div className="hidden lg:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setPreviewMode('form')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                previewMode === 'form' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Form Only
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('split')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                previewMode === 'split' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Split Preview
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('mockup')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                previewMode === 'mockup' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Live Mockup
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Form + Live Preview Card */}
      <div
        className={`grid gap-6 ${
          previewMode === 'split' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'
        }`}
      >
        {/* ================================================================ */}
        {/* LEFT COLUMN: THE REAL UPLOAD FORM                                */}
        {/* ================================================================ */}
        {(previewMode === 'form' || previewMode === 'split') && (
          <div
            className={`space-y-6 ${
              previewMode === 'split' ? 'lg:col-span-7' : 'w-full'
            }`}
          >
            {/* -------------------- YOUTUBE FORM -------------------- */}
            {isYtActive && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
                {/* Account Selector */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {currentYtAccount?.avatarUrl ? (
                      <img
                        src={currentYtAccount.avatarUrl}
                        alt="Channel"
                        className="w-9 h-9 rounded-full object-cover border border-slate-700"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-xs border border-red-500/30">
                        YT
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{currentYtAccount?.name || 'No YouTube Channel Connected'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {currentYtAccount?.handle || ''}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">Target Channel for Upload</div>
                    </div>
                  </div>

                  {youtubeAccounts.length > 1 ? (
                    <select
                      value={selectedYtAccountId}
                      onChange={(e) => setSelectedYtAccountId(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
                    >
                      {youtubeAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.handle || a.platformAccountId})
                        </option>
                      ))}
                    </select>
                  ) : onOpenAccounts && youtubeAccounts.length === 0 ? (
                    <button
                      type="button"
                      onClick={onOpenAccounts}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold"
                    >
                      Connect Channel
                    </button>
                  ) : null}
                </div>

                {/* Shorts Detection Badge */}
                <div className="flex items-center justify-between p-3 bg-red-950/20 border border-red-900/40 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-red-200">
                    <Film className="w-4 h-4 text-red-400 shrink-0" />
                    <span>
                      {isDetectedShorts ? (
                        <>
                          <strong className="text-white">Detected as YouTube Short</strong> (Duration: {durationSec}s &lt; 3 mins, vertical format)
                        </>
                      ) : (
                        <>Standard YouTube Video ({durationSec}s)</>
                      )}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                    #Shorts Auto-Tag
                  </span>
                </div>

                {/* 1. Title (100 char limit) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <label className="text-slate-300 flex items-center gap-1.5">
                      <span>Video Title</span>
                      <span className="text-red-400">*</span>
                    </label>
                    <span
                      className={`font-mono text-[11px] ${
                        ytTitleLength > 100 ? 'text-red-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {ytTitleLength}/100 characters
                    </span>
                  </div>
                  <input
                    type="text"
                    value={ytTitle}
                    maxLength={100}
                    onChange={(e) => setYtTitle(e.target.value)}
                    placeholder="Enter catchy title with character and #Shorts..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* 2. Description (5000 char limit) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <label className="text-slate-300">Description</label>
                    <span className="font-mono text-[11px] text-slate-400">
                      {ytDescLength}/5000 characters
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={ytDescription}
                    maxLength={5000}
                    onChange={(e) => setYtDescription(e.target.value)}
                    placeholder="Tell viewers about your video, character lore, anime source, music credits..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-sans leading-relaxed"
                  />
                </div>

                {/* 3. Custom Thumbnail Upload */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                      Custom Thumbnail (Optional)
                    </span>
                    {ytThumbnailUrl && (
                      <button
                        type="button"
                        onClick={() => setYtThumbnailUrl(null)}
                        className="text-red-400 hover:text-red-300 text-[11px]"
                      >
                        Remove
                      </button>
                    )}
                  </label>

                  <div className="flex items-center gap-4 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    {ytThumbnailUrl ? (
                      <img
                        src={ytThumbnailUrl}
                        alt="Thumbnail preview"
                        className="w-24 h-14 object-cover rounded-lg border border-slate-700"
                      />
                    ) : (
                      <div className="w-24 h-14 bg-slate-900 border border-dashed border-slate-700 rounded-lg flex items-center justify-center text-slate-500 text-[10px]">
                        Auto-frame
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Custom Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[10px] text-slate-400 mt-1">
                        16:9 or 9:16 high-contrast image (JPG, PNG, WebP)
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Tags (500 character counter) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <label className="text-slate-300 flex items-center gap-1.5">
                      <span>YouTube Search Tags</span>
                    </label>
                    <span
                      className={`font-mono text-[11px] ${
                        ytTagsTotalChars > 500 ? 'text-red-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {ytTagsTotalChars}/500 total chars
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 p-3 bg-slate-950 border border-slate-800 rounded-xl min-h-[48px]">
                    {ytTags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 text-slate-200 rounded-lg text-xs"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => handleRemoveYtTag(t)}
                          className="text-slate-400 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {ytTags.length === 0 && (
                      <span className="text-xs text-slate-500 py-1">No tags yet.</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newYtTag}
                      onChange={(e) => setNewYtTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddYtTag())}
                      placeholder="Add tag (e.g. anime edit, gojo satoru, phonk amv)..."
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddYtTag}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* 5. Category & Language */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Category</label>
                    <select
                      value={ytCategory}
                      onChange={(e) => setYtCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500"
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
                      Language
                    </label>
                    <select
                      value={ytLanguage}
                      onChange={(e) => setYtLanguage(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 6. Visibility & Scheduling */}
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">Visibility & Schedule</label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ytScheduled}
                        onChange={(e) => setYtScheduled(e.target.checked)}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      <span>Schedule for later</span>
                    </label>
                  </div>

                  {!ytScheduled ? (
                    <div className="grid grid-cols-3 gap-2">
                      {(['public', 'unlisted', 'private'] as PrivacyStatus[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setYtPrivacy(st)}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold capitalize border transition-all ${
                            ytPrivacy === st
                              ? 'bg-red-500/20 border-red-500/50 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-xs text-amber-300">
                        <Calendar className="w-4 h-4 text-amber-400" />
                        <span>Select publication release date & time (UTC):</span>
                      </div>
                      <input
                        type="datetime-local"
                        value={ytScheduleDate}
                        onChange={(e) => setYtScheduleDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <p className="text-[11px] text-slate-400">
                        YouTube will keep the video private until this time, then automatically make it public.
                      </p>
                    </div>
                  )}
                </div>

                {/* 7. Made for Kids toggle */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    COPPA Audience Selection
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="ytKids"
                        checked={ytMadeForKids === false}
                        onChange={() => setYtMadeForKids(false)}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span>No, it's not made for kids (Standard)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="ytKids"
                        checked={ytMadeForKids === true}
                        onChange={() => setYtMadeForKids(true)}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span>Yes, it's made for kids</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------- INSTAGRAM REELS FORM -------------------- */}
            {!isYtActive && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
                {/* Account Selector */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {currentIgAccount?.avatarUrl ? (
                      <img
                        src={currentIgAccount.avatarUrl}
                        alt="Instagram Account"
                        className="w-9 h-9 rounded-full object-cover border border-slate-700"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-pink-600/20 text-pink-400 flex items-center justify-center font-bold text-xs border border-pink-500/30">
                        IG
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{currentIgAccount?.name || 'No Instagram Account Connected'}</span>
                        <span className="text-[10px] text-pink-400 font-mono">
                          {currentIgAccount?.handle || ''}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">Target Reels Profile</div>
                    </div>
                  </div>

                  {instagramAccounts.length > 1 ? (
                    <select
                      value={selectedIgAccountId}
                      onChange={(e) => setSelectedIgAccountId(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
                    >
                      {instagramAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.handle})
                        </option>
                      ))}
                    </select>
                  ) : onOpenAccounts && instagramAccounts.length === 0 ? (
                    <button
                      type="button"
                      onClick={onOpenAccounts}
                      className="px-3 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-lg text-xs font-bold"
                    >
                      Connect Instagram
                    </button>
                  ) : null}
                </div>

                {/* 1. Caption (2200 char counter) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <label className="text-slate-300">Reels Caption</label>
                    <span
                      className={`font-mono text-[11px] ${
                        igCaptionLength > 2200 ? 'text-red-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {igCaptionLength}/2200 characters
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    value={igCaption}
                    maxLength={2200}
                    onChange={(e) => setIgCaption(e.target.value)}
                    placeholder="Hook your audience in the first line... Tell the story, drop a question, add emojis!"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-pink-500 font-sans leading-relaxed"
                  />
                </div>

                {/* 2. Hashtags & Verified Limit Setting */}
                <div className="p-4 bg-slate-950 border border-pink-500/20 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                        Targeted Hashtags ({igHashtags.length} / {igHashtagLimit})
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Instagram now recommends max 5 hashtags per Reel to avoid suppression (grounding verified).
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Limit:</span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={igHashtagLimit}
                        onChange={(e) => setIgHashtagLimit(Math.max(1, Math.min(30, parseInt(e.target.value, 10) || 5)))}
                        className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center text-xs font-bold text-pink-300"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 p-3 bg-slate-900/60 border border-slate-800 rounded-xl min-h-[44px]">
                    {igHashtags.map((h) => (
                      <span
                        key={h}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-950/40 border border-pink-800/40 text-pink-300 rounded-lg text-xs"
                      >
                        {h}
                        <button
                          type="button"
                          onClick={() => handleRemoveIgHashtag(h)}
                          className="text-pink-400 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {igHashtags.length === 0 && (
                      <span className="text-xs text-slate-500 py-1">No hashtags selected.</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newIgHashtag}
                      onChange={(e) => setNewIgHashtag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddIgHashtag())}
                      placeholder="Add targeted hashtag (e.g. #animeedit, #reelsviral)..."
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddIgHashtag}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* 3. Cover Frame / Custom Image Picker */}
                <div className="space-y-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                      Reel Cover
                    </label>
                    <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIgCoverType('frame')}
                        className={`px-2.5 py-1 rounded text-xs font-medium ${
                          igCoverType === 'frame' ? 'bg-pink-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        Video Frame
                      </button>
                      <button
                        type="button"
                        onClick={() => setIgCoverType('upload')}
                        className={`px-2.5 py-1 rounded text-xs font-medium ${
                          igCoverType === 'upload' ? 'bg-pink-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        Upload Cover
                      </button>
                    </div>
                  </div>

                  {igCoverType === 'frame' ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Pick frame at timestamp:</span>
                        <span className="font-mono text-pink-300 font-bold">{igCoverFrameSec.toFixed(1)}s</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={durationSec}
                        step={0.5}
                        value={igCoverFrameSec}
                        onChange={(e) => setIgCoverFrameSec(parseFloat(e.target.value))}
                        className="w-full accent-pink-500"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {igCoverImageUrl ? (
                        <img
                          src={igCoverImageUrl}
                          alt="Cover"
                          className="w-16 h-24 object-cover rounded-lg border border-slate-700"
                        />
                      ) : (
                        <div className="w-16 h-24 bg-slate-900 border border-dashed border-slate-700 rounded-lg flex items-center justify-center text-slate-500 text-[10px]">
                          9:16
                        </div>
                      )}
                      <div>
                        <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Select 9:16 Image</span>
                          <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Share to Feed & Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-pink-400" />
                      Location
                    </label>
                    <input
                      type="text"
                      value={igLocation}
                      onChange={(e) => setIgLocation(e.target.value)}
                      placeholder="e.g. Tokyo, Japan"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">Feed Distribution</label>
                    <div className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                      <span className="text-xs text-slate-200">Also share to Feed</span>
                      <input
                        type="checkbox"
                        checked={igShareToFeed}
                        onChange={(e) => setIgShareToFeed(e.target.checked)}
                        className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 bg-slate-900 border-slate-700 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Collaborators */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    Tag Collaborators
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-3 bg-slate-950 border border-slate-800 rounded-xl min-h-[44px]">
                    {igCollaborators.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-950/40 border border-purple-800/40 text-purple-300 rounded-lg text-xs"
                      >
                        {c}
                        <button
                          type="button"
                          onClick={() => handleRemoveIgCollab(c)}
                          className="text-purple-400 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {igCollaborators.length === 0 && (
                      <span className="text-xs text-slate-500 py-1">No collaborators tagged.</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newIgCollab}
                      onChange={(e) => setNewIgCollab(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddIgCollab())}
                      placeholder="Add collaborator username (e.g. @animespotlight, @marvelstudios)..."
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddIgCollab}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* RIGHT COLUMN: LIVE REALISTIC MOCKUP PREVIEW                      */}
        {/* ================================================================ */}
        {(previewMode === 'mockup' || previewMode === 'split') && (
          <div
            className={`space-y-4 ${
              previewMode === 'split' ? 'lg:col-span-5' : 'max-w-md mx-auto w-full'
            }`}
          >
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-indigo-400" />
                Live {isYtActive ? 'YouTube Shorts' : 'Instagram Reel'} Preview
              </span>
              <span className="text-[11px] text-slate-400">Uses connected account profile</span>
            </div>

            {/* REAL YOUTUBE SHORTS MOCKUP CARD */}
            {isYtActive && (
              <div className="bg-black border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative max-w-sm mx-auto aspect-[9/16] flex flex-col justify-between p-4 text-white">
                {/* Background Video / Thumbnail Simulation */}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-950/20 to-black/90 pointer-events-none z-0" />
                {ytThumbnailUrl ? (
                  <img
                    src={ytThumbnailUrl}
                    alt="YouTube Video"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : video?.publicUrl ? (
                  <video
                    src={video.publicUrl}
                    className="absolute inset-0 w-full h-full object-cover"
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                ) : (
                  <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-slate-600 text-xs font-mono">
                    [Video Player]
                  </div>
                )}

                {/* Top Overlay */}
                <div className="relative z-10 flex items-center justify-between text-xs text-white">
                  <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 font-bold">
                    <Youtube className="w-3.5 h-3.5 text-red-500" />
                    <span>Shorts</span>
                  </div>
                  <span className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono">
                    {durationSec}s
                  </span>
                </div>

                {/* Right Action Icons Column */}
                <div className="relative z-10 self-end flex flex-col items-center gap-4 pb-2">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors">
                      <Heart className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold mt-1">42K</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold mt-1">1,280</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                      <Share2 className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold mt-1">Share</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                      <Music className="w-5 h-5 text-white animate-spin" />
                    </div>
                  </div>
                </div>

                {/* Bottom Overlay: Title, Channel, & Subscribe */}
                <div className="relative z-10 space-y-2.5 bg-gradient-to-t from-black via-black/80 to-transparent p-3 -mx-4 -mb-4 pt-6">
                  {/* Channel Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {currentYtAccount?.avatarUrl ? (
                        <img
                          src={currentYtAccount.avatarUrl}
                          alt="Avatar"
                          className="w-8 h-8 rounded-full border border-white/20"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-xs">
                          YT
                        </div>
                      )}
                      <div>
                        <span className="text-xs font-bold block leading-none">
                          {currentYtAccount?.name || 'Channel Name'}
                        </span>
                        <span className="text-[10px] text-slate-300">
                          {currentYtAccount?.handle || '@channel'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold hover:bg-red-500 transition-colors"
                    >
                      Subscribe
                    </button>
                  </div>

                  {/* Title & Description Preview */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold line-clamp-2 text-white">
                      {ytTitle || 'Catchy YouTube Shorts Video Title #Shorts'}
                    </p>
                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                      {ytDescription || 'Video description lore and tags will appear here.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* REAL INSTAGRAM REEL MOCKUP CARD */}
            {!isYtActive && (
              <div className="bg-black border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative max-w-sm mx-auto aspect-[9/16] flex flex-col justify-between p-4 text-white">
                {/* Background Image / Video */}
                {igCoverImageUrl ? (
                  <img
                    src={igCoverImageUrl}
                    alt="Instagram Reel Cover"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : video?.publicUrl ? (
                  <video
                    src={video.publicUrl}
                    className="absolute inset-0 w-full h-full object-cover"
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                ) : (
                  <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-slate-600 text-xs font-mono">
                    [Reel Player]
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90 pointer-events-none z-0" />

                {/* Top Bar */}
                <div className="relative z-10 flex items-center justify-between text-xs font-bold">
                  <span className="tracking-wider">Reels</span>
                  <div className="flex items-center gap-2">
                    {igLocation && (
                      <span className="text-[10px] bg-black/60 px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/10">
                        <MapPin className="w-2.5 h-2.5 text-pink-400" />
                        {igLocation}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Action Icons Column */}
                <div className="relative z-10 self-end flex flex-col items-center gap-4 pb-2">
                  <div className="flex flex-col items-center">
                    <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                      <Heart className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold mt-1">36.4K</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold mt-1">942</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                      <Share2 className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                      <Bookmark className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Spinning Audio Album Cover */}
                  <div className="w-8 h-8 rounded-full border border-white/30 p-0.5 bg-black animate-spin">
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-pink-500 to-purple-500" />
                  </div>
                </div>

                {/* Bottom Overlay: Account, Caption, Audio */}
                <div className="relative z-10 space-y-2 bg-gradient-to-t from-black via-black/80 to-transparent p-3 -mx-4 -mb-4 pt-6">
                  {/* Account Row */}
                  <div className="flex items-center gap-2">
                    {currentIgAccount?.avatarUrl ? (
                      <img
                        src={currentIgAccount.avatarUrl}
                        alt="Instagram Avatar"
                        className="w-8 h-8 rounded-full border border-white/30"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs">
                        IG
                      </div>
                    )}
                    <span className="text-xs font-bold">{currentIgAccount?.handle || '@creator'}</span>
                    <button
                      type="button"
                      className="text-[11px] font-bold px-2.5 py-0.5 border border-white/40 rounded-lg hover:bg-white/10"
                    >
                      Follow
                    </button>
                  </div>

                  {/* Caption & Hashtags */}
                  <p className="text-[11px] leading-relaxed text-slate-100 line-clamp-3">
                    {igCaption || 'Caption will appear here...'}
                    {igHashtags.length > 0 && (
                      <span className="text-pink-300 font-semibold block mt-0.5">
                        {igHashtags.join(' ')}
                      </span>
                    )}
                  </p>

                  {/* Audio Track Bar */}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                    <Music className="w-3 h-3 text-pink-400" />
                    <span className="truncate">
                      Original Audio - {currentIgAccount?.handle || 'creator'} • Trending Phonk
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* SCHEDULING MODE SELECTOR ("Post now / Schedule")                  */}
      {/* ================================================================ */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Publication Mode</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose whether to launch immediately or schedule across your target accounts.
            </p>
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setPublishingMode('now')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                publishingMode === 'now'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Post Now</span>
            </button>
            <button
              type="button"
              onClick={() => setPublishingMode('schedule')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                publishingMode === 'schedule'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Schedule</span>
            </button>
          </div>
        </div>

        {publishingMode === 'schedule' && (
          <div className="space-y-4 animate-fade-in pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Date Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Release Date</span>
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Time Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Release Time</span>
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Time Zone Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Time Zone</span>
                </label>
                <select
                  value={scheduleTimeZone}
                  onChange={(e) => setScheduleTimeZone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Platform Mechanism Breakdown Callout */}
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs space-y-1 text-slate-400">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-[11px]">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>How Multi-Platform Scheduling Works</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
                {selectedPlatforms.includes('youtube') && (
                  <li>
                    <strong className="text-red-400">YouTube:</strong> Uploads video as private with native{' '}
                    <code className="text-slate-200">status.publishAt</code> so YouTube servers publish on time.
                  </li>
                )}
                {selectedPlatforms.includes('instagram') && (
                  <li>
                    <strong className="text-pink-400">Instagram:</strong> Defers job in Supabase and keeps video file in storage until{' '}
                    <span className="text-white font-mono">{scheduleTime}</span>, then publishes via background cron and automatically deletes the video.
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* FINAL PUBLISH ACTION BAR                                         */}
      {/* ================================================================ */}
      <div className="sticky bottom-0 z-20 p-4 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {selectedPlatforms.includes('youtube') && (
              <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center border-2 border-slate-900">
                <Youtube className="w-4 h-4" />
              </div>
            )}
            {selectedPlatforms.includes('instagram') && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-pink-600 to-purple-600 text-white flex items-center justify-center border-2 border-slate-900">
                <Instagram className="w-4 h-4" />
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Ready to {publishingMode === 'schedule' ? 'Schedule' : 'Publish'} ({selectedPlatforms.join(' & ')})</span>
              {publishingMode === 'schedule' && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {scheduleDate} @ {scheduleTime}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400">
              {publishingMode === 'schedule'
                ? `Will execute for ${selectedPlatforms.length} platform(s) at designated time`
                : `${selectedPlatforms.length} platform(s) configured with verified real upload fields`}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePublishClick}
          disabled={isPublishing}
          className={`inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-sm text-white shadow-xl transition-all ${
            isPublishing
              ? 'bg-indigo-600/50 cursor-not-allowed'
              : publishingMode === 'schedule'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-600/30 active:scale-95'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-600/30 active:scale-95'
          }`}
        >
          {isPublishing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{publishingMode === 'schedule' ? 'Scheduling Post...' : 'Sending to Platforms...'}</span>
            </>
          ) : publishingMode === 'schedule' ? (
            <>
              <Clock className="w-4 h-4" />
              <span>Schedule for {scheduleDate} at {scheduleTime}</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Publish Now to {selectedPlatforms.length > 1 ? 'Both Platforms' : selectedPlatforms[0]}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
