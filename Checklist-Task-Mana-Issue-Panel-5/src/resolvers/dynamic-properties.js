import {
  buildCompletionStatus,
  countCompletion,
  fetchItemsByIssue,
  getIssueKey,
} from './checklist-storage';

/**
 * dynamicProperties handler — hiển thị counter "X/Y hoàn thành" trên issueContext badge.
 */
export const getDynamicProperties = async (payload) => {
  const issueKey = payload?.extension?.issue?.key;

  if (!issueKey) {
    return {
      status: buildCompletionStatus(0, 0),
    };
  }

  const items = await fetchItemsByIssue(issueKey);
  const { done, total } = countCompletion(items);

  return {
    status: buildCompletionStatus(done, total),
  };
};

export { getIssueKey };
