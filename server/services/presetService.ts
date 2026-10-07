import fs from 'fs';
import path from 'path';
import { Platform, PlatformPreset, AIAnalysisResult, YouTubePublishPayload, InstagramPublishPayload } from '../../shared/types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const PRESETS_FILE = path.join(DATA_DIR, 'presets.json');

// Default initial presets for each platform
const DEFAULT_PRESETS: PlatformPreset[] = [
  {
    id: 'preset-youtube-default',
    platform: 'youtube',
    name: 'YouTube Shorts Viral Boost',
    fixedHashtags: ['#Shorts', '#Creator', '#Trending2026'],
    descriptionFooter: `\n\n━━━━━━━━━━━━━━━━━━━━━━\n🔔 Subscribe to the channel & turn on all notifications!\n🌐 Links & Resources: https://creator.link\n📩 Business: collaborations@creator.com`,
    category: '28', // Science & Technology
    privacy: 'public',
    tone: 'viral_hook',
    shareToFeed: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'preset-instagram-default',
    platform: 'instagram',
    name: 'Instagram Reels High-Reach',
    fixedHashtags: ['#reels', '#reelsviral', '#explorepage', '#creators'],
    descriptionFooter: `\n\n---\n📌 Tap save so you don't lose this!\n✨ Follow for daily drops & breakdowns.`,
    category: '28',
    privacy: 'public',
    tone: 'viral_hook',
    shareToFeed: true,
    updatedAt: new Date().toISOString(),
  },
];

export class PresetService {
  private static presets: Map<string, PlatformPreset> = new Map();

  static init(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(PRESETS_FILE)) {
      try {
        const raw = fs.readFileSync(PRESETS_FILE, 'utf-8');
        const list: PlatformPreset[] = JSON.parse(raw);
        list.forEach((p) => this.presets.set(p.platform, p));
        console.log(`[PresetService] Loaded ${this.presets.size} presets from database.`);
      } catch (err) {
        console.warn('[PresetService] Error loading presets, using defaults:', err);
        this.saveDefaults();
      }
    } else {
      this.saveDefaults();
    }
  }

  private static saveDefaults(): void {
    DEFAULT_PRESETS.forEach((p) => this.presets.set(p.platform, p));
    this.persist();
  }

  private static persist(): void {
    try {
      const list = Array.from(this.presets.values());
      fs.writeFileSync(PRESETS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[PresetService] Failed to persist presets to disk:', err);
    }
  }

  static getAll(): PlatformPreset[] {
    return Array.from(this.presets.values());
  }

  static getForPlatform(platform: Platform): PlatformPreset {
    const existing = this.presets.get(platform);
    if (existing) return existing;
    const defaultPreset = DEFAULT_PRESETS.find((p) => p.platform === platform) || DEFAULT_PRESETS[0];
    return defaultPreset;
  }

  static savePreset(preset: Partial<PlatformPreset> & { platform: Platform }): PlatformPreset {
    const existing = this.presets.get(preset.platform) || {
      id: `preset-${preset.platform}-${Date.now()}`,
      platform: preset.platform,
      name: `${preset.platform.toUpperCase()} Preset`,
      fixedHashtags: [],
      descriptionFooter: '',
      category: '28',
      privacy: 'public',
      tone: 'viral_hook',
      shareToFeed: true,
      updatedAt: new Date().toISOString(),
    };

    const updated: PlatformPreset = {
      ...existing,
      ...preset,
      updatedAt: new Date().toISOString(),
    };

    this.presets.set(preset.platform, updated);
    this.persist();
    return updated;
  }

  /**
   * Merges AI generated content with user presets:
   * - Deduplicates and appends fixed hashtags
   * - Appends footer to description
   * - Applies saved privacy, category, and feed share settings
   */
  static mergeWithPreset(
    aiOutput: AIAnalysisResult,
    platform: Platform,
    customPreset?: PlatformPreset
  ): { youtube?: YouTubePublishPayload; instagram?: InstagramPublishPayload } {
    const preset = customPreset || this.getForPlatform(platform);

    if (platform === 'youtube') {
      const existingTags = new Set((aiOutput.youtube?.tags || []).map((t) => t.toLowerCase()));
      const combinedTags = [...(aiOutput.youtube?.tags || [])];

      // Merge hashtags into description
      const existingHashtags = new Set((aiOutput.youtube?.hashtags || []).map((h) => h.toLowerCase()));
      const mergedHashtags = [...(aiOutput.youtube?.hashtags || [])];

      preset.fixedHashtags.forEach((tag) => {
        const formatted = tag.startsWith('#') ? tag : `#${tag}`;
        if (!existingHashtags.has(formatted.toLowerCase())) {
          existingHashtags.add(formatted.toLowerCase());
          mergedHashtags.push(formatted);
        }
      });

      const baseDesc = aiOutput.youtube?.description || '';
      const footer = preset.descriptionFooter ? preset.descriptionFooter : '';
      const finalDesc = `${baseDesc}${footer}`;

      return {
        youtube: {
          title: aiOutput.youtube?.title || 'New Video Upload',
          description: finalDesc,
          tags: combinedTags,
          privacyStatus: preset.privacy,
          categoryId: preset.category || '28',
          madeForKids: false,
        },
      };
    } else {
      // Instagram
      const existingHashtags = new Set((aiOutput.instagram?.hashtags || []).map((h) => h.toLowerCase()));
      const mergedHashtags = [...(aiOutput.instagram?.hashtags || [])];

      preset.fixedHashtags.forEach((tag) => {
        const formatted = tag.startsWith('#') ? tag : `#${tag}`;
        if (!existingHashtags.has(formatted.toLowerCase())) {
          existingHashtags.add(formatted.toLowerCase());
          mergedHashtags.push(formatted);
        }
      });

      const baseCaption = aiOutput.instagram?.caption || '';
      const footer = preset.descriptionFooter ? preset.descriptionFooter : '';
      const finalCaption = `${baseCaption}${footer}`;

      return {
        instagram: {
          caption: finalCaption,
          hashtags: mergedHashtags,
          shareToFeed: preset.shareToFeed ?? true,
        },
      };
    }
  }
}

// Initialize on module load
PresetService.init();
