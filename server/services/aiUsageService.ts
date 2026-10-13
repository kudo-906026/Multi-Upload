import { SupabaseService } from './supabaseService.js';
import { AIUsageQuota } from '../../shared/types.js';

interface DailyUsageRecord {
  date: string; // YYYY-MM-DD
  analyzeCount: number;
  trendCount: number;
  keywordsCount: number;
}

export class AIUsageService {
  // Configurable limits per user per UTC day
  static readonly DAILY_LIMITS = {
    analyze: 20,
    trend: 30,
    keywords: 30,
  };

  // Sliding window rate limit: max requests within window
  private static readonly RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
  private static readonly MAX_REQUESTS_PER_WINDOW = 10;

  // In-memory request timestamp store for rate limiting: userId -> timestamps[]
  private static rateLimitMap: Map<string, number[]> = new Map();

  // In-memory daily cache: userId -> DailyUsageRecord
  private static dailyCache: Map<string, DailyUsageRecord> = new Map();

  private static getTodayUtc(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Applies sliding-window rate limiting per user.
   */
  static checkRateLimit(userId: string): { allowed: boolean; retryAfterSec?: number } {
    const now = Date.now();
    let timestamps = this.rateLimitMap.get(userId) || [];

    // Filter out timestamps outside the window
    timestamps = timestamps.filter((t) => now - t < this.RATE_LIMIT_WINDOW_MS);

    if (timestamps.length >= this.MAX_REQUESTS_PER_WINDOW) {
      const oldestInWindow = timestamps[0];
      const waitMs = this.RATE_LIMIT_WINDOW_MS - (now - oldestInWindow);
      const retryAfterSec = Math.max(1, Math.ceil(waitMs / 1000));
      return { allowed: false, retryAfterSec };
    }

    timestamps.push(now);
    this.rateLimitMap.set(userId, timestamps);
    return { allowed: true };
  }

  /**
   * Retrieves current daily usage for a user from cache or Supabase.
   */
  static async getUserUsage(userId: string): Promise<DailyUsageRecord> {
    const today = this.getTodayUtc();
    const cached = this.dailyCache.get(userId);
    if (cached && cached.date === today) {
      return cached;
    }

    const initial: DailyUsageRecord = {
      date: today,
      analyzeCount: 0,
      trendCount: 0,
      keywordsCount: 0,
    };

    const client = SupabaseService.getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('user_ai_usage')
          .select('*')
          .eq('user_id', userId)
          .eq('usage_date', today)
          .single();

        if (data && !error) {
          initial.analyzeCount = Number(data.analyze_count || 0);
          initial.trendCount = Number(data.trend_count || 0);
          initial.keywordsCount = Number(data.keywords_count || 0);
        }
      } catch (err: any) {
        // Table might not exist yet before SQL is run; continue with in-memory record
      }
    }

    this.dailyCache.set(userId, initial);
    return initial;
  }

  /**
   * Checks if user has quota remaining for the given action and increments usage if allowed.
   */
  static async checkAndIncrement(
    userId: string,
    action: 'analyze' | 'trend' | 'keywords'
  ): Promise<{ allowed: boolean; remaining: number; error?: string }> {
    // 1. Rate limit check (prevents rapid bursts)
    const rateCheck = this.checkRateLimit(userId);
    if (!rateCheck.allowed) {
      return {
        allowed: false,
        remaining: 0,
        error: `Too many AI requests. Please wait ${rateCheck.retryAfterSec} seconds before trying again.`,
      };
    }

    // 2. Daily quota check
    const usage = await this.getUserUsage(userId);
    const limit = this.DAILY_LIMITS[action];

    let current = 0;
    if (action === 'analyze') current = usage.analyzeCount;
    else if (action === 'trend') current = usage.trendCount;
    else if (action === 'keywords') current = usage.keywordsCount;

    if (current >= limit) {
      return {
        allowed: false,
        remaining: 0,
        error: `Daily AI limit reached for ${action} (${limit}/${limit} requests used today). Quota resets at midnight UTC to protect shared API resources.`,
      };
    }

    // Increment usage
    if (action === 'analyze') usage.analyzeCount += 1;
    else if (action === 'trend') usage.trendCount += 1;
    else if (action === 'keywords') usage.keywordsCount += 1;

    this.dailyCache.set(userId, usage);

    // Asynchronously persist to Supabase
    const client = SupabaseService.getClient();
    if (client) {
      Promise.resolve(
        client.from('user_ai_usage').upsert(
          {
            user_id: userId,
            usage_date: usage.date,
            analyze_count: usage.analyzeCount,
            trend_count: usage.trendCount,
            keywords_count: usage.keywordsCount,
            last_request_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,usage_date' }
        )
      )
        .then((res: any) => {
          if (res?.error) console.warn('[AIUsageService] Notice saving quota usage to Supabase:', res.error.message);
        })
        .catch((e: any) => console.warn('[AIUsageService] Error upserting quota to Supabase:', e.message));
    }

    const remaining = Math.max(0, limit - (current + 1));
    return { allowed: true, remaining };
  }

  /**
   * Returns complete AI usage quota for the user to display in the UI.
   */
  static async getQuota(userId: string): Promise<AIUsageQuota> {
    const usage = await this.getUserUsage(userId);
    return {
      analyzeUsedToday: usage.analyzeCount,
      analyzeDailyLimit: this.DAILY_LIMITS.analyze,
      trendUsedToday: usage.trendCount,
      trendDailyLimit: this.DAILY_LIMITS.trend,
      keywordsUsedToday: usage.keywordsCount,
      keywordsDailyLimit: this.DAILY_LIMITS.keywords,
      remainingAnalyses: Math.max(0, this.DAILY_LIMITS.analyze - usage.analyzeCount),
      remainingTrends: Math.max(0, this.DAILY_LIMITS.trend - usage.trendCount),
      remainingKeywords: Math.max(0, this.DAILY_LIMITS.keywords - usage.keywordsCount),
    };
  }
}
