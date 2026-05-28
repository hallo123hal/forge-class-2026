import React, { useCallback, useEffect, useState } from 'react';
import ForgeReconciler, {
  Button,
  EmptyState,
  Inline,
  List,
  ListItem,
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

const App = () => {
  const context = useProductContext();
  const issueKey = context?.extension?.issue?.key;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const loadIssueState = useCallback(async () => {
    if (!issueKey) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await invoke('getIssueBookmarkState', { issueKey });
      setIsBookmarked(Boolean(result?.isBookmarked));
    } catch (e) {
      setError(e?.message || 'Không tải được trạng thái bookmark của issue.');
      setIsBookmarked(false);
    } finally {
      setLoading(false);
    }
  }, [issueKey]);

  const loadBookmarks = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const result = await invoke('listMyBookmarks');
      setBookmarks(result?.bookmarks ?? []);
    } catch (e) {
      setError(e?.message || 'Không tải được danh sách bookmarks.');
      setBookmarks([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIssueState();
    loadBookmarks();
  }, [loadIssueState, loadBookmarks]);

  const onToggleBookmark = async () => {
    if (!issueKey) return;

    setSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const result = await invoke('toggleBookmark', { issueKey });
      setIsBookmarked(result?.action === 'added');
      setFeedback({
        appearance: 'success',
        title: 'Thành công',
        message: result?.message ?? 'Cập nhật bookmark thành công.',
      });
      await loadBookmarks();
    } catch (e) {
      setError(e?.message || 'Cập nhật bookmark thất bại.');
      setFeedback({
        appearance: 'error',
        title: 'Thất bại',
        message: e?.message || 'Cập nhật bookmark thất bại.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onRemoveBookmark = async (keyToRemove) => {
    setSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const result = await invoke('removeBookmark', { issueKey: keyToRemove });
      setFeedback({
        appearance: 'success',
        title: 'Thành công',
        message: result?.message ?? `Đã xóa bookmark ${keyToRemove}.`,
      });
      if (keyToRemove === issueKey) {
        setIsBookmarked(false);
      }
      await loadBookmarks();
    } catch (e) {
      setError(e?.message || 'Xóa bookmark thất bại.');
      setFeedback({
        appearance: 'error',
        title: 'Thất bại',
        message: e?.message || 'Xóa bookmark thất bại.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!context || loading) {
    return <Spinner label="Đang tải dữ liệu bookmarks..." />;
  }

  if (!issueKey) {
    return (
      <SectionMessage appearance="error" title="Thiếu issue key">
        <Text>Không lấy được issue key từ context Jira.</Text>
      </SectionMessage>
    );
  }

  return (
    <Stack space="space.200">
      {error ? (
        <SectionMessage appearance="error" title="Lỗi">
          <Text>{error}</Text>
        </SectionMessage>
      ) : null}

      {feedback ? (
        <SectionMessage appearance={feedback.appearance} title={feedback.title}>
          <Text>{feedback.message}</Text>
        </SectionMessage>
      ) : null}

      <Tabs>
        <TabList>
          <Tab>Issue này</Tab>
          <Tab>Bookmarks của tôi</Tab>
        </TabList>

        <TabPanel>
          <Stack space="space.150">
            <Text>{`Issue hiện tại: ${issueKey}`}</Text>
            <Button
              appearance={isBookmarked ? 'danger' : 'primary'}
              isDisabled={submitting}
              onClick={onToggleBookmark}
            >
              {isBookmarked ? 'Bỏ bookmark issue này' : 'Bookmark issue này'}
            </Button>
          </Stack>
        </TabPanel>

        <TabPanel>
          {listLoading ? (
            <Spinner label="Đang tải bookmarks..." />
          ) : bookmarks.length === 0 ? (
            <EmptyState
              header="Chưa có bookmark nào"
              description="Bạn chưa bookmark issue nào."
            />
          ) : (
            <List>
              {bookmarks.map((item) => (
                <ListItem key={item.key}>
                  <Stack space="space.050">
                    <Text>{`${item.issueKey} - ${item.summary}`}</Text>
                    <Inline space="space.100" alignBlock="center">
                      <Text>{`Status: ${item.status}`}</Text>
                      <Button
                        appearance="subtle"
                        spacing="compact"
                        isDisabled={submitting}
                        onClick={() => onRemoveBookmark(item.issueKey)}
                      >
                        Xóa
                      </Button>
                    </Inline>
                  </Stack>
                </ListItem>
              ))}
            </List>
          )}
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
