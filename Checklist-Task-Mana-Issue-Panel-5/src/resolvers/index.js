import Resolver from '@forge/resolver';
import {
  addChecklistItem,
  countCompletion,
  deleteChecklistItem,
  fetchItemsByIssue,
  getIssueKey,
  toggleChecklistItem,
  validatePriority,
  validateTitle,
} from './checklist-storage';

const resolver = new Resolver();

resolver.define('getChecklistItems', async (req) => {
  const issueKey = getIssueKey(req);
  if (!issueKey) {
    throw new Error('Không xác định được issue key.');
  }

  const items = await fetchItemsByIssue(issueKey);
  const { done, total } = countCompletion(items);

  return { items, done, total };
});

resolver.define('addChecklistItem', async (req) => {
  const issueKey = getIssueKey(req);
  if (!issueKey) {
    throw new Error('Không xác định được issue key.');
  }

  const title = validateTitle(req.payload?.title);
  const priority = validatePriority(req.payload?.priority ?? 2);

  const item = await addChecklistItem(issueKey, title, priority);
  const items = await fetchItemsByIssue(issueKey);
  const { done, total } = countCompletion(items);

  return { item, items, done, total };
});

resolver.define('toggleChecklistItem', async (req) => {
  const issueKey = getIssueKey(req);
  const key = req.payload?.key;

  if (!issueKey) {
    throw new Error('Không xác định được issue key.');
  }
  if (!key || typeof key !== 'string') {
    throw new Error('Thiếu key của checklist item.');
  }

  const item = await toggleChecklistItem(key);
  const items = await fetchItemsByIssue(issueKey);
  const { done, total } = countCompletion(items);

  return { item, items, done, total };
});

resolver.define('deleteChecklistItem', async (req) => {
  const issueKey = getIssueKey(req);
  const key = req.payload?.key;

  if (!issueKey) {
    throw new Error('Không xác định được issue key.');
  }
  if (!key || typeof key !== 'string') {
    throw new Error('Thiếu key của checklist item.');
  }

  await deleteChecklistItem(key);
  const items = await fetchItemsByIssue(issueKey);
  const { done, total } = countCompletion(items);

  return { items, done, total };
});

export const handler = resolver.getDefinitions();
