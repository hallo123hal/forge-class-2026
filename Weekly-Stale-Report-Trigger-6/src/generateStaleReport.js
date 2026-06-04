import api, { route, storage } from '@forge/api';

export const LATEST_REPORT_KEY = 'stale-report:latest';
const STALE_JQL = 'status = "In Progress" AND updated <= -5d';

async function postJiraJson(path, body) {
  const res = await api.asApp().requestJira(path, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Jira API failed (${res.status}): ${text}`);
  }

  return JSON.parse(text);
}

async function searchStaleIssues() {
  return postJiraJson(route`/rest/api/3/search/jql`, {
    jql: STALE_JQL,
    maxResults: 100,
    fields: ['summary', 'status', 'updated', 'assignee', 'project'],
  });
}

async function countStaleIssues() {
  try {
    const body = await postJiraJson(route`/rest/api/3/search/approximate-count`, {
      jql: STALE_JQL,
    });
    return typeof body.count === 'number' ? body.count : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log('approximate-count skipped:', message);
    return null;
  }
}

function normalizeIssues(searchResult) {
  const issues = Array.isArray(searchResult?.issues) ? searchResult.issues : [];

  return issues.map((issue) => {
    const key = issue?.key;
    const fields = issue?.fields ?? {};

    return {
      key,
      summary: fields?.summary ?? '',
      updated: fields?.updated ?? null,
      status: fields?.status?.name ?? null,
      projectKey: fields?.project?.key ?? null,
      assignee: fields?.assignee?.displayName ?? null,
    };
  });
}

function jsonResponse(payload, statusCode = 200) {
  return {
    statusCode,
    statusText: statusCode === 200 ? 'OK' : 'Error',
    headers: {
      'Content-Type': ['application/json'],
    },
    body: JSON.stringify(payload, null, 2),
  };
}

export const generateStaleReport = async () => {
  const runId = Date.now();
  console.log(`generateStaleReport start runId=${runId} jql=${STALE_JQL}`);

  try {
    const generatedAt = new Date().toISOString();
    const searchResult = await searchStaleIssues();
    const issues = normalizeIssues(searchResult);
    const countedTotal = await countStaleIssues();

    const report = {
      generatedAt,
      jql: STALE_JQL,
      total: countedTotal ?? issues.length,
      issues,
    };

    await storage.set(LATEST_REPORT_KEY, report);
    console.log(
      `generateStaleReport success runId=${runId} total=${report.total} issues=${issues.length}`,
    );

    return jsonResponse({ ok: true, runId, storedKey: LATEST_REPORT_KEY, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`generateStaleReport failed runId=${runId}:`, message);
    return jsonResponse({ ok: false, runId, error: message });
  }
};
