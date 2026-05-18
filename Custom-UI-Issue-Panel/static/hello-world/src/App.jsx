import React, { useEffect, useState } from 'react';
import { requestJira, showFlag, view } from '@forge/bridge';
import './App.css';

function formatContextRows(context) {
  return [
    ['cloudId', context.cloudId],
    ['accountId', context.accountId],
    ['moduleKey', context.moduleKey],
    ['localId', context.localId],
    ['locale', context.locale],
    ['timezone', context.timezone],
    ['siteUrl', context.siteUrl],
    ['extension.type', context.extension?.type],
    ['extension.issue.key', context.extension?.issue?.key],
    ['extension.issue.id', context.extension?.issue?.id],
    ['extension.issue.type', context.extension?.issue?.type],
  ].filter(([, value]) => value !== undefined && value !== null);
}

function formatCreated(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function App() {
  const [contextRows, setContextRows] = useState([]);
  const [issueRows, setIssueRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const ctx = await view.getContext();
        if (cancelled) return;

        setContextRows(formatContextRows(ctx));

        const issueKey = ctx.extension?.issue?.key;
        if (!issueKey) {
          throw new Error('No issue key in extension context');
        }

        const res = await requestJira(
          `/rest/api/3/issue/${issueKey}?fields=summary,status,priority,assignee,created`
        );

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Jira API ${res.status}: ${body}`);
        }

        const issue = await res.json();
        if (cancelled) return;

        setIssueRows([
          ['Key', issue.key],
          ['Summary', issue.fields?.summary ?? '—'],
          ['Status', issue.fields?.status?.name ?? '—'],
          ['Priority', issue.fields?.priority?.name ?? 'None'],
          ['Assignee', issue.fields?.assignee?.displayName ?? 'Unassigned'],
          ['Created', formatCreated(issue.fields?.created)],
        ]);

        showFlag({
          id: 'issue-loaded',
          title: `Issue loaded: ${issue.key}`,
          type: 'success',
        });
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="panel">Loading…</div>;
  }

  if (error) {
    return <div className="panel panel--error">{error}</div>;
  }

  return (
    <div className="panel">
      <h2>view.getContext() — debug info</h2>
      <table className="forge-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {contextRows.map(([field, value]) => (
            <tr key={field}>
              <td>{field}</td>
              <td>{String(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>requestJira() — issue details</h2>
      <table className="forge-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {issueRows.map(([field, value]) => (
            <tr key={field}>
              <td>{field}</td>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
