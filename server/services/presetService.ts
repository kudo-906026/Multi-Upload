import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

// Built-in ready-made presets for Anime edit, Marvel edit, Manhwa edit, Gaming, and Cinema
export const DEFAULT_PRESETS: PlatformPreset[] = [
  // --- 1. ANIME EDIT ---
  {
    id: 'preset-yt-anime',
    platform: 'youtube',
    genre: 'anime',
    name: 'Anime Edit (4K HDR / Phonk)',
    titleTemplate: '{character} | {series} Edit ⚡ [{edit_style}] #Shorts',
    descriptionTemplate: `Witness {character} at absolute peak power in this {series} edit!\n\nAnime: {series}\nCharacter: {character}\nStyle: {edit_style}\nAudio: Phonk / Slowed Beat\n\nEnjoying these edits? Subscribe & like for daily anime edits!`,
    fixedHashtags: [],
    descriptionFooter: `\n\n━━━━━━━━━━━━━━━━━━━━━━\n⚡ Watch in 4K HDR for maximum visual detail\n🔔 Subscribe with bell turned on: https://youtube.com/@creator\n🎨 Edited in After Effects & Premiere Pro\n📌 Disclaimer: All rights belong to original creators & studios.`,
    tags: [
      'anime edit',
      'amv',
      'anime shorts',
      'phonk edit',
      'anime tiktok',
      '4k anime',
      'anime 60fps',
      'anime status',
      'badass anime moments',
      'jujutsu kaisen',
      'gojo satoru',
    ],
    category: '1', // Film & Animation
    privacy: 'public',
    tone: 'viral_hook',
    shareToFeed: true,
    madeForKids: false,
    language: 'en',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'preset-ig-anime',
    platform: 'instagram',
    genre: 'anime',
    name: 'Anime Edit (Reels Viral)',
    captionTemplate: `{character} is honestly terrifying 🥶 Who is beating them in {series}?\n\nAudio: Trending Phonk\nVisuals: {series} - {character}\n\nSave this Reel & share with your anime squad! ⚔️`,
    descriptionFooter: `\n\n---\n🔥 Follow for daily anime edits & manga panels!\n💬 Drop your favorite character below\n📌 Save this Reel so you don't lose it`,
    fixedHashtags: ['#animeedit', '#animereels', '#jujutsukaisen', '#amvedits', '#reelsviral'],
    tags: [],
    category: '1',
    privacy: 'public',
    tone: 'viral_hook',
    shareToFeed: true,
    defaultLocation: 'Tokyo, Japan',
    collaborators: ['@animespotlight', '@animestudio'],
    hashtagLimit: 5,
    updatedAt: new Date().toISOString(),
  },

  // --- 2. MARVEL EDIT ---
  {
    id: 'preset-yt-marvel',
    platform: 'youtube',
    genre: 'marvel',
    name: 'Marvel Edit (Cinematic / MCU)',
    titleTemplate: '{character} - Peak Marvel Cinematic Edit 🎬 [{edit_style}] #Shorts',
    descriptionTemplate: `The cinematic journey of {character} across the {series}!\n\nCharacter: {character}\nFranchise: Marvel / {series}\nVFX & Grade: 4K Rec.709 Color Flow\n\nLeave a comment with your favorite Marvel moment!`,
    fixedHashtags: [],
    descriptionFooter: `\n\n━━━━━━━━━━━━━━━━━━━━━━\n🎬 MCU Universe Edits & Character Tributes\n🔔 Subscribe for daily superhero shorts!\n📩 Contact: marveledits@creator.com\n✨ Marvel Studios characters & scenes.`,
    tags: [
      'marvel edit',
      'mcu',
      'avengers edit',
      'marvel cinematic universe',
      'superhero edit',
      'marvel shorts',
      '4k marvel',
      'marvel tiktok',
      'peter parker',
      'iron man',
    ],
    category: '24', // Entertainment
    privacy: 'public',
    tone: 'viral_hook',
    shareToFeed: true,
    madeForKids: false,
    language: 'en',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'preset-ig-marvel',
    platform: 'instagram',
    genre: 'marvel',
    name: 'Marvel Edit (MCU Reels)',
    captionTemplate: `No one could have pulled this off like {character} in {series} 🐐\n\nMCU fans, where does this rank among your all-time top superhero moments?\n\nTag a Marvel fan who needs to rewatch this! 💥`,
    descriptionFooter: `\n\n---\n🛡️ Daily Marvel & MCU Reels\n📌 Tap save & share to your story!\n🍿 Comment which Marvel character we should do next`,
    fixedHashtags: ['#marveledit', '#mcu', '#spidermanedit', '#marveltok', '#avengersedit'],
    tags: [],
    category: '24',
    privacy: 'public',
    tone: 'viral_hook',
    shareToFeed: true,
    defaultLocation: 'New York, NY',
    collaborators: ['@marvelcinematic', '@marvelpage'],
    hashtagLimit: 5,
    updatedAt: new Date().toISOString(),
  },

  // --- 3. MANHWA EDIT ---
  {
    id: 'preset-yt-manhwa',
    platform: 'youtube',
    genre: 'manhwa',
    name: 'Manhwa Edit (Solo Leveling / Webtoon)',
    titleTemplate: '{character} Arises! | {series} Manhwa Edit 👑 [{edit_style}] #Shorts',
    descriptionTemplate: `The unstoppable aura of {character} from {series}!\n\nWebtoon / Manhwa: {series}\nProtagonist: {character}\nSoundtrack: Dark Phonk / Orchestral Trap\n\nRead the official webtoon & subscribe for more manhwa animation edits!`,
    fixedHashtags: [],
    descriptionFooter: `\n\n━━━━━━━━━━━━━━━━━━━━━━\n📖 Support the author & artists on official webtoon platforms\n🔔 Subscribe for more weekly manhwa motion edits!\n💬 Join our community for manhwa recommendations & discussion.`,
    tags: [
      'manhwa edit',
      'solo leveling',
      'webtoon edit',
      'manhwa recommendation',
      'sung jin woo',
      'manhwa shorts',
      'shadow monarch',
      'omniscient reader',
      'action webtoon',
    ],
    category: '1', // Film & Animation
    privacy: 'public',
    tone: 'viral_hook',
    shareToFeed: true,
    madeForKids: false,
    language: 'en',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'preset-ig-manhwa',
    platform: 'instagram',
    genre: 'manhwa',
    name: 'Manhwa Edit (Reels Hype)',
    captionTemplate: `The aura in this chapter was unmatched 🔥 {character} just became that guy in {series}.\n\nHave you read {series} yet? Rate this manhwa from 1 to 10 below! 👇`,
    descriptionFooter: `\n\n---\n👑 Follow for elite manhwa & webtoon edits\n📚 Save this post for your reading list\n💬 Tell me what chapter this is from in comments!`,
    fixedHashtags: ['#manhwaedit', '#sololeveling', '#webtoonedit', '#manhwarecommendation', '#sungjinwoo'],
    tags: [],
    category: '1',
    privacy: 'public',
    tone: 'viral_hook',
    shareToFeed: true,
    defaultLocation: 'Seoul, South Korea',
    collaborators: ['@webtoonofficial', '@manhwaclub'],
    hashtagLimit: 5,
    updatedAt: new Date().toISOString(),
  },

  // --- 4. GAMING / PHONK EDIT ---
  {
    id: 'preset-yt-gaming',
    platform: 'youtube',
    genre: 'gaming',
    name: 'Gaming Velocity & Phonk Edit',
    titleTemplate: '{character} UNREAL Clutch | {series} 1v5 Edit 🎯 [{edit_style}] #Shorts',
    descriptionTemplate: `Insane velocity beat sync highlights featuring {character} in {series}!\n\nGame: {series}\nPlayer / Agent: {character}\nSong: Drift Phonk (Slowed + Reverb)\n\nSmash that like button if that headshot was clean!`,
    fixedHashtags: [],
    descriptionFooter: `\n\n━━━━━━━━━━━━━━━━━━━━━━\n🎮 Daily Competitive Gaming Highlights & Velocity Edits\n🔔 Subscribe for weekly montages\n⚙️ Sensitivity: 800 DPI | 0.35`,
    tags: [
      'gaming edit',
      'phonk edit',
      'velocity edit',
      'clutch montage',
      'gametok',
      'clean transitions',
      'gaming shorts',
      '4k gaming',
      'valorant edit',
    ],
    category: '20', // Gaming
    privacy: 'public',
    tone: 'viral_hook',
    shareToFeed: true,
    madeForKids: false,
    language: 'en',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'preset-ig-gaming',
    platform: 'instagram',
    genre: 'gaming',
    name: 'Gaming Velocity (Reels Sync)',
    captionTemplate: `Wait for the beat drop on this {character} play 😮‍💨 | {series}\n\nCould you hit this clutch under pressure?\n\nTag your duo who needs to hit these shots! 🎯`,
    descriptionFooter: `\n\n---\n🕹️ Daily Gaming Clips & Beat Syncs\n📌 Save for edit inspiration\n🔊 Headphones recommended`,
    fixedHashtags: ['#gamingedit', '#phonkedit', '#gametok', '#velocityedit', '#clutch'],
    tags: [],
    category: '20',
    privacy: 'public',
    tone: 'viral_hook',
    shareToFeed: true,
    defaultLocation: 'Los Angeles, CA',
    collaborators: ['@gamingspotlight', '@esportsedits'],
    hashtagLimit: 5,
    updatedAt: new Date().toISOString(),
  },
];

export class PresetService {
  // Keyed by preset id
  private static userCustomPresets: Map<string, PlatformPreset> = new Map();

  static init(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(PRESETS_FILE)) {
      try {
        const raw = fs.readFileSync(PRESETS_FILE, 'utf-8');
        const list: PlatformPreset[] = JSON.parse(raw);
        list.forEach((p) => {
          this.userCustomPresets.set(p.id, p);
        });
      } catch (err) {
        console.warn('[PresetService] Error loading presets cache:', err);
      }
    }
  }

  private static persistLocal(): void {
    try {
      const list = Array.from(this.userCustomPresets.values());
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
          this.userCustomPresets.set(row.id, {
            id: row.id,
            userId: row.user_id,
            platform: row.platform,
            name: row.name,
            genre: row.genre || 'custom',
            titleTemplate: row.title_template,
            descriptionTemplate: row.description_template,
            captionTemplate: row.caption_template,
            fixedHashtags: Array.isArray(row.fixed_hashtags) ? row.fixed_hashtags : [],
            descriptionFooter: row.description_footer || '',
            tags: Array.isArray(row.tags) ? row.tags : [],
            category: row.category || '1',
            privacy: row.privacy || 'public',
            tone: row.tone || 'viral_hook',
            shareToFeed: row.share_to_feed ?? true,
            madeForKids: row.made_for_kids ?? false,
            language: row.language || 'en',
            defaultLocation: row.default_location,
            collaborators: Array.isArray(row.collaborators) ? row.collaborators : [],
            hashtagLimit: row.hashtag_limit || 5,
            updatedAt: row.updated_at || new Date().toISOString(),
          });
        });
        this.persistLocal();
      }
    } catch (err: any) {
      console.warn('[PresetService] Supabase sync presets error:', err.message);
    }
  }

  /**
   * Returns all presets (built-in ready-made presets + user-saved presets).
   */
  static async getAll(userId: string): Promise<PlatformPreset[]> {
    await this.syncUserPresets(userId);

    // Filter user's custom presets
    const userList = Array.from(this.userCustomPresets.values()).filter(
      (p) => !p.userId || p.userId === userId
    );

    // Merge built-in presets with user overrides if same ID
    const mergedMap = new Map<string, PlatformPreset>();

    DEFAULT_PRESETS.forEach((dp) => {
      mergedMap.set(dp.id, { ...dp, userId });
    });

    userList.forEach((up) => {
      mergedMap.set(up.id, up);
    });

    return Array.from(mergedMap.values());
  }

  /**
   * Gets specific preset by ID, or fallback by platform.
   */
  static async getById(userId: string, presetId: string): Promise<PlatformPreset | undefined> {
    const all = await this.getAll(userId);
    return all.find((p) => p.id === presetId);
  }

  static async getForPlatform(userId: string, platform: Platform): Promise<PlatformPreset> {
    const all = await this.getAll(userId);
    const matched = all.find((p) => p.platform === platform);
    if (matched) return matched;
    return DEFAULT_PRESETS.find((p) => p.platform === platform) || DEFAULT_PRESETS[0];
  }

  /**
   * Saves or updates a preset.
   */
  static async savePreset(
    userId: string,
    preset: Partial<PlatformPreset> & { platform: Platform; name: string }
  ): Promise<PlatformPreset> {
    const id = preset.id || `preset-${preset.platform}-${Date.now()}`;
    const existing = await this.getById(userId, id);

    const updated: PlatformPreset = {
      ...(existing || DEFAULT_PRESETS.find((p) => p.platform === preset.platform) || DEFAULT_PRESETS[0]),
      ...preset,
      id,
      userId,
      platform: preset.platform,
      updatedAt: new Date().toISOString(),
    };

    this.userCustomPresets.set(id, updated);
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
            genre: updated.genre || 'custom',
            title_template: updated.titleTemplate || null,
            description_template: updated.descriptionTemplate || null,
            caption_template: updated.captionTemplate || null,
            fixed_hashtags: updated.fixedHashtags,
            description_footer: updated.descriptionFooter,
            tags: updated.tags || [],
            category: updated.category,
            privacy: updated.privacy,
            tone: updated.tone,
            share_to_feed: updated.shareToFeed,
            made_for_kids: updated.madeForKids ?? false,
            language: updated.language || 'en',
            default_location: updated.defaultLocation || null,
            collaborators: updated.collaborators || [],
            hashtag_limit: updated.hashtagLimit || 5,
            updated_at: updated.updatedAt,
          },
          { onConflict: 'id' }
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
   * Merges AI generated content with user presets, substituting recognized
   * character name, series name, and edit style into titles, descriptions, and captions!
   */
  static async mergeWithPreset(
    userId: string,
    aiOutput: AIAnalysisResult,
    platform: Platform,
    customPreset?: PlatformPreset
  ): Promise<{ youtube?: YouTubePublishPayload; instagram?: InstagramPublishPayload }> {
    const preset = customPreset || (await this.getForPlatform(userId, platform));

    // Extract recognized entities or sensible fallbacks
    const character = aiOutput.recognizedCharacter || aiOutput.topic?.split(' ')[0] || 'Viral Creator';
    const series = aiOutput.recognizedSeries || aiOutput.topic || 'Trending Universe';
    const editStyle = aiOutput.editStyle || '4K HDR Velocity';

    const interpolate = (text: string) => {
      return text
        .replace(/{character}/g, character)
        .replace(/{series}/g, series)
        .replace(/{edit_style}/g, editStyle)
        .replace(/{editStyle}/g, editStyle);
    };

    if (platform === 'youtube') {
      let title = aiOutput.youtube?.title || `${character} | ${series} Edit #Shorts`;
      if (preset.titleTemplate) {
        title = interpolate(preset.titleTemplate);
      }
      if (!title.toLowerCase().includes('#shorts')) {
        title = `${title} #Shorts`;
      }
      title = title.slice(0, 100);

      let description = aiOutput.youtube?.description || '';
      if (preset.descriptionTemplate) {
        description = interpolate(preset.descriptionTemplate);
      }
      const footer = preset.descriptionFooter ? `\n\n${preset.descriptionFooter}` : '';
      if (!description.includes(preset.descriptionFooter.trim())) {
        description = `${description}${footer}`;
      }
      description = description.slice(0, 5000);

      // Merge tags (combining preset tags + AI tags + character + series)
      const tagSet = new Set<string>();
      (preset.tags || []).forEach((t) => tagSet.add(t.toLowerCase()));
      (aiOutput.youtube?.tags || []).forEach((t) => tagSet.add(t.toLowerCase()));
      tagSet.add(character.toLowerCase());
      tagSet.add(series.toLowerCase());
      tagSet.add('shorts');

      // Keep tags under 500 characters total
      const finalTags: string[] = [];
      let totalTagChars = 0;
      for (const tag of tagSet) {
        if (totalTagChars + tag.length + 1 <= 500) {
          finalTags.push(tag);
          totalTagChars += tag.length + 1;
        }
      }

      return {
        youtube: {
          title,
          description,
          tags: finalTags,
          privacyStatus: preset.privacy,
          categoryId: preset.category || '1',
          madeForKids: preset.madeForKids ?? false,
          language: preset.language || 'en',
          isShorts: true,
        },
      };
    } else {
      // Instagram Reels
      let caption = aiOutput.instagram?.caption || '';
      if (preset.captionTemplate) {
        caption = interpolate(preset.captionTemplate);
      }
      const footer = preset.descriptionFooter ? `\n\n${preset.descriptionFooter}` : '';
      if (!caption.includes(preset.descriptionFooter.trim())) {
        caption = `${caption}${footer}`;
      }
      caption = caption.slice(0, 2200);

      // Merge hashtags & enforce Instagram's current limit (default 5)
      const limit = preset.hashtagLimit || 5;
      const hashSet = new Set<string>();

      (preset.fixedHashtags || []).forEach((h) => {
        const formatted = h.startsWith('#') ? h : `#${h}`;
        hashSet.add(formatted.toLowerCase());
      });

      (aiOutput.instagram?.hashtags || []).forEach((h) => {
        const formatted = h.startsWith('#') ? h : `#${h}`;
        hashSet.add(formatted.toLowerCase());
      });

      const finalHashtags = Array.from(hashSet).slice(0, limit);

      return {
        instagram: {
          caption,
          hashtags: finalHashtags,
          shareToFeed: preset.shareToFeed,
          location: preset.defaultLocation || aiOutput.instagram?.suggestedLocation || undefined,
          collaborators:
            preset.collaborators && preset.collaborators.length > 0
              ? preset.collaborators
              : aiOutput.instagram?.suggestedCollaborators || undefined,
          altText: (aiOutput.instagram as any)?.altText,
        },
      };
    }
  }
}
