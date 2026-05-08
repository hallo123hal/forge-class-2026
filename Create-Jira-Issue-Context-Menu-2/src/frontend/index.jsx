import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Button, Label, Link, Select, Text, Textfield, useProductContext } from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const context = useProductContext();
  const [summary, setSummary] = useState('');
  const [issueTypes, setIssueTypes] = useState([]);
  const [issueTypeId, setIssueTypeId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdIssue, setCreatedIssue] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const selectedText = context?.extension?.selectedText?.trim() || '';
        setSummary(selectedText);

        const types = await invoke('getIssueTypes');
        const mapped = (types || []).map((item) => ({
          label: item.name,
          value: item.id,
        }));
        setIssueTypes(mapped);
        setIssueTypeId(mapped[0]?.value || '');
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : 'Failed to load issue types.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    if (context) {
      initialize();
    }
  }, [context]);

  const handleSubmit = async () => {
    setError('');
    setCreatedIssue(null);

    if (!summary.trim()) {
      setError('Summary is required.');
      return;
    }
    if (!issueTypeId) {
      setError('Please choose an issue type.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await invoke('createJiraIssue', {
        summary: summary.trim(),
        issueTypeId,
        siteUrl: context?.siteUrl || '',
      });
      setCreatedIssue(result);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : 'Failed to create Jira issue.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Text>Create Jira Issue</Text>
      {isLoading ? <Text>Loading...</Text> : null}
      {!isLoading ? (
        <>
          <Label labelFor="summary">Summary</Label>
          <Textfield
            id="summary"
            value={summary}
            onChange={(value) => setSummary(typeof value === 'string' ? value : value?.target?.value || '')}
          />

          <Label labelFor="issue-type">Issue Type</Label>
          <Select
            inputId="issue-type"
            options={issueTypes}
            value={issueTypes.find((item) => item.value === issueTypeId) || null}
            onChange={(option) => setIssueTypeId(option?.value || '')}
            placeholder="Select issue type"
          />

          <Button appearance="primary" onClick={handleSubmit} isDisabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create issue'}
          </Button>
        </>
      ) : null}

      {error ? <Text>{error}</Text> : null}

      {createdIssue?.key ? (
        <>
          <Text>{`Issue created: ${createdIssue.key}`}</Text>
          {createdIssue.issueUrl ? (
            <Link href={createdIssue.issueUrl}>{createdIssue.issueUrl}</Link>
          ) : null}
        </>
      ) : null}
    </>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
