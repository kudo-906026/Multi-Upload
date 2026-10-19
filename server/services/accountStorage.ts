import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ConnectedAccount, Platform } from '../../shared/types.js';
import { config } from '../config.js';
import { SupabaseService } from './supabaseService.js';

interface EncryptedPayload {
  iv: string;
  authTag: string;
  ciphertext: string;
}

export interface StoredAccountRecord {
  id: string;
  userId: string;
  platform: Platform;
  name: string;
  handle?: string;
  avatarUrl?: string;
  platformAccountId: string;
  connectedAt: string;
  expiresAt?: string;
  isDefault?: boolean;
  hasAnalyticsScope?: boolean;
  grantedScopes?: string[];
  missingPermissions?: string[];
  encryptedTokens: EncryptedPayload;
}

export interface YouTubeTokens {
  refreshToken: string;
  accessToken?: string;
  tokenExpiry?: string;
}

export interface InstagramTokens {
  longLivedToken: string;
  userId: string;
  issuedAt: string;
  expiresAt: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const KEY_FILE = path.join(DATA_DIR, '.secret_key');

export class AccountStorageService {
  // Keyed by record.id
  private static accounts: Map<string, StoredAccountRecord> = new Map();
  private static encryptionKeyBuffer: Buffer;

  static async init(): Promise<void> {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Initialize or derive 32-byte encryption key
    this.encryptionKeyBuffer = this.resolveKey();

    // Load locally stored accounts as initial cache
    if (fs.existsSync(ACCOUNTS_FILE)) {
      try {
        const raw = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
        const list: StoredAccountRecord[] = JSON.parse(raw);
        list.forEach((rec) => {
          if (rec.id && rec.userId) {
            this.accounts.set(rec.id, rec);
          }
        });
        console.log(`[AccountStorage] Loaded ${this.accounts.size} cached connected accounts.`);
      } catch (err) {
        console.warn('[AccountStorage] Failed to parse accounts file:', err);
      }
    }
  }

  /**
   * Syncs accounts for a specific user from Supabase.
   */
  static async syncUserAccounts(userId: string): Promise<void> {
    if (!SupabaseService.isConfigured() || !userId) return;
    const client = SupabaseService.getClient();
    if (!client) return;

    try {
      const { data, error } = await client
        .from('connected_accounts')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.warn(`[AccountStorage] Supabase accounts query notice for user ${userId}:`, error.message);
        return;
      }

      if (data) {
        // Clear old memory records for this user and load fresh
        for (const [id, rec] of this.accounts.entries()) {
          if (rec.userId === userId) {
            this.accounts.delete(id);
          }
        }

        data.forEach((row: any) => {
          const encryptedTokens =
            typeof row.encrypted_tokens === 'string'
              ? JSON.parse(row.encrypted_tokens)
              : row.encrypted_tokens;

          this.accounts.set(row.id, {
            id: row.id,
            userId: row.user_id,
            platform: row.platform,
            name: row.name,
            handle: row.handle || undefined,
            avatarUrl: row.avatar_url || undefined,
            platformAccountId: row.platform_account_id,
            connectedAt: row.connected_at,
            expiresAt: row.expires_at || undefined,
            isDefault: Boolean(row.is_default),
            encryptedTokens,
          });
        });
        this.persistLocal();
      }
    } catch (err: any) {
      console.warn('[AccountStorage] Supabase sync error:', err.message);
    }
  }

  private static resolveKey(): Buffer {
    if (config.encryptionKey && config.encryptionKey.trim().length >= 16) {
      return crypto.createHash('sha256').update(config.encryptionKey.trim()).digest();
    }

    if (fs.existsSync(KEY_FILE)) {
      try {
        const savedHex = fs.readFileSync(KEY_FILE, 'utf-8').trim();
        if (savedHex.length === 64) {
          return Buffer.from(savedHex, 'hex');
        }
      } catch (e) {
        // fallback
      }
    }

    const generatedKey = crypto.randomBytes(32);
    try {
      fs.writeFileSync(KEY_FILE, generatedKey.toString('hex'), 'utf-8');
    } catch (e) {
      console.warn('[AccountStorage] Could not write secret key file:', e);
    }
    return generatedKey;
  }

  private static encrypt(data: any): EncryptedPayload {
    const iv = crypto.randomBytes(12); // GCM standard 96-bit IV
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKeyBuffer, iv);

    const plaintext = JSON.stringify(data);
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      iv: iv.toString('hex'),
      authTag,
      ciphertext,
    };
  }

  private static decrypt<T = any>(payload: EncryptedPayload): T {
    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKeyBuffer, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }

  private static persistLocal(): void {
    try {
      const list = Array.from(this.accounts.values());
      fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[AccountStorage] Failed to persist accounts locally:', err);
    }
  }

  private static async persistToSupabase(record: StoredAccountRecord): Promise<void> {
    if (!SupabaseService.isConfigured()) return;
    const client = SupabaseService.getClient();
    if (!client) return;

    try {
      const { error } = await client.from('connected_accounts').upsert({
        id: record.id,
        user_id: record.userId,
        platform: record.platform,
        name: record.name,
        handle: record.handle || null,
        avatar_url: record.avatarUrl || null,
        platform_account_id: record.platformAccountId,
        connected_at: record.connectedAt,
        expires_at: record.expiresAt || null,
        is_default: Boolean(record.isDefault),
        encrypted_tokens: record.encryptedTokens,
      });
      if (error) {
        console.warn('[AccountStorage] Supabase upsert notice:', error.message);
      }
    } catch (err: any) {
      console.warn('[AccountStorage] Supabase persist error:', err.message);
    }
  }

  private static async deleteFromSupabase(userId: string, id: string): Promise<void> {
    if (!SupabaseService.isConfigured()) return;
    const client = SupabaseService.getClient();
    if (!client) return;

    try {
      const { error } = await client
        .from('connected_accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.warn('[AccountStorage] Supabase delete notice:', error.message);
      }
    } catch (err: any) {
      console.warn('[AccountStorage] Supabase delete error:', err.message);
    }
  }

  /**
   * Returns sanitized public account objects with zero token leakage.
   */
  static toPublicAccount(record: StoredAccountRecord): ConnectedAccount {
    let tokenDaysRemaining: number | undefined;
    let needsRefresh: boolean | undefined;

    if (record.platform === 'instagram' && record.expiresAt) {
      const expires = new Date(record.expiresAt).getTime();
      const now = Date.now();
      const msRemaining = Math.max(0, expires - now);
      tokenDaysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
      needsRefresh = tokenDaysRemaining < 15;
    }

    return {
      id: record.id,
      userId: record.userId,
      platform: record.platform,
      name: record.name,
      handle: record.handle,
      avatarUrl: record.avatarUrl,
      platformAccountId: record.platformAccountId,
      connectedAt: record.connectedAt,
      expiresAt: record.expiresAt,
      tokenDaysRemaining,
      needsRefresh,
      hasAnalyticsScope: Boolean(record.hasAnalyticsScope),
      grantedScopes: record.grantedScopes,
      missingPermissions: record.missingPermissions,
      isDefault: record.isDefault,
    };
  }

  /**
   * Retrieves public accounts belonging strictly to the specified userId.
   */
  static async getPublicAccounts(userId: string, platform?: Platform): Promise<ConnectedAccount[]> {
    await this.syncUserAccounts(userId);

    const list = Array.from(this.accounts.values()).filter((a) => a.userId === userId);
    const filtered = platform ? list.filter((a) => a.platform === platform) : list;
    return filtered
      .map((r) => this.toPublicAccount(r))
      .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
  }

  static getPublicAccountById(userId: string, id: string): ConnectedAccount | null {
    const record = this.accounts.get(id);
    if (!record || record.userId !== userId) return null;
    return this.toPublicAccount(record);
  }

  /**
   * Internal helper to retrieve all stored records across users (for background refresh maintenance).
   */
  static getAllStoredAccounts(): StoredAccountRecord[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Retrieves and decrypts the tokens for server-side authenticated operations.
   * Scoped to the specific user.
   */
  static getAccountTokens<T = any>(
    userId: string,
    id: string
  ): { account: ConnectedAccount; tokens: T } | null {
    const record = this.accounts.get(id);
    if (!record || record.userId !== userId) return null;

    try {
      const tokens = this.decrypt<T>(record.encryptedTokens);
      return {
        account: this.toPublicAccount(record),
        tokens,
      };
    } catch (err) {
      console.error(`[AccountStorage] Decryption error for account ${id}:`, err);
      return null;
    }
  }

  /**
   * Returns the primary or default account for a given platform and user.
   * Strictly scopes by userId to prevent any cross-user account leakage.
   */
  static getDefaultAccountTokens<T = any>(
    userId: string,
    platform: Platform
  ): { account: ConnectedAccount; tokens: T } | null {
    if (!userId) return null;
    const list = Array.from(this.accounts.values()).filter(
      (a) => a.userId === userId && a.platform === platform
    );
    if (list.length === 0) return null;

    const selected = list.find((a) => a.isDefault) || list[0];
    return this.getAccountTokens<T>(userId, selected.id);
  }

  private static listeners: Array<(userId: string) => void> = [];

  static addChangeListener(fn: (userId: string) => void): void {
    this.listeners.push(fn);
  }

  private static notifyChange(userId: string): void {
    this.listeners.forEach((fn) => {
      try {
        fn(userId);
      } catch (err) {
        console.warn('[AccountStorage] Change listener error:', err);
      }
    });
  }

  /**
   * Saves or updates a connected account with encrypted tokens for a specific user.
   */
  static async saveAccount(
    userId: string,
    params: {
      platform: Platform;
      name: string;
      handle?: string;
      avatarUrl?: string;
      platformAccountId: string;
      tokens: any;
      expiresAt?: string;
      hasAnalyticsScope?: boolean;
      grantedScopes?: string[];
      missingPermissions?: string[];
    }
  ): Promise<ConnectedAccount> {
    // Check if account already exists for this user with same platformAccountId
    const userAccounts = Array.from(this.accounts.values()).filter((a) => a.userId === userId);
    const existing = userAccounts.find(
      (a) => a.platform === params.platform && a.platformAccountId === params.platformAccountId
    );

    const id = existing ? existing.id : crypto.randomUUID();
    const isFirstOfPlatform = userAccounts.filter((a) => a.platform === params.platform).length === 0;

    const record: StoredAccountRecord = {
      id,
      userId,
      platform: params.platform,
      name: params.name,
      handle: params.handle,
      avatarUrl: params.avatarUrl,
      platformAccountId: params.platformAccountId,
      connectedAt: existing ? existing.connectedAt : new Date().toISOString(),
      expiresAt: params.expiresAt,
      isDefault: existing ? existing.isDefault : isFirstOfPlatform,
      hasAnalyticsScope:
        params.hasAnalyticsScope !== undefined
          ? params.hasAnalyticsScope
          : (existing?.hasAnalyticsScope ?? false),
      grantedScopes: params.grantedScopes ?? existing?.grantedScopes,
      missingPermissions: params.missingPermissions ?? existing?.missingPermissions,
      encryptedTokens: this.encrypt(params.tokens),
    };

    this.accounts.set(id, record);
    this.persistLocal();
    await this.persistToSupabase(record);
    this.notifyChange(userId);

    return this.toPublicAccount(record);
  }

  /**
   * Updates tokens for an existing account belonging to the user.
   */
  static async updateTokens(
    userId: string,
    id: string,
    newTokens: any,
    newExpiresAt?: string
  ): Promise<boolean> {
    const record = this.accounts.get(id);
    if (!record || record.userId !== userId) return false;

    record.encryptedTokens = this.encrypt(newTokens);
    if (newExpiresAt) {
      record.expiresAt = newExpiresAt;
    }
    this.persistLocal();
    await this.persistToSupabase(record);
    this.notifyChange(userId);
    return true;
  }

  static async removeAccount(userId: string, id: string): Promise<boolean> {
    const record = this.accounts.get(id);
    if (!record || record.userId !== userId) return false;

    const deleted = this.accounts.delete(id);
    if (deleted) {
      this.persistLocal();
      await this.deleteFromSupabase(userId, id);
      this.notifyChange(userId);
    }
    return deleted;
  }

  static async setDefault(userId: string, id: string): Promise<boolean> {
    const target = this.accounts.get(id);
    if (!target || target.userId !== userId) return false;

    // Reset default for other accounts of the same platform for this user
    for (const acc of this.accounts.values()) {
      if (acc.userId === userId && acc.platform === target.platform) {
        acc.isDefault = acc.id === id;
        this.persistToSupabase(acc).catch((e) =>
          console.warn('[AccountStorage] Supabase update default notice:', e)
        );
      }
    }

    this.persistLocal();
    this.notifyChange(userId);
    return true;
  }
}
