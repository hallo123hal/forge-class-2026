import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

const requestJiraJson = async (path, options = {}) => {
  const response = await api.asUser().requestJira(path, {
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Jira API failed (${response.status}): ${errorText}`);
  }

  return response.json();
};

resolver.define('getIssueTypes', async () => {
  const issueTypes = await requestJiraJson(route`/rest/api/3/issuetype`);
  return (issueTypes || [])
    .filter((item) => !item?.subtask)
    .map((item) => ({
      id: item.id,
      name: item.name,
    }));
});

resolver.define('createJiraIssue', async (req) => {
  const summary = req?.payload?.summary?.trim();
  const issueTypeId = req?.payload?.issueTypeId;
  const siteUrl = req?.payload?.siteUrl ?? '';

  if (!summary) {
    throw new Error('Summary is required.');
  }
  if (!issueTypeId) {
    throw new Error('Issue type is required.');
  }

  const projects = await requestJiraJson(route`/rest/api/3/project/search?maxResults=1`);
  const projectKey = projects?.values?.[0]?.key;
  if (!projectKey) {
    throw new Error('No Jira project found for this user.');
  }

  const created = await requestJiraJson(route`/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        project: { key: projectKey },
        summary,
        issuetype: { id: issueTypeId },
      },
    }),
  });

  const jiraBaseUrl = siteUrl ? siteUrl.replace(/\/wiki\/?$/, '') : '';
  return {
    key: created?.key,
    id: created?.id,
    issueUrl: created?.key && jiraBaseUrl ? `${jiraBaseUrl}/browse/${created.key}` : '',
  };
});

export const handler = resolver.getDefinitions();
