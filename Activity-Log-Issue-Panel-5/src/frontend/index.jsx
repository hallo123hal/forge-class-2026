import React, { useCallback, useEffect, useState } from 'react';
import ForgeReconciler, {
  Button,
  ButtonGroup,
  EmptyState,
  List,
  ListItem,
  LoadingButton,
  SectionMessage,
  Spinner,
  Stack,
  Strong,
  Text,
  useProductContext,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const formatViewedAt = (iso) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const App = () => {
  const context = useProductContext();
  const issueKey = context?.extension?.issue?.key;

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const applyPage = useCallback((page, append) => {
    const incoming = page?.logs ?? [];
    setLogs((prev) => (append ? [...prev, ...incoming] : incoming));
    setNextCursor(page?.nextCursor ?? null);
    setHasMore(Boolean(page?.hasMore));
  }, []);

  const openPanel = useCallback(async () => {
    if (!issueKey) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const page = await invoke('recordPanelOpen', { issueKey });
      applyPage(page, false);
    } catch (e) {
      setError(e?.message || 'Không tải được lịch sử xem.');
      setLogs([]);
      setNextCursor(null);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [issueKey, applyPage]);

  useEffect(() => {
    openPanel();
  }, [openPanel]);

  const handleLoadMore = async () => {
    if (!issueKey || !nextCursor) {
      return;
    }

    setLoadingMore(true);
    setError(null);
    try {
      const page = await invoke('getViewLogs', {
        issueKey,
        cursor: nextCursor,
      });
      applyPage(page, true);
    } catch (e) {
      setError(e?.message || 'Không tải thêm lịch sử.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleClearHistory = async () => {
    if (!issueKey) {
      return;
    }

    setClearing(true);
    setError(null);
    try {
      await invoke('clearViewHistory', { issueKey });
      setLogs([]);
      setNextCursor(null);
      setHasMore(false);
    } catch (e) {
      setError(e?.message || 'Xóa lịch sử thất bại.');
    } finally {
      setClearing(false);
    }
  };

  if (!context) {
    return <Spinner label="Đang tải context…" />;
  }

  if (!issueKey) {
    return (
      <EmptyState
        header="Không có issue"
        description="Mở một issue trong Jira để xem lịch sử hoạt động."
      />
    );
  }

  if (loading) {
    return <Spinner label="Đang ghi nhận lượt xem và tải lịch sử…" />;
  }

  return (
    <Stack space="space.200">
      <Text>
        Theo dõi các lần mở panel trên issue <Strong>{issueKey}</Strong>.
      </Text>

      {error ? (
        <SectionMessage appearance="error" title="Lỗi">
          <Text>{error}</Text>
        </SectionMessage>
      ) : null}

      {logs.length === 0 ? (
        <EmptyState
          header="Chưa có lịch sử"
          description="Lần mở panel tiếp theo sẽ được ghi vào KVS."
        />
      ) : (
        <List>
          {logs.map((log) => (
            <ListItem key={log.key}>
              <Text>
                <Strong>{formatViewedAt(log.viewedAt ?? log.timestamp)}</Strong>
                {' — '}
                {log.accountId}
              </Text>
            </ListItem>
          ))}
        </List>
      )}

      <ButtonGroup>
        <LoadingButton
          appearance="default"
          isLoading={loadingMore}
          isDisabled={!hasMore || clearing}
          onClick={handleLoadMore}
        >
          Xem thêm
        </LoadingButton>
        <LoadingButton
          appearance="warning"
          isLoading={clearing}
          isDisabled={loadingMore}
          onClick={handleClearHistory}
        >
          Xóa lịch sử
        </LoadingButton>
        <Button appearance="subtle" onClick={openPanel} isDisabled={loadingMore || clearing}>
          Làm mới
        </Button>
      </ButtonGroup>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
