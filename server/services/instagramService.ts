import axios from 'axios';
import { config } from '../config.js';
import { InstagramPublishPayload, ConnectedAccount } from '../../shared/types.js';
import { AccountStorageService, InstagramTokens } from './accountStorage.js';
import { OAuthStateService } from './oauthStateService.js';

/**
 * InstagramService
 *
 * Implements "Instagram API with Instagram Login" (no Facebook Page or App Domains required).
 *
 * OAuth Authorize URL: https://www.instagram.com/oauth/authorize
 * Scopes: instagram_business_basic, instagram_business_content_publish, instagram_business_manage_insights
 * Token Exchange: POST https://api.instagram.com/oauth/access_token
 * Long-Lived Token: GET https://graph.instagram.com/access_token (60 days)
 * Refresh Token: GET https://graph.instagram.com/refresh_access_token (extends 60 days)
 * Reels Publishing & Graph APIs: https://graph.instagram.com/v21.0
 */
export class InstagramService {
  private static readonly GRAPH_API_VERSION = 'v21.0';
  private static readonly GRAPH_BASE = `https://graph.instagram.com/${InstagramService.GRAPH_API_VERSION}`;
  private static readonly OAUTH_AUTHORIZE_URL = 'https://www.instagram.com/oauth/authorize';
  private static readonly OAUTH_TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
  private static readonly LONG_LIVED_TOKEN_URL = 'https://graph.instagram.com/access_token';
  private static readonly REFRESH_TOKEN_URL = 'https://graph.instagram.com/refresh_access_token';

  /**
   * Initializes background token renewal checks (every 6 hours).
   * Refreshes long-lived tokens well before the 60-day expiration window.
   */
  static initAutoRefresh(): void {
    setInterval(async () => {
      try {
        await this.checkAndRefreshExpiringTokens();
      } catch (err) {
        console.error('[InstagramService] Background token refresh check error:', err);
      }
    }, 6 * 60 * 60 * 1000);
  }

  /**
   * Checks Instagram connection status and connected accounts for the user.
   */
  static async getAuthStatus(userId: string): Promise<{
    configured: boolean;
    authenticated: boolean;
    username?: string;
    tokenDaysRemaining?: number;
    needsRefresh: boolean;
    hasAnalyticsScope?: boolean;
    accounts: ConnectedAccount[];
  }> {
    const configured = Boolean(config.meta.appId && config.meta.appSecret);
    const accounts = await AccountStorageService.getPublicAccounts(userId, 'instagram');
    const authenticated = accounts.length > 0;
    const defaultAcc = accounts.find((a) => a.isDefault) || accounts[0];

    const needsRefresh = accounts.some((a) => a.needsRefresh);
    const hasAnalyticsScope = accounts.some((a) => a.hasAnalyticsScope);

    return {
      configured,
      authenticated,
      username: defaultAcc ? defaultAcc.name : undefined,
      tokenDaysRemaining: defaultAcc?.tokenDaysRemaining,
      needsRefresh,
      hasAnalyticsScope,
      accounts,
    };
  }

  /**
   * Generates Instagram OAuth authorization URL with "Instagram API with Instagram Login".
   * Scopes: instagram_business_basic, instagram_business_content_publish, instagram_business_manage_insights
   * No Facebook Page or App Domains required.
   */
  static getAuthUrl(userId: string, customRedirectUri?: string): string {
    const redirectUri = customRedirectUri || config.meta.redirectUri;
    const scopes = [
      'instagram_business_basic',
      'instagram_business_content_publish',
      'instagram_business_manage_insights',
    ].join(',');

    const state = OAuthStateService.signState(userId, 'instagram');

    return (
      `${this.OAUTH_AUTHORIZE_URL}?` +
      `client_id=${encodeURIComponent(config.meta.appId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&response_type=code` +
      `&state=${encodeURIComponent(state)}`
    );
  }

  /**
   * Exchanges code for tokens via Instagram Login for Business:
   * 1. Exchange code at https://api.instagram.com/oauth/access_token
   * 2. Exchange short-lived token for 60-day long-lived token at graph.instagram.com
   * 3. Fetch Instagram account profile directly from graph.instagram.com (NO Facebook Page needed)
   * 4. Save encrypted to backend database
   */
  static async handleCallback(
    code: string,
    userId: string,
    customRedirectUri?: string
  ): Promise<ConnectedAccount> {
    const redirectUri = customRedirectUri || config.meta.redirectUri;

    // Instagram redirects may append #_ or #_=_ to the query parameter or URL
    const cleanCode = code.replace(/#.*$/, '').trim();

    console.log('[InstagramService] Exchanging authorization code for Instagram access token at api.instagram.com...');

    // Step 1: Exchange code for short-lived User Access Token
    let shortToken = '';
    let userIdFromToken: string | number | undefined;
    let permissions: string[] = [];

    try {
      const formData = new URLSearchParams();
      formData.append('client_id', config.meta.appId);
      formData.append('client_secret', config.meta.appSecret);
      formData.append('grant_type', 'authorization_code');
      formData.append('redirect_uri', redirectUri);
      formData.append('code', cleanCode);

      const tokenRes = await axios.post(this.OAUTH_TOKEN_URL, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      });

      shortToken = tokenRes.data?.access_token;
      userIdFromToken = tokenRes.data?.user_id;
      permissions = Array.isArray(tokenRes.data?.permissions) ? tokenRes.data.permissions : [];
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error_message ||
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message;
      console.error('[InstagramService] Code exchange error at api.instagram.com:', errorMsg);
      throw new Error(`Failed to exchange authorization code with Instagram API: ${errorMsg}`);
    }

    if (!shortToken) {
      throw new Error('Instagram API did not return a valid access token.');
    }

    // Step 2: Exchange short-lived token for Long-Lived Token (60-day validity) at graph.instagram.com
    console.log('[InstagramService] Exchanging short-lived token for 60-day long-lived token at graph.instagram.com...');
    let longLivedToken = shortToken;
    let expiresInSec = 60 * 24 * 60 * 60; // 60 days default (5,184,000 seconds)

    try {
      const longRes = await axios.get(this.LONG_LIVED_TOKEN_URL, {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: config.meta.appSecret,
          access_token: shortToken,
        },
        timeout: 15000,
      });

      if (longRes.data?.access_token) {
        longLivedToken = longRes.data.access_token;
        expiresInSec = longRes.data.expires_in || expiresInSec;
      }
    } catch (longErr: any) {
      console.warn('[InstagramService] Long-lived token exchange notice (using current token):', longErr.message);
    }

    // Step 3: Fetch Instagram Professional Account Profile directly from graph.instagram.com
    // NO Facebook Page is needed! The token directly identifies the Instagram account.
    console.log('[InstagramService] Fetching Instagram account profile from graph.instagram.com (no Facebook Page needed)...');
    let igUserId = userIdFromToken ? String(userIdFromToken) : '';
    let igUsername = 'Instagram Professional';
    let igName = 'Instagram Creator';
    let avatarUrl: string | undefined;

    try {
      const meRes = await axios.get(`${this.GRAPH_BASE}/me`, {
        params: {
          fields: 'id,user_id,username,name,account_type,profile_picture_url',
          access_token: longLivedToken,
        },
        timeout: 15000,
      });

      const profileData = meRes.data || {};
      igUserId = profileData.user_id || profileData.id || igUserId || `ig-${Date.now()}`;
      igUsername = profileData.username || igUsername;
      igName = profileData.name || profileData.username || igName;
      avatarUrl = profileData.profile_picture_url;
    } catch (profileErr: any) {
      console.warn('[InstagramService] /v21.0/me profile lookup notice:', profileErr.response?.data || profileErr.message);
      // Fallback: query without version prefix or fallback to user_id from token
      try {
        const fallbackRes = await axios.get('https://graph.instagram.com/me', {
          params: {
            fields: 'id,username,name,account_type,profile_picture_url',
            access_token: longLivedToken,
          },
          timeout: 10000,
        });
        const d = fallbackRes.data || {};
        igUserId = d.user_id || d.id || igUserId;
        igUsername = d.username || igUsername;
        igName = d.name || d.username || igName;
        avatarUrl = d.profile_picture_url;
      } catch (fallbackErr: any) {
        console.warn('[InstagramService] Fallback me lookup notice:', fallbackErr.message);
        if (!igUserId) {
          igUserId = `ig-${Date.now()}`;
        }
      }
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInSec * 1000).toISOString();

    const hasAnalyticsScope =
      permissions.length > 0
        ? permissions.includes('instagram_business_manage_insights')
        : true; // Granted as part of the 3 requested scopes

    // Step 4: Encrypt and persist tokens to backend database (AES-256-GCM)
    const saved = await AccountStorageService.saveAccount(userId, {
      platform: 'instagram',
      platformAccountId: igUserId,
      name: igName,
      handle: igUsername.startsWith('@') ? igUsername : `@${igUsername}`,
      avatarUrl,
      hasAnalyticsScope,
      tokens: {
        longLivedToken,
        userId: igUserId,
        issuedAt: now.toISOString(),
        expiresAt,
      } as InstagramTokens,
      expiresAt,
    });

    console.log(
      `[InstagramService] Successfully connected Instagram account: "${igName}" (${saved.handle}) for user ${userId} using Instagram Login!`
    );
    return saved;
  }

  /**
   * Refreshes an Instagram long-lived token before it expires (60-day extension).
   * Calls GET https://graph.instagram.com/refresh_access_token
   */
  static async refreshAccountToken(
    userId: string,
    accountId: string
  ): Promise<{ success: boolean; daysRemaining: number; error?: string }> {
    const creds = AccountStorageService.getAccountTokens<InstagramTokens>(userId, accountId);
    if (!creds || !creds.tokens.longLivedToken) {
      return { success: false, daysRemaining: 0, error: 'Account not found or no token to refresh' };
    }

    try {
      console.log(`[InstagramService] Refreshing token for Instagram account "${creds.account.name}" (user: ${userId}) at graph.instagram.com...`);
      const response = await axios.get(this.REFRESH_TOKEN_URL, {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: creds.tokens.longLivedToken,
        },
        timeout: 15000,
      });

      if (response.data?.access_token) {
        const now = new Date();
        const expiresInSec = response.data.expires_in || 60 * 24 * 60 * 60;
        const newExpiresAt = new Date(now.getTime() + expiresInSec * 1000).toISOString();

        await AccountStorageService.updateTokens(
          userId,
          accountId,
          {
            ...creds.tokens,
            longLivedToken: response.data.access_token,
            issuedAt: now.toISOString(),
            expiresAt: newExpiresAt,
          },
          newExpiresAt
        );

        console.log(`[InstagramService] Successfully refreshed Instagram token for "${creds.account.name}"! Expires in ~60 days.`);
        return { success: true, daysRemaining: 60 };
      }
      return { success: false, daysRemaining: 0, error: 'Empty token returned by Instagram Graph API' };
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message;
      console.error(`[InstagramService] Refresh failed for ${accountId}:`, msg);
      return { success: false, daysRemaining: 0, error: msg };
    }
  }

  /**
   * Background task: Automatically refreshes tokens before the 60 days are up (for accounts with < 15 days remaining).
   */
  static async checkAndRefreshExpiringTokens(): Promise<number> {
    const allRecords = AccountStorageService.getAllStoredAccounts();
    const igRecords = allRecords.filter((r) => r.platform === 'instagram');
    let refreshedCount = 0;
    const now = Date.now();
    const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;

    for (const record of igRecords) {
      try {
        if (!record.expiresAt) continue;
        const expiresTime = new Date(record.expiresAt).getTime();
        // Refresh token if fewer than 15 days left
        if (expiresTime - now < fifteenDaysMs) {
          console.log(`[InstagramService] Auto-refreshing expiring token for account "${record.name}" (${record.handle || record.id})...`);
          const res = await this.refreshAccountToken(record.userId, record.id);
          if (res.success) {
            refreshedCount++;
          }
        }
      } catch (err: any) {
        console.warn(`[InstagramService] Failed to auto-refresh token for account ${record.id}:`, err.message);
      }
    }
    return refreshedCount;
  }

  /**
   * Publishes vertical video to Instagram Reels through graph.instagram.com.
   * Uses the user's specific or default connected account.
   */
  static async publishReel(
    publicVideoUrl: string,
    payload: InstagramPublishPayload,
    onProgress: (progress: number, stage: string) => void,
    userId: string,
    accountId?: string
  ): Promise<{ mediaId: string; url: string }> {
    onProgress(5, 'Authenticating Instagram account credentials...');

    let creds = accountId
      ? AccountStorageService.getAccountTokens<InstagramTokens>(userId, accountId)
      : AccountStorageService.getDefaultAccountTokens<InstagramTokens>(userId, 'instagram');

    if (!creds || !creds.tokens.longLivedToken || !creds.tokens.userId) {
      throw new Error(
        'No connected Instagram account found. Please connect your Instagram Professional account on the Accounts page first.'
      );
    }

    // Proactive token refresh if fewer than 5 days remaining before the 60 days are up
    if (creds.account.expiresAt) {
      const msLeft = new Date(creds.account.expiresAt).getTime() - Date.now();
      if (msLeft < 5 * 24 * 60 * 60 * 1000) {
        onProgress(8, 'Extending Instagram long-lived token before publish...');
        await this.refreshAccountToken(userId, creds.account.id).catch((e) =>
          console.warn('[InstagramService] Proactive refresh notice:', e.message)
        );
        // Reload fresh credentials
        const refreshed = accountId
          ? AccountStorageService.getAccountTokens<InstagramTokens>(userId, accountId)
          : AccountStorageService.getDefaultAccountTokens<InstagramTokens>(userId, 'instagram');
        if (refreshed) creds = refreshed;
      }
    }

    const { longLivedToken, userId: igUserId } = creds.tokens;

    // Check if video URL is accessible over the internet
    if (!publicVideoUrl.startsWith('http://') && !publicVideoUrl.startsWith('https://')) {
      throw new Error(`Video URL must be a publicly accessible HTTP(S) URL for Instagram to download: ${publicVideoUrl}`);
    }

    onProgress(15, `Creating Instagram Reels media container for ${creds.account.handle || creds.account.name}...`);

    let caption = payload.caption.trim();
    if (payload.hashtags && payload.hashtags.length > 0) {
      const tagString = payload.hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ');
      caption = `${caption}\n\n${tagString}`;
    }

    const reelParams: Record<string, any> = {
      media_type: 'REELS',
      video_url: publicVideoUrl,
      caption: caption.slice(0, 2200),
      share_to_feed: payload.shareToFeed ?? true,
      access_token: longLivedToken,
    };

    if (payload.coverImageUrl && (payload.coverImageUrl.startsWith('http://') || payload.coverImageUrl.startsWith('https://'))) {
      reelParams.cover_url = payload.coverImageUrl;
    }

    if (payload.thumbOffsetMs !== undefined && payload.thumbOffsetMs >= 0) {
      reelParams.thumb_offset = payload.thumbOffsetMs;
    }

    if (payload.location && payload.location.trim()) {
      reelParams.location_id = payload.location.trim();
    }

    if (payload.collaborators && payload.collaborators.length > 0) {
      const cleanCollabs = payload.collaborators.map((c) => c.replace(/^@/, '').trim()).filter(Boolean);
      if (cleanCollabs.length > 0) {
        reelParams.collaborators = JSON.stringify(cleanCollabs);
      }
    }

    // Step 1: Create Media Container through graph.instagram.com
    const containerRes = await axios.post(
      `${this.GRAPH_BASE}/${igUserId}/media`,
      null,
      {
        params: reelParams,
        timeout: 30000,
      }
    );

    const creationId = containerRes.data?.id;
    if (!creationId) {
      throw new Error('Failed to create Instagram media container. Check video URL and permissions.');
    }

    onProgress(30, 'Video uploaded to Instagram processing servers. Awaiting container readiness...');

    // Step 2: Poll container status until FINISHED through graph.instagram.com
    let status = 'IN_PROGRESS';
    let pollAttempts = 0;
    const maxPollAttempts = 40;

    while (status !== 'FINISHED' && pollAttempts < maxPollAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      pollAttempts++;

      try {
        const statusRes = await axios.get(`${this.GRAPH_BASE}/${creationId}`, {
          params: {
            fields: 'status_code,status',
            access_token: longLivedToken,
          },
          timeout: 10000,
        });

        status = statusRes.data?.status_code || statusRes.data?.status || 'IN_PROGRESS';
        const progress = Math.min(85, 30 + pollAttempts * 2);
        onProgress(progress, `Instagram video transcoding & audio sync: ${status} (${progress}%)...`);

        if (status === 'ERROR' || status === 'EXPIRED') {
          throw new Error(`Instagram container encoding failed with status: ${status}`);
        }
      } catch (pollErr: any) {
        console.warn(`[InstagramService] Poll attempt ${pollAttempts} warning:`, pollErr.message);
      }
    }

    if (status !== 'FINISHED') {
      throw new Error('Timed out waiting for Instagram to transcode video container.');
    }

    // Step 3: Publish Media Container through graph.instagram.com
    onProgress(90, 'Publishing Reel to Instagram feed & profile...');

    const publishRes = await axios.post(
      `${this.GRAPH_BASE}/${igUserId}/media_publish`,
      null,
      {
        params: {
          creation_id: creationId,
          access_token: longLivedToken,
        },
        timeout: 30000,
      }
    );

    const mediaId = publishRes.data?.id;
    if (!mediaId) {
      throw new Error('Instagram failed to finalize publication of Reel container.');
    }

    // Step 4: Resolve permalink through graph.instagram.com
    let permalink = `https://www.instagram.com/reel/${mediaId}`;
    try {
      const mediaInfo = await axios.get(`${this.GRAPH_BASE}/${mediaId}`, {
        params: {
          fields: 'permalink',
          access_token: longLivedToken,
        },
        timeout: 10000,
      });
      if (mediaInfo.data?.permalink) {
        permalink = mediaInfo.data.permalink;
      }
    } catch {
      // Fallback permalink preserved
    }

    onProgress(100, `Published to Instagram Reels on ${creds.account.handle || creds.account.name}!`);
    return { mediaId, url: permalink };
  }
}
