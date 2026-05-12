import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

/**
 * POST JSON to Jira REST; throws with body on non-OK.
 * @param {string} path
 * @param {unknown} body
 */
async function postJiraJson(path, body) {
  const res = await api.asUser().requestJira(path, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Jira API failed: ${res.status} ${errText}`);
  }
  return res.json();
}

/**
 * Maps Jira status category to Lozenge appearance (UI Kit).
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

/**
 * Maps priority name to Badge appearance for quick visual scanning.
 * @param {string | undefined} name
 * @returns {string}
 */
function priorityToBadgeAppearance(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('highest') || n.includes('critical')) return 'removed';
  if (n.includes('high')) return 'important';
  if (n.includes('lowest') || n.includes('trivial')) return 'success';
  if (n.includes('low')) return 'primary';
  return 'default';
}

resolver.define('getProjectIssues', async (req) => {
  const projectKey =
    req.payload?.projectKey ?? req.context?.extension?.project?.key;

  if (!projectKey) {
    throw new Error('Không lấy được project key từ ngữ cảnh trang project.');
  }

  const jql = `project = ${projectKey} ORDER BY key ASC`;
  const body = await postJiraJson(route`/rest/api/3/search/jql`, {
    jql,
    maxResults: 100,
    fields: ['key', 'summary', 'status', 'priority', 'assignee', 'issuetype'],
  });

  const issues = Array.isArray(body.issues) ? body.issues : [];

  return issues.map((issue) => {
    const fields = issue.fields ?? {};
    const status = fields.status;
    const statusCategoryKey = status?.statusCategory?.key;
    const issuetype = fields.issuetype;
    const priorityName = fields.priority?.name ?? '';

    return {
      key: issue.key,
      summary: fields.summary ?? '',
      statusName: status?.name ?? '',
      statusCategory: statusCategoryKey ?? '',
      statusLozengeAppearance:
        statusCategoryToLozengeAppearance(statusCategoryKey),
      priorityName,
      priorityBadgeAppearance: priorityToBadgeAppearance(priorityName),
      type: issuetype?.name ?? '',
      assignee: fields.assignee?.displayName ?? 'Unassigned',
    };
  });
});

export const handler = resolver.getDefinitions();
