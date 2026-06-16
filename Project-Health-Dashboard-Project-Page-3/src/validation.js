/**
 * Pure validation and mapping helpers for Project Health Dashboard.
 * Kept separate from the resolver so Jest can unit-test them without Forge runtime.
 */

/**
 * Reject project keys that could break JQL or route interpolation.
 * @param {string} key
 */
export function assertSafeProjectKey(key) {
  if (!key || typeof key !== 'string' || !/^[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error('Project key không hợp lệ.');
  }
}

/**
 * @param {string | undefined} categoryKey
 * @returns {string}
 */
export function statusCategoryToLozengeAppearance(categoryKey) {
  switch (categoryKey) {
    case 'done':
      return 'success';
    case 'new':
      return 'new';
    case 'indeterminate':
      return 'inprogress';
    default:
      return 'default';
  }
}

/**
 * @param {string | undefined} name
 * @returns {string}
 */
export function priorityToBadgeAppearance(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('highest') || n.includes('critical')) return 'removed';
  if (n.includes('high')) return 'important';
  if (n.includes('lowest') || n.includes('trivial')) return 'success';
  if (n.includes('low')) return 'primary';
  return 'default';
}

/**
 * @param {string | undefined} priorityName
 * @returns {'Highest' | 'High' | 'Medium' | 'Low'}
 */
export function bucketBugPriority(priorityName) {
  const n = (priorityName || '').toLowerCase();
  if (n.includes('highest') || n.includes('critical')) return 'Highest';
  if (n.includes('high')) return 'High';
  if (n.includes('lowest') || n.includes('trivial') || n.includes('low')) return 'Low';
  if (n.includes('medium') || n.includes('normal')) return 'Medium';
  return 'Medium';
}

/**
 * Donut color grouping from Jira status category key.
 * @param {string | undefined} categoryKey
 */
export function donutColorKey(categoryKey) {
  switch (categoryKey) {
    case 'done':
      return 'done';
    case 'new':
      return 'new';
    case 'indeterminate':
      return 'inprogress';
    default:
      return 'other';
  }
}

/**
 * Collapse small status slices for readability (donut).
 * @param {Array<[string, string, number]>} rows — [colorKey, label, value]
 * @param {number} maxSlices
 */
export function capDonutSlices(rows, maxSlices) {
  const positive = rows.filter((r) => r[2] > 0);
  if (positive.length <= maxSlices) return positive;
  const sorted = [...positive].sort((a, b) => b[2] - a[2]);
  const head = sorted.slice(0, maxSlices - 1);
  const tail = sorted.slice(maxSlices - 1);
  const otherSum = tail.reduce((s, r) => s + r[2], 0);
  return [...head, ['other', 'Other', otherSum]];
}
