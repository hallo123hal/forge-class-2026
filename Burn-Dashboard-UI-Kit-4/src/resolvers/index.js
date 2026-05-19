import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

const postJson = async (path, body) => {
    const response = await api.asUser().requestJira(path, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jira API failed (${response.status}): ${errorText}`);
    }

    return response.json();
};

const getJson = async (path) => {
    const response = await api.asUser().requestJira(path, {
        headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jira API failed (${response.status}): ${errorText}`);
    }

    return response.json();
};

const searchJql = (payload) => postJson(route`/rest/api/3/search/jql`, payload);

const approximateCount = async (jql) => {
    const data = await postJson(route`/rest/api/3/search/approximate-count`, { jql });
    return typeof data?.count === 'number' ? data.count : 0;
};

function getProjectKey(req) {
    const projectKey = req?.context?.extension?.project?.key;
    if (!projectKey) {
        throw new Error('Missing project key in context.');
    }
    return projectKey;
}

async function getActiveSprint(projectKey) {
    try {
        const boards = await getJson(
            route`/rest/agile/1.0/board?projectKeyOrId=${projectKey}&maxResults=1`
        );
        const boardId = boards?.values?.[0]?.id;
        if (!boardId) {
            return null;
        }

        const sprints = await getJson(
            route`/rest/agile/1.0/board/${boardId}/sprint?state=active`
        );
        return sprints?.values?.[0] || null;
    } catch {
        return null;
    }
}

function mapIssueRow(issue) {
    return {
        key: issue.key,
        summary: issue?.fields?.summary || '',
        status: issue?.fields?.status?.name || 'Unknown',
        assignee: issue?.fields?.assignee?.displayName || 'Unassigned',
    };
}

function buildBurndownSeries(sprint, issues) {
    const start = sprint?.startDate ? new Date(sprint.startDate) : new Date(Date.now() - 10 * 86400000);
    const end = sprint?.endDate ? new Date(sprint.endDate) : new Date();
    const totalDays = Math.max(1, Math.ceil((end - start) / 86400000));
    const totalIssues = issues.length;

    const doneByDay = new Map();
    issues.forEach((issue) => {
        const doneAt = issue?.fields?.resolutiondate;
        const isDone = issue?.fields?.status?.statusCategory?.key === 'done';
        if (!isDone || !doneAt) {
            return;
        }
        const dayIndex = Math.min(
            totalDays,
            Math.max(0, Math.ceil((new Date(doneAt) - start) / 86400000))
        );
        doneByDay.set(dayIndex, (doneByDay.get(dayIndex) || 0) + 1);
    });

    let cumulativeDone = 0;
    const data = [];
    for (let day = 0; day <= totalDays; day += 1) {
        cumulativeDone += doneByDay.get(day) || 0;
        const ideal = Math.max(0, Math.round(totalIssues - (totalIssues * day) / totalDays));
        const actual = Math.max(0, totalIssues - cumulativeDone);
        data.push({ day: day === 0 ? 'Start' : `Day ${day}`, ideal, actual });
    }

    return data;
}

resolver.define('getOverview', async (req) => {
    const projectKey = getProjectKey(req);
    const sprint = await getActiveSprint(projectKey);
    const jql = sprint?.id ? `sprint = ${sprint.id}` : `project = ${projectKey}`;
    const totalIssues = await approximateCount(jql);

    return {
        sprintName: sprint?.name || `Project ${projectKey}`,
        startDate: sprint?.startDate || null,
        endDate: sprint?.endDate || null,
        totalIssues,
    };
});

resolver.define('getIssues', async (req) => {
    const projectKey = getProjectKey(req);
    const sprint = await getActiveSprint(projectKey);
    const jql = sprint?.id
        ? `sprint = ${sprint.id} ORDER BY key ASC`
        : `project = ${projectKey} ORDER BY key ASC`;

    const search = await searchJql({
        jql,
        maxResults: 100,
        fields: ['key', 'summary', 'status', 'assignee'],
    });

    return (search?.issues || []).map(mapIssueRow);
});

resolver.define('getBurndown', async (req) => {
    const projectKey = getProjectKey(req);
    const sprint = await getActiveSprint(projectKey);
    const jql = sprint?.id
        ? `sprint = ${sprint.id}`
        : `project = ${projectKey} AND updated >= -14d`;

    const search = await searchJql({
        jql,
        maxResults: 100,
        fields: ['status', 'resolutiondate'],
    });

    const issues = search?.issues || [];
    return {
        sprintName: sprint?.name || null,
        data: buildBurndownSeries(sprint, issues),
    };
});

export const handler = resolver.getDefinitions();
