import { migrationRunner } from '@forge/sql';

/**
 * DDL: tạo bảng sprint_tasks nếu chưa tồn tại.
 * Cột khớp yêu cầu bài tập Forge SQL.
 */
export const CREATE_SPRINT_TASKS_TABLE = `CREATE TABLE IF NOT EXISTS sprint_tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  issue_key VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  status VARCHAR(50) NOT NULL,
  priority VARCHAR(50),
  assignee VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

const createDbObjects = migrationRunner.enqueue(
  'v001_create_sprint_tasks_table',
  CREATE_SPRINT_TASKS_TABLE
);

/**
 * Chạy migration qua scheduledTrigger — Forge SQL theo dõi từng operationName.
 */
export const runMigration = async () => {
  try {
    const successfulMigrations = await createDbObjects.run();
    console.log('Sprint tasks migrations applied:', successfulMigrations);

    const migrations = await migrationRunner.list();
    migrations.forEach((entry) => {
      console.log(`${entry.name} migrated at ${entry.migratedAt.toUTCString()}`);
    });
  } catch (error) {
    console.error('Sprint tasks migration failed:', JSON.stringify(error));
    throw error;
  }
};
