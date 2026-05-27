import React, { useCallback, useEffect, useState } from 'react';
import ForgeReconciler, {
  Lozenge,
  SectionMessage,
  Spinner,
  Stack,
  Text,
  useProductContext,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const context = useProductContext();
  const issueKey = context?.extension?.issue?.key;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);

  const loadSummary = useCallback(async () => {
    if (!issueKey) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await invoke('getChecklistItems', { issueKey });
      setDone(result?.done ?? 0);
      setTotal(result?.total ?? 0);
    } catch (e) {
      setError(e?.message || 'Không tải được tiến độ checklist.');
      setDone(0);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [issueKey]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  if (!context || loading) {
    return <Spinner label="Đang tải…" />;
  }

  if (!issueKey) {
    return <Text>Không lấy được issue key.</Text>;
  }

  if (error) {
    return (
      <SectionMessage appearance="error" title="Lỗi">
        <Text>{error}</Text>
      </SectionMessage>
    );
  }

  const appearance =
    total > 0 && done === total ? 'success' : done > 0 ? 'inprogress' : 'default';

  return (
    <Stack space="space.100">
      <Text>Tiến độ checklist của issue:</Text>
      <Lozenge appearance={appearance}>{`${done}/${total} hoàn thành`}</Lozenge>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
