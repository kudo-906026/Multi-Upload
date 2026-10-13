import fs from 'fs';
import path from 'path';
import {
  Platform,
  PlatformPreset,
  AIAnalysisResult,
  YouTubePublishPayload,
  InstagramPublishPayload,
} from '../../shared/types.js';
import { SupabaseService } from './supabaseService.js';

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
  // Keyed by `${userId}:${platform}`
  private static presets: Map<string, PlatformPreset> = new Map();

  static init(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(PRESETS_FILE)) {
      try {
        const raw = fs.readFileSync(PRESETS_FILE, 'utf-8');
        const list: PlatformPreset[] = JSON.parse(raw);
        list.forEach((p) => {
          const key = p.userId ? `${p.userId}:${p.platform}` : `default:${p.platform}`;
          this.presets.set(key, p);
        });
      } catch (err) {
        console.warn('[PresetService] Error loading presets cache:', err);
      }
    }
  }

  private static persistLocal(): void {
    try {
      const list = Array.from(this.presets.values());
      fs.writeFileSync(PRESETS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[PresetService] Failed to persist presets locally:', err);
    }
  }

  /**
   * Syncs user presets from Supabase.
   */
  static async syncUserPresets(userId: string): Promise<void> {
    if (!SupabaseService.isConfigured() || !userId) return;
    const client = SupabaseService.getClient();
    if (!client) return;

    try {
      const { data, error } = await client
        .from('presets')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.warn(`[PresetService] Notice querying presets for user ${userId}:`, error.message);
        return;
      }

      if (data && data.length > 0) {
        data.forEach((row: any) => {
          const key = `${userId}:${row.platform}`;
          this.presets.set(key, {
            id: row.id,
            userId: row.user_id,
            platform: row.platform,
            name: row.name,
            fixedHashtags: Array.isArray(row.fixed_hashtags) ? row.fixed_hashtags : [],
            descriptionFooter: row.description_footer || '',
            category: row.category || '28',
            privacy: row.privacy || 'public',
            tone: row.tone || 'viral_hook',
            shareToFeed: row.share_to_feed ?? true,
            updatedAt: row.updated_at || new Date().toISOString(),
          });
        });
        this.persistLocal();
      }
    } catch (err: any) {
      console.warn('[PresetService] Supabase sync presets error:', err.message);
    }
  }

  static async getAll(userId: string): Promise<PlatformPreset[]> {
    await this.syncUserPresets(userId);

    const platforms: Platform[] = ['youtube', 'instagram'];
    return platforms.map((p) => this.getForPlatformLocal(userId, p));
  }

  private static getForPlatformLocal(userId: string, platform: Platform): PlatformPreset {
    const key = `${userId}:${platform}`;
    const existing = this.presets.get(key);
    if (existing) return existing;

    const defaultPreset = DEFAULT_PRESETS.find((p) => p.platform === platform) || DEFAULT_PRESETS[0];
    return {
      ...defaultPreset,
      id: `preset-${platform}-${userId}`,
      userId,
    };
  }

  static async getForPlatform(userId: string, platform: Platform): Promise<PlatformPreset> {
    await this.syncUserPresets(userId);
    return this.getForPlatformLocal(userId, platform);
  }

  static async savePreset(
    userId: string,
    preset: Partial<PlatformPreset> & { platform: Platform }
  ): Promise<PlatformPreset> {
    const key = `${userId}:${preset.platform}`;
    const existing = this.getForPlatformLocal(userId, preset.platform);

    const updated: PlatformPreset = {
      ...existing,
      ...preset,
      userId,
      platform: preset.platform,
      updatedAt: new Date().toISOString(),
    };

    this.presets.set(key, updated);
    this.persistLocal();

    // Persist to Supabase
    const client = SupabaseService.getClient();
    if (client) {
      client
        .from('presets')
        .upsert(
          {
            id: updated.id,
            user_id: userId,
            platform: updated.platform,
            name: updated.name,
            fixed_hashtags: updated.fixedHashtags,
            description_footer: updated.descriptionFooter,
            category: updated.category,
            privacy: updated.privacy,
            tone: updated.tone,
            share_to_feed: updated.shareToFeed,
            updated_at: updated.updatedAt,
          },
          { onConflict: 'user_id,platform' }
        )
        .then(
          ({ error }) => {
            if (error) console.warn('[PresetService] Supabase upsert preset notice:', error.message);
          },
          (e: any) => console.warn('[PresetService] Error saving preset to Supabase:', e?.message)
        );
    }

    return updated;
  }

  /**
   * Merges AI generated content with user presets.
   */
  static async mergeWithPreset(
    userId: string,
    aiOutput: AIAnalysisResult,
    platform: Platform,
    customPreset?: PlatformPreset
  ): Promise<{ youtube?: YouTubePublishPayload; instagram?: InstagramPublishPayload }> {
    const preset = customPreset || (await this.getForPlatform(userId, platform));

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
          title: aiOutput.youtube?.title || 'YouTube Shorts',
          description: finalDesc,
          tags: combinedTags,
          privacyStatus: preset.privacy,
          categoryId: preset.category || '28',
          madeForKids: false,
        },
      };
    } else {
      // Instagram Reels
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
      const footer = preset.descriptionFooter ? `\n\n${preset.descriptionFooter}` : '';
      const finalCaption = `${baseCaption}${footer}`;

      return {
        instagram: {
          caption: finalCaption,
          hashtags: mergedHashtags,
          shareToFeed: preset.shareToFeed,
          altText: (aiOutput.instagram as any)?.altText,
        },
      };
    }
  }
}
