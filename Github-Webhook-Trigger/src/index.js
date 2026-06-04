import api, { route } from '@forge/api';

/** Regex Jira issue key: PROJECT-123 */
const ISSUE_KEY_REGEX = /[A-Z]+-\d+/g;

const MENTION_COMMENT_TEXT = 'Được mention trong request';

/**
 * Trả về HTTP response cho web trigger dynamic.
 */
function jsonResponse(payload, statusCode = 200) {
  return {
    statusCode,
    statusText: statusCode === 200 ? 'OK' : statusCode === 405 ? 'Method Not Allowed' : 'Error',
    headers: {
      'Content-Type': ['application/json'],
    },
    body: JSON.stringify(payload, null, 2),
  };
}

/**
 * ADF đơn giản cho comment Jira.
 */
function buildCommentAdf(text) {
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
 * Trích xuất issue keys duy nhất từ chuỗi message.
 */
function extractIssueKeys(message) {
  if (typeof message !== 'string' || !message) {
    return [];
  }

  const matches = message.match(ISSUE_KEY_REGEX);
  if (!matches) {
    return [];
  }

  return [...new Set(matches)];
}

/**
 * Thêm comment vào issue qua Jira REST API (asApp).
 */
async function addMentionComment(issueKey) {
  const response = await api.asApp().requestJira(
    route`/rest/api/3/issue/${issueKey}/comment`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body: buildCommentAdf(MENTION_COMMENT_TEXT),
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Không thêm được comment cho ${issueKey} (${response.status}): ${body}`
    );
  }
}

/**
 * Web trigger handler: nhận POST từ bên ngoài, parse JSON, tìm issue keys trong message.
 * Query ?event=push — đọc loại event (log / mở rộng sau).
 */
export async function handleWebhook(req) {
  const method = req?.method;

  if (method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  }

  const eventType = req?.queryParameters?.event?.[0];
  console.log(`Webhook received, event=${eventType ?? '(none)'}`);

  let body;
  try {
    body = req?.body ? JSON.parse(req.body) : {};
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const issueKeys = extractIssueKeys(body?.message);
  console.log(`Issue keys found: ${issueKeys.join(', ') || '(none)'}`);

  for (const issueKey of issueKeys) {
    await addMentionComment(issueKey);
    console.log(`Đã comment cho ${issueKey}`);
  }

  return jsonResponse({
    processed: true,
    issuesFound: issueKeys,
  });
}
