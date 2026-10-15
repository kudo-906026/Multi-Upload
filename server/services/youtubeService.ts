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
    accounts: ConnectedAccount[];
  }> {
    const configured = Boolean(config.google.clientId && config.google.clientSecret);
    const accounts = await AccountStorageService.getPublicAccounts(userId, 'youtube');
    const authenticated = accounts.length > 0;
    const defaultAcc = accounts.find((a) => a.isDefault) || accounts[0];

    return {
      configured,
      authenticated,
      channelTitle: defaultAcc ? defaultAcc.name : undefined,
      needsReauth: !authenticated && configured,
      accounts,
    };
  }

  /**
   * Generates Google OAuth 2.0 consent URL with signed state identifying the user.
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
      'https://www.googleapis.com/auth/userinfo.profile',
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
   * Exchanges authorization code for tokens and saves to the user's account storage.
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

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch authorized YouTube Channel details
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const channelRes = await youtube.channels.list({
      mine: true,
      part: ['snippet', 'id', 'statistics'],
    });

    const channelItem = channelRes.data.items?.[0];
    const channelId = channelItem?.id || `yt-${Date.now()}`;
    const channelTitle = channelItem?.snippet?.title || 'YouTube Channel';
    const channelHandle =
      channelItem?.snippet?.customUrl ||
      `@${channelTitle.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()}`;
    const avatarUrl =
      channelItem?.snippet?.thumbnails?.high?.url ||
      channelItem?.snippet?.thumbnails?.medium?.url ||
      channelItem?.snippet?.thumbnails?.default?.url;

    const refreshToken = tokens.refresh_token || '';
    if (!refreshToken) {
      console.warn(
        '[YouTubeService] Notice: Google did not return a refresh_token in this exchange (prompt=consent ensures it).'
      );
    }

    const savedAccount = await AccountStorageService.saveAccount(userId, {
      platform: 'youtube',
      platformAccountId: channelId,
      name: channelTitle,
      handle: channelHandle,
      avatarUrl: avatarUrl || undefined,
      tokens: {
        refreshToken: refreshToken || (tokens.access_token as string),
        accessToken: tokens.access_token || '',
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : undefined,
      } as YouTubeTokens,
    });

    console.log(
      `[YouTubeService] Successfully connected YouTube channel: "${channelTitle}" (${channelId}) for user ${userId}`
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

    const res = await youtube.videos.insert(
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
