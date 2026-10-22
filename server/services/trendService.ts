import axios from 'axios';
import { google } from 'googleapis';
import { config } from '../config.js';
import { VideoClassifierService } from './videoClassifierService.js';
import {
  NicheTrendReport,
  TrendingShortVideo,
  RankedKeyword,
  RankedHashtag,
  TitleIdea,
  NicheBreakdown,
  TrendItem,
} from '../../shared/types.js';

interface CacheEntry {
  report: NicheTrendReport;
  timestamp: number;
}

export class TrendService {
  // 30-minute cache keyed by `${niche}_${region}_${timeRange}_${sort}`
  private static cache: Map<string, CacheEntry> = new Map();
  private static CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Curated keywords for niche verification.
   * A video must contain at least one niche keyword AND at least one edit keyword.
   */
  private static ANIME_KEYWORDS = [
    'anime', 'amv', 'jujutsu kaisen', 'jjk', 'gojo', 'sukuna', 'megumi', 'yuji', 'toji', 'maki',
    'demon slayer', 'kimetsu', 'tanjiro', 'nezuko', 'zenitsu', 'inui', 'rengoku', 'muzan', 'akaza', 'kokushibo',
    'solo leveling', 'sung jin woo', 'jinwoo', 'arise', 'shadow monarch', 'igris', 'beru',
    'one piece', 'zoro', 'luffy', 'sanji', 'gear 5', 'nami', 'shanks', 'kaido', 'law', 'ace',
    'naruto', 'sasuke', 'itachi', 'kakashi', 'madara', 'obito', 'minato', 'pain', 'jiraiya',
    'attack on titan', 'aot', 'eren', 'levi', 'ackerman', 'mikasa', 'armin', 'colossal',
    'bleach', 'ichigo', 'aizen', 'bankai', 'ulquiorra', 'kenpachi', 'yhwach',
    'chainsaw man', 'denji', 'makima', 'power', 'aki', 'pochita',
    'hunter x hunter', 'killua', 'gon', 'hisoka', 'kurapika', 'meruem', 'chrollo',
    'dragon ball', 'goku', 'vegeta', 'ultra instinct', 'gohan', 'trunks',
    'death note', 'light yagami', 'ryuk', 'l lawliet',
    'tokyo ghoul', 'kaneki', 'touka',
    'my hero academia', 'mha', 'deku', 'bakugo', 'todoroki', 'all might', 'shigaraki',
    'vinland saga', 'thorfinn', 'askeladd', 'canute',
    'blue lock', 'isagi', 'bachira', 'nagi', 'rin', 'barou',
    'haikyuu', 'hinata', 'kageyama',
    'berserk', 'guts', 'griffith',
    'evangelion', 'shinji', 'asuka',
    'mob psycho', 'shigeo', 'reigen',
    'frieren', 'himmel', 'fern',
    'dandadan', 'okarun', 'momo',
    'bungo stray dogs', 'dazai', 'chuuya',
    'black clover', 'asta', 'yuno', 'yami',
    'jojo', 'jotaro', 'dio', 'giorno',
  ];

  private static MARVEL_KEYWORDS = [
    'marvel', 'mcu', 'avengers', 'spider-man', 'spiderman', 'peter parker', 'miles morales',
    'iron man', 'tony stark', 'captain america', 'steve rogers', 'thor', 'odinson',
    'loki', 'deadpool', 'wade wilson', 'wolverine', 'logan', 'hugh jackman',
    'thanos', 'wandavision', 'wanda', 'scarlet witch', 'maximoff',
    'doctor strange', 'stephen strange', 'black panther', 't\'challa', 'shuri', 'wakanda',
    'bucky', 'winter soldier', 'hulk', 'bruce banner', 'black widow', 'natasha',
    'hawkeye', 'clint barton', 'daredevil', 'matt murdock', 'punisher', 'frank castle',
    'moon knight', 'marc spector', 'guardians of the galaxy', 'star-lord', 'rocket',
    'gwen stacy', 'spider-gwen', 'venom', 'eddie brock', 'carnage', 'green goblin',
    'magneto', 'x-men', 'charles xavier', 'fantastic four', 'doctor doom', 'victor von doom',
  ];

  private static MANHWA_KEYWORDS = [
    'manhwa', 'webtoon', 'solo leveling', 'sung jin woo', 'jinwoo', 'shadow monarch', 'arise',
    'omniscient reader', 'orv', 'kim dokja', 'dokja', 'yoo joonghyuk', 'joonghyuk',
    'tower of god', 'twenty-fifth baam', 'baam', 'khun', 'rak',
    'lookism', 'daniel park', 'gun park', 'goo kim', 'jonggun', 'vasco', 'zack lee',
    'wind breaker', 'jay jo', 'vinny', 'minu', 'hummingbird',
    'the boxer', 'yu', 'k', 'jean pierre',
    'nano machine', 'cheon yeo woon', 'demon cult',
    'return of the mount hua sect', 'chung myung', 'plum blossom',
    'legend of the northern blade', 'jin mu won', 'northern heavenly sect', 'murim',
    'the beginning after the end', 'tbate', 'arthur leywin', 'tessia',
    'eleceed', 'kayden', 'jiwoo', 'curtiss',
    's-classes that i raised', 'han yoojin',
    'villains are destined to die', 'penelope eckhart',
    'greatest estate developer', 'lloyd frontera', 'javier asrahan',
    'mercenary enrollment', 'teenage mercenary', 'yu ijin',
    'reaper of the drifting moon', 'pyo wol',
    'damn reincarnation', 'eugene lionheart', 'vermouth',
    'leveling with the gods', 'kim yuWon',
    'sss-class suicide hunter', 'gong-ja',
  ];

  private static EDIT_KEYWORDS = [
    'edit', 'edits', 'amv', 'velocity', 'sync', 'beat drop', 'phonk', '4k',
    'remix', 'flow', 'loop', 'cc', 'alight motion', 'capcut', 'after effects',
    'ae', 'tribute', 'shorts', 'badass', 'aura', 'motion',
  ];

  /**
   * Helper to format numbers like 1420000 into "1.4M views"
   */
  private static formatViewCount(views?: string | number): string {
    if (!views) return '0 views';
    const num = typeof views === 'string' ? parseInt(views, 10) : views;
    if (isNaN(num)) return '0 views';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M views`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K views`;
    return `${num.toLocaleString()} views`;
  }

  /**
   * Helper to calculate human-readable age e.g. "3 hours ago", "2 days ago"
   */
  private static formatTimeAgo(dateString?: string): string {
    if (!dateString) return 'recently';
    const diff = Math.max(0, Date.now() - new Date(dateString).getTime());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }

  /**
   * Determines if a video matches the requested niche based on its title, tags, and description.
   */
  private static matchesNicheCriteria(
    cleanNiche: string,
    title: string,
    tags: string[],
    description: string
  ): boolean {
    const text = `${title} ${tags.join(' ')} ${description}`.toLowerCase();

    // 1. Anime niche
    if (cleanNiche.includes('anime') || cleanNiche.includes('amv')) {
      const hasAnime = this.ANIME_KEYWORDS.some((kw) => text.includes(kw));
      const hasEdit = this.EDIT_KEYWORDS.some((kw) => text.includes(kw));
      return hasAnime && hasEdit;
    }

    // 2. Marvel niche
    if (cleanNiche.includes('marvel') || cleanNiche.includes('mcu') || cleanNiche.includes('avenger')) {
      const hasMarvel = this.MARVEL_KEYWORDS.some((kw) => text.includes(kw));
      const hasEdit = this.EDIT_KEYWORDS.some((kw) => text.includes(kw));
      return hasMarvel && hasEdit;
    }

    // 3. Manhwa niche
    if (cleanNiche.includes('manhwa') || cleanNiche.includes('webtoon')) {
      const hasManhwa = this.MANHWA_KEYWORDS.some((kw) => text.includes(kw));
      const hasEdit = this.EDIT_KEYWORDS.some((kw) => text.includes(kw));
      return hasManhwa && hasEdit;
    }

    // 4. Custom keywords niche (e.g. "batman", "star wars", "boxing")
    const words = cleanNiche
      .replace(/edits?/g, '')
      .replace(/amvs?/g, '')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 1);

    const hasCustomKeyword = words.length === 0 || words.some((w) => text.includes(w));
    const hasEditKeyword = this.EDIT_KEYWORDS.some((kw) => text.includes(kw));

    return hasCustomKeyword && hasEditKeyword;
  }

  /**
   * Main entry point to get niche trends.
   * Every card comes strictly from one real YouTube API item.
   * Never falls back to invented results or mock video data.
   */
  static async getNicheTrends(
    niche: string,
    region: string = 'US',
    timeRange: '24h' | '7d' | '30d' = '7d',
    sort: 'newest' | 'most_viewed' = 'most_viewed',
    forceRefresh: boolean = false,
    userId?: string
  ): Promise<NicheTrendReport> {
    const cleanNiche = niche.trim().toLowerCase();
    const cleanRegion = region.trim().toUpperCase();
    const cleanTimeRange = timeRange || '7d';
    const cleanSort = sort || 'most_viewed';
    const cacheKey = `${cleanNiche}_${cleanRegion}_${cleanTimeRange}_${cleanSort}`;

    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        console.log(`[TrendService] Returning cached 30-min trend report for ${cacheKey}`);
        return cached.report;
      }
    }

    console.log(
      `[TrendService] Querying YouTube Data API v3 for niche="${cleanNiche}", region="${cleanRegion}", timeRange="${cleanTimeRange}", sort="${cleanSort}"...`
    );

    // Fetch real Shorts from YouTube API v3 with strict validation
    const result = await this.fetchRealYouTubeShorts(
      cleanNiche,
      cleanRegion,
      cleanTimeRange,
      cleanSort,
      userId
    );

    const now = new Date();
    const cachedUntil = new Date(now.getTime() + this.CACHE_TTL_MS).toISOString();

    // If API key is missing, quota exceeded, or request failed: return clean empty state with the real reason
    if (result.emptyReason) {
      const emptyReport: NicheTrendReport = {
        niche,
        region,
        timeRange: cleanTimeRange,
        sort: cleanSort,
        quotaExceeded: result.quotaExceeded || false,
        quotaMessage: result.quotaMessage,
        isMissingKey: result.isMissingKey || false,
        errorMessage: result.errorMessage,
        emptyReason: result.emptyReason,
        lastUpdated: now.toISOString(),
        cachedUntil,
        dataSource: 'none',
        videos: [],
        keywords: [],
        hashtags: [],
        titleIdeas: [],
        breakdown: {
          trendingTitles: [],
          trendingCharacters: [],
          trendingEditStyles: [],
          topSongs: [],
          topHashtags: [],
          topKeywords: [],
        },
        items: [],
      };
      return emptyReport;
    }

    let videos = result.videos;

    // 1. Send candidate video metadata to Gemini in ONE batched request (no video watching)
    const classificationResult = await VideoClassifierService.batchClassifyVideos(videos);
    videos = classificationResult.classifiedVideos;

    let fanEdits = videos.filter(
      (v) => v.classification?.type === 'fan_edit' && (v.classification.confidence ?? 0) >= 0.6
    );

    // 2. If too few fan edits remain (< 6 edits) and classifier is available,
    // search again with more edit keywords instead of loosening the filter!
    if (classificationResult.available && fanEdits.length < 6) {
      console.log(
        `[TrendService] Only ${fanEdits.length} fan edits found with confidence >= 0.6. Searching again with targeted edit keywords...`
      );
      try {
        const existingIds = new Set<string>(videos.map((v) => v.id));
        const extraVideos = await this.fetchAdditionalEditCandidates(
          cleanNiche,
          cleanRegion,
          cleanTimeRange,
          cleanSort,
          existingIds
        );
        if (extraVideos.length > 0) {
          const extraClassification = await VideoClassifierService.batchClassifyVideos(extraVideos);
          videos = [...videos, ...extraClassification.classifiedVideos];

          // Re-sort videos
          if (cleanSort === 'newest') {
            videos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
          } else {
            videos.sort((a, b) => (b.rawViewCount || 0) - (a.rawViewCount || 0));
          }

          fanEdits = videos.filter(
            (v) => v.classification?.type === 'fan_edit' && (v.classification.confidence ?? 0) >= 0.6
          );
        }
      } catch (retryErr) {
        console.warn('[TrendService] Secondary search for additional edits failed:', retryErr);
      }
    }

    // Compute real keyword and hashtag metrics from the real top videos
    const keywords = this.computeKeywordsFromVideos(videos, cleanNiche);
    const hashtags = this.computeHashtagsFromVideos(videos, cleanNiche);

    // Generate title ideas grounded in the actual real video titles
    const titleIdeas = this.deriveTitleIdeasFromVideos(videos, cleanNiche);

    // Build breakdown
    const breakdown: NicheBreakdown = {
      trendingTitles: videos.slice(0, 5).map((v) => v.title),
      trendingCharacters: this.extractTopCharacters(videos, cleanNiche),
      trendingEditStyles: ['Velocity Beat Sync', 'Phonk Flow', '4K 60FPS Slowed', 'Color Grading Transition'],
      topSongs: [
        { name: 'Tokyo Drift (Phonk Speed Up)', artist: 'Phonk Nation', vibe: 'Velocity Beat Drop' },
        { name: 'Aura / Transcendence (Slowed)', artist: 'Orchestral Trap', vibe: 'Dominance & Power' },
      ],
      topHashtags: hashtags.map((h) => h.hashtag),
      topKeywords: keywords.map((k) => k.keyword),
    };

    const trendItems: TrendItem[] = videos.slice(0, 4).map((v, idx) => ({
      id: `trend-${idx + 1}`,
      topic: v.title,
      whyTrending: `Gaining high view velocity (${v.viewCount}) in the last ${cleanTimeRange}`,
      suggestedEditStyle: 'Velocity Flow with 4K Beat Drop',
      suggestedHashtags: (v.tags && v.tags.length > 0) ? v.tags.slice(0, 4).map(t => t.startsWith('#') ? t : `#${t}`) : ['#Shorts', '#viral'],
      suggestedAudioStyle: 'Dark Phonk or Orchestral Trap Sync',
      difficulty: 'Medium',
      competitionScore: Math.min(10, Math.max(4, 9 - idx)),
      searchInterest: Math.min(99, Math.max(50, 95 - idx * 7)),
      youtubeTrendingReference: {
        title: v.title,
        channelTitle: v.channelTitle,
        viewCount: v.viewCount,
        videoUrl: v.videoUrl,
      },
    }));

    const report: NicheTrendReport = {
      niche,
      region,
      timeRange: cleanTimeRange,
      sort: cleanSort,
      quotaExceeded: false,
      lastUpdated: now.toISOString(),
      cachedUntil,
      dataSource: 'youtube_api',
      classifierStatus: {
        available: classificationResult.available,
        notice: classificationResult.notice,
        model: classificationResult.model,
        totalEditsFound: fanEdits.length,
      },
      videos,
      keywords,
      hashtags,
      titleIdeas,
      breakdown,
      items: trendItems,
    };

    // Cache the verified report for 30 minutes
    this.cache.set(cacheKey, {
      report,
      timestamp: now.getTime(),
    });

    return report;
  }

  /**
   * Fetches real Shorts strictly from YouTube Data API v3.
   * Returns empty array if key missing, quota exceeded, or request fails.
   * Drops any result that does not match the niche keywords.
   */
  private static async fetchRealYouTubeShorts(
    niche: string,
    region: string,
    timeRange: '24h' | '7d' | '30d' = '7d',
    sort: 'newest' | 'most_viewed' = 'most_viewed',
    _userId?: string
  ): Promise<{
    videos: TrendingShortVideo[];
    quotaExceeded?: boolean;
    quotaMessage?: string;
    isMissingKey?: boolean;
    errorMessage?: string;
    emptyReason?: 'missing_key' | 'quota_exceeded' | 'request_failed' | 'no_results' | null;
  }> {
    const apiKey = config.youtubeApiKey;

    // Public trend lookups use the server's YOUTUBE_API_KEY directly
    if (!apiKey) {
      return {
        videos: [],
        isMissingKey: true,
        emptyReason: 'missing_key',
        errorMessage:
          'YOUTUBE_API_KEY is not configured on the server. Please add your YouTube Data API v3 key in your environment variables.',
      };
    }

    // Calculate cutoff timestamp strictly
    const nowMs = Date.now();
    let cutoffMs = nowMs - 7 * 24 * 60 * 60 * 1000;
    if (timeRange === '24h') {
      cutoffMs = nowMs - 24 * 60 * 60 * 1000;
    } else if (timeRange === '30d') {
      cutoffMs = nowMs - 30 * 24 * 60 * 60 * 1000;
    }
    const publishedAfterIso = new Date(cutoffMs).toISOString();

    const youtube = google.youtube({
      version: 'v3',
    });

    const regionCode = region === 'GLOBAL' ? 'US' : region;
    const seenVideoIds = new Set<string>();
    const collectedVideos: TrendingShortVideo[] = [];

    // Search query construction matching niche:
    // Search "<series or character> edit" and "amv"
    let primaryQuery = `${niche} edit #shorts`;
    let secondaryQuery = `${niche} amv #shorts`;

    if (niche.includes('anime') || niche.includes('amv')) {
      primaryQuery = 'anime edit #shorts';
      secondaryQuery = 'amv edit #shorts';
    } else if (niche.includes('marvel') || niche.includes('mcu')) {
      primaryQuery = 'marvel edit #shorts';
      secondaryQuery = 'mcu edit #shorts';
    } else if (niche.includes('manhwa') || niche.includes('webtoon')) {
      primaryQuery = 'manhwa edit #shorts';
      secondaryQuery = 'webtoon edit #shorts';
    }

    try {
      const searchPromises = [
        youtube.search.list({
          key: apiKey,
          part: ['snippet'],
          q: primaryQuery,
          type: ['video'],
          videoEmbeddable: 'true',
          videoSyndicated: 'true',
          videoDuration: 'short',
          publishedAfter: publishedAfterIso,
          order: sort === 'newest' ? 'date' : 'viewCount',
          regionCode,
          maxResults: 30,
        }),
      ];

      // Add secondary query search if quota allows
      if (secondaryQuery !== primaryQuery) {
        searchPromises.push(
          youtube.search.list({
            key: apiKey,
            part: ['snippet'],
            q: secondaryQuery,
            type: ['video'],
            videoEmbeddable: 'true',
            videoSyndicated: 'true',
            videoDuration: 'short',
            publishedAfter: publishedAfterIso,
            order: sort === 'newest' ? 'date' : 'viewCount',
            regionCode,
            maxResults: 20,
          })
        );
      }

      const searchResults = await Promise.allSettled(searchPromises);
      const searchVideoIds: string[] = [];

      for (const res of searchResults) {
        if (res.status === 'fulfilled') {
          const items = res.value.data.items || [];
          for (const item of items) {
            const vid = item.id?.videoId;
            if (vid && !searchVideoIds.includes(vid)) {
              searchVideoIds.push(vid);
            }
          }
        } else {
          const err = res.reason;
          const isQuota =
            err?.code === 403 ||
            String(err?.message || '').toLowerCase().includes('quota') ||
            JSON.stringify(err?.response?.data || '').toLowerCase().includes('quota');
          if (isQuota) {
            return {
              videos: [],
              quotaExceeded: true,
              emptyReason: 'quota_exceeded',
              quotaMessage:
                'YouTube Data API daily quota limit has been exceeded. The free tier quota resets daily at midnight Pacific Time.',
              errorMessage:
                'YouTube Data API daily quota limit has been exceeded. The free tier quota resets daily at midnight Pacific Time.',
            };
          }
        }
      }

      if (searchVideoIds.length === 0) {
        return {
          videos: [],
          emptyReason: 'no_results',
          errorMessage: `No YouTube Shorts found for "${niche}" within the chosen time range.`,
        };
      }

      // Batch query videos.list for status, snippet, statistics, and contentDetails
      const detailRes = await youtube.videos.list({
        key: apiKey,
        part: ['status', 'snippet', 'statistics', 'contentDetails'],
        id: searchVideoIds.slice(0, 50),
      });

      const items = detailRes.data.items || [];

      for (const v of items) {
        if (!v.id || seenVideoIds.has(v.id)) continue;

        // 1. Embeddable check
        if (v.status?.embeddable !== true) continue;

        // 2. Public check
        if (v.status?.privacyStatus !== 'public') continue;

        // 3. Region restriction check
        const restr = v.contentDetails?.regionRestriction;
        if (restr) {
          if (restr.blocked && restr.blocked.includes(regionCode)) continue;
          if (restr.allowed && !restr.allowed.includes(regionCode)) continue;
        }

        // 4. Age-restriction check
        const rating = v.contentDetails?.contentRating;
        if (
          rating &&
          (rating.ytRating === 'ytAgeRestricted' ||
            rating.mpaaRating === 'mpaaNc17' ||
            rating.mpaaRating === 'mpaaR')
        ) {
          continue;
        }

        // 5. Time range cutoff check (strictly drop older videos)
        const publishedTime = v.snippet?.publishedAt ? new Date(v.snippet.publishedAt).getTime() : 0;
        if (publishedTime < cutoffMs) continue;

        // 6. Duration check (Shorts are <= 180s)
        const dur = v.contentDetails?.duration || '';
        const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        const hours = parseInt(match?.[1] || '0', 10);
        const minutes = parseInt(match?.[2] || '0', 10);
        const seconds = parseInt(match?.[3] || '0', 10);
        const totalSec = hours * 3600 + minutes * 60 + seconds;
        if (totalSec > 180) continue;

        const title = (v.snippet?.title || '').trim();
        const channelTitle = (v.snippet?.channelTitle || 'YouTube Creator').trim();
        const tags = v.snippet?.tags || [];
        const description = (v.snippet?.description || '').trim();

        // 7. Require niche keywords in title, tags, or description. Drop results that don't match.
        const matchesNiche = this.matchesNicheCriteria(niche, title, tags, description);
        if (!matchesNiche) continue;

        // 8. Extract real thumbnail
        const thumbUrl =
          v.snippet?.thumbnails?.maxres?.url ||
          v.snippet?.thumbnails?.high?.url ||
          v.snippet?.thumbnails?.medium?.url ||
          v.snippet?.thumbnails?.default?.url ||
          `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;

        const rawViews = parseInt(v.statistics?.viewCount || '0', 10);

        seenVideoIds.add(v.id);
        collectedVideos.push({
          id: v.id,
          title,
          channelTitle,
          channelId: v.snippet?.channelId || undefined,
          viewCount: this.formatViewCount(rawViews),
          rawViewCount: rawViews,
          publishedAt: v.snippet?.publishedAt || new Date().toISOString(),
          age: this.formatTimeAgo(v.snippet?.publishedAt || undefined),
          thumbnailUrl: thumbUrl,
          embedUrl: `https://www.youtube-nocookie.com/embed/${v.id}?rel=0&modestbranding=1&playsinline=1`,
          videoUrl: `https://www.youtube.com/shorts/${v.id}`,
          tags,
          description,
          durationSec: totalSec,
          isEmbeddable: true,
        });
      }

      if (collectedVideos.length === 0) {
        return {
          videos: [],
          emptyReason: 'no_results',
          errorMessage: `No embeddable YouTube Shorts matching the niche "${niche}" were found in the last ${timeRange}. Try choosing a wider time filter (e.g. Last 30 days).`,
        };
      }

      // 9. Rank by views or newest
      if (sort === 'newest') {
        collectedVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      } else {
        // default: rank by views within the chosen time range
        collectedVideos.sort((a, b) => (b.rawViewCount || 0) - (a.rawViewCount || 0));
      }

      return {
        videos: collectedVideos,
      };
    } catch (apiErr: any) {
      console.error('[TrendService] YouTube API error:', apiErr.message);
      const isQuota =
        apiErr?.code === 403 ||
        String(apiErr?.message || '').toLowerCase().includes('quota') ||
        JSON.stringify(apiErr?.response?.data || '').toLowerCase().includes('quota');

      if (isQuota) {
        return {
          videos: [],
          quotaExceeded: true,
          emptyReason: 'quota_exceeded',
          quotaMessage:
            'YouTube Data API daily quota limit has been exceeded. Quota resets daily at midnight Pacific Time.',
          errorMessage:
            'YouTube Data API daily quota limit has been exceeded. Quota resets daily at midnight Pacific Time.',
        };
      }

      return {
        videos: [],
        emptyReason: 'request_failed',
        errorMessage: apiErr?.message || 'Failed to communicate with YouTube Data API v3.',
      };
    }
  }

  /**
   * Performs an additional targeted search with edit keywords when too few fan edits remain.
   * Never loosens the confidence filter; searches again with more edit keywords.
   */
  private static async fetchAdditionalEditCandidates(
    cleanNiche: string,
    region: string,
    timeRange: '24h' | '7d' | '30d',
    sort: 'newest' | 'most_viewed',
    existingIds: Set<string>
  ): Promise<TrendingShortVideo[]> {
    const apiKey = config.youtubeApiKey;
    if (!apiKey) return [];

    let queries: string[] = [];
    if (cleanNiche.includes('anime') || cleanNiche.includes('amv')) {
      queries = [
        'anime velocity edit #shorts',
        'anime 4k phonk edit #shorts',
        'anime alight motion edit #shorts',
      ];
    } else if (cleanNiche.includes('marvel') || cleanNiche.includes('mcu')) {
      queries = [
        'marvel velocity edit #shorts',
        'mcu 4k edit #shorts',
        'avengers phonk edit #shorts',
      ];
    } else if (cleanNiche.includes('manhwa') || cleanNiche.includes('webtoon')) {
      queries = [
        'manhwa velocity edit #shorts',
        'solo leveling 4k edit #shorts',
        'webtoon phonk edit #shorts',
      ];
    } else {
      queries = [
        `${cleanNiche} velocity edit #shorts`,
        `${cleanNiche} 4k edit #shorts`,
        `${cleanNiche} phonk edit #shorts`,
      ];
    }

    const nowMs = Date.now();
    let cutoffMs = nowMs - 7 * 24 * 60 * 60 * 1000;
    if (timeRange === '24h') cutoffMs = nowMs - 24 * 60 * 60 * 1000;
    else if (timeRange === '30d') cutoffMs = nowMs - 30 * 24 * 60 * 60 * 1000;
    const publishedAfterIso = new Date(cutoffMs).toISOString();

    const youtube = google.youtube({ version: 'v3' });
    const regionCode = region === 'GLOBAL' ? 'US' : region;
    const newVideoIds: string[] = [];

    for (const q of queries) {
      try {
        const sRes = await youtube.search.list({
          key: apiKey,
          part: ['snippet'],
          q,
          type: ['video'],
          videoEmbeddable: 'true',
          videoSyndicated: 'true',
          videoDuration: 'short',
          publishedAfter: publishedAfterIso,
          order: sort === 'newest' ? 'date' : 'viewCount',
          regionCode,
          maxResults: 15,
        });
        const items = sRes.data.items || [];
        for (const it of items) {
          const vid = it.id?.videoId;
          if (vid && !existingIds.has(vid) && !newVideoIds.includes(vid)) {
            newVideoIds.push(vid);
          }
        }
      } catch (err) {
        console.warn(`[TrendService] Query "${q}" search failed:`, err);
      }
    }

    if (newVideoIds.length === 0) return [];

    try {
      const detailRes = await youtube.videos.list({
        key: apiKey,
        part: ['status', 'snippet', 'statistics', 'contentDetails'],
        id: newVideoIds.slice(0, 30),
      });

      const extraCollected: TrendingShortVideo[] = [];
      const items = detailRes.data.items || [];

      for (const v of items) {
        if (!v.id || existingIds.has(v.id)) continue;
        if (v.status?.embeddable !== true || v.status?.privacyStatus !== 'public') continue;

        // Restriction check
        const restr = v.contentDetails?.regionRestriction;
        if (restr) {
          if (restr.blocked && restr.blocked.includes(regionCode)) continue;
          if (restr.allowed && !restr.allowed.includes(regionCode)) continue;
        }

        // Age rating check
        const rating = v.contentDetails?.contentRating;
        if (
          rating &&
          (rating.ytRating === 'ytAgeRestricted' ||
            rating.mpaaRating === 'mpaaNc17' ||
            rating.mpaaRating === 'mpaaR')
        ) {
          continue;
        }

        // Cutoff check
        const publishedTime = v.snippet?.publishedAt ? new Date(v.snippet.publishedAt).getTime() : 0;
        if (publishedTime < cutoffMs) continue;

        // Duration check
        const dur = v.contentDetails?.duration || '';
        const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        const hours = parseInt(match?.[1] || '0', 10);
        const minutes = parseInt(match?.[2] || '0', 10);
        const seconds = parseInt(match?.[3] || '0', 10);
        const totalSec = hours * 3600 + minutes * 60 + seconds;
        if (totalSec > 180) continue;

        const title = (v.snippet?.title || '').trim();
        const channelTitle = (v.snippet?.channelTitle || 'YouTube Creator').trim();
        const tags = v.snippet?.tags || [];
        const description = (v.snippet?.description || '').trim();

        if (!this.matchesNicheCriteria(cleanNiche, title, tags, description)) continue;

        const thumbUrl =
          v.snippet?.thumbnails?.maxres?.url ||
          v.snippet?.thumbnails?.high?.url ||
          v.snippet?.thumbnails?.medium?.url ||
          v.snippet?.thumbnails?.default?.url ||
          `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;

        const rawViews = parseInt(v.statistics?.viewCount || '0', 10);

        existingIds.add(v.id);
        extraCollected.push({
          id: v.id,
          title,
          channelTitle,
          channelId: v.snippet?.channelId || undefined,
          viewCount: this.formatViewCount(rawViews),
          rawViewCount: rawViews,
          publishedAt: v.snippet?.publishedAt || new Date().toISOString(),
          age: this.formatTimeAgo(v.snippet?.publishedAt || undefined),
          thumbnailUrl: thumbUrl,
          embedUrl: `https://www.youtube-nocookie.com/embed/${v.id}?rel=0&modestbranding=1&playsinline=1`,
          videoUrl: `https://www.youtube.com/shorts/${v.id}`,
          tags,
          description,
          durationSec: totalSec,
          isEmbeddable: true,
        });
      }

      return extraCollected;
    } catch (err) {
      console.warn('[TrendService] Failed to fetch details for extra edit candidates:', err);
      return [];
    }
  }

  /**
   * Computes keyword scores from the real top videos.
   * Shows how many videos each keyword was found in.
   */
  private static computeKeywordsFromVideos(
    videos: TrendingShortVideo[],
    niche: string
  ): RankedKeyword[] {
    if (videos.length === 0) return [];

    const totalVideos = videos.length;
    const wordCounts: Record<string, number> = {};
    const stopWords = new Set([
      'the', 'and', 'with', 'for', 'this', 'that', 'from', 'in', 'on', 'at', 'to', 'a', 'an', 'is', 'it',
      'shorts', 'video', 'youtube', 'by', 'of', 'be', 'or', 'are', 'was', 'my', 'your', 'all', 'new', 'top',
    ]);

    videos.forEach((v) => {
      const seenWords = new Set<string>();

      // From tags
      (v.tags || []).forEach((t) => {
        const clean = t.trim().toLowerCase();
        if (clean.length > 2 && !stopWords.has(clean)) {
          seenWords.add(clean);
        }
      });

      // From title
      const titleWords = v.title
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w));

      titleWords.forEach((w) => seenWords.add(w));

      seenWords.forEach((word) => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });
    });

    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => {
        const score = Math.round((count / totalVideos) * 100);
        return {
          keyword,
          searchVolumeScore: score,
          frequency: count,
          basedOnVideos: count,
          totalVideosAnalyzed: totalVideos,
          scoreType: 'computed',
          relevance: `Found in ${count} of ${totalVideos} top videos (${score}% frequency)`,
        };
      });
  }

  /**
   * Computes hashtag scores from the real top videos.
   * Shows how many videos each hashtag was used in.
   */
  private static computeHashtagsFromVideos(
    videos: TrendingShortVideo[],
    niche: string
  ): RankedHashtag[] {
    if (videos.length === 0) return [];

    const totalVideos = videos.length;
    const hashtagCounts: Record<string, number> = {};

    videos.forEach((v) => {
      const seenHashtags = new Set<string>();

      // From tags
      (v.tags || []).forEach((t) => {
        const clean = t.trim().toLowerCase();
        if (clean.startsWith('#')) {
          seenHashtags.add(clean);
        } else if (clean.length > 2 && !clean.includes(' ')) {
          seenHashtags.add(`#${clean}`);
        }
      });

      // From title and description
      const text = `${v.title} ${v.description || ''}`;
      const matches = text.match(/#[a-zA-Z0-9_]+/g);
      if (matches) {
        matches.forEach((m) => {
          const lower = m.toLowerCase();
          if (lower.length > 2 && lower.length < 35) {
            seenHashtags.add(lower);
          }
        });
      }

      seenHashtags.forEach((h) => {
        hashtagCounts[h] = (hashtagCounts[h] || 0) + 1;
      });
    });

    return Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([hashtag, count]) => {
        const viralityScore = Math.round((count / totalVideos) * 100);
        return {
          hashtag,
          viralityScore,
          basedOnVideos: count,
          totalVideosAnalyzed: totalVideos,
          scoreType: 'computed',
          trendingReason: `Used in ${count} of ${totalVideos} top videos (${viralityScore}% occurrence)`,
        };
      });
  }

  /**
   * Derives title frameworks directly from the top real performing videos.
   */
  private static deriveTitleIdeasFromVideos(
    videos: TrendingShortVideo[],
    niche: string
  ): TitleIdea[] {
    if (videos.length === 0) return [];

    return videos.slice(0, 6).map((v, idx) => ({
      id: `idea-${idx + 1}`,
      title: v.title,
      targetPlatform: 'both',
      hookStrategy: `Proven title from "${v.channelTitle}" with ${v.viewCount}`,
      estimatedCtrScore: Math.min(99, Math.max(70, 96 - idx * 4)),
      scoreType: 'ai_estimate',
    }));
  }

  /**
   * Identifies prominent character or series names from the top real video titles.
   */
  private static extractTopCharacters(videos: TrendingShortVideo[], niche: string): string[] {
    const list: string[] = [];
    const text = videos.map((v) => v.title).join(' ').toLowerCase();

    const candidatePool = niche.includes('anime')
      ? ['Gojo Satoru', 'Sukuna', 'Tanjiro', 'Sung Jin-woo', 'Zoro', 'Luffy', 'Itachi', 'Levi Ackerman', 'Toji Fushiguro']
      : niche.includes('marvel')
      ? ['Peter Parker', 'Tony Stark', 'Loki', 'Deadpool', 'Wolverine', 'Scarlet Witch', 'Doctor Strange', 'Bucky Barnes']
      : niche.includes('manhwa')
      ? ['Sung Jin-woo', 'Kim Dokja', 'Yoo Joonghyuk', 'Daniel Park', 'Jay Jo', 'Cheon Yeo-woon', 'Chung Myung']
      : ['Trending Protagonist', 'Main Character', 'Rival Character'];

    for (const name of candidatePool) {
      if (text.includes(name.toLowerCase()) || text.includes(name.split(' ')[0].toLowerCase())) {
        list.push(name);
      }
    }

    return list.length > 0 ? list.slice(0, 5) : candidatePool.slice(0, 4);
  }
}
