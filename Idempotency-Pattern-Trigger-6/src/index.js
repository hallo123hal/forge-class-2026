import api, { route } from '@forge/api';
import { kvs } from '@forge/kvs';

/** TTL dedup key — 24 giờ (at-least-once trong cửa sổ này chỉ comment một lần). */
const DEDUPE_TTL = { unit: 'HOURS', value: 24 };

/**
 * Key KVS đánh dấu issue đã được xử lý comment chào mừng.
 * Pattern: dedupe:comment:{issueKey}
 */
const buildDedupeKey = (issueKey) => `dedupe:comment:${issueKey}`;

/**
 * Định dạng ngày giờ hiển thị trong comment (múi giờ Việt Nam).
 */
function formatDateTime(isoString) {
  const date = isoString ? new Date(isoString) : new Date();
  return date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

/**
 * Tạo nội dung ADF cho comment chào mừng.
 */
function buildWelcomeCommentAdf(reporterName, dateTimeText) {
  const text = `Chào mừng issue mới! Thời gian: ${dateTimeText}. Reporter: ${reporterName}.`;

  return {
    type: 'doc',
    version: 1,
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }],
      },
    ],
  };
}

/**
 * Kiểm tra dedup key đã tồn tại — delivery trùng sẽ return sớm.
 */
async function isCommentDeduped(issueKey) {
  const existing = await kvs.get(buildDedupeKey(issueKey));
  return existing !== undefined;
}

/**
 * Ghi nhận đang xử lý (claim) trước khi gọi Jira API.
 */
async function claimCommentDedupe(issueKey) {
  await kvs.set(
    buildDedupeKey(issueKey),
    { claimedAt: new Date().toISOString() },
    { ttl: DEDUPE_TTL }
  );
}

/**
 * Rollback claim khi addComment thất bại — cho phép retry at-least-once.
 */
async function releaseCommentDedupe(issueKey) {
  await kvs.delete(buildDedupeKey(issueKey));
}

/**
 * Thêm comment ADF vào issue qua Jira REST API.
 */
async function addWelcomeComment(issueKey, reporterName, dateTimeText) {
  const response = await api.asApp().requestJira(
    route`/rest/api/3/issue/${issueKey}/comment`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body: buildWelcomeCommentAdf(reporterName, dateTimeText),
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Không thêm được comment (${response.status}): ${body}`);
  }

  return response.json();
}

/**
 * Handler cho trigger avi:jira:created:issue.
 * Deduplication bằng Forge KVS để xử lý at-least-once delivery an toàn.
 */
export async function onIssueCreated(event) {
  const issueKey = event?.issue?.key;
  const issueId = event?.issue?.id;

  console.log(`Issue created event: ${issueKey ?? 'unknown'}`);

  if (!issueKey || !issueId) {
    console.log('Thiếu issue key/id — bỏ qua.');
    return;
  }

  if (await isCommentDeduped(issueKey)) {
    console.log(
      `Dedup key đã tồn tại cho ${issueKey} — bỏ qua (idempotent).`
    );
    return;
  }

  await claimCommentDedupe(issueKey);

  const reporter =
    event?.issue?.fields?.reporter?.displayName ??
    event?.issue?.fields?.reporter?.accountId ??
    'Unknown';

  const createdAt =
    event?.issue?.fields?.created ?? new Date().toISOString();
  const dateTimeText = formatDateTime(createdAt);

  try {
    await addWelcomeComment(issueKey, reporter, dateTimeText);
    console.log(`Đã thêm comment chào mừng cho ${issueKey}.`);
  } catch (error) {
    console.log(
      `addComment thất bại — xóa dedup key để cho phép retry: ${error.message}`
    );
    await releaseCommentDedupe(issueKey);
    throw error;
  }
}
