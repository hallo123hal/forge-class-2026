/** Jira issue key format: PROJECT-123 (uppercase letters, hyphen, digits). */
export const ISSUE_KEY_REGEX = /^[A-Z]+-\d+$/;

/**
 * Validates that issueKey is a non-empty string matching [A-Z]+-\d+.
 * @throws {Error} when issueKey is missing or malformed
 */
export const validateIssueKey = (issueKey) => {
  if (!issueKey || typeof issueKey !== 'string') {
    throw new Error('Issue key không hợp lệ: phải là chuỗi không rỗng.');
  }
  if (!ISSUE_KEY_REGEX.test(issueKey)) {
    throw new Error(
      'Issue key không hợp lệ: phải đúng format [A-Z]+-\\d+ (ví dụ: PROJ-123).'
    );
  }
};

/**
 * Pagination cursor for getMyBookmarks must be absent or a string.
 * @throws {Error} when cursor has an unsupported type
 */
export const validateCursor = (cursor) => {
  if (cursor !== undefined && typeof cursor !== 'string') {
    throw new Error('cursor không hợp lệ: phải là string hoặc undefined.');
  }
};

/**
 * Ensures the caller cannot act on another user's bookmarks via payload.accountId.
 * @returns {string} authenticated accountId from request context
 * @throws {Error} when accountId is missing or payload targets another user
 */
export const assertOwnAccount = (req, getAccountId) => {
  const accountId = getAccountId(req);
  if (!accountId) {
    throw new Error('Không xác định được accountId.');
  }

  const payloadAccountId = req.payload?.accountId;
  if (payloadAccountId && payloadAccountId !== accountId) {
    throw new Error(
      'Không được thao tác bookmark của người dùng khác.'
    );
  }

  return accountId;
};

/**
 * Verifies a stored bookmark record belongs to the authenticated user.
 * @throws {Error} when bookmark.accountId does not match the caller
 */
export const assertBookmarkOwnership = (bookmark, accountId) => {
  if (bookmark?.accountId && bookmark.accountId !== accountId) {
    throw new Error('Không được xóa bookmark của người dùng khác.');
  }
};

/**
 * Rejects attempts to delete via a KVS key that belongs to another user.
 * @throws {Error} when key is outside the caller's bookmark prefix
 */
export const assertOwnBookmarkKey = (key, accountId, buildBookmarkPrefix) => {
  if (!key || typeof key !== 'string') {
    return;
  }

  const expectedPrefix = buildBookmarkPrefix(accountId);
  if (!key.startsWith(expectedPrefix)) {
    throw new Error('Không được xóa bookmark của người dùng khác.');
  }
};
