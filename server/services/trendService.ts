import axios from 'axios';
import { google } from 'googleapis';
import { config } from '../config.js';
import { NicheTrendReport, TrendItem } from '../../shared/types.js';
import { AccountStorageService, YouTubeTokens } from './accountStorage.js';

interface CacheEntry {
  report: NicheTrendReport;
  timestamp: number;
}

export class TrendService {
  // 1-hour cache: key is `${niche.toLowerCase()}_${region.toUpperCase()}`
  private static cache: Map<string, CacheEntry> = new Map();
  private static CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  private static NICHE_YOUTUBE_CATEGORY: Record<string, string> = {
    gaming: '20',
    music: '10',
    comedy: '23',
    tech: '28',
    fitness: '17',
    food: '26',
    anime: '1',
    finance: '27',
    lifestyle: '22',
    beauty: '26',
    education: '27',
  };

  /**
   * Fetches trending topics, formats, audio, and hashtags for a niche and region.
   * Caches results for 1 hour.
   */
  static async getNicheTrends(
    niche: string,
    region: string = 'US',
    forceRefresh: boolean = false,
    userId?: string
  ): Promise<NicheTrendReport> {
    const cacheKey = `${niche.trim().toLowerCase()}_${region.trim().toUpperCase()}`;

    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        console.log(`[TrendService] Returning cached trend report for ${cacheKey}`);
        return cached.report;
      }
    }

    console.log(`[TrendService] Generating fresh trend report for niche="${niche}", region="${region}"...`);

    // 1. Fetch YouTube trending videos for this niche/region (if user connected YouTube)
    const ytTrending = await this.fetchYouTubeTrending(niche, region, userId);

    // 2. Fetch Gemini search-grounded viral trends
    const geminiTrends = await this.fetchGeminiGroundedTrends(niche, region, ytTrending);

    const now = new Date();
    const cachedUntil = new Date(now.getTime() + this.CACHE_TTL_MS).toISOString();

    const report: NicheTrendReport = {
      niche,
      region,
      lastUpdated: now.toISOString(),
      cachedUntil,
      items: geminiTrends,
    };

    this.cache.set(cacheKey, {
      report,
      timestamp: now.getTime(),
    });

    return report;
  }

  /**
   * Queries YouTube Data API v3 for chart=mostPopular in the specified category & region.
   */
  private static async fetchYouTubeTrending(niche: string, region: string, userId?: string): Promise<any[]> {
    const catId = this.NICHE_YOUTUBE_CATEGORY[niche.toLowerCase()] || '0';

    try {
      // If user has connected their YouTube account, use their OAuth credentials
      const userYt = userId
        ? AccountStorageService.getDefaultAccountTokens<YouTubeTokens>(userId, 'youtube')
        : null;
      let authClient: any = null;

      if (userYt?.tokens?.refreshToken && config.google.clientId && config.google.clientSecret) {
        const oauth2Client = new google.auth.OAuth2(
          config.google.clientId,
          config.google.clientSecret,
          config.google.redirectUri
        );
        oauth2Client.setCredentials({ refresh_token: userYt.tokens.refreshToken });
        authClient = oauth2Client;
      }

      const youtube = google.youtube({
        version: 'v3',
        auth: authClient || undefined,
      });

      const params: any = {
        part: ['snippet', 'statistics'],
        chart: 'mostPopular',
        regionCode: region === 'GLOBAL' ? 'US' : region,
        maxResults: 6,
      };

      if (catId && catId !== '0') {
        params.videoCategoryId = catId;
      }

      // If we don't have OAuth client, try with API key
      if (!authClient && config.geminiApiKey) {
        params.key = config.geminiApiKey;
      }

      const res = await youtube.videos.list(params);
      return (res.data.items || []).map((item) => ({
        id: item.id,
        title: item.snippet?.title || '',
        channelTitle: item.snippet?.channelTitle || '',
        description: item.snippet?.description || '',
        tags: item.snippet?.tags || [],
        viewCount: item.statistics?.viewCount ? Number(item.statistics.viewCount).toLocaleString() : undefined,
        videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
      }));
    } catch (err: any) {
      console.warn('[TrendService] YouTube Data API trending fetch notice:', err.message);
      return [];
    }
  }

  /**
   * Calls Gemini 2.5 Flash with Google Search grounding to discover currently trending topics.
   */
  private static async fetchGeminiGroundedTrends(
    niche: string,
    region: string,
    ytReferences: any[]
  ): Promise<TrendItem[]> {
    const apiKey = config.geminiApiKey;

    const ytContext = ytReferences.length > 0
      ? `Recent popular YouTube videos in this niche:\n` +
        ytReferences.slice(0, 3).map((y) => `- "${y.title}" by ${y.channelTitle} (${y.viewCount || 'many'} views)`).join('\n')
      : '';

    const systemPrompt = `You are an elite short-form video trend forecaster and virality analyst for YouTube Shorts and Instagram Reels.
Your task is to search real-time web trends and social algorithmic shifts to uncover 5 high-opportunity trending video topics in the specified niche and geographic region.

For each trend, provide:
1. topic: A sharp, compelling video concept/topic headline
2. whyTrending: 1-2 punchy sentences explaining the algorithmic hook, search surge, or cultural trigger
3. suggestedEditStyle: Specific visual editing recommendation (e.g. "Split-screen reaction with kinetic typography", "3-second POV suspense hook followed by fast-paced tutorial")
4. suggestedHashtags: 4-6 high-performing hashtags (e.g. ["#GamingClips", "#Speedrun2026", "#Shorts"])
5. suggestedAudioStyle: Recommended background audio/music vibe (e.g. "Fast phonk bassline", "Lo-fi synthwave ambient")
6. difficulty: "Low", "Medium", or "High" (production effort and competition level)
7. competitionScore: Integer from 1 to 10 (1 = low competition/easy to rank, 10 = saturated)
8. searchInterest: Integer from 50 to 99 representing search demand index

Return STRICTLY a valid JSON array of 5 objects matching this schema (no markdown formatting, no backticks):
[
  {
    "id": "trend-1",
    "topic": "Topic headline",
    "whyTrending": "Why it is blowing up right now",
    "suggestedEditStyle": "Editing format guidance",
    "suggestedHashtags": ["#tag1", "#tag2", "#tag3"],
    "suggestedAudioStyle": "Trending audio style",
    "difficulty": "Low",
    "competitionScore": 4,
    "searchInterest": 88
  }
]`;

    const userPrompt = `Niche: "${niche}"
Region: "${region}"
${ytContext}

Search the web for what is trending right now in ${niche} (${region}) on YouTube Shorts and Instagram Reels. Identify viral formats, emerging topics, and breakout search queries.`;

    if (apiKey) {
      try {
        console.log('[TrendService] Querying Gemini with Google Search tool...');
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            contents: [
              {
                role: 'user',
                parts: [{ text: systemPrompt }, { text: userPrompt }],
              },
            ],
            tools: [{ google_search: {} }],
            generationConfig: {
              temperature: 0.7,
            },
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 35000,
          }
        );

        const candidates = response.data.candidates;
        const rawText = candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawText) {
          const cleaned = rawText
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();

          const parsed: any[] = JSON.parse(cleaned);

          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((item, idx) => ({
              id: item.id || `trend-${Date.now()}-${idx}`,
              topic: item.topic || `Viral ${niche} Concept #${idx + 1}`,
              whyTrending: item.whyTrending || 'Experiencing high algorithmic discovery on Shorts & Reels.',
              suggestedEditStyle: item.suggestedEditStyle || 'Fast-paced hook with kinetic text and sound effects.',
              suggestedHashtags: Array.isArray(item.suggestedHashtags) ? item.suggestedHashtags : [`#${niche}`, '#Shorts', '#Reels'],
              suggestedAudioStyle: item.suggestedAudioStyle || 'Trending upbeat short-form sound',
              difficulty: (['Low', 'Medium', 'High'].includes(item.difficulty) ? item.difficulty : 'Medium') as 'Low' | 'Medium' | 'High',
              competitionScore: typeof item.competitionScore === 'number' ? item.competitionScore : 5,
              searchInterest: typeof item.searchInterest === 'number' ? item.searchInterest : 75,
              youtubeTrendingReference: ytReferences[idx]
                ? {
                    title: ytReferences[idx].title,
                    channelTitle: ytReferences[idx].channelTitle,
                    viewCount: ytReferences[idx].viewCount,
                    videoUrl: ytReferences[idx].videoUrl,
                  }
                : undefined,
            }));
          }
        }
      } catch (err: any) {
        console.warn('[TrendService] Gemini search grounding call failed, using intelligent fallback:', err.message);
      }
    }

    // Fallback template items if Gemini API key not yet set
    return this.generateFallbackTrends(niche, region, ytReferences);
  }

  private static generateFallbackTrends(niche: string, region: string, ytReferences: any[]): TrendItem[] {
    const baseTopics: Record<string, string[]> = {
      gaming: [
        'Secret Gameplay Easter Eggs & Hidden Mechanics Breakdown',
        'Top 5 Unbelievable Speedrun Moments & Tricks',
        'Frame-by-Frame Boss Fight Strategy Guide',
        'Before vs After Game Physics & Graphics Evolution',
        'Hilarious In-Game Glitches & Viral Community Reactions',
      ],
      tech: [
        '3 Game-Changing AI Tools Released This Week',
        'Smartphone Camera Comparison: Blind Test Reality',
        'Hidden Productivity Hacks Most People Miss',
        'Budget Tech That Actually Punches Above Its Price',
        'Setup Tour: Minimalist Desk Aesthetic with Cable Management',
      ],
      fitness: [
        '3 Common Exercise Mistakes Destroying Your Progress',
        '30-Minute High-Intensity Dumbbell Workout Routine',
        'High-Protein Meal Prep Under 15 Minutes',
        'Mythbusting Viral Fitness Advice from Social Media',
        'Daily Mobility & Stretching Routine to Fix Posture',
      ],
      food: [
        '5-Ingredient Restaurant Quality Dinner in 20 Minutes',
        'Trying the Viral Crispy Cheese Technique',
        'Pro Chef Secret to Elevating Store-Bought Pasta',
        'Budget Gourmet: $5 Meal vs $50 Meal Taste Test',
        'Air Fryer Dessert Hack That Goes Viral Every Time',
      ],
      anime: [
        'Top 5 Hyped Anime Fights of the Current Season',
        'Hidden Details in New Opening Sequences You Missed',
        'Manga vs Anime: What the Adaptation Changed & Cut',
        'Underrated Anime Gems That Deserve More Recognition',
        'Power Scaling Debate: Who Really Wins the Ultimate Matchup?',
      ],
    };

    const topics = baseTopics[niche.toLowerCase()] || [
      `Breakthrough ${niche} Trend That Algorithm Loves`,
      `The 3-Step Guide to Mastering ${niche} Faster`,
      `Debunking the Biggest ${niche} Myth on Social Media`,
      `Essential Starter Tools Every ${niche} Creator Needs`,
      `How Top Creators Dominate the ${niche} Category`,
    ];

    return topics.map((t, idx) => ({
      id: `trend-fallback-${idx}`,
      topic: t,
      whyTrending: `Surging in ${region} search queries and viewer engagement over the past 48 hours.`,
      suggestedEditStyle: idx % 2 === 0
        ? '3-second visual question hook, kinetic captions with color accents, fast cuts.'
        : 'Split-screen demonstration, before/after reveal, smooth zoom transitions.',
      suggestedHashtags: [`#${niche.replace(/\s+/g, '')}`, '#Shorts', '#Reels', '#Trending2026', '#ViralTips'],
      suggestedAudioStyle: 'Trending synthwave / upbeat phonk rhythm',
      difficulty: idx === 0 ? 'Low' : idx === 4 ? 'High' : 'Medium',
      competitionScore: 3 + idx,
      searchInterest: 85 - idx * 4,
      youtubeTrendingReference: ytReferences[idx]
        ? {
            title: ytReferences[idx].title,
            channelTitle: ytReferences[idx].channelTitle,
            viewCount: ytReferences[idx].viewCount,
            videoUrl: ytReferences[idx].videoUrl,
          }
        : undefined,
    }));
  }
}
