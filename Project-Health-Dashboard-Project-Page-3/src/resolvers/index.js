import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

const STATUS_SAMPLE_MAX = 250;
const STALE_MAX = 50;

/**
 * @param {string} key
 */
function assertSafeProjectKey(key) {
  if (!key || typeof key !== 'string' || !/^[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error('Project key không hợp lệ.');
  }
}

/**
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
 * @param {string} jql
 * @param {number} maxResults
 * @param {string[]} fields
 */
async function searchJql(jql, maxResults, fields) {
  return postJiraJson(route`/rest/api/3/search/jql`, {
    jql,
    maxResults,
    fields,
  });
}

/**
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

/**
 * @param {string | undefined} priorityName
 * @returns {'Highest' | 'High' | 'Medium' | 'Low'}
 */
function bucketBugPriority(priorityName) {
  const n = (priorityName || '').toLowerCase();
  if (n.includes('highest') || n.includes('critical')) return 'Highest';
  if (n.includes('high')) return 'High';
  if (n.includes('lowest') || n.includes('trivial') || n.includes('low')) return 'Low';
  if (n.includes('medium') || n.includes('normal')) return 'Medium';
  return 'Medium';
}

/**
 * Donut color grouping from Jira status category key.
 * @param {string | undefined} categoryKey
 */
function donutColorKey(categoryKey) {
  switch (categoryKey) {
    case 'done':
      return 'done';
    case 'new':
      return 'new';
    case 'indeterminate':
      return 'inprogress';
    default:
      return 'other';
  }
}

/**
 * @param {unknown} issue
 */
function mapIssueRow(issue) {
  const rec = /** @type {{ key?: string; fields?: Record<string, unknown> }} */ (issue ?? {});
  const fields = /** @type {Record<string, any>} */ (rec.fields ?? {});
  const status = fields.status;
  const statusCategoryKey = status?.statusCategory?.key;
  const issuetype = fields.issuetype;
  const priorityName = fields.priority?.name ?? '';

  return {
    key: rec.key ?? '',
    summary: fields.summary ?? '',
    statusName: status?.name ?? '',
    statusCategory: statusCategoryKey ?? '',
    statusLozengeAppearance: statusCategoryToLozengeAppearance(statusCategoryKey),
    priorityName,
    priorityBadgeAppearance: priorityToBadgeAppearance(priorityName),
    type: issuetype?.name ?? '',
    assignee: fields.assignee?.displayName ?? 'Unassigned',
    updated: fields.updated ?? null,
  };
}

/**
 * `POST /rest/api/3/search/jql` does not return a top-level `total` (unlike legacy search).
 * Use approximate-count for dashboard aggregates (returns `{ count }`).
 * @param {string} jql
 */
async function countIssues(jql) {
  const body = await postJiraJson(route`/rest/api/3/search/approximate-count`, { jql });
  return typeof body.count === 'number' ? body.count : 0;
}

/**
 * Collapse small status slices for readability (donut).
 * @param {Array<[string, string, number]>} rows — [colorKey, label, value]
 * @param {number} maxSlices
 */
function capDonutSlices(rows, maxSlices) {
  const positive = rows.filter((r) => r[2] > 0);
  if (positive.length <= maxSlices) return positive;
  const sorted = [...positive].sort((a, b) => b[2] - a[2]);
  const head = sorted.slice(0, maxSlices - 1);
  const tail = sorted.slice(maxSlices - 1);
  const otherSum = tail.reduce((s, r) => s + r[2], 0);
  return [...head, ['other', 'Other', otherSum]];
}

resolver.define('getProjectHealthDashboard', async (req) => {
  const projectKey =
    req.payload?.projectKey ?? req.context?.extension?.project?.key;

  if (!projectKey) {
    throw new Error('Không lấy được project key từ ngữ cảnh trang project.');
  }
  assertSafeProjectKey(projectKey);

  const base = `project = ${projectKey}`;

  const [
    total,
    inProgress,
    done,
    bugs,
    latestBody,
    staleBody,
    statusBody,
    bugBody,
  ] = await Promise.all([
    countIssues(base),
    countIssues(`${base} AND statusCategory = "In Progress"`),
    countIssues(`${base} AND statusCategory = Done`),
    countIssues(`${base} AND type = Bug`),
    searchJql(`${base} ORDER BY created DESC`, 10, [
      'key',
      'summary',
      'status',
      'priority',
      'assignee',
      'issuetype',
      'updated',
    ]),
    searchJql(`${base} AND updated < -7d ORDER BY updated ASC`, STALE_MAX, [
      'key',
      'summary',
      'status',
      'priority',
      'assignee',
      'issuetype',
      'updated',
    ]),
    searchJql(`${base} ORDER BY key ASC`, STATUS_SAMPLE_MAX, ['status']),
    searchJql(`${base} AND type = Bug ORDER BY key ASC`, 500, ['priority']),
  ]);

  const latestIssues = (Array.isArray(latestBody.issues) ? latestBody.issues : []).map(
    mapIssueRow
  );
  const staleIssues = (Array.isArray(staleBody.issues) ? staleBody.issues : []).map(
    mapIssueRow
  );

  /** @type {Map<string, { count: number, colorKey: string }>} */
  const byStatus = new Map();
  for (const issue of Array.isArray(statusBody.issues) ? statusBody.issues : []) {
    const fields = /** @type {Record<string, any>} */ (issue?.fields ?? {});
    const status = fields.status;
    const name = status?.name || 'Unknown';
    const colorKey = donutColorKey(status?.statusCategory?.key);
    const cur = byStatus.get(name) ?? { count: 0, colorKey };
    cur.count += 1;
    cur.colorKey = colorKey;
    byStatus.set(name, cur);
  }

  const rawDonut = Array.from(byStatus.entries()).map(([label, { count, colorKey }]) => [
    colorKey,
    label,
    count,
  ]);
  const donutData = capDonutSlices(rawDonut, 7);

  const bugBuckets = { Highest: 0, High: 0, Medium: 0, Low: 0 };
  for (const issue of Array.isArray(bugBody.issues) ? bugBody.issues : []) {
    const fields = /** @type {Record<string, any>} */ (issue?.fields ?? {});
    const bucket = bucketBugPriority(fields.priority?.name);
    bugBuckets[bucket] += 1;
  }

  const bugsByPriorityBar = [
    ['Highest', bugBuckets.Highest, 'Highest'],
    ['High', bugBuckets.High, 'High'],
    ['Medium', bugBuckets.Medium, 'Medium'],
    ['Low', bugBuckets.Low, 'Low'],
  ];

  return {
    counts: { total, inProgress, done, bugs },
    latestIssues,
    staleIssues,
    donutData,
    donutSampleSize: Array.isArray(statusBody.issues) ? statusBody.issues.length : 0,
    donutTotalInProject: total,
    bugsByPriorityBar,
  };
});

export const handler = resolver.getDefinitions();
