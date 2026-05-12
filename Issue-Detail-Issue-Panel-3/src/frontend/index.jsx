import React, { useCallback, useEffect, useState } from 'react';
import ForgeReconciler, {
  Badge,
  Box,
  Button,
  EmptyState,
  Heading,
  Lozenge,
  SectionMessage,
  Spinner,
  Stack,
  Strong,
  Text,
  useProductContext,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const context = useProductContext();
  const issueKey = context?.extension?.issue?.key;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [issueData, setIssueData] = useState(null);

  const fetchIssue = useCallback(async () => {
    if (!issueKey) {
      setIssueData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await invoke('getIssueDetail', { issueKey });
      setIssueData(data);
    } catch (e) {
      setIssueData(null);
      setError(e?.message || 'Đã xảy ra lỗi không xác định.');
    } finally {
      setLoading(false);
    }
  }, [issueKey]);

  useEffect(() => {
    fetchIssue();
  }, [fetchIssue]);

  if (!context) {
    return <Spinner label="Đang tải context..." />;
  }

  if (!issueKey) {
    return (
      <EmptyState
        header="Không có dữ liệu issue"
        description="Mở một issue trong Jira để xem chi tiết trong panel này."
      />
    );
  }

  if (loading) {
    return <Spinner label="Đang tải chi tiết issue..." />;
  }

  if (error) {
    return (
      <Stack space="space.200">
        <SectionMessage appearance="error" title="Lỗi tải dữ liệu">
          <Text>{error}</Text>
        </SectionMessage>
        <Button appearance="default" onClick={fetchIssue}>
          Thử lại
        </Button>
      </Stack>
    );
  }

  if (!issueData) {
    return (
      <EmptyState
        header="Không có dữ liệu"
        description="Không nhận được thông tin issue từ server."
      />
    );
  }

  const createdLabel = issueData.created
    ? new Date(issueData.created).toLocaleString('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

  return (
    <Stack space="space.200">
      <Stack space="space.100">
        <Heading as="h2">Chi tiết issue</Heading>
        <Text>
          <Strong>Key:</Strong> {issueData.key}
        </Text>
        <Text>
          <Strong>Summary:</Strong> {issueData.summary || '—'}
        </Text>
        <Text>
          <Strong>Status:</Strong>{' '}
          <Lozenge appearance={issueData.statusLozengeAppearance}>
            {issueData.statusName || '—'}
          </Lozenge>
        </Text>
        <Text>
          <Strong>Priority:</Strong>{' '}
          <Badge appearance="primary">
            {issueData.priorityName || '—'}
          </Badge>
        </Text>
        <Text>
          <Strong>Assignee:</Strong> {issueData.assignee}
        </Text>
        <Text>
          <Strong>Số comment:</Strong> {issueData.commentCount}
        </Text>
        <Text>
          <Strong>Ngày tạo:</Strong> {createdLabel}
        </Text>
      </Stack>
      <Box>
        <Button appearance="primary" onClick={fetchIssue}>
          Refresh
        </Button>
      </Box>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
