import crypto from 'crypto';
import { config } from '../config.js';
import { Platform } from '../../shared/types.js';

interface OAuthStatePayload {
  userId: string;
  platform: Platform;
  timestamp: number;
  nonce: string;
}

export class OAuthStateService {
  private static getSigningKey(): Buffer {
    const secret = config.encryptionKey || 'omnipost-oauth-state-secret-2026-min-32-chars';
    return crypto.createHash('sha256').update(secret).digest();
  }

  /**
   * Signs a state token identifying the user and platform for OAuth flows.
   */
  static signState(userId: string, platform: Platform): string {
    const payload: OAuthStatePayload = {
      userId,
      platform,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(8).toString('hex'),
    };

    const serialized = JSON.stringify(payload);
    const b64Payload = Buffer.from(serialized, 'utf8').toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.getSigningKey())
      .update(b64Payload)
      .digest('base64url');

    return `${b64Payload}.${signature}`;
  }

  /**
   * Verifies the signed state parameter and extracts the authenticated userId.
   * Ensures the state is authentic and not expired (15-minute window).
   */
  static verifyState(
    state: string,
    expectedPlatform?: Platform
  ): { userId: string; platform: Platform } | null {
    if (!state || typeof state !== 'string' || !state.includes('.')) {
      return null;
    }

    const [b64Payload, signature] = state.split('.');
    if (!b64Payload || !signature) {
      return null;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.getSigningKey())
      .update(b64Payload)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.warn('[OAuthStateService] Invalid OAuth state signature');
      return null;
    }

    try {
      const jsonStr = Buffer.from(b64Payload, 'base64url').toString('utf8');
      const payload: OAuthStatePayload = JSON.parse(jsonStr);

      // 15-minute expiration
      const now = Date.now();
      const ageMs = now - payload.timestamp;
      if (ageMs > 15 * 60 * 1000 || ageMs < -60 * 1000) {
        console.warn(`[OAuthStateService] OAuth state expired (${Math.round(ageMs / 1000)}s old)`);
        return null;
      }

      if (expectedPlatform && payload.platform !== expectedPlatform) {
        console.warn(`[OAuthStateService] OAuth state platform mismatch: expected ${expectedPlatform}, got ${payload.platform}`);
        return null;
      }

      return {
        userId: payload.userId,
        platform: payload.platform,
      };
    } catch (err: any) {
      console.error('[OAuthStateService] Failed to parse OAuth state payload:', err.message);
      return null;
    }
  }
}
