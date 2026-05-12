import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ForgeReconciler, {
  Badge,
  Box,
  Button,
  ButtonGroup,
  DynamicTable,
  Heading,
  Lozenge,
  SectionMessage,
  Spinner,
  Stack,
  Text,
  useProductContext,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const FILTER_IDS = /** @type {const} */ (['all', 'open', 'bugs']);

const head = {
  cells: [
    { key: 'issueKey', content: 'Key', isSortable: true, width: 14 },
    { key: 'summary', content: 'Summary', isSortable: true, shouldTruncate: true },
    { key: 'status', content: 'Status', isSortable: true, width: 16 },
    { key: 'priority', content: 'Priority', isSortable: true, width: 14 },
    { key: 'assignee', content: 'Assignee', isSortable: true, width: 18 },
  ],
};

/** @param {Record<string, unknown>} issue */
function issueToTableRow(issue) {
  const summary = issue.summary ?? '';
  const statusName = issue.statusName ?? '';
  const priorityName = issue.priorityName ?? '';
  const assignee = issue.assignee ?? 'Unassigned';

  return {
    key: issue.key,
    cells: [
      {
        key: issue.key,
        content: <Text>{issue.key}</Text>,
      },
      {
        key: summary,
        content: <Text>{summary || '—'}</Text>,
      },
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
      {
        key: assignee,
        content: <Text>{assignee}</Text>,
      },
    ],
  };
}

const App = () => {
  const context = useProductContext();
  const projectKey = context?.extension?.project?.key;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [issues, setIssues] = useState([]);
  const [filter, setFilter] = useState(/** @type {'all' | 'open' | 'bugs'} */ ('all'));

  const loadIssues = useCallback(async () => {
    if (!projectKey) {
      setIssues([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const list = await invoke('getProjectIssues', { projectKey });
      setIssues(Array.isArray(list) ? list : []);
    } catch (e) {
      setIssues([]);
      setError(e?.message || 'Không tải được danh sách issue.');
    } finally {
      setLoading(false);
    }
  }, [projectKey]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  const filteredIssues = useMemo(() => {
    if (filter === 'open') {
      return issues.filter((i) => i.statusCategory !== 'done');
    }
    if (filter === 'bugs') {
      return issues.filter((i) => i.type === 'Bug');
    }
    return issues;
  }, [issues, filter]);

  const rows = useMemo(
    () => filteredIssues.map((issue) => issueToTableRow(issue)),
    [filteredIssues]
  );

  if (!context || loading) {
    return <Spinner />;
  }

  if (!projectKey) {
    return (
      <SectionMessage appearance="warning" title="Thiếu project">
        <Text>Không có project trong ngữ cảnh trang.</Text>
      </SectionMessage>
    );
  }

  if (error) {
    return (
      <Stack space="space.200">
        <SectionMessage appearance="error" title="Lỗi tải dữ liệu">
          <Text>{error}</Text>
        </SectionMessage>
        <Button appearance="primary" onClick={loadIssues}>
          Thử lại
        </Button>
      </Stack>
    );
  }

  return (
    <Stack space="space.200">
      <Stack space="space.100">
        <Heading as="h2">Issues trong project</Heading>
        <Text>
          Project: <Text style={{ fontWeight: 'bold' }}>{projectKey}</Text> — hiển thị tối đa 100 issue gần nhất (theo key),
          lọc phía client không gọi lại API.
        </Text>
      </Stack>

      <Box>
        <ButtonGroup label="Lọc danh sách">
          {FILTER_IDS.map((f) => (
            <Button
              key={f}
              appearance={filter === f ? 'primary' : 'subtle'}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'open' ? 'Open' : 'Bugs'}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      <DynamicTable
        key={filter}
        caption="Danh sách issue"
        Label="Bảng issue theo project"
        head={head}
        rows={rows}
        rowsPerPage={10}
        defaultSortKey="issueKey"
        defaultSortOrder="ASC"
        emptyView="Không có issue nào khớp bộ lọc."
        paginationi18n={{
          prev: 'Trang trước',
          next: 'Trang sau',
          label: 'Phân trang bảng issue',
        }}
      />
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
