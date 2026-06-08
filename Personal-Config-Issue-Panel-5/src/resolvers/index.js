import Resolver from '@forge/resolver';
import { kvs } from '@forge/kvs';
import {
  buildPrefsKey,
  buildV2StoredValue,
  normalizeUserPrefs,
} from './userPrefs';

const resolver = new Resolver();

const getAccountId = (req) =>
  req.context?.accountId ?? req.context?.principal?.accountId;

/**
 * Đọc user preferences — hỗ trợ v1 (không có version) và v2.
 * v1 được transform in-memory sang v2 với default cho locale, notifications.
 */
resolver.define('getUserPrefs', async (req) => {
  const accountId = getAccountId(req);
  if (!accountId) {
    throw new Error('Không xác định được người dùng (accountId).');
  }

  const key = buildPrefsKey(accountId);
  const stored = await kvs.get(key);
  const prefs = normalizeUserPrefs(stored);

  return {
    prefs: {
      theme: prefs.theme,
      showAvatar: prefs.showAvatar,
      locale: prefs.locale,
      notifications: prefs.notifications,
      version: prefs.version,
    },
    savedAt: prefs.savedAt,
    hasStoredValue: Boolean(stored),
    migratedFromV1: prefs.migratedFromV1,
  };
});

/**
 * Lưu user preferences — luôn ghi format v2 (có version: 2).
 */
resolver.define('saveUserPrefs', async (req) => {
  const accountId = getAccountId(req);
  if (!accountId) {
    throw new Error('Không xác định được người dùng (accountId).');
  }

  const savedAt = new Date().toISOString();
  const key = buildPrefsKey(accountId);
  const value = buildV2StoredValue(req.payload, savedAt);

  await kvs.set(key, value);

  return { success: true, savedAt, version: value.version };
});

/**
 * Tiện ích test: ghi thủ công v1 data vào KVS để verify migration.
 * v1: { theme, showAvatar } — không có locale, notifications, version.
 */
resolver.define('seedV1UserPrefs', async (req) => {
  const accountId = getAccountId(req);
  if (!accountId) {
    throw new Error('Không xác định được người dùng (accountId).');
  }

  const theme =
    typeof req.payload?.theme === 'string' ? req.payload.theme : 'dark';
  const showAvatar =
    typeof req.payload?.showAvatar === 'boolean' ? req.payload.showAvatar : true;

  const key = buildPrefsKey(accountId);
  const v1Value = { theme, showAvatar };

  await kvs.set(key, v1Value);

  return { success: true, seeded: v1Value };
});

resolver.define('deleteUserPrefs', async (req) => {
  const accountId = getAccountId(req);
  if (!accountId) {
    throw new Error('Không xác định được người dùng (accountId).');
  }

  const key = buildPrefsKey(accountId);
  await kvs.delete(key);

  return { success: true };
});

export const handler = resolver.getDefinitions();
