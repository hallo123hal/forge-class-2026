import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

/**
 * Debug log theo định dạng bài tập: level, message, issueKey.
 * @param {string} level
 * @param {string} message
 * @param {string | undefined} issueKey
 */
function debugLog(level, message, issueKey) {
  console.log(JSON.stringify({ level, message, issueKey }));
}

/**
 * Ánh xạ Jira status category sang appearance của Lozenge (UI Kit).
 * @param {string | undefined} categoryKey
 * @returns {string}
 */
function statusCategoryToLozengeAppearance(categoryKey) {
  switch (categoryKey) {
    case 'done':
      return 'success';
    case 'new':
      return 'new';
    case 'indeterminate':
      return 'inprogress';
    default:
      return 'default';
  }
}

resolver.define('getIssueDetail', async (req) => {
  const issueKey =
    req.payload?.issueKey ?? req.context?.extension?.issue?.key;

  debugLog('info', 'resolver invoked', issueKey);

  if (!issueKey) {
    debugLog('error', 'missing issue key', issueKey);
    throw new Error('Không có issue key để tải dữ liệu.');
  }

  const jiraPath = route`/rest/api/3/issue/${issueKey}?fields=summary,status,priority,assignee,comment,created`;

  debugLog('info', 'calling Jira GET issue', issueKey);

  const res = await api.asUser().requestJira(jiraPath, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const errText = await res.text();
    debugLog('error', `Jira API failed: ${res.status} ${errText}`, issueKey);
    throw new Error(
      `Jira API trả về lỗi ${res.status}. Kiểm tra quyền truy cập issue.`
    );
  }

  const data = await res.json();
  const fields = data.fields ?? {};

  const summary = fields.summary ?? '';
  const statusName = fields.status?.name ?? '';
  const statusCategoryKey = fields.status?.statusCategory?.key;
  const priorityName = fields.priority?.name ?? '';
  const assignee = fields.assignee?.displayName ?? 'Unassigned';
  const commentCount =
    typeof fields.comment?.total === 'number' ? fields.comment.total : 0;
  const created = fields.created ?? '';

  const payload = {
    key: data.key,
    summary,
    statusName,
    statusLozengeAppearance: statusCategoryToLozengeAppearance(
      statusCategoryKey
    ),
    priorityName,
    assignee,
    commentCount,
    created,
  };

  debugLog('info', 'issue detail mapped successfully', issueKey);

  return payload;
});

export const handler = resolver.getDefinitions();
