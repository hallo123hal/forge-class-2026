import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ForgeReconciler, {
  Badge,
  BarChart,
  Box,
  Button,
  DonutChart,
  DynamicTable,
  EmptyState,
  Heading,
  Inline,
  LoadingButton,
  Lozenge,
  SectionMessage,
  Spinner,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
  useProductContext,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const issuesHead = {
  cells: [
    { key: 'issueKey', content: 'Key', isSortable: true, width: 14 },
    { key: 'summary', content: 'Summary', isSortable: true, shouldTruncate: true },
    { key: 'status', content: 'Status', isSortable: true, width: 16 },
    { key: 'priority', content: 'Priority', isSortable: true, width: 14 },
    { key: 'assignee', content: 'Assignee', isSortable: true, width: 18 },
  ],
};

const staleHead = {
  cells: [
    { key: 'issueKey', content: 'Key', isSortable: true, width: 12 },
    { key: 'summary', content: 'Summary', isSortable: true, shouldTruncate: true },
    { key: 'status', content: 'Status', isSortable: true, width: 14 },
    { key: 'priority', content: 'Priority', isSortable: true, width: 12 },
    { key: 'updated', content: 'Last updated', isSortable: true, width: 18 },
  ],
};

/** @param {Record<string, unknown>} issue */
function issueToRow(issue) {
  const summary = issue.summary ?? '';
  const statusName = issue.statusName ?? '';
  const priorityName = issue.priorityName ?? '';
  const assignee = issue.assignee ?? 'Unassigned';

  return {
    key: issue.key,
    cells: [
      { key: issue.key, content: <Text>{issue.key}</Text> },
      { key: summary, content: <Text>{summary || '—'}</Text> },
      {
        key: statusName,
        content: (
          <Lozenge appearance={issue.statusLozengeAppearance ?? 'default'}>
            {statusName || '—'}
          </Lozenge>
        ),
      },
      {
        key: priorityName,
        content: (
          <Badge appearance={issue.priorityBadgeAppearance ?? 'default'}>
            {priorityName || '—'}
          </Badge>
        ),
      },
      { key: assignee, content: <Text>{assignee}</Text> },
    ],
  };
}

/** @param {Record<string, unknown>} issue */
function staleIssueToRow(issue) {
  const summary = issue.summary ?? '';
  const statusName = issue.statusName ?? '';
  const priorityName = issue.priorityName ?? '';
  const updated = issue.updated
    ? new Date(/** @type {string} */ (issue.updated)).toLocaleString('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

  return {
    key: issue.key,
    cells: [
      { key: issue.key, content: <Text>{issue.key}</Text> },
      { key: summary, content: <Text>{summary || '—'}</Text> },
      {
        key: statusName,
        content: (
          <Lozenge appearance={issue.statusLozengeAppearance ?? 'default'}>
            {statusName || '—'}
          </Lozenge>
        ),
      },
      {
        key: priorityName,
        content: (
          <Badge appearance={issue.priorityBadgeAppearance ?? 'default'}>
            {priorityName || '—'}
          </Badge>
        ),
      },
      { key: updated, content: <Text>{updated}</Text> },
    ],
  };
}

/**
 * Stat summary tile (UI Kit does not ship a `StatCard` primitive; this matches the pattern).
 * @param {{ label: string; value: number | string; backgroundColor?: string }} props
 */
function StatCard({ label, value, backgroundColor = 'color.background.discovery' }) {
  return (
    <Box padding="space.200" backgroundColor={backgroundColor}>
      <Stack space="space.050" alignInline="start">
        <Text>{label}</Text>
        <Heading as="h3">{typeof value === 'number' ? String(value) : value}</Heading>
      </Stack>
    </Box>
  );
}

const App = () => {
  const context = useProductContext();
  const projectKey = context?.extension?.project?.key;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [dashboard, setDashboard] = useState(/** @type {Record<string, unknown> | null} */ (null));

  const loadDashboard = useCallback(
    async (/** @type {'initial' | 'refresh'} */ mode) => {
      if (!projectKey) {
        setDashboard(null);
        setError(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const data = await invoke('getProjectHealthDashboard', { projectKey });
        setDashboard(data && typeof data === 'object' ? data : null);
      } catch (e) {
        setDashboard(null);
        setError(e?.message || 'Không tải được dữ liệu dashboard.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [projectKey]
  );

  useEffect(() => {
    loadDashboard('initial');
  }, [loadDashboard]);

  const latestIssues = useMemo(
    () => (Array.isArray(dashboard?.latestIssues) ? dashboard.latestIssues : []),
    [dashboard]
  );
  const staleIssues = useMemo(
    () => (Array.isArray(dashboard?.staleIssues) ? dashboard.staleIssues : []),
    [dashboard]
  );
  const counts = dashboard?.counts && typeof dashboard.counts === 'object' ? dashboard.counts : {};
  const donutData = useMemo(() => {
    const raw = Array.isArray(dashboard?.donutData) ? dashboard.donutData : [];
    return raw.filter((row) => Array.isArray(row) && typeof row[2] === 'number' && row[2] > 0);
  }, [dashboard]);
  const bugsBar = Array.isArray(dashboard?.bugsByPriorityBar) ? dashboard.bugsByPriorityBar : [];

  const issueRows = useMemo(() => latestIssues.map((i) => issueToRow(i)), [latestIssues]);
  const staleRows = useMemo(() => staleIssues.map((i) => staleIssueToRow(i)), [staleIssues]);

  if (!context || (loading && !dashboard)) {
    return <Spinner label="Đang tải dashboard..." />;
  }

  if (!projectKey) {
    return (
      <EmptyState
        header="Không có project"
        description="Mở trang project trong Jira để xem Project Health Dashboard."
      />
    );
  }

  if (error) {
    return (
      <Stack space="space.200">
        <SectionMessage appearance="error" title="Lỗi tải dữ liệu">
          <Text>{error}</Text>
        </SectionMessage>
        <Button appearance="primary" onClick={() => loadDashboard('initial')}>
          Thử lại
        </Button>
      </Stack>
    );
  }

  if (!dashboard) {
    return (
      <EmptyState
        header="Không có dữ liệu"
        description="Không nhận được phản hồi từ server. Nhấn làm mới để thử lại."
      />
    );
  }

  const total = typeof counts.total === 'number' ? counts.total : 0;
  const inProgress = typeof counts.inProgress === 'number' ? counts.inProgress : 0;
  const done = typeof counts.done === 'number' ? counts.done : 0;
  const bugs = typeof counts.bugs === 'number' ? counts.bugs : 0;
  const donutSampleSize =
    typeof dashboard.donutSampleSize === 'number' ? dashboard.donutSampleSize : 0;
  const donutNote =
    donutSampleSize < total
      ? `Biểu đồ trạng thái dựa trên ${donutSampleSize}/${total} issue mẫu (theo key).`
      : `Biểu đồ trạng thái theo toàn bộ ${total} issue trong mẫu tối đa.`;

  const bugBarSum = bugsBar.reduce((s, r) => s + (Array.isArray(r) && typeof r[1] === 'number' ? r[1] : 0), 0);

  return (
    <Stack space="space.200">
      <Inline spread="space-between" alignBlock="center" space="space.200">
        <Stack space="space.050">
          <Heading as="h2">Project Health Dashboard</Heading>
          <Text>
            Project: {projectKey}
          </Text>
        </Stack>
        <LoadingButton
          appearance="default"
          isLoading={refreshing}
          onClick={() => loadDashboard('refresh')}
        >
          Refresh
        </LoadingButton>
      </Inline>

      <Tabs id="project-health-tabs" defaultSelected={0}>
        <TabList>
          <Tab>Overview</Tab>
          <Tab>Issues Table</Tab>
          <Tab>Stale Issues</Tab>
          <Tab>Bugs Chart</Tab>
        </TabList>

        <TabPanel>
          <Box padding="space.200">
            <Stack space="space.300">
              <Inline space="space.100" shouldWrap>
                <StatCard label="Total issues" value={total} backgroundColor="color.background.discovery" />
                <StatCard
                  label="In progress"
                  value={inProgress}
                  backgroundColor="color.background.information"
                />
                <StatCard label="Done" value={done} backgroundColor="color.background.success" />
                <StatCard label="Bugs" value={bugs} backgroundColor="color.background.warning" />
              </Inline>

              {total === 0 ? (
                <EmptyState
                  header="Chưa có issue"
                  description="Project này chưa có issue nào để phân tích."
                />
              ) : donutData.length === 0 ? (
                <Text>Không đủ dữ liệu trạng thái để vẽ biểu đồ.</Text>
              ) : (
                <Stack space="space.100">
                  <DonutChart
                    data={donutData}
                    colorAccessor={0}
                    labelAccessor={1}
                    valueAccessor={2}
                    title="Status distribution"
                    subtitle={donutNote}
                    height={280}
                    width={320}
                    showMarkLabels
                  />
                </Stack>
              )}
            </Stack>
          </Box>
        </TabPanel>

        <TabPanel>
          <Box padding="space.200">
            <Stack space="space.100">
              <Text>10 issue tạo gần nhất, sắp xếp mặc định theo Key, 10 hàng mỗi trang.</Text>
              <DynamicTable
                caption="Latest issues"
                Label="Bảng 10 issue mới nhất"
                head={issuesHead}
                rows={issueRows}
                rowsPerPage={10}
                defaultSortKey="issueKey"
                defaultSortOrder="ASC"
                emptyView="Không có issue trong project."
                paginationi18n={{
                  prev: 'Trang trước',
                  next: 'Trang sau',
                  label: 'Phân trang bảng issue',
                }}
              />
            </Stack>
          </Box>
        </TabPanel>

        <TabPanel>
          <Box padding="space.200">
            {staleIssues.length === 0 ? (
              <Box padding="space.200" backgroundColor="color.background.success">
                <EmptyState
                  header="Không có stale issue"
                  description="Mọi issue đều được cập nhật trong vòng 7 ngày qua."
                />
              </Box>
            ) : (
              <Stack space="space.100">
                <Text>Issue không cập nhật trong 7+ ngày (tối đa {staleIssues.length} bản ghi).</Text>
                <DynamicTable
                  caption="Stale issues"
                  Label="Bảng issue stale"
                  head={staleHead}
                  rows={staleRows}
                  rowsPerPage={10}
                  defaultSortKey="issueKey"
                  defaultSortOrder="ASC"
                  emptyView="Không có stale issue."
                  paginationi18n={{
                    prev: 'Trang trước',
                    next: 'Trang sau',
                    label: 'Phân trang stale issues',
                  }}
                />
              </Stack>
            )}
          </Box>
        </TabPanel>

        <TabPanel>
          <Box padding="space.200">
            {bugBarSum === 0 ? (
              <EmptyState
                header="Không có bug"
                description="Không có issue loại Bug trong project (hoặc chưa được lập chỉ mục)."
              />
            ) : (
              <BarChart
                data={bugsBar}
                xAccessor={0}
                yAccessor={1}
                colorAccessor={2}
                title="Bugs theo priority"
                subtitle="Chỉ tính issue có loại Bug"
                height={320}
                width={400}
              />
            )}
          </Box>
        </TabPanel>
      </Tabs>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
