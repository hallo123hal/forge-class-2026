import Resolver from '@forge/resolver';
import { kvs } from '@forge/kvs';

const resolver = new Resolver();

/** Cài đặt mặc định khi user chưa lưu lần nào (kvs.get trả về undefined). */
const DEFAULT_SETTINGS = {
  preferredLanguage: 'vi',
  showAvatar: true,
  itemsPerPage: 25,
};

const LANGUAGE_VALUES = new Set(['vi', 'en', 'ja']);

/**
 * Key KVS theo user — global, không gắn issue.
 * Pattern: user-settings:{accountId}
 */
const buildSettingsKey = (accountId) => `user-settings:${accountId}`;

const getAccountId = (req) =>
  req.context?.accountId ?? req.context?.principal?.accountId;

const normalizeStoredSettings = (stored) => {
  if (!stored || typeof stored !== 'object') {
    return { ...DEFAULT_SETTINGS, savedAt: null };
  }

  const preferredLanguage = LANGUAGE_VALUES.has(stored.preferredLanguage)
    ? stored.preferredLanguage
    : DEFAULT_SETTINGS.preferredLanguage;
  const showAvatar =
    typeof stored.showAvatar === 'boolean'
      ? stored.showAvatar
      : DEFAULT_SETTINGS.showAvatar;
  const itemsPerPage =
    typeof stored.itemsPerPage === 'number' &&
    Number.isFinite(stored.itemsPerPage) &&
    stored.itemsPerPage > 0
      ? Math.floor(stored.itemsPerPage)
      : DEFAULT_SETTINGS.itemsPerPage;

  return {
    preferredLanguage,
    showAvatar,
    itemsPerPage,
    savedAt:
      typeof stored.savedAt === 'string' && stored.savedAt
        ? stored.savedAt
        : null,
  };
};

resolver.define('getUserSettings', async (req) => {
  const accountId = getAccountId(req);
  if (!accountId) {
    throw new Error('Không xác định được người dùng (accountId).');
  }

  const key = buildSettingsKey(accountId);
  const stored = await kvs.get(key);
  const settings = normalizeStoredSettings(stored);

  return {
    settings: {
      preferredLanguage: settings.preferredLanguage,
      showAvatar: settings.showAvatar,
      itemsPerPage: settings.itemsPerPage,
    },
    savedAt: settings.savedAt,
    hasStoredValue: Boolean(stored),
  };
});

resolver.define('saveUserSettings', async (req) => {
  const accountId = getAccountId(req);
  if (!accountId) {
    throw new Error('Không xác định được người dùng (accountId).');
  }

  const preferredLanguage =
    typeof req.payload?.preferredLanguage === 'string'
      ? req.payload.preferredLanguage
      : DEFAULT_SETTINGS.preferredLanguage;
  if (!LANGUAGE_VALUES.has(preferredLanguage)) {
    throw new Error('Ngôn ngữ không hợp lệ.');
  }

  const showAvatar =
    typeof req.payload?.showAvatar === 'boolean'
      ? req.payload.showAvatar
      : DEFAULT_SETTINGS.showAvatar;

  const itemsPerPageRaw = req.payload?.itemsPerPage;
  const itemsPerPage = Number(itemsPerPageRaw);
  if (!Number.isFinite(itemsPerPage) || itemsPerPage < 1 || itemsPerPage > 100) {
    throw new Error('Số items/trang phải từ 1 đến 100.');
  }

  const savedAt = new Date().toISOString();
  const key = buildSettingsKey(accountId);
  const value = {
    preferredLanguage,
    showAvatar,
    itemsPerPage: Math.floor(itemsPerPage),
    savedAt,
  };

  await kvs.set(key, value);

  return { success: true, savedAt };
});

resolver.define('deleteUserSettings', async (req) => {
  const accountId = getAccountId(req);
  if (!accountId) {
    throw new Error('Không xác định được người dùng (accountId).');
  }

  const key = buildSettingsKey(accountId);
  await kvs.delete(key);

  return { success: true };
});

export const handler = resolver.getDefinitions();
