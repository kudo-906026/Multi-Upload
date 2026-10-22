import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import {
  TrendingShortVideo,
  VideoClassificationType,
  VideoEditClassification,
} from '../../shared/types.js';

interface CachedClassificationEntry {
  classification: VideoEditClassification;
  cachedAt: number; // epoch ms
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_FILE_PATH = path.resolve(process.cwd(), 'uploads', 'video_classifications_cache.json');
const GEMINI_MODEL = 'gemini-3.8-flash';

const ALLOWED_TYPES: Set<VideoClassificationType> = new Set([
  'fan_edit',
  'official_clip',
  'trailer',
  'full_scene',
  'reaction',
  'recap_or_explainer',
  'compilation',
  'other',
]);

export class VideoClassifierService {
  private static memoryCache: Map<string, CachedClassificationEntry> = new Map();
  private static cacheLoaded = false;

  /**
   * Loads cache from disk on startup
   */
  private static loadCacheFromDisk(): void {
    if (this.cacheLoaded) return;
    try {
      if (fs.existsSync(CACHE_FILE_PATH)) {
        const raw = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        const now = Date.now();
        if (parsed && typeof parsed === 'object') {
          for (const [id, entry] of Object.entries(parsed)) {
            const castEntry = entry as CachedClassificationEntry;
            if (castEntry && castEntry.cachedAt && now - castEntry.cachedAt < SEVEN_DAYS_MS) {
              this.memoryCache.set(id, castEntry);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[VideoClassifierService] Could not read classification cache file:', err);
    }
    this.cacheLoaded = true;
  }

  /**
   * Persists cache to disk
   */
  private static saveCacheToDisk(): void {
    try {
      const obj: Record<string, CachedClassificationEntry> = {};
      const now = Date.now();
      for (const [id, entry] of this.memoryCache.entries()) {
        if (now - entry.cachedAt < SEVEN_DAYS_MS) {
          obj[id] = entry;
        }
      }
      const dir = path.dirname(CACHE_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[VideoClassifierService] Could not write classification cache file:', err);
    }
  }

  /**
   * Get cached classification if valid within 7 days
   */
  public static getCachedClassification(videoId: string): VideoEditClassification | null {
    this.loadCacheFromDisk();
    const entry = this.memoryCache.get(videoId);
    if (entry && Date.now() - entry.cachedAt < SEVEN_DAYS_MS) {
      return entry.classification;
    }
    return null;
  }

  /**
   * Store classification in 7-day cache
   */
  public static setCachedClassification(
    videoId: string,
    classification: VideoEditClassification
  ): void {
    this.loadCacheFromDisk();
    this.memoryCache.set(videoId, {
      classification,
      cachedAt: Date.now(),
    });
    this.saveCacheToDisk();
  }

  /**
   * Batch classifies videos in ONE request using Gemini 3.8 Flash (metadata only, no video watching).
   * Checks 7-day cache first. Only un-cached videos are sent to Gemini.
   * If Gemini is unavailable, returns available=false and notice without invented labels.
   */
  public static async batchClassifyVideos(videos: TrendingShortVideo[]): Promise<{
    classifiedVideos: TrendingShortVideo[];
    available: boolean;
    notice?: string;
    model?: string;
  }> {
    if (!videos || videos.length === 0) {
      return { classifiedVideos: [], available: true };
    }

    this.loadCacheFromDisk();
    const apiKey = config.geminiApiKey;

    // Check if Gemini API key is missing
    if (!apiKey) {
      console.warn('[VideoClassifierService] GEMINI_API_KEY missing - showing unfiltered without fake labels');
      return {
        classifiedVideos: videos,
        available: false,
        notice: 'AI edit classification is unavailable because GEMINI_API_KEY is not configured on the server. Showing all real YouTube results unfiltered.',
      };
    }

    // Separate videos into cached and uncached
    const uncachedVideos: TrendingShortVideo[] = [];
    const classificationMap = new Map<string, VideoEditClassification>();

    for (const v of videos) {
      const cached = this.getCachedClassification(v.id);
      if (cached) {
        classificationMap.set(v.id, cached);
      } else {
        uncachedVideos.push(v);
      }
    }

    console.log(
      `[VideoClassifierService] Batch classification: ${videos.length} total, ${classificationMap.size} cached, ${uncachedVideos.length} to classify with ${GEMINI_MODEL}`
    );

    // If all are already cached within 7 days, return immediately
    if (uncachedVideos.length === 0) {
      const enriched = videos.map((v) => ({
        ...v,
        classification: classificationMap.get(v.id) || undefined,
      }));
      return {
        classifiedVideos: enriched,
        available: true,
        model: GEMINI_MODEL,
      };
    }

    // Prepare candidate payload for the ONE batched request (strictly metadata: title, channel, tags, description, duration)
    const candidatePayload = uncachedVideos.map((v) => ({
      id: v.id,
      title: v.title,
      channelTitle: v.channelTitle,
      tags: v.tags || [],
      description: (v.description || '').slice(0, 300), // truncate long descriptions to optimize token usage
      durationSec: v.durationSec || 0,
    }));

    const systemPrompt = `You are a high-precision video edit classifier for YouTube Shorts.
You must classify each candidate video into exactly ONE of the following 8 categories based on its metadata:
1. fan_edit: a fan-made montage or edit with beat sync, transitions, motion effects, phonk/AMV audio, or a stylized music-driven cut
2. official_clip: an official promo or snippet published by official studios, networks, or game developers
3. trailer: official teaser or trailer for an upcoming movie, anime season, game, or series
4. full_scene: a raw or lightly trimmed anime/movie scene without fan-made editing, beat sync, or transitions
5. reaction: content creator reacting, talking, or commentating over a video with facecam/voice
6. recap_or_explainer: plot summaries, explanations, lore analysis, theories, or top 10 lists
7. compilation: a string of raw clips without stylized editing or sync
8. other: anything else not fitting the above

STRONG EDIT SIGNALS:
- Keywords in title, tags, or description: "edit", "edits", "amv", "fmv", "mmv", "phonk", "velocity", "capcut", "alight motion", "after effects", "4k edit", "twixtor", "cc", "smooth 60fps", "sync".
- Creator channels ending in "edits", "amv", "fx", "ae".

STRONG NON-EDIT SIGNALS:
- Official brand channels (e.g. Crunchyroll, Netflix, Marvel, Sony Pictures, TOHO animation, MAPPA, Warner Bros, IGN, Star Wars, Prime Video, etc.).
- Words like "official", "trailer", "teaser", "clip", "episode", "reaction", "reacts", "recap", "explained", "review", "breakdown".

You MUST return a JSON object with a single "classifications" array:
{
  "classifications": [
    {
      "id": "videoId",
      "type": "fan_edit" | "official_clip" | "trailer" | "full_scene" | "reaction" | "recap_or_explainer" | "compilation" | "other",
      "confidence": 0.0 to 1.0,
      "reason": "One concise line explaining the specific signals detected"
    }
  ]
}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt },
                {
                  text:
                    'Classify these candidate YouTube Shorts now:\n' +
                    JSON.stringify(candidatePayload, null, 2),
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[VideoClassifierService] Gemini batch API error (${response.status}):`, errorText);
        return {
          classifiedVideos: videos.map((v) => ({
            ...v,
            classification: classificationMap.get(v.id) || undefined,
          })),
          available: false,
          notice: `AI edit classification temporarily unavailable (Gemini returned status ${response.status}). Showing all real results unfiltered.`,
        };
      }

      const resData = (await response.json()) as any;
      const textOutput = resData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textOutput) {
        console.warn('[VideoClassifierService] Empty text output from Gemini');
        return {
          classifiedVideos: videos.map((v) => ({
            ...v,
            classification: classificationMap.get(v.id) || undefined,
          })),
          available: false,
          notice: 'AI edit classification returned empty response. Showing all real results unfiltered.',
        };
      }

      const parsed = JSON.parse(textOutput);
      const items = Array.isArray(parsed?.classifications)
        ? parsed.classifications
        : Array.isArray(parsed)
        ? parsed
        : [];

      const nowIso = new Date().toISOString();

      for (const item of items) {
        const vidId = String(item.id || item.videoId || '');
        if (!vidId) continue;

        let rawType = String(item.type || 'other').toLowerCase();
        if (!ALLOWED_TYPES.has(rawType as VideoClassificationType)) {
          rawType = 'other';
        }

        const conf = typeof item.confidence === 'number' ? Math.max(0, Math.min(1, item.confidence)) : 0.8;
        const reason = String(item.reason || 'Classified based on metadata analysis.').trim();

        const classification: VideoEditClassification = {
          type: rawType as VideoClassificationType,
          confidence: conf,
          reason,
          verifiedWithVideo: false,
          classifiedAt: nowIso,
        };

        classificationMap.set(vidId, classification);
        this.setCachedClassification(vidId, classification);
      }

      const enriched = videos.map((v) => ({
        ...v,
        classification: classificationMap.get(v.id) || undefined,
      }));

      return {
        classifiedVideos: enriched,
        available: true,
        model: GEMINI_MODEL,
      };
    } catch (err: any) {
      console.error('[VideoClassifierService] Batch classification failed:', err?.message || err);
      // Per Requirement 5: Never invent labels when Gemini fails. Show results unfiltered with notice.
      return {
        classifiedVideos: videos.map((v) => ({
          ...v,
          classification: classificationMap.get(v.id) || undefined,
        })),
        available: false,
        notice: 'AI edit classification is temporarily unavailable. Showing all real YouTube results unfiltered.',
      };
    }
  }

  /**
   * On-demand verification of a single video using Gemini multimodal video watching.
   * Sends the YouTube URL to Gemini, confirms or corrects the classification,
   * updates the 7-day cache, and returns the updated classification.
   */
  public static async verifyVideoWithGemini(
    videoId: string,
    videoUrl: string
  ): Promise<{
    success: boolean;
    classification?: VideoEditClassification;
    error?: string;
  }> {
    const apiKey = config.geminiApiKey;
    if (!apiKey) {
      return {
        success: false,
        error: 'GEMINI_API_KEY is not configured on the server. Unable to verify video.',
      };
    }

    const cleanVideoId = videoId.trim();
    const targetUrl =
      videoUrl && videoUrl.startsWith('http')
        ? videoUrl
        : `https://www.youtube.com/watch?v=${cleanVideoId}`;

    console.log(`[VideoClassifierService] On-demand video verification for ${cleanVideoId} via ${targetUrl}...`);

    const prompt = `Watch and analyze this YouTube video carefully.
Classify it into exactly ONE of the following 8 categories:
1. fan_edit: a fan-made montage or edit with beat sync, transitions, visual effects, phonk/AMV music, color grading, or stylized cutting
2. official_clip: an official promo or snippet from studios or publishers
3. trailer: official teaser or trailer for an upcoming movie, anime season, game, or series
4. full_scene: a raw or lightly trimmed anime/movie scene without fan-made editing, beat sync, or transitions
5. reaction: creator reacting, talking, or commentating over a video with facecam/voice
6. recap_or_explainer: plot summaries, explanations, lore analysis, theories, or reviews
7. compilation: a string of raw clips without stylized editing or sync
8. other: anything else not fitting the above

Respond ONLY in valid JSON matching this structure:
{
  "type": "fan_edit" | "official_clip" | "trailer" | "full_scene" | "reaction" | "recap_or_explainer" | "compilation" | "other",
  "confidence": 0.0 to 1.0,
  "reason": "One concise line describing what was observed in the actual video frames and audio (e.g. music sync, editing effects, official branding, facecam reaction)"
}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout for video multimodal processing

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { fileData: { fileUri: targetUrl } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[VideoClassifierService] Video verification failed (${response.status}):`, errText);
        return {
          success: false,
          error: `Gemini video verification failed with status ${response.status}.`,
        };
      }

      const resData = (await response.json()) as any;
      const textOutput = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textOutput) {
        return {
          success: false,
          error: 'Gemini returned empty response for video verification.',
        };
      }

      const parsed = JSON.parse(textOutput);
      let rawType = String(parsed.type || 'other').toLowerCase();
      if (!ALLOWED_TYPES.has(rawType as VideoClassificationType)) {
        rawType = 'other';
      }

      const conf = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.95;
      const reason = String(parsed.reason || 'Verified through video footage analysis.').trim();

      const verifiedClassification: VideoEditClassification = {
        type: rawType as VideoClassificationType,
        confidence: conf,
        reason,
        verifiedWithVideo: true,
        classifiedAt: new Date().toISOString(),
      };

      // Cache updated verified result for 7 days
      this.setCachedClassification(cleanVideoId, verifiedClassification);

      return {
        success: true,
        classification: verifiedClassification,
      };
    } catch (err: any) {
      console.error('[VideoClassifierService] On-demand video verification exception:', err);
      return {
        success: false,
        error: err?.message || 'Failed to verify video with Gemini.',
      };
    }
  }
}
