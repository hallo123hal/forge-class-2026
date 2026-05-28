import Resolver from '@forge/resolver';
import { sql } from '@forge/sql';

const resolver = new Resolver();

const INSERT_SPRINT_TASK = `
  INSERT INTO sprint_tasks (issue_key, title, status, priority, assignee)
  VALUES (?, ?, ?, ?, ?)
`;

const SELECT_SPRINT_TASKS = `
  SELECT id, issue_key, title, status, priority, assignee, created_at
  FROM sprint_tasks
  WHERE issue_key = ? AND status = ?
  ORDER BY created_at DESC
`;

const SELECT_SPRINT_STATS = `
  SELECT status, COUNT(*) AS count
  FROM sprint_tasks
  GROUP BY status
`;

/**
 * INSERT sprint task — dùng ? placeholders, không string interpolation.
 */
resolver.define('createSprintTask', async (req) => {
  const { issueKey, title, status, priority, assignee } = req.payload;

  if (!issueKey || !title || !status) {
    throw new Error('issueKey, title và status là bắt buộc.');
  }

  const result = await sql
    .prepare(INSERT_SPRINT_TASK)
    .bindParams(
      String(issueKey).trim(),
      String(title).trim(),
      String(status).trim(),
      priority ? String(priority).trim() : null,
      assignee ? String(assignee).trim() : null
    )
    .execute();

  return {
    id: result.rows.insertId,
    issueKey: String(issueKey).trim(),
    title: String(title).trim(),
    status: String(status).trim(),
    priority: priority ? String(priority).trim() : null,
    assignee: assignee ? String(assignee).trim() : null,
  };
});

/**
 * SELECT tasks theo issue_key và status — cả hai đều bind qua ?.
 */
resolver.define('getSprintTasks', async (req) => {
  const { issueKey, status } = req.payload;

  if (!issueKey || !status) {
    throw new Error('issueKey và status là bắt buộc để lọc tasks.');
  }

  const result = await sql
    .prepare(SELECT_SPRINT_TASKS)
    .bindParams(String(issueKey).trim(), String(status).trim())
    .execute();

  return (result.rows || []).map((row) => ({
    id: row.id,
    issueKey: row.issue_key,
    title: row.title,
    status: row.status,
    priority: row.priority,
    assignee: row.assignee,
    createdAt: row.created_at,
  }));
});

/**
 * Aggregate: số tasks theo từng status (GROUP BY status).
 */
resolver.define('getSprintStats', async () => {
  const result = await sql.prepare(SELECT_SPRINT_STATS).execute();

  return (result.rows || []).map((row) => ({
    status: row.status,
    count: Number(row.count) || 0,
  }));
});

export const handler = resolver.getDefinitions();
