import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';
import { kvs, WhereConditions } from '@forge/kvs';
import {
  assertBookmarkOwnership,
  assertOwnAccount,
  assertOwnBookmarkKey,
  validateCursor,
  validateIssueKey,
} from './validation';
import { logRequestReceived } from './requestLog';

const resolver = new Resolver();

const BOOKMARK_PREFIX = 'bookmark';

const getIssueKey = (req) =>
  req.payload?.issueKey ?? req.context?.extension?.issue?.key;

const getAccountId = (req) =>
  req.context?.accountId ?? req.context?.principal?.accountId;

const buildBookmarkKey = (accountId, issueKey) =>
  `${BOOKMARK_PREFIX}:${accountId}:${issueKey}`;

const buildBookmarkPrefix = (accountId) => `${BOOKMARK_PREFIX}:${accountId}:`;

const logEvent = (level, event, payload = {}) => {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level,
      event,
      ...payload,
    })
  );
};

const getIssueSnapshot = async (issueKey) => {
  const response = await api.asUser().requestJira(
    route`/rest/api/3/issue/${issueKey}?fields=summary,status`,
    {
      headers: { Accept: 'application/json' },
    }
  );

  if (!response.ok) {
    throw new Error(`Không đọc được issue từ Jira API (status ${response.status}).`);
  }

  const issue = await response.json();
  return {
    issueKey: issue.key ?? issueKey,
    summary: issue.fields?.summary ?? '(Không có summary)',
    status: issue.fields?.status?.name ?? '(Không có status)',
  };
};

const mapBookmarkRow = (row, prefix) => ({
  key: row.key,
  issueKey: row.value?.issueKey ?? row.key.replace(prefix, ''),
  summary: row.value?.summary ?? '(Không có summary)',
  status: row.value?.status ?? '(Không có status)',
  savedAt: row.value?.savedAt ?? null,
});

resolver.define('getIssueBookmarkState', async (req) => {
  const functionName = 'getIssueBookmarkState';
  const startedAt = Date.now();
  const issueKey = getIssueKey(req);
  const accountId = getAccountId(req);

  logRequestReceived(req, functionName);

  try {
    if (!issueKey) {
      throw new Error('Không xác định được issue key.');
    }
    if (!accountId) {
      throw new Error('Không xác định được accountId.');
    }

    const key = buildBookmarkKey(accountId, issueKey);
    const bookmark = await kvs.get(key);
    const isBookmarked = Boolean(bookmark);

    const result = { isBookmarked, bookmark: bookmark ?? null };
    logEvent('INFO', 'resolver_succeeded', {
      functionName,
      issueKey,
      accountId,
      durationMs: Date.now() - startedAt,
      isBookmarked,
    });
    return result;
  } catch (error) {
    logEvent('ERROR', 'resolver_failed', {
      functionName,
      issueKey,
      accountId,
      durationMs: Date.now() - startedAt,
      errorMessage: error.message,
    });
    throw error;
  }
});

resolver.define('toggleBookmark', async (req) => {
  const functionName = 'toggleBookmark';
  const startedAt = Date.now();
  const issueKey = getIssueKey(req);

  logRequestReceived(req, functionName);

  try {
    const accountId = assertOwnAccount(req, getAccountId);
    validateIssueKey(issueKey);

    const key = buildBookmarkKey(accountId, issueKey);
    const existing = await kvs.get(key);

    if (existing) {
      assertBookmarkOwnership(existing, accountId);
      await kvs.delete(key);
      const result = {
        action: 'removed',
        message: `Đã xóa bookmark ${issueKey}.`,
      };
      logEvent('INFO', 'resolver_succeeded', {
        functionName,
        issueKey,
        accountId,
        action: result.action,
        durationMs: Date.now() - startedAt,
      });
      return result;
    }

    const snapshot = await getIssueSnapshot(issueKey);
    const savedAt = new Date().toISOString();
    const value = {
      ...snapshot,
      accountId,
      savedAt,
    };

    await kvs.set(key, value);

    const result = {
      action: 'added',
      message: `Đã thêm bookmark ${issueKey}.`,
      bookmark: value,
    };
    logEvent('INFO', 'resolver_succeeded', {
      functionName,
      issueKey,
      accountId,
      action: result.action,
      durationMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    logEvent('ERROR', 'resolver_failed', {
      functionName,
      issueKey,
      accountId: getAccountId(req),
      durationMs: Date.now() - startedAt,
      errorMessage: error.message,
    });
    throw error;
  }
});

resolver.define('getMyBookmarks', async (req) => {
  const functionName = 'getMyBookmarks';
  const startedAt = Date.now();
  const cursor = req.payload?.cursor;

  logRequestReceived(req, functionName);

  try {
    const accountId = getAccountId(req);
    if (!accountId) {
      throw new Error('Không xác định được accountId.');
    }

    validateCursor(cursor);

    const prefix = buildBookmarkPrefix(accountId);
    let query = kvs
      .query()
      .where('key', WhereConditions.beginsWith(prefix))
      .limit(50);

    if (cursor) {
      query = query.cursor(cursor);
    }

    const page = await query.getMany();
    const bookmarks = page.results.map((row) => mapBookmarkRow(row, prefix));

    const result = {
      bookmarks,
      nextCursor: page.nextCursor ?? null,
    };
    logEvent('INFO', 'resolver_succeeded', {
      functionName,
      accountId,
      count: bookmarks.length,
      hasNextCursor: Boolean(result.nextCursor),
      durationMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    logEvent('ERROR', 'resolver_failed', {
      functionName,
      accountId: getAccountId(req),
      durationMs: Date.now() - startedAt,
      errorMessage: error.message,
    });
    throw error;
  }
});

resolver.define('removeBookmark', async (req) => {
  const functionName = 'removeBookmark';
  const startedAt = Date.now();
  const issueKey = req.payload?.issueKey;

  logRequestReceived(req, functionName);

  try {
    const accountId = assertOwnAccount(req, getAccountId);
    validateIssueKey(issueKey);
    assertOwnBookmarkKey(req.payload?.key, accountId, buildBookmarkPrefix);

    const key = buildBookmarkKey(accountId, issueKey);
    const existing = await kvs.get(key);
    assertBookmarkOwnership(existing, accountId);

    await kvs.delete(key);

    const result = {
      success: true,
      message: `Đã xóa bookmark ${issueKey}.`,
    };
    logEvent('INFO', 'resolver_succeeded', {
      functionName,
      issueKey,
      accountId,
      durationMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    logEvent('ERROR', 'resolver_failed', {
      functionName,
      issueKey,
      accountId: getAccountId(req),
      durationMs: Date.now() - startedAt,
      errorMessage: error.message,
    });
    throw error;
  }
});

export const handler = resolver.getDefinitions();
