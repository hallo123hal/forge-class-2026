import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Spinner, useProductContext } from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const context = useProductContext();
  const [loading, setLoading] = useState(true);
  const [issueData, setIssueData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadIssue = async () => {
      try {
        const issueKey = context?.extension?.issue?.key;
        if (!issueKey) {
          setError('Không lấy được issue key từ context.');
          setLoading(false);
          return;
        }

        const data = await invoke('getIssueDetails', { issueKey });
        setIssueData(data);
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : e && typeof e === 'object' && typeof e.message === 'string'
              ? e.message
              : 'Có lỗi xảy ra';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    if (context) {
      loadIssue();
    }
  }, [context]);

  if (!context || loading) return <Spinner />;
  if (error) return <Text>{error}</Text>;

  const createdDate = issueData?.created
    ? new Date(issueData.created).toLocaleString('vi-VN')
    : 'Unknown';

  return (
    <>
      <Text>{`Priority: ${issueData?.priority ?? 'Unknown'}`}</Text>
      <Text>{`Issue type: ${issueData?.issueType ?? 'Unknown'}`}</Text>
      <Text>{`Assignee: ${issueData?.assignee ?? 'Unassigned'}`}</Text>
      <Text>{`Ngay tao: ${createdDate}`}</Text>
    </>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
