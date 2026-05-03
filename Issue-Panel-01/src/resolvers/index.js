import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

function logEvent(level, event, payload = {}) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level,
      event,
      ...payload,
    })
  );
}

resolver.define('getIssueDetails', async (req) => {
  const start = Date.now();
  const functionName = 'getIssueDetails';
  const issueKey =
    req.payload?.issueKey ?? req.context?.extension?.issue?.key;
  const accountId =
    req.context?.accountId ?? req.context?.principal?.accountId;

  logEvent('INFO', 'function_called', {
    functionName,
    issueKey,
    accountId,
  });

  if (!issueKey) {
    logEvent('ERROR', 'function_failed', {
      functionName,
      issueKey,
      accountId,
      durationMs: Date.now() - start,
      errorMessage: 'Missing issueKey',
    });
    throw new Error('Không lấy được issue key.');
  }

  const jiraPath = route`/rest/api/3/issue/${issueKey}?fields=summary,status,assignee`;

  logEvent('INFO', 'api_request_sent', {
    functionName,
    issueKey,
    path: '/rest/api/3/issue/{key}?fields=summary,status,assignee',
  });

  try {
    const res = await api.asUser().requestJira(jiraPath, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Jira API lỗi: ${res.status}`);
    }

    const data = await res.json();
    const result = {
      key: data.key,
      summary: data.fields?.summary ?? '(Không có tiêu đề)',
      status: data.fields?.status?.name ?? '(Không có status)',
      assignee: data.fields?.assignee?.displayName ?? 'Unassigned',
    };

    logEvent('INFO', 'function_succeeded', {
      functionName,
      issueKey,
      durationMs: Date.now() - start,
      resultSummary: {
        key: result.key,
        status: result.status,
        hasAssignee: result.assignee !== 'Unassigned',
      },
    });

    return result;
  } catch (error) {
    logEvent('ERROR', 'function_failed', {
      functionName,
      issueKey,
      accountId,
      durationMs: Date.now() - start,
      errorMessage: error.message,
    });
    throw error;
  }
});

export const handler = resolver.getDefinitions();
