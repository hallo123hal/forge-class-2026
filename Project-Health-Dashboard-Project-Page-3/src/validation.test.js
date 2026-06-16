import {
  assertSafeProjectKey,
  bucketBugPriority,
  capDonutSlices,
  donutColorKey,
  priorityToBadgeAppearance,
  statusCategoryToLozengeAppearance,
} from './validation.js';

describe('assertSafeProjectKey', () => {
  it('accepts valid alphanumeric project keys', () => {
    expect(() => assertSafeProjectKey('PROJ')).not.toThrow();
    expect(() => assertSafeProjectKey('MY-APP_2')).not.toThrow();
  });

  it('rejects empty, non-string, or unsafe project keys', () => {
    expect(() => assertSafeProjectKey('')).toThrow('Project key không hợp lệ.');
    expect(() => assertSafeProjectKey('PROJ 1')).toThrow('Project key không hợp lệ.');
    expect(() => assertSafeProjectKey('PROJ;DROP')).toThrow('Project key không hợp lệ.');
    expect(() => assertSafeProjectKey(null)).toThrow('Project key không hợp lệ.');
  });
});

describe('statusCategoryToLozengeAppearance', () => {
  it('maps known Jira status categories to lozenge appearances', () => {
    expect(statusCategoryToLozengeAppearance('done')).toBe('success');
    expect(statusCategoryToLozengeAppearance('new')).toBe('new');
    expect(statusCategoryToLozengeAppearance('indeterminate')).toBe('inprogress');
    expect(statusCategoryToLozengeAppearance(undefined)).toBe('default');
  });
});

describe('priorityToBadgeAppearance', () => {
  it('maps priority names to badge appearances', () => {
    expect(priorityToBadgeAppearance('Highest')).toBe('removed');
    expect(priorityToBadgeAppearance('Critical')).toBe('removed');
    expect(priorityToBadgeAppearance('High')).toBe('important');
    expect(priorityToBadgeAppearance('Lowest')).toBe('success');
    expect(priorityToBadgeAppearance('Low')).toBe('primary');
    expect(priorityToBadgeAppearance('Medium')).toBe('default');
  });
});

describe('bucketBugPriority', () => {
  it('buckets bug priorities into chart groups', () => {
    expect(bucketBugPriority('Highest')).toBe('Highest');
    expect(bucketBugPriority('Critical blocker')).toBe('Highest');
    expect(bucketBugPriority('High')).toBe('High');
    expect(bucketBugPriority('Medium')).toBe('Medium');
    expect(bucketBugPriority('Low')).toBe('Low');
    expect(bucketBugPriority('Trivial')).toBe('Low');
    expect(bucketBugPriority(undefined)).toBe('Medium');
  });
});

describe('donutColorKey', () => {
  it('maps status categories to donut color keys', () => {
    expect(donutColorKey('done')).toBe('done');
    expect(donutColorKey('new')).toBe('new');
    expect(donutColorKey('indeterminate')).toBe('inprogress');
    expect(donutColorKey('unknown')).toBe('other');
  });
});

describe('capDonutSlices', () => {
  it('returns rows unchanged when within max slice limit', () => {
    const rows = [
      ['done', 'Done', 5],
      ['new', 'To Do', 3],
    ];
    expect(capDonutSlices(rows, 7)).toEqual(rows);
  });

  it('collapses excess slices into an Other bucket', () => {
    const rows = [
      ['done', 'Done', 10],
      ['new', 'To Do', 8],
      ['inprogress', 'In Progress', 6],
      ['other', 'Review', 4],
      ['other', 'Blocked', 3],
      ['other', 'Waiting', 2],
      ['other', 'QA', 1],
      ['other', 'Deploy', 1],
    ];
    const capped = capDonutSlices(rows, 4);
    expect(capped).toHaveLength(4);
    expect(capped[capped.length - 1]).toEqual(['other', 'Other', 11]);
  });

  it('ignores zero-value slices before capping', () => {
    const rows = [
      ['done', 'Done', 5],
      ['new', 'To Do', 0],
      ['inprogress', 'In Progress', 2],
    ];
    expect(capDonutSlices(rows, 7)).toEqual([
      ['done', 'Done', 5],
      ['inprogress', 'In Progress', 2],
    ]);
  });
});
