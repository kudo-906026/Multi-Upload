import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ConnectedAccount, Platform } from '../../shared/types.js';
import { config } from '../config.js';

interface EncryptedPayload {
  iv: string;
  authTag: string;
  ciphertext: string;
}

export interface StoredAccountRecord {
  id: string;
  platform: Platform;
  name: string;
  handle?: string;
  avatarUrl?: string;
  platformAccountId: string;
  connectedAt: string;
  expiresAt?: string;
  isDefault?: boolean;
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
  private static accounts: Map<string, StoredAccountRecord> = new Map();
  private static encryptionKeyBuffer: Buffer;

  static init(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Initialize or derive 32-byte encryption key
    this.encryptionKeyBuffer = this.resolveKey();

    // Load stored accounts
    if (fs.existsSync(ACCOUNTS_FILE)) {
      try {
        const raw = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
        const list: StoredAccountRecord[] = JSON.parse(raw);
        list.forEach((rec) => this.accounts.set(rec.id, rec));
        console.log(`[AccountStorage] Loaded ${this.accounts.size} connected accounts.`);
      } catch (err) {
        console.warn('[AccountStorage] Failed to parse accounts file, starting fresh:', err);
      }
    }
  }

  private static resolveKey(): Buffer {
    if (config.encryptionKey && config.encryptionKey.trim().length >= 16) {
      // Deterministically expand to 32 bytes via SHA-256
      return crypto.createHash('sha256').update(config.encryptionKey.trim()).digest();
    }

    // Persist a local machine key in data/.secret_key if no env var supplied
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

  private static persist(): void {
    try {
      const list = Array.from(this.accounts.values());
      fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[AccountStorage] Failed to persist accounts:', err);
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
      platform: record.platform,
      name: record.name,
      handle: record.handle,
      avatarUrl: record.avatarUrl,
      platformAccountId: record.platformAccountId,
      connectedAt: record.connectedAt,
      expiresAt: record.expiresAt,
      tokenDaysRemaining,
      needsRefresh,
      isDefault: record.isDefault,
    };
  }

  static getPublicAccounts(platform?: Platform): ConnectedAccount[] {
    const list = Array.from(this.accounts.values());
    const filtered = platform ? list.filter((a) => a.platform === platform) : list;
    return filtered
      .map((r) => this.toPublicAccount(r))
      .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
  }

  static getPublicAccountById(id: string): ConnectedAccount | null {
    const record = this.accounts.get(id);
    return record ? this.toPublicAccount(record) : null;
  }

  /**
   * Retrieves and decrypts the tokens for server-side authenticated operations.
   */
  static getAccountTokens<T = any>(id: string): { account: ConnectedAccount; tokens: T } | null {
    const record = this.accounts.get(id);
    if (!record) return null;

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
   * Returns the primary or default account for a given platform.
   */
  static getDefaultAccountTokens<T = any>(platform: Platform): { account: ConnectedAccount; tokens: T } | null {
    const list = Array.from(this.accounts.values()).filter((a) => a.platform === platform);
    if (list.length === 0) return null;

    const selected = list.find((a) => a.isDefault) || list[0];
    return this.getAccountTokens<T>(selected.id);
  }

  /**
   * Saves or updates a connected account with encrypted tokens.
   */
  static saveAccount(params: {
    platform: Platform;
    name: string;
    handle?: string;
    avatarUrl?: string;
    platformAccountId: string;
    tokens: any;
    expiresAt?: string;
  }): ConnectedAccount {
    // Check if account already exists with the same platformAccountId
    const existing = Array.from(this.accounts.values()).find(
      (a) => a.platform === params.platform && a.platformAccountId === params.platformAccountId
    );

    const id = existing ? existing.id : crypto.randomUUID();
    const isFirstOfPlatform = Array.from(this.accounts.values()).filter((a) => a.platform === params.platform).length === 0;

    const record: StoredAccountRecord = {
      id,
      platform: params.platform,
      name: params.name,
      handle: params.handle,
      avatarUrl: params.avatarUrl,
      platformAccountId: params.platformAccountId,
      connectedAt: existing ? existing.connectedAt : new Date().toISOString(),
      expiresAt: params.expiresAt,
      isDefault: existing ? existing.isDefault : isFirstOfPlatform,
      encryptedTokens: this.encrypt(params.tokens),
    };

    this.accounts.set(id, record);
    this.persist();

    return this.toPublicAccount(record);
  }

  /**
   * Updates tokens for an existing account (e.g. after Instagram refresh).
   */
  static updateTokens(id: string, newTokens: any, newExpiresAt?: string): boolean {
    const record = this.accounts.get(id);
    if (!record) return false;

    record.encryptedTokens = this.encrypt(newTokens);
    if (newExpiresAt) {
      record.expiresAt = newExpiresAt;
    }
    this.persist();
    return true;
  }

  static removeAccount(id: string): boolean {
    const deleted = this.accounts.delete(id);
    if (deleted) {
      this.persist();
    }
    return deleted;
  }

  static setDefault(id: string): boolean {
    const target = this.accounts.get(id);
    if (!target) return false;

    // Reset default for other accounts of the same platform
    this.accounts.forEach((acc) => {
      if (acc.platform === target.platform) {
        acc.isDefault = acc.id === id;
      }
    });

    this.persist();
    return true;
  }
}
