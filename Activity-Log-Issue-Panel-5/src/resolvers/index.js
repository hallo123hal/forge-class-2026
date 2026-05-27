import Resolver from '@forge/resolver';
import { kvs, WhereConditions } from '@forge/kvs';

const resolver = new Resolver();

const PAGE_SIZE = 5;

const getAccountId = (req) =>
  req.context?.accountId ?? req.context?.principal?.accountId;

const getIssueKey = (req) =>
  req.payload?.issueKey ?? req.context?.extension?.issue?.key;

/** Prefix KVS cho mọi log xem issue: view-log:{issueKey}: */
const buildLogPrefix = (issueKey) => `view-log:${issueKey}:`;

/** Key đầy đủ: view-log:{issueKey}:{timestamp}:{accountId} */
const buildLogKey = (issueKey, timestamp, accountId) =>
  `${buildLogPrefix(issueKey)}${timestamp}:${accountId}`;

/**
 * Tách timestamp và accountId từ key (accountId Atlassian có thể chứa ':').
 * Timestamp luôn là chuỗi ISO-8601 kết thúc bằng 'Z'.
 */
const parseViewLogKey = (key, issueKey) => {
  const prefix = buildLogPrefix(issueKey);
  if (!key.startsWith(prefix)) {
    return null;
  }
  const rest = key.slice(prefix.length);
  const match = rest.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z):(.+)$/);
  if (!match) {
    return null;
  }
  return { timestamp: match[1], accountId: match[2] };
};

const mapResultToLog = (result, issueKey) => {
  const parsed = parseViewLogKey(result.key, issueKey);
  const value = result.value ?? {};
  return {
    key: result.key,
    issueKey,
    timestamp: parsed?.timestamp ?? value.viewedAt ?? null,
    accountId: parsed?.accountId ?? value.accountId ?? null,
    viewedAt: value.viewedAt ?? parsed?.timestamp ?? null,
  };
};

/** Sắp xếp log mới nhất trước (timestamp giảm dần). */
const sortLogsNewestFirst = (logs) =>
  [...logs].sort((a, b) => {
    const ta = Date.parse(a.timestamp ?? a.viewedAt ?? 0);
    const tb = Date.parse(b.timestamp ?? b.viewedAt ?? 0);
    return tb - ta;
  });

/**
 * Query KVS theo prefix, có thể kèm cursor.
 * Trả về trang kết quả thô từ KVS (thứ tự key tăng dần).
 */
const queryViewLogPage = async (issueKey, cursor) => {
  const prefix = buildLogPrefix(issueKey);
  let query = kvs
    .query()
    .where('key', WhereConditions.beginsWith(prefix))
    .limit(PAGE_SIZE);

  if (cursor) {
    query = query.cursor(cursor);
  }

  return query.getMany();
};

/**
 * Lấy trang cuối (5 log mới nhất) bằng cách duyệt cursor tới hết.
 * nextCursor trả về là cursor của trang trước đó (để "Xem thêm" lấy log cũ hơn).
 */
const fetchNewestPage = async (issueKey) => {
  let cursor;
  let previousCursor;
  let page = { results: [], nextCursor: undefined };

  do {
    previousCursor = cursor;
    page = await queryViewLogPage(issueKey, cursor);
    cursor = page.nextCursor;
  } while (cursor);

  return {
    results: page.results,
    nextCursor: previousCursor,
  };
};

resolver.define('recordPanelOpen', async (req) => {
  const issueKey = getIssueKey(req);
  const accountId = getAccountId(req);

  if (!issueKey) {
    throw new Error('Không xác định được issue key.');
  }
  if (!accountId) {
    throw new Error('Không xác định được người dùng (accountId).');
  }

  const viewedAt = new Date().toISOString();
  const key = buildLogKey(issueKey, viewedAt, accountId);

  await kvs.set(key, {
    issueKey,
    accountId,
    viewedAt,
  });

  const { results, nextCursor } = await fetchNewestPage(issueKey);
  const logs = sortLogsNewestFirst(
    results.map((row) => mapResultToLog(row, issueKey))
  );

  return {
    recorded: true,
    logs,
    nextCursor: nextCursor ?? null,
    hasMore: Boolean(nextCursor),
  };
});

resolver.define('getViewLogs', async (req) => {
  const issueKey = getIssueKey(req);
  if (!issueKey) {
    throw new Error('Không xác định được issue key.');
  }

  const cursor = req.payload?.cursor ?? undefined;

  if (!cursor) {
    const { results, nextCursor } = await fetchNewestPage(issueKey);
    const logs = sortLogsNewestFirst(
      results.map((row) => mapResultToLog(row, issueKey))
    );
    return {
      logs,
      nextCursor: nextCursor ?? null,
      hasMore: Boolean(nextCursor),
    };
  }

  const page = await queryViewLogPage(issueKey, cursor);
  const logs = sortLogsNewestFirst(
    page.results.map((row) => mapResultToLog(row, issueKey))
  );

  return {
    logs,
    nextCursor: page.nextCursor ?? null,
    hasMore: Boolean(page.nextCursor),
  };
});

resolver.define('clearViewHistory', async (req) => {
  const issueKey = getIssueKey(req);
  if (!issueKey) {
    throw new Error('Không xác định được issue key.');
  }

  const prefix = buildLogPrefix(issueKey);
  let cursor;
  let deletedCount = 0;

  do {
    let query = kvs
      .query()
      .where('key', WhereConditions.beginsWith(prefix))
      .limit(20);

    if (cursor) {
      query = query.cursor(cursor);
    }

    const page = await query.getMany();
    for (const row of page.results) {
      await kvs.delete(row.key);
      deletedCount += 1;
    }
    cursor = page.nextCursor;
  } while (cursor);

  return { success: true, deletedCount };
});

export const handler = resolver.getDefinitions();
