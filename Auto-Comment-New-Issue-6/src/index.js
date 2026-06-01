import api, { route } from '@forge/api';

/** Issue property key — dùng để đảm bảo idempotency khi trigger fire nhiều lần. */
const WELCOME_PROPERTY_KEY = 'auto-comment-new-issue-6-welcome';

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
 * Kiểm tra issue đã được gửi comment chào mừng chưa (idempotency).
 */
async function hasWelcomeBeenSent(issueId) {
  const response = await api.asApp().requestJira(
    route`/rest/api/3/issue/${issueId}/properties/${WELCOME_PROPERTY_KEY}`,
    { headers: { Accept: 'application/json' } }
  );

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    const body = await response.text();
    console.log(
      `Không đọc được issue property (${response.status}): ${body}`
    );
    return false;
  }

  return true;
}

/**
 * Ghi nhận issue đã nhận comment chào mừng.
 */
async function markWelcomeSent(issueId) {
  const response = await api.asApp().requestJira(
    route`/rest/api/3/issue/${issueId}/properties/${WELCOME_PROPERTY_KEY}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        welcomed: true,
        sentAt: new Date().toISOString(),
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Không lưu được issue property (${response.status}): ${body}`
    );
  }
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
 * Filter server-side (manifest) đã lọc project + ignoreSelf;
 * handler xử lý idempotency và gọi Jira API.
 */
export async function onIssueCreated(event) {
  const issueKey = event?.issue?.key;
  const issueId = event?.issue?.id;

  console.log(`Issue created event: ${issueKey ?? 'unknown'}`);

  if (!issueKey || !issueId) {
    console.log('Thiếu issue key/id — bỏ qua.');
    return;
  }

  if (await hasWelcomeBeenSent(issueId)) {
    console.log(
      `Comment chào mừng đã tồn tại cho ${issueKey} — bỏ qua (idempotent).`
    );
    return;
  }

  const reporter =
    event?.issue?.fields?.reporter?.displayName ??
    event?.issue?.fields?.reporter?.accountId ??
    'Unknown';

  const createdAt =
    event?.issue?.fields?.created ?? new Date().toISOString();
  const dateTimeText = formatDateTime(createdAt);

  await addWelcomeComment(issueKey, reporter, dateTimeText);
  await markWelcomeSent(issueId);

  console.log(`Đã thêm comment chào mừng cho ${issueKey}.`);
}
