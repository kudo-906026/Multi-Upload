import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { config } from '../config.js';
import { YouTubePublishPayload, ConnectedAccount } from '../../shared/types.js';
import { AccountStorageService, YouTubeTokens } from './accountStorage.js';
import { OAuthStateService } from './oauthStateService.js';

export class YouTubeService {
  /**
   * Check if YouTube OAuth is configured and returns connected channels for the user.
   */
  static async getAuthStatus(userId: string): Promise<{
    configured: boolean;
    authenticated: boolean;
    channelTitle?: string;
    needsReauth: boolean;
    hasAnalyticsScope?: boolean;
    accounts: ConnectedAccount[];
  }> {
    const configured = Boolean(config.google.clientId && config.google.clientSecret);
    const accounts = await AccountStorageService.getPublicAccounts(userId, 'youtube');
    const authenticated = accounts.length > 0;
    const defaultAcc = accounts.find((a) => a.isDefault) || accounts[0];
    const hasAnalyticsScope = accounts.length > 0 && accounts.every((a) => a.hasAnalyticsScope);
    const missingPermissions =
      defaultAcc?.missingPermissions ||
      (!hasAnalyticsScope && authenticated ? ['yt-analytics.readonly'] : []);

    return {
      configured,
      authenticated,
      channelTitle: defaultAcc ? defaultAcc.name : undefined,
      needsReauth: !authenticated && configured,
      hasAnalyticsScope,
      missingPermissions,
      accounts,
    };
  }

  /**
   * Generates Google OAuth 2.0 consent URL with signed state identifying the user.
   * Scopes: youtube.upload, youtube.readonly, yt-analytics.readonly
   */
  static getAuthUrl(userId: string, customRedirectUri?: string): string {
    const redirectUri = customRedirectUri || config.google.redirectUri;
    const oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      redirectUri
    );

    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/yt-analytics.readonly',
    ];

    // Cryptographically signed state identifying the user
    const state = OAuthStateService.signState(userId, 'youtube');

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      include_granted_scopes: true,
      state,
    });
  }

  /**
   * Exchanges authorization code for tokens, extracts granted scopes, and saves to the user's account storage.
   */
  static async handleCallback(
    code: string,
    userId: string,
    customRedirectUri?: string
  ): Promise<ConnectedAccount> {
    const redirectUri = customRedirectUri || config.google.redirectUri;
    const oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      redirectUri
    );

    let tokens: any;
    try {
      const tokenRes = await oauth2Client.getToken(code);
      tokens = tokenRes.tokens;
    } catch (err: any) {
      const googleError =
        err.response?.data?.error_description ||
        err.response?.data?.error ||
        err.message ||
        'Failed to exchange authorization code with Google';
      console.error('[YouTubeService] Real Google OAuth error:', googleError, err.response?.data);
      throw new Error(`Google OAuth error: ${googleError}`);
    }

    if (!tokens || !tokens.access_token) {
      throw new Error('Google OAuth did not return a valid access token.');
    }

    oauth2Client.setCredentials(tokens);

    // Fetch authorized YouTube Channel details
    let channelItem: any;
    try {
      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
      const channelRes = await youtube.channels.list({
        mine: true,
        part: ['snippet', 'id', 'statistics'],
      });
      channelItem = channelRes.data.items?.[0];
    } catch (err: any) {
      const googleError =
        err.response?.data?.error?.message ||
        err.response?.data?.error_description ||
        err.message ||
        'Failed to query channel from YouTube API';
      console.error('[YouTubeService] Real Google API error:', googleError);
      throw new Error(`Google YouTube API error: ${googleError}`);
    }

    if (!channelItem) {
      throw new Error(
        'No YouTube channel was found for this Google account. Please create a YouTube channel on this account or switch to an account with a channel.'
      );
    }

    const channelId = channelItem.id || `yt-${Date.now()}`;
    const channelTitle = channelItem.snippet?.title || 'YouTube Channel';
    const channelHandle =
      channelItem.snippet?.customUrl ||
      `@${channelTitle.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()}`;
    const avatarUrl =
      channelItem.snippet?.thumbnails?.high?.url ||
      channelItem.snippet?.thumbnails?.medium?.url ||
      channelItem.snippet?.thumbnails?.default?.url;

    // Check if account already exists to preserve refresh token if Google omitted it during re-consent
    const existingAccounts = await AccountStorageService.getPublicAccounts(userId, 'youtube');
    const existing = existingAccounts.find((a) => a.platformAccountId === channelId);

    let refreshToken = tokens.refresh_token || '';
    if (!refreshToken && existing) {
      const existingTokens = AccountStorageService.getAccountTokens<YouTubeTokens>(userId, existing.id);
      if (existingTokens?.tokens?.refreshToken) {
        refreshToken = existingTokens.tokens.refreshToken;
        console.log(`[YouTubeService] Preserved existing refresh token for channel ${channelId}`);
      }
    }

    if (!refreshToken) {
      console.warn(
        '[YouTubeService] Notice: Google did not return a refresh_token and no existing token was found.'
      );
    }

    // Read granted scopes from Google's token response
    const scopeString = typeof tokens.scope === 'string' ? tokens.scope : '';
    const grantedScopes = scopeString.split(/\s+/).filter(Boolean);

    const hasScope = (target: string) =>
      grantedScopes.some((s) => s === target || s.includes(target) || s.endsWith(`/${target}`));

    const hasUpload = hasScope('youtube.upload');
    const hasReadonly = hasScope('youtube.readonly');
    const hasAnalytics = hasScope('yt-analytics.readonly');

    const missingPermissions: string[] = [];
    if (!hasUpload) missingPermissions.push('youtube.upload');
    if (!hasReadonly) missingPermissions.push('youtube.readonly');
    if (!hasAnalytics) missingPermissions.push('yt-analytics.readonly');

    const hasAnalyticsScope = hasAnalytics;

    const savedAccount = await AccountStorageService.saveAccount(userId, {
      platform: 'youtube',
      platformAccountId: channelId,
      name: channelTitle,
      handle: channelHandle,
      avatarUrl: avatarUrl || undefined,
      hasAnalyticsScope,
      grantedScopes,
      missingPermissions,
      tokens: {
        refreshToken: refreshToken || (tokens.access_token as string),
        accessToken: tokens.access_token || '',
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : undefined,
      } as YouTubeTokens,
    });

    console.log(
      `[YouTubeService] Successfully connected YouTube channel: "${channelTitle}" (${channelId}) for user ${userId}. Analytics granted: ${hasAnalyticsScope}. Missing: ${missingPermissions.join(', ') || 'none'}`
    );
    return savedAccount;
  }

  /**
   * Uploads vertical video to YouTube Shorts using the specific or default connected account for the user.
   */
  static async uploadVideo(
    storagePath: string,
    payload: YouTubePublishPayload,
    onProgress: (progress: number, stage: string) => void,
    userId: string,
    accountId?: string
  ): Promise<{ videoId: string; url: string }> {
    onProgress(5, 'Authenticating YouTube channel credentials...');

    // Fetch user's account with decrypted tokens
    const creds = accountId
      ? AccountStorageService.getAccountTokens<YouTubeTokens>(userId, accountId)
      : AccountStorageService.getDefaultAccountTokens<YouTubeTokens>(userId, 'youtube');

    if (!creds || !creds.tokens.refreshToken) {
      throw new Error(
        'No connected YouTube channel found for your account. Please connect your YouTube channel on the Accounts page first.'
      );
    }

    const redirectUri = config.google.redirectUri;
    const oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      redirectUri
    );

    oauth2Client.setCredentials({
      refresh_token: creds.tokens.refreshToken,
      access_token: creds.tokens.accessToken,
    });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    if (!fs.existsSync(storagePath)) {
      throw new Error(`Master video file not found on disk at: ${storagePath}`);
    }

    const fileSize = fs.statSync(storagePath).size;
    onProgress(15, `Preparing file upload for ${creds.account.name} (${(fileSize / (1024 * 1024)).toFixed(1)}MB)...`);

    // Ensure Shorts hashtag is present in title/description for viral reach
    let title = payload.title.trim();
    if (!title.toLowerCase().includes('#shorts')) {
      title = `${title} #Shorts`;
    }

    let description = payload.description.trim();
    if (!description.toLowerCase().includes('#shorts')) {
      description = `${description}\n\n#Shorts`;
    }

    const isScheduled = Boolean(payload.scheduledPublishTime);
    const publishAtDate = isScheduled ? new Date(payload.scheduledPublishTime!) : null;

    const requestBody: any = {
      snippet: {
        title: title.slice(0, 100),
        description: description.slice(0, 5000),
        tags: payload.tags || ['Shorts', 'Viral'],
        categoryId: payload.categoryId || '1',
        defaultLanguage: payload.language || 'en',
        defaultAudioLanguage: payload.language || 'en',
      },
      status: {
        privacyStatus: isScheduled ? 'private' : payload.privacyStatus || 'public',
        selfDeclaredMadeForKids: payload.madeForKids || false,
      },
    };

    if (isScheduled && publishAtDate && !isNaN(publishAtDate.getTime())) {
      requestBody.status.publishAt = publishAtDate.toISOString();
    }

    onProgress(30, 'Initiating resumable upload to YouTube API...');

    let res: any;
    try {
      res = await youtube.videos.insert(
        {
          part: ['snippet', 'status'],
          requestBody,
          media: {
            body: fs.createReadStream(storagePath),
          },
        },
        {
          onUploadProgress: (evt) => {
            if (evt.bytesRead && fileSize > 0) {
              const rawProgress = 30 + Math.floor((evt.bytesRead / fileSize) * 60);
              const progress = Math.min(90, rawProgress);
              onProgress(progress, `Uploading to YouTube Shorts: ${progress}%`);
            }
          },
        }
      );
    } catch (insertErr: any) {
      const googleError =
        insertErr.response?.data?.error?.message ||
        insertErr.response?.data?.error_description ||
        insertErr.message ||
        'YouTube video upload failed';
      console.error('[YouTubeService] Real Google upload error:', googleError, insertErr.response?.data);
      throw new Error(`Google YouTube Upload error: ${googleError}`);
    }

    const videoId = res.data.id;
    if (!videoId) {
      throw new Error('YouTube did not return a valid video ID after upload.');
    }

    // Handle optional custom thumbnail upload
    if (payload.customThumbnailUrl) {
      try {
        onProgress(92, 'Uploading custom thumbnail to YouTube...');
        let thumbBuffer: Buffer | null = null;
        let mime = 'image/jpeg';

        if (payload.customThumbnailUrl.startsWith('data:')) {
          const match = payload.customThumbnailUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mime = match[1];
            thumbBuffer = Buffer.from(match[2], 'base64');
          }
        } else if (fs.existsSync(payload.customThumbnailUrl)) {
          thumbBuffer = fs.readFileSync(payload.customThumbnailUrl);
        }

        if (thumbBuffer) {
          const tempThumbPath = path.join(process.cwd(), 'uploads', `thumb_${videoId}_${Date.now()}.jpg`);
          fs.writeFileSync(tempThumbPath, thumbBuffer);
          try {
            await youtube.thumbnails.set({
              videoId,
              media: {
                mimeType: mime,
                body: fs.createReadStream(tempThumbPath),
              },
            });
            console.log(`[YouTubeService] Successfully uploaded custom thumbnail for video ${videoId}`);
          } finally {
            if (fs.existsSync(tempThumbPath)) fs.unlinkSync(tempThumbPath);
          }
        }
      } catch (thumbErr: any) {
        console.warn(`[YouTubeService] Notice: Could not set custom thumbnail (channel may need phone verification for thumbnails):`, thumbErr.message);
      }
    }

    onProgress(96, 'Processing YouTube Shorts video metadata...');
    const url = `https://youtube.com/shorts/${videoId}`;
    onProgress(100, `Published to YouTube channel "${creds.account.name}"!`);

    return { videoId, url };
  }
}
