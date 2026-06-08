/** Schema v2 — format chuẩn khi lưu mới. */
export const PREFS_VERSION = 2;

/** Giá trị mặc định cho user chưa lưu hoặc field mới sau migration. */
export const V2_DEFAULTS = {
  theme: 'light',
  showAvatar: true,
  locale: 'vi',
  notifications: true,
  version: PREFS_VERSION,
};

export const THEME_VALUES = new Set(['light', 'dark']);
export const LOCALE_VALUES = new Set(['vi', 'en', 'ja']);

/**
 * Key KVS theo user — global, không gắn issue.
 * Pattern: user-prefs:{accountId}
 */
export const buildPrefsKey = (accountId) => `user-prefs:${accountId}`;

/**
 * Nhận diện dữ liệu v1: object hợp lệ nhưng không có version === 2.
 * v1 ví dụ: { theme: "dark", showAvatar: true }
 */
export const isV1StoredPrefs = (stored) =>
  Boolean(stored) &&
  typeof stored === 'object' &&
  stored.version !== PREFS_VERSION;

/**
 * Transform v1 → v2: giữ field cũ, bổ sung default cho locale, notifications, version.
 */
export const migrateV1ToV2 = (v1) => ({
  theme: THEME_VALUES.has(v1.theme) ? v1.theme : V2_DEFAULTS.theme,
  showAvatar:
    typeof v1.showAvatar === 'boolean'
      ? v1.showAvatar
      : V2_DEFAULTS.showAvatar,
  locale: V2_DEFAULTS.locale,
  notifications: V2_DEFAULTS.notifications,
  version: PREFS_VERSION,
});

/**
 * Đọc từ KVS và chuẩn hóa về v2 (trong bộ nhớ).
 * Không ghi lại storage — migration lazy khi user save lần sau.
 */
export const normalizeUserPrefs = (stored) => {
  if (!stored || typeof stored !== 'object') {
    return { ...V2_DEFAULTS, savedAt: null, migratedFromV1: false };
  }

  const savedAt =
    typeof stored.savedAt === 'string' && stored.savedAt ? stored.savedAt : null;

  if (stored.version === PREFS_VERSION) {
    return {
      theme: THEME_VALUES.has(stored.theme) ? stored.theme : V2_DEFAULTS.theme,
      showAvatar:
        typeof stored.showAvatar === 'boolean'
          ? stored.showAvatar
          : V2_DEFAULTS.showAvatar,
      locale: LOCALE_VALUES.has(stored.locale)
        ? stored.locale
        : V2_DEFAULTS.locale,
      notifications:
        typeof stored.notifications === 'boolean'
          ? stored.notifications
          : V2_DEFAULTS.notifications,
      version: PREFS_VERSION,
      savedAt,
      migratedFromV1: false,
    };
  }

  const migrated = migrateV1ToV2(stored);
  return {
    ...migrated,
    savedAt,
    migratedFromV1: true,
  };
};

/** Chuẩn hóa payload từ client trước khi ghi KVS — luôn v2. */
export const buildV2StoredValue = (input, savedAt) => {
  const theme =
    typeof input?.theme === 'string' && THEME_VALUES.has(input.theme)
      ? input.theme
      : V2_DEFAULTS.theme;
  const showAvatar =
    typeof input?.showAvatar === 'boolean'
      ? input.showAvatar
      : V2_DEFAULTS.showAvatar;
  const locale =
    typeof input?.locale === 'string' && LOCALE_VALUES.has(input.locale)
      ? input.locale
      : V2_DEFAULTS.locale;
  const notifications =
    typeof input?.notifications === 'boolean'
      ? input.notifications
      : V2_DEFAULTS.notifications;

  return {
    theme,
    showAvatar,
    locale,
    notifications,
    version: PREFS_VERSION,
    savedAt,
  };
};
