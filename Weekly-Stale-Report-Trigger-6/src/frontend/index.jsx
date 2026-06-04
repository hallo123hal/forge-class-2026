import React, { useCallback, useEffect, useState } from 'react';
import ForgeReconciler, {
  Box,
  Button,
  DynamicTable,
  Heading,
  Inline,
  Spinner,
  Stack,
  Text,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const INVOKE_TIMEOUT_MS = 15000;

const issuesHead = {
  cells: [
    { key: 'key', content: 'Key', width: 14 },
    { key: 'summary', content: 'Summary', shouldTruncate: true },
    { key: 'status', content: 'Status', width: 14 },
    { key: 'assignee', content: 'Assignee', width: 18 },
    { key: 'updated', content: 'Updated', width: 20 },
  ],
};

const invokeWithTimeout = async (resolverKey, payload, timeoutMs = INVOKE_TIMEOUT_MS) => {
  let timer;
  try {
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new Error(
            `Timed out after ${timeoutMs / 1000}s while loading data from resolver "${resolverKey}".`,
          ),
        );
      }, timeoutMs);
    });

    return await Promise.race([invoke(resolverKey, payload), timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
};

const App = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await invokeWithTimeout('getStaleReport');
      setReport(data);
    } catch (err) {
      setError(err?.message || 'Failed to load stale report from storage.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  if (loading) {
    return (
      <Box>
        <Inline alignBlock="center" space="space.100">
          <Spinner size="small" />
          <Text>Loading stale report...</Text>
        </Inline>
      </Box>
    );
  }

  if (error) {
    return (
      <Stack space="space.200">
        <Text>{error}</Text>
        <Button appearance="primary" onClick={loadReport}>
          Retry
        </Button>
      </Stack>
    );
  }

  if (!report) {
    return (
      <Stack space="space.200">
        <Heading size="medium">Stale Report</Heading>
        <Text>No report in storage yet.</Text>
        <Text>Run the web trigger or wait for the daily schedule, then refresh.</Text>
        <Button appearance="primary" onClick={loadReport}>
          Refresh
        </Button>
      </Stack>
    );
  }

  const issues = Array.isArray(report.issues) ? report.issues : [];
  const rows = issues.slice(0, 50).map((issue) => ({
    key: issue.key,
    cells: [
      { key: `${issue.key}-key`, content: issue.key },
      { key: `${issue.key}-summary`, content: issue.summary || '-' },
      { key: `${issue.key}-status`, content: issue.status || '-' },
      { key: `${issue.key}-assignee`, content: issue.assignee || 'Unassigned' },
      {
        key: `${issue.key}-updated`,
        content: issue.updated ? new Date(issue.updated).toLocaleString() : '-',
      },
    ],
  }));

  return (
    <Stack space="space.300">
      <Heading size="medium">Stale Report</Heading>
      <Text>Generated at: {report.generatedAt}</Text>
      <Text>JQL: {report.jql}</Text>
      <Text>Total: {report.total}</Text>
      {issues.length === 0 ? (
        <Text>No stale issues found.</Text>
      ) : (
        <DynamicTable
          head={issuesHead}
          rows={rows}
          rowsPerPage={10}
          defaultPage={1}
          isFixedSize
          emptyView={<Text>No issues.</Text>}
        />
      )}
      {issues.length > 50 ? <Text>Showing first 50 issues only.</Text> : null}
      <Button appearance="default" onClick={loadReport}>
        Refresh
      </Button>
    </Stack>
  );
};

ForgeReconciler.render(<App />);