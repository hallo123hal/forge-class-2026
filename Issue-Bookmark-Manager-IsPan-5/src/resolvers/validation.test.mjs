import assert from 'node:assert/strict';
import {
  ISSUE_KEY_REGEX,
  validateIssueKey,
  validateCursor,
  assertBookmarkOwnership,
  assertOwnBookmarkKey,
} from './validation.js';

const buildBookmarkPrefix = (accountId) => `bookmark:${accountId}:`;

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

const expectError = (fn, expectedMessage) => {
  let thrown = null;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof Error, 'Expected an Error to be thrown');
  assert.equal(thrown.message, expectedMessage);
};

test('ISSUE_KEY_REGEX accepts valid keys', () => {
  assert.ok(ISSUE_KEY_REGEX.test('PROJ-1'));
  assert.ok(ISSUE_KEY_REGEX.test('ABC-999'));
});

test('ISSUE_KEY_REGEX rejects invalid keys', () => {
  assert.ok(!ISSUE_KEY_REGEX.test('proj-1'));
  assert.ok(!ISSUE_KEY_REGEX.test('PROJ'));
  assert.ok(!ISSUE_KEY_REGEX.test('PROJ-'));
  assert.ok(!ISSUE_KEY_REGEX.test('123-PROJ'));
});

test('validateIssueKey rejects missing issue key', () => {
  expectError(
    () => validateIssueKey(''),
    'Issue key không hợp lệ: phải là chuỗi không rỗng.'
  );
});

test('validateIssueKey rejects malformed issue key', () => {
  expectError(
    () => validateIssueKey('invalid-key'),
    'Issue key không hợp lệ: phải đúng format [A-Z]+-\\d+ (ví dụ: PROJ-123).'
  );
});

test('validateIssueKey accepts valid issue key', () => {
  assert.doesNotThrow(() => validateIssueKey('DEMO-42'));
});

test('validateCursor accepts undefined', () => {
  assert.doesNotThrow(() => validateCursor(undefined));
});

test('validateCursor accepts string', () => {
  assert.doesNotThrow(() => validateCursor('next-page-token'));
});

test('validateCursor rejects number', () => {
  expectError(
    () => validateCursor(123),
    'cursor không hợp lệ: phải là string hoặc undefined.'
  );
});

test('validateCursor rejects object', () => {
  expectError(
    () => validateCursor({ page: 1 }),
    'cursor không hợp lệ: phải là string hoặc undefined.'
  );
});

test('assertBookmarkOwnership rejects another user bookmark', () => {
  expectError(
    () => assertBookmarkOwnership({ accountId: 'user-b' }, 'user-a'),
    'Không được xóa bookmark của người dùng khác.'
  );
});

test('assertBookmarkOwnership allows own bookmark', () => {
  assert.doesNotThrow(() =>
    assertBookmarkOwnership({ accountId: 'user-a' }, 'user-a')
  );
});

test('assertOwnBookmarkKey rejects foreign KVS key', () => {
  expectError(
    () =>
      assertOwnBookmarkKey(
        'bookmark:other-user:DEMO-1',
        'current-user',
        buildBookmarkPrefix
      ),
    'Không được xóa bookmark của người dùng khác.'
  );
});

test('assertOwnBookmarkKey allows own KVS key', () => {
  assert.doesNotThrow(() =>
    assertOwnBookmarkKey(
      'bookmark:current-user:DEMO-1',
      'current-user',
      buildBookmarkPrefix
    )
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
