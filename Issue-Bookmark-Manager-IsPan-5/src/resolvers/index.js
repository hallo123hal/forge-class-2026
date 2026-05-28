import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';
import { kvs, WhereConditions } from '@forge/kvs';

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

resolver.define('getIssueBookmarkState', async (req) => {
  const functionName = 'getIssueBookmarkState';
  const startedAt = Date.now();
  const issueKey = getIssueKey(req);
  const accountId = getAccountId(req);

  logEvent('INFO', 'resolver_called', { functionName, issueKey, accountId });

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
  const accountId = getAccountId(req);

  logEvent('INFO', 'resolver_called', { functionName, issueKey, accountId });

  try {
    if (!issueKey) {
      throw new Error('Không xác định được issue key.');
    }
    if (!accountId) {
      throw new Error('Không xác định được accountId.');
    }

    const key = buildBookmarkKey(accountId, issueKey);
    const existing = await kvs.get(key);

    if (existing) {
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
      accountId,
      durationMs: Date.now() - startedAt,
      errorMessage: error.message,
    });
    throw error;
  }
});

resolver.define('listMyBookmarks', async (req) => {
  const functionName = 'listMyBookmarks';
  const startedAt = Date.now();
  const accountId = getAccountId(req);

  logEvent('INFO', 'resolver_called', { functionName, accountId });

  try {
    if (!accountId) {
      throw new Error('Không xác định được accountId.');
    }

    const prefix = buildBookmarkPrefix(accountId);
    const bookmarks = [];
    let cursor;

    do {
      let query = kvs
        .query()
        .where('key', WhereConditions.beginsWith(prefix))
        .limit(50);

      if (cursor) {
        query = query.cursor(cursor);
      }

      const page = await query.getMany();
      for (const row of page.results) {
        bookmarks.push({
          key: row.key,
          issueKey: row.value?.issueKey ?? row.key.replace(prefix, ''),
          summary: row.value?.summary ?? '(Không có summary)',
          status: row.value?.status ?? '(Không có status)',
          savedAt: row.value?.savedAt ?? null,
        });
      }
      cursor = page.nextCursor;
    } while (cursor);

    bookmarks.sort((a, b) => Date.parse(b.savedAt ?? 0) - Date.parse(a.savedAt ?? 0));

    const result = { bookmarks };
    logEvent('INFO', 'resolver_succeeded', {
      functionName,
      accountId,
      count: bookmarks.length,
      durationMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    logEvent('ERROR', 'resolver_failed', {
      functionName,
      accountId,
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
  const accountId = getAccountId(req);

  logEvent('INFO', 'resolver_called', { functionName, issueKey, accountId });

  try {
    if (!issueKey || typeof issueKey !== 'string') {
      throw new Error('Issue key không hợp lệ.');
    }
    if (!accountId) {
      throw new Error('Không xác định được accountId.');
    }

    const key = buildBookmarkKey(accountId, issueKey);
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
      accountId,
      durationMs: Date.now() - startedAt,
      errorMessage: error.message,
    });
    throw error;
  }
});

export const handler = resolver.getDefinitions();
