import api, { route } from '@forge/api';

/**
 * Tạo nội dung ADF cho comment cảnh báo khi Bug được nâng priority lên Highest.
 */
function buildWarningCommentAdf(issueKey, projectLeadName) {
  const text = `⚠️ Cảnh báo: Bug ${issueKey} vừa được nâng priority lên Highest. Issue đã được assign cho project lead (${projectLeadName}).`;

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
 * Lấy thông tin project lead qua Jira REST API.
 */
async function getProjectLead(projectKey) {
  const response = await api.asApp().requestJira(
    route`/rest/api/3/project/${projectKey}`,
    { headers: { Accept: 'application/json' } }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Không lấy được project lead (${response.status}): ${body}`
    );
  }

  const project = await response.json();
  const lead = project?.lead;

  if (!lead?.accountId) {
    throw new Error(`Project ${projectKey} không có project lead.`);
  }

  return {
    accountId: lead.accountId,
    displayName: lead.displayName ?? lead.accountId,
  };
}

/**
 * Thêm comment cảnh báo vào issue.
 */
async function addWarningComment(issueKey, projectLeadName) {
  const response = await api.asApp().requestJira(
    route`/rest/api/3/issue/${issueKey}/comment`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body: buildWarningCommentAdf(issueKey, projectLeadName),
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Không thêm được comment (${response.status}): ${body}`);
  }
}

/**
 * Assign issue cho project lead.
 */
async function assignIssueToLead(issueKey, accountId) {
  const response = await api.asApp().requestJira(
    route`/rest/api/3/issue/${issueKey}/assignee`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Không assign được issue (${response.status}): ${body}`);
  }
}

/**
 * Handler cho trigger avi:jira:updated:issue.
 * Filter server-side (manifest) đã lọc Bug + priority Highest;
 * handler thêm comment cảnh báo và assign cho project lead.
 */
export async function onBugPriorityHighest(event) {
  const issueKey = event?.issue?.key;
  const projectKey = event?.issue?.fields?.project?.key;
  const issueType = event?.issue?.fields?.issuetype?.name;
  const priority = event?.issue?.fields?.priority?.name;

  console.log(
    `Issue updated event: ${issueKey ?? 'unknown'} — type=${issueType}, priority=${priority}`
  );

  if (!issueKey || !projectKey) {
    console.log('Thiếu issue key hoặc project key — bỏ qua.');
    return;
  }

  const projectLead = await getProjectLead(projectKey);

  await addWarningComment(issueKey, projectLead.displayName);
  await assignIssueToLead(issueKey, projectLead.accountId);

  console.log(
    `Đã cảnh báo và assign ${issueKey} cho project lead ${projectLead.displayName}.`
  );
}
