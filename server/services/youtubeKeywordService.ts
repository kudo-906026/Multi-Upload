import { google } from 'googleapis';
import { config } from '../config.js';
import { LiveKeywordData } from '../../shared/types.js';

export class YouTubeKeywordService {
  private static cache = new Map<string, { data: LiveKeywordData; timestamp: number }>();
  private static TTL_MS = 30 * 60 * 1000; // 30 minutes cache

  /**
   * Queries YouTube Data API v3 (search.list and videos.list) for the confirmed topic,
   * extracts top video tags and titles as live keyword data, and caches for 30 minutes.
   * Public keyword lookups use the server's YOUTUBE_API_KEY directly.
   * Skips quietly if the API key or quota are missing.
   */
  static async getLiveKeywordData(topic: string, _userId?: string): Promise<LiveKeywordData | null> {
    const cleanTopic = (topic || '').trim();
    if (!cleanTopic || cleanTopic.length < 2) return null;

    const cacheKey = cleanTopic.toLowerCase();
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.TTL_MS) {
      console.log(`[YouTubeKeywordService] Using 30m cached YouTube keywords for "${cleanTopic}"`);
      return cached.data;
    }

    try {
      const apiKey = config.youtubeApiKey;
      if (!apiKey) {
        // Skip quietly if YOUTUBE_API_KEY is not configured
        return null;
      }

      const youtube = google.youtube({
        version: 'v3',
      });

      // 1. search.list for top videos for the confirmed topic
      const searchRes = await youtube.search.list({
        key: apiKey,
        part: ['snippet'],
        q: `${cleanTopic} #shorts`,
        type: ['video'],
        order: 'viewCount',
        maxResults: 10,
      });

      const videoIds = (searchRes.data.items || [])
        .map((i) => i.id?.videoId)
        .filter(Boolean) as string[];

      if (videoIds.length === 0) {
        return null;
      }

      // 2. videos.list for detailed tags and statistics
      const detailRes = await youtube.videos.list({
        key: apiKey,
        part: ['snippet', 'statistics'],
        id: videoIds,
      });

      const topTitles: string[] = [];
      const tagCountMap = new Map<string, number>();

      (detailRes.data.items || []).forEach((item) => {
        if (item.snippet?.title) {
          topTitles.push(item.snippet.title);
        }
        const tags = item.snippet?.tags || [];
        tags.forEach((tag) => {
          const normalized = tag.toLowerCase().trim();
          if (normalized.length > 1 && normalized.length < 50) {
            tagCountMap.set(normalized, (tagCountMap.get(normalized) || 0) + 1);
          }
        });
      });

      // Rank tags by frequency
      const sortedTags = Array.from(tagCountMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([tag]) => tag)
        .slice(0, 20);

      const result: LiveKeywordData = {
        topTags: sortedTags,
        topTitles: topTitles.slice(0, 5),
        source: 'youtube_live',
        queriedAt: new Date().toISOString(),
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`[YouTubeKeywordService] Fetched & cached ${result.topTags.length} live YouTube tags for "${cleanTopic}"`);
      return result;
    } catch (err: any) {
      // Skip quietly if key or quota is missing or invalid
      console.log(`[YouTubeKeywordService] Notice: live YouTube keyword query skipped (${err?.message || 'quota or key unavailable'})`);
      return null;
    }
  }
}
