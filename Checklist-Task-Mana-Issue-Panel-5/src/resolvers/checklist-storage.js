import { randomUUID } from 'crypto';
import { kvs, Sort } from '@forge/kvs';

const ENTITY_NAME = 'checklist-item';
const INDEX_BY_ISSUE = 'by-issue-status';
const PRIORITY_MIN = 1;
const PRIORITY_MAX = 3;

export const getIssueKey = (req) =>
  req.payload?.issueKey ?? req.context?.extension?.issue?.key;

const mapStoredItem = (row) => ({
  key: row.key,
  title: row.value?.title ?? '',
  isDone: Boolean(row.value?.isDone),
  priority: row.value?.priority ?? PRIORITY_MIN,
  issueKey: row.value?.issueKey ?? '',
});

/**
 * Query checklist-item theo index by-issue-status (partition=issueKey, sort theo priority).
 */
export const fetchItemsByIssue = async (issueKey) => {
  const items = [];
  let cursor;

  do {
    let query = kvs
      .entity(ENTITY_NAME)
      .query()
      .index(INDEX_BY_ISSUE, { partition: [issueKey] })
      .sort(Sort.ASC)
      .limit(100);

    if (cursor) {
      query = query.cursor(cursor);
    }

    const page = await query.getMany();
    items.push(...page.results.map(mapStoredItem));
    cursor = page.nextCursor;
  } while (cursor);

  return items;
};

export const countCompletion = (items) => {
  const total = items.length;
  const done = items.filter((item) => item.isDone).length;
  return { done, total };
};

export const buildCompletionStatus = (done, total) => {
  const label = `${done}/${total} hoàn thành`;
  let type = 'default';

  if (total > 0 && done === total) {
    type = 'success';
  } else if (done > 0) {
    type = 'inprogress';
  }

  return {
    type: 'lozenge',
    value: { label, type },
  };
};

export const validatePriority = (priority) => {
  const value = Number(priority);
  if (
    !Number.isInteger(value) ||
    value < PRIORITY_MIN ||
    value > PRIORITY_MAX
  ) {
    throw new Error('Priority phải từ 1 đến 3.');
  }
  return value;
};

export const validateTitle = (title) => {
  const trimmed = typeof title === 'string' ? title.trim() : '';
  if (!trimmed) {
    throw new Error('Tiêu đề không được để trống.');
  }
  return trimmed;
};

export const addChecklistItem = async (issueKey, title, priority) => {
  const key = `item-${randomUUID()}`;
  const value = {
    title: validateTitle(title),
    isDone: false,
    priority: validatePriority(priority),
    issueKey,
  };

  await kvs.entity(ENTITY_NAME).set(key, value);
  return { key, ...value };
};

export const toggleChecklistItem = async (key) => {
  const stored = await kvs.entity(ENTITY_NAME).get(key);
  const current = stored?.value ?? stored;

  if (!current || typeof current !== 'object') {
    throw new Error('Không tìm thấy checklist item.');
  }

  const updated = {
    ...current,
    isDone: !Boolean(current.isDone),
  };

  await kvs.entity(ENTITY_NAME).set(key, updated);
  return { key, ...updated };
};

export const deleteChecklistItem = async (key) => {
  await kvs.entity(ENTITY_NAME).delete(key);
};
