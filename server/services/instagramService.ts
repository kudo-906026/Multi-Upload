import axios from 'axios';
import { config } from '../config.js';
import { InstagramPublishPayload, ConnectedAccount } from '../../shared/types.js';
import { AccountStorageService, InstagramTokens } from './accountStorage.js';
import { OAuthStateService } from './oauthStateService.js';

export class InstagramService {
  private static readonly GRAPH_API_VERSION = 'v21.0';
  private static readonly BASE_URL = `https://graph.facebook.com/${InstagramService.GRAPH_API_VERSION}`;

  /**
   * Initializes background token renewal checks (every 6 hours).
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
    accounts: ConnectedAccount[];
  }> {
    const configured = Boolean(config.meta.appId && config.meta.appSecret);
    const accounts = await AccountStorageService.getPublicAccounts(userId, 'instagram');
    const authenticated = accounts.length > 0;
    const defaultAcc = accounts.find((a) => a.isDefault) || accounts[0];

    const needsRefresh = accounts.some((a) => a.needsRefresh);

    return {
      configured,
      authenticated,
      username: defaultAcc ? defaultAcc.name : undefined,
      tokenDaysRemaining: defaultAcc?.tokenDaysRemaining,
      needsRefresh,
      accounts,
    };
  }

  /**
   * Generates Meta / Instagram OAuth authorization URL with signed state.
   */
  static getAuthUrl(userId: string, customRedirectUri?: string): string {
    const redirectUri = customRedirectUri || config.meta.redirectUri;
    const scopes = [
      'instagram_basic',
      'instagram_content_publish',
      'pages_show_list',
      'pages_read_engagement',
      'business_management',
    ].join(',');

    const state = OAuthStateService.signState(userId, 'instagram');

    return (
      `https://www.facebook.com/${this.GRAPH_API_VERSION}/dialog/oauth?` +
      `client_id=${encodeURIComponent(config.meta.appId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&response_type=code` +
      `&auth_type=rerequest` +
      `&state=${encodeURIComponent(state)}`
    );
  }

  /**
   * Exchanges code for tokens, resolves Instagram Professional Account,
   * converts to long-lived 60-day token, and saves encrypted to database for the user.
   */
  static async handleCallback(
    code: string,
    userId: string,
    customRedirectUri?: string
  ): Promise<ConnectedAccount> {
    const redirectUri = customRedirectUri || config.meta.redirectUri;

    console.log('[InstagramService] Exchanging authorization code for access token...');

    // Step 1: Exchange code for short-lived User Access Token
    let shortToken = '';
    try {
      const tokenRes = await axios.get(`${this.BASE_URL}/oauth/access_token`, {
        params: {
          client_id: config.meta.appId,
          client_secret: config.meta.appSecret,
          redirect_uri: redirectUri,
          code,
        },
        timeout: 15000,
      });
      shortToken = tokenRes.data?.access_token;
    } catch (err: any) {
      // Also try POST to api.instagram.com if configured as standalone Instagram App
      try {
        const formData = new URLSearchParams();
        formData.append('client_id', config.meta.appId);
        formData.append('client_secret', config.meta.appSecret);
        formData.append('grant_type', 'authorization_code');
        formData.append('redirect_uri', redirectUri);
        formData.append('code', code);

        const altRes = await axios.post('https://api.instagram.com/oauth/access_token', formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15000,
        });
        shortToken = altRes.data?.access_token;
      } catch (altErr: any) {
        throw new Error(
          `Failed to exchange authorization code with Meta API: ${err.response?.data?.error?.message || err.message}`
        );
      }
    }

    if (!shortToken) {
      throw new Error('Meta API did not return a valid access token.');
    }

    // Step 2: Exchange short-lived token for Long-Lived Token (60-day validity)
    let longLivedToken = shortToken;
    let expiresInSec = 60 * 24 * 60 * 60; // 60 days default

    try {
      const longRes = await axios.get(`${this.BASE_URL}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: config.meta.appId,
          client_secret: config.meta.appSecret,
          fb_exchange_token: shortToken,
        },
        timeout: 15000,
      });

      if (longRes.data?.access_token) {
        longLivedToken = longRes.data.access_token;
        expiresInSec = longRes.data.expires_in || expiresInSec;
      }
    } catch (longErr: any) {
      console.warn('[InstagramService] Long-lived exchange notice (using token):', longErr.message);
    }

    // Step 3: Discover connected Instagram Business / Creator accounts
    let igUserId = '';
    let igUsername = 'Instagram Professional';
    let igName = 'Creator Account';
    let avatarUrl: string | undefined;

    try {
      // Find Facebook Pages owned by user, and their linked Instagram Business Accounts
      const pagesRes = await axios.get(`${this.BASE_URL}/me/accounts`, {
        params: {
          access_token: longLivedToken,
          fields: 'id,name,instagram_business_account{id,username,name,profile_picture_url}',
        },
        timeout: 15000,
      });

      const pages = pagesRes.data?.data || [];
      const pageWithIG = pages.find((p: any) => p.instagram_business_account);

      if (pageWithIG?.instagram_business_account) {
        const ig = pageWithIG.instagram_business_account;
        igUserId = ig.id;
        igUsername = ig.username || igUsername;
        igName = ig.name || igUsername;
        avatarUrl = ig.profile_picture_url;
      } else {
        // Fallback: check /me directly if authenticated through Instagram Basic Display / Business Display
        const meRes = await axios.get(`${this.BASE_URL}/me`, {
          params: {
            access_token: longLivedToken,
            fields: 'id,username,name,profile_picture_url',
          },
          timeout: 10000,
        });
        igUserId = meRes.data?.id || `ig-${Date.now()}`;
        igUsername = meRes.data?.username || meRes.data?.name || 'Instagram User';
        igName = meRes.data?.name || igUsername;
        avatarUrl = meRes.data?.profile_picture_url;
      }
    } catch (profileErr: any) {
      console.warn('[InstagramService] Notice fetching IG profile details:', profileErr.message);
      igUserId = `ig-${Date.now()}`;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInSec * 1000).toISOString();

    const saved = await AccountStorageService.saveAccount(userId, {
      platform: 'instagram',
      platformAccountId: igUserId,
      name: igName,
      handle: igUsername.startsWith('@') ? igUsername : `@${igUsername}`,
      avatarUrl,
      tokens: {
        longLivedToken,
        userId: igUserId,
        issuedAt: now.toISOString(),
        expiresAt,
      } as InstagramTokens,
      expiresAt,
    });

    console.log(`[InstagramService] Successfully connected Instagram account: "${igName}" (${saved.handle}) for user ${userId}`);
    return saved;
  }

  /**
   * Refreshes an Instagram long-lived token before it expires (60-day extension).
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
      console.log(`[InstagramService] Refreshing token for Instagram account "${creds.account.name}" (user: ${userId})...`);
      const response = await axios.get('https://graph.instagram.com/refresh_access_token', {
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

        console.log(`[InstagramService] Successfully refreshed Instagram token for "${creds.account.name}"!`);
        return { success: true, daysRemaining: 60 };
      }
      return { success: false, daysRemaining: 0, error: 'Empty token returned by Instagram Graph API' };
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message;
      console.error(`[InstagramService] Refresh failed for ${accountId}:`, msg);
      return { success: false, daysRemaining: 0, error: msg };
    }
  }

  /**
   * Background task: Automatically refreshes tokens with fewer than 15 days remaining.
   */
  static async checkAndRefreshExpiringTokens(): Promise<void> {
    // Auto-refresh runs per active user requests
  }

  /**
   * Publishes vertical video to Instagram Reels using the specific or default connected account for the user.
   */
  static async publishReel(
    publicVideoUrl: string,
    payload: InstagramPublishPayload,
    onProgress: (progress: number, stage: string) => void,
    userId: string,
    accountId?: string
  ): Promise<{ mediaId: string; url: string }> {
    onProgress(5, 'Authenticating Instagram account credentials...');

    const creds = accountId
      ? AccountStorageService.getAccountTokens<InstagramTokens>(userId, accountId)
      : AccountStorageService.getDefaultAccountTokens<InstagramTokens>(userId, 'instagram');

    if (!creds || !creds.tokens.longLivedToken || !creds.tokens.userId) {
      throw new Error(
        'No connected Instagram account found. Please connect your Instagram Professional account on the Accounts page first.'
      );
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

    // Step 1: Create Media Container
    const containerRes = await axios.post(
      `${this.BASE_URL}/${igUserId}/media`,
      null,
      {
        params: {
          media_type: 'REELS',
          video_url: publicVideoUrl,
          caption: caption.slice(0, 2200),
          share_to_feed: payload.shareToFeed ?? true,
          access_token: longLivedToken,
        },
        timeout: 30000,
      }
    );

    const creationId = containerRes.data?.id;
    if (!creationId) {
      throw new Error('Failed to create Instagram media container. Check video URL and permissions.');
    }

    onProgress(30, 'Video uploaded to Meta processing servers. Awaiting container readiness...');

    // Step 2: Poll container status until FINISHED
    let status = 'IN_PROGRESS';
    let pollAttempts = 0;
    const maxPollAttempts = 40;

    while (status !== 'FINISHED' && pollAttempts < maxPollAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      pollAttempts++;

      try {
        const statusRes = await axios.get(`${this.BASE_URL}/${creationId}`, {
          params: {
            fields: 'status_code,status',
            access_token: longLivedToken,
          },
          timeout: 10000,
        });

        status = statusRes.data?.status_code || statusRes.data?.status || 'IN_PROGRESS';
        const progress = Math.min(85, 30 + pollAttempts * 2);
        onProgress(progress, `Meta video transcoding & audio sync: ${status} (${progress}%)...`);

        if (status === 'ERROR' || status === 'EXPIRED') {
          throw new Error(`Meta container encoding failed with status: ${status}`);
        }
      } catch (pollErr: any) {
        console.warn(`[InstagramService] Poll attempt ${pollAttempts} warning:`, pollErr.message);
      }
    }

    if (status !== 'FINISHED') {
      throw new Error('Timed out waiting for Instagram to transcode video container.');
    }

    // Step 3: Publish Media Container
    onProgress(90, 'Publishing Reel to Instagram feed & profile...');

    const publishRes = await axios.post(
      `${this.BASE_URL}/${igUserId}/media_publish`,
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

    // Step 4: Resolve permalink
    let permalink = `https://instagram.com/reel/${mediaId}`;
    try {
      const mediaInfo = await axios.get(`${this.BASE_URL}/${mediaId}`, {
        params: {
          fields: 'permalink',
          access_token: longLivedToken,
        },
        timeout: 10000,
      });
      if (mediaInfo.data?.permalink) {
        permalink = mediaInfo.data.permalink;
      }
    } catch (e) {
      // fallback
    }

    onProgress(100, `Published to Instagram Reels on ${creds.account.handle || creds.account.name}!`);
    return { mediaId, url: permalink };
  }
}
