import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

resolver.define('getIssueDetails', async (req) => {
  const issueKey = req.payload?.issueKey ?? req.context?.extension?.issue?.key;
  if (!issueKey) {
    throw new Error('Không lấy được issue key.');
  }

  const res = await api.asUser().requestJira(
    route`/rest/api/3/issue/${issueKey}?fields=priority,issuetype,assignee,created`,
    {
      headers: { Accept: 'application/json' },
    }
  );

  if (!res.ok) {
    throw new Error(`Jira API lỗi: ${res.status}`);
  }

  const data = await res.json();
  return {
    key: data.key,
    priority: data.fields?.priority?.name ?? 'Unknown',
    issueType: data.fields?.issuetype?.name ?? 'Unknown',
    assignee: data.fields?.assignee?.displayName ?? 'Unassigned',
    created: data.fields?.created ?? '',
  };
});

export const handler = resolver.getDefinitions();
