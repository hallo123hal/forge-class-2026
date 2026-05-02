import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Strong, Spinner, useProductContext } from '@forge/react';
import { requestJira } from '@forge/bridge';

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

        const res = await requestJira(
          `/rest/api/3/issue/${issueKey}?fields=summary,status,assignee`
        );

        if (!res.ok) {
          throw new Error(`Jira API lỗi: ${res.status}`);
        }

        const data = await res.json();
        setIssueData({
          key: data.key,
          summary: data.fields?.summary ?? '(Không có tiêu đề)',
          status: data.fields?.status?.name ?? '(Không có status)',
          assignee: data.fields?.assignee?.displayName ?? 'Unassigned',
        });
      } catch (e) {
        setError(e.message || 'Có lỗi xảy ra');
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

  return (
    <>
      <Text>
        <Strong>Issue:</Strong> {issueData.key} - {issueData.summary}
      </Text>
      <Text>
        <Strong>Status:</Strong> {issueData.status}
      </Text>
      <Text>
        <Strong>Assignee:</Strong> {issueData.assignee}
      </Text>
    </>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);