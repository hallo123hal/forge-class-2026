import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

const postJson = async (path, body) => {
    const response = await api.asUser().requestJira(path, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jira API failed (${response.status}): ${errorText}`);
    }

    return response.json();
};

/** Enhanced JQL search (replaces removed GET /rest/api/3/search?jql=...) */
const searchJql = (payload) => postJson(route`/rest/api/3/search/jql`, payload);

/** Bounded JQL count for overview totals */
const approximateCount = async (jql) => {
    const data = await postJson(route`/rest/api/3/search/approximate-count`, { jql });
    return typeof data?.count === 'number' ? data.count : 0;
};

resolver.define('getOverview', async (req) => {
    const project = req?.context?.extension?.project;
    const projectKey = project?.key;
    const projectType = project?.type;

    if (!projectKey) {
        throw new Error('Missing project key in context.');
    }

    const jql = `project = ${projectKey}`;
    const issueCount = await approximateCount(jql);

    return {
        projectKey,
        projectType: projectType || 'Unknown',
        issueCount
    };
});

resolver.define('getRecentIssues', async (req) => {
    const projectKey = req?.context?.extension?.project?.key;
    if (!projectKey) {
        throw new Error('Missing project key in context.');
    }

    const search = await searchJql({
        jql: `project = ${projectKey} ORDER BY created DESC`,
        maxResults: 5,
        fields: ['key', 'summary', 'status', 'assignee', 'created']
    });

    return (search?.issues || []).map((issue) => ({
        key: issue.key,
        summary: issue?.fields?.summary || '',
        status: issue?.fields?.status?.name || 'Unknown',
        assignee: issue?.fields?.assignee?.displayName || 'Unassigned',
        created: issue?.fields?.created || null
    }));
});

resolver.define('getTeam', async (req) => {
    const projectKey = req?.context?.extension?.project?.key;
    if (!projectKey) {
        throw new Error('Missing project key in context.');
    }

    const search = await searchJql({
        jql: `project = ${projectKey} AND assignee IS NOT EMPTY AND updated >= -7d ORDER BY updated DESC`,
        maxResults: 100,
        fields: ['assignee']
    });

    const unique = new Map();
    (search?.issues || []).forEach((issue) => {
        const assignee = issue?.fields?.assignee;
        if (assignee?.accountId && !unique.has(assignee.accountId)) {
            unique.set(assignee.accountId, {
                accountId: assignee.accountId,
                displayName: assignee.displayName || 'Unknown user'
            });
        }
    });

    return Array.from(unique.values());
});

export const handler = resolver.getDefinitions();
