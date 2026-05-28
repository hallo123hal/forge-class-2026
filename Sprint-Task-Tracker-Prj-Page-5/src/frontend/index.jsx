import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ForgeReconciler, {
  Badge,
  Box,
  Button,
  DynamicTable,
  EmptyState,
  Form,
  FormFooter,
  FormHeader,
  FormSection,
  Heading,
  Inline,
  LoadingButton,
  Lozenge,
  SectionMessage,
  Select,
  Spinner,
  Stack,
  Text,
  Textfield,
  useProductContext,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const STATUS_OPTIONS = [
  { label: 'To Do', value: 'To Do' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Done', value: 'Done' },
];

const tasksHead = {
  cells: [
    { key: 'issueKey', content: 'Issue key', isSortable: true, width: 12 },
    { key: 'title', content: 'Title', isSortable: true, shouldTruncate: true },
    { key: 'status', content: 'Status', isSortable: true, width: 14 },
    { key: 'priority', content: 'Priority', isSortable: true, width: 12 },
    { key: 'assignee', content: 'Assignee', isSortable: true, width: 16 },
    { key: 'createdAt', content: 'Created', isSortable: true, width: 18 },
  ],
};

/** @param {Record<string, unknown>} task */
function taskToRow(task) {
  const createdAt = task.createdAt
    ? new Date(String(task.createdAt)).toLocaleString('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

  return {
    key: String(task.id ?? task.issueKey),
    cells: [
      { key: String(task.issueKey), content: <Text>{task.issueKey || '—'}</Text> },
      { key: String(task.title), content: <Text>{task.title || '—'}</Text> },
      {
        key: String(task.status),
        content: (
          <Lozenge appearance={task.status === 'Done' ? 'success' : 'default'}>
            {task.status || '—'}
          </Lozenge>
        ),
      },
      {
        key: String(task.priority),
        content: (
          <Badge appearance="default">{task.priority || '—'}</Badge>
        ),
      },
      { key: String(task.assignee), content: <Text>{task.assignee || 'Unassigned'}</Text> },
      { key: createdAt, content: <Text>{createdAt}</Text> },
    ],
  };
}

/**
 * Stat tile hiển thị số tasks theo status (từ getSprintStats aggregate).
 * @param {{ label: string; value: number }} props
 */
function StatCard({ label, value }) {
  return (
    <Box padding="space.200" backgroundColor="color.background.discovery">
      <Stack space="space.050" alignInline="start">
        <Text>{label}</Text>
        <Heading as="h3">{String(value)}</Heading>
      </Stack>
    </Box>
  );
}

const App = () => {
  const context = useProductContext();
  const projectKey = context?.extension?.project?.key;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [stats, setStats] = useState(/** @type {Array<{ status: string; count: number }>} */ ([]));
  const [tasks, setTasks] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));

  const [filterIssueKey, setFilterIssueKey] = useState('');
  const [filterStatus, setFilterStatus] = useState(STATUS_OPTIONS[0]);

  const [formIssueKey, setFormIssueKey] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formStatus, setFormStatus] = useState(STATUS_OPTIONS[0]);
  const [formPriority, setFormPriority] = useState('');
  const [formAssignee, setFormAssignee] = useState('');

  const loadStats = useCallback(async () => {
    const data = await invoke('getSprintStats');
    setStats(Array.isArray(data) ? data : []);
  }, []);

  const loadTasks = useCallback(async (issueKey, status) => {
    const key = (issueKey ?? filterIssueKey).trim();
    const taskStatus = status ?? filterStatus?.value;

    if (!key || !taskStatus) {
      setTasks([]);
      return;
    }

    const data = await invoke('getSprintTasks', { issueKey: key, status: taskStatus });
    setTasks(Array.isArray(data) ? data : []);
  }, [filterIssueKey, filterStatus]);

  const loadAll = useCallback(
    async (/** @type {'initial' | 'refresh'} */ mode, overrides = {}) => {
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        await loadStats();
        await loadTasks(overrides.issueKey, overrides.status);
      } catch (e) {
        setStats([]);
        setTasks([]);
        setError(e?.message || 'Không tải được dữ liệu sprint tasks.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadStats, loadTasks]
  );

  useEffect(() => {
    if (projectKey && !filterIssueKey) {
      const defaultKey = `${projectKey}-1`;
      setFilterIssueKey(defaultKey);
      setFormIssueKey(defaultKey);
      loadAll('initial', { issueKey: defaultKey, status: STATUS_OPTIONS[0].value });
      return;
    }

    if (filterIssueKey) {
      loadAll('initial');
    }
  }, [projectKey]);

  const handleCreateTask = async () => {
    const issueKey = formIssueKey.trim();
    const title = formTitle.trim();
    const status = formStatus?.value;

    if (!issueKey || !title || !status) {
      setError('Issue key, title và status là bắt buộc khi tạo task.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await invoke('createSprintTask', {
        issueKey,
        title,
        status,
        priority: formPriority.trim() || null,
        assignee: formAssignee.trim() || null,
      });

      setFormTitle('');
      setFormPriority('');
      setFormAssignee('');

      await loadAll('refresh');
    } catch (e) {
      setError(e?.message || 'Không tạo được sprint task.');
    } finally {
      setSaving(false);
    }
  };

  const taskRows = useMemo(() => tasks.map((task) => taskToRow(task)), [tasks]);
  const totalTasks = useMemo(
    () => stats.reduce((sum, row) => sum + (row.count || 0), 0),
    [stats]
  );

  if (!context || (loading && stats.length === 0 && tasks.length === 0)) {
    return <Spinner label="Đang tải Sprint Task Tracker..." />;
  }

  if (!projectKey) {
    return (
      <EmptyState
        header="Không có project"
        description="Mở trang project trong Jira để xem Sprint Task Tracker."
      />
    );
  }

  return (
    <Stack space="space.300">
      <Inline spread="space-between" alignBlock="center" space="space.200">
        <Stack space="space.050">
          <Heading as="h2">Sprint Task Tracker</Heading>
          <Text>Project: {projectKey} — dữ liệu lưu trong Forge SQL (bảng sprint_tasks).</Text>
        </Stack>
        <LoadingButton
          appearance="default"
          isLoading={refreshing}
          onClick={() => loadAll('refresh')}
        >
          Refresh
        </LoadingButton>
      </Inline>

      {error ? (
        <SectionMessage appearance="error" title="Lỗi">
          <Text>{error}</Text>
        </SectionMessage>
      ) : null}

      <Stack space="space.100">
        <Heading as="h3">Thống kê theo status</Heading>
        {stats.length === 0 ? (
          <Text>Chưa có task nào. Tạo task mới bên dưới để bắt đầu.</Text>
        ) : (
          <Inline space="space.100" shouldWrap>
            <StatCard label="Tổng tasks" value={totalTasks} />
            {stats.map((row) => (
              <StatCard key={row.status} label={row.status} value={row.count} />
            ))}
          </Inline>
        )}
      </Stack>

      <Form onSubmit={handleCreateTask}>
        <FormHeader title="Tạo sprint task mới" />
        <FormSection>
          <Stack space="space.100">
            <Textfield
              label="Issue key"
              name="issueKey"
              value={formIssueKey}
              onChange={(e) => setFormIssueKey(e.target.value)}
              isRequired
            />
            <Textfield
              label="Title"
              name="title"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              isRequired
            />
            <Select
              label="Status"
              name="status"
              options={STATUS_OPTIONS}
              value={formStatus}
              onChange={(option) => setFormStatus(option)}
            />
            <Textfield
              label="Priority"
              name="priority"
              value={formPriority}
              onChange={(e) => setFormPriority(e.target.value)}
            />
            <Textfield
              label="Assignee"
              name="assignee"
              value={formAssignee}
              onChange={(e) => setFormAssignee(e.target.value)}
            />
          </Stack>
        </FormSection>
        <FormFooter>
          <LoadingButton type="submit" appearance="primary" isLoading={saving}>
            Tạo task
          </LoadingButton>
        </FormFooter>
      </Form>

      <Stack space="space.100">
        <Heading as="h3">Danh sách tasks</Heading>
        <Inline space="space.100" shouldWrap>
          <Textfield
            label="Lọc theo issue key"
            name="filterIssueKey"
            value={filterIssueKey}
            onChange={(e) => setFilterIssueKey(e.target.value)}
          />
          <Select
            label="Lọc theo status"
            name="filterStatus"
            options={STATUS_OPTIONS}
            value={filterStatus}
            onChange={(option) => setFilterStatus(option)}
          />
          <Box padding="space.100">
            <Button appearance="primary" onClick={() => loadAll('refresh')}>
              Áp dụng bộ lọc
            </Button>
          </Box>
        </Inline>

        <DynamicTable
          caption="Sprint tasks"
          Label="Bảng sprint tasks"
          head={tasksHead}
          rows={taskRows}
          rowsPerPage={10}
          defaultSortKey="createdAt"
          defaultSortOrder="DESC"
          emptyView="Không có task khớp issue key và status đã chọn."
          paginationi18n={{
            prev: 'Trang trước',
            next: 'Trang sau',
            label: 'Phân trang sprint tasks',
          }}
        />
      </Stack>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
