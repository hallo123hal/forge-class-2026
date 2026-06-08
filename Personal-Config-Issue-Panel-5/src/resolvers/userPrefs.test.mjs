import assert from 'node:assert/strict';
import {
  migrateV1ToV2,
  normalizeUserPrefs,
  buildV2StoredValue,
  isV1StoredPrefs,
} from './userPrefs.js';

let passed = 0;
let failed = 0;

const test = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`PASS: ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL: ${name}`);
    console.error(`  ${error.message}`);
  }
};

// --- Test: đọc v1 data thủ công, transform về v2 với default fields mới ---

test('isV1StoredPrefs nhận diện v1 (không có version field)', () => {
  const v1 = { theme: 'dark', showAvatar: true };
  assert.equal(isV1StoredPrefs(v1), true);
});

test('isV1StoredPrefs không coi v2 là v1', () => {
  const v2 = { theme: 'dark', showAvatar: true, locale: 'vi', notifications: true, version: 2 };
  assert.equal(isV1StoredPrefs(v2), false);
});

test('migrateV1ToV2 giữ theme và showAvatar, thêm default locale/notifications/version', () => {
  const v1 = { theme: 'dark', showAvatar: true };
  const result = migrateV1ToV2(v1);

  assert.deepEqual(result, {
    theme: 'dark',
    showAvatar: true,
    locale: 'vi',
    notifications: true,
    version: 2,
  });
});

test('normalizeUserPrefs đọc v1 storage → v2 in-memory với migratedFromV1', () => {
  const v1Stored = { theme: 'dark', showAvatar: true, savedAt: '2024-01-01T00:00:00.000Z' };
  const result = normalizeUserPrefs(v1Stored);

  assert.equal(result.theme, 'dark');
  assert.equal(result.showAvatar, true);
  assert.equal(result.locale, 'vi');
  assert.equal(result.notifications, true);
  assert.equal(result.version, 2);
  assert.equal(result.savedAt, '2024-01-01T00:00:00.000Z');
  assert.equal(result.migratedFromV1, true);
});

test('normalizeUserPrefs đọc v2 storage không migrate lại', () => {
  const v2Stored = {
    theme: 'dark',
    showAvatar: false,
    locale: 'en',
    notifications: false,
    version: 2,
    savedAt: '2025-06-01T12:00:00.000Z',
  };
  const result = normalizeUserPrefs(v2Stored);

  assert.deepEqual(
    {
      theme: result.theme,
      showAvatar: result.showAvatar,
      locale: result.locale,
      notifications: result.notifications,
      version: result.version,
      savedAt: result.savedAt,
      migratedFromV1: result.migratedFromV1,
    },
    {
      theme: 'dark',
      showAvatar: false,
      locale: 'en',
      notifications: false,
      version: 2,
      savedAt: '2025-06-01T12:00:00.000Z',
      migratedFromV1: false,
    }
  );
});

// --- Test: save v2 không mất data cũ (theme, showAvatar từ v1) ---

test('buildV2StoredValue luôn ghi version 2', () => {
  const savedAt = '2025-06-08T10:00:00.000Z';
  const value = buildV2StoredValue(
    { theme: 'dark', showAvatar: true, locale: 'vi', notifications: true },
    savedAt
  );

  assert.equal(value.version, 2);
  assert.equal(value.savedAt, savedAt);
});

test('save v2 giữ nguyên theme và showAvatar từ v1 sau khi user lưu', () => {
  const v1 = { theme: 'dark', showAvatar: true };
  const normalized = normalizeUserPrefs(v1);
  const savedAt = '2025-06-08T10:00:00.000Z';

  const stored = buildV2StoredValue(
    {
      theme: normalized.theme,
      showAvatar: normalized.showAvatar,
      locale: normalized.locale,
      notifications: normalized.notifications,
    },
    savedAt
  );

  assert.equal(stored.theme, 'dark', 'theme từ v1 phải được giữ');
  assert.equal(stored.showAvatar, true, 'showAvatar từ v1 phải được giữ');
  assert.equal(stored.locale, 'vi');
  assert.equal(stored.notifications, true);
  assert.equal(stored.version, 2);

  const roundTrip = normalizeUserPrefs(stored);
  assert.equal(roundTrip.theme, 'dark');
  assert.equal(roundTrip.showAvatar, true);
  assert.equal(roundTrip.migratedFromV1, false);
});

test('buildV2StoredValue cho phép cập nhật locale/notifications mà không đụng field cũ', () => {
  const savedAt = '2025-06-08T11:00:00.000Z';
  const stored = buildV2StoredValue(
    { theme: 'dark', showAvatar: true, locale: 'en', notifications: false },
    savedAt
  );

  assert.equal(stored.theme, 'dark');
  assert.equal(stored.showAvatar, true);
  assert.equal(stored.locale, 'en');
  assert.equal(stored.notifications, false);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
