import React, { useEffect, useMemo, useState } from 'react';
import { invoke } from '@forge/bridge';

function compareKeys(a, b, direction) {
    const result = a.key.localeCompare(b.key, undefined, { numeric: true });
    return direction === 'asc' ? result : -result;
}

function IssuesPage() {
    const [sortDir, setSortDir] = useState('asc');
    const [state, setState] = useState({ loading: true, error: '', issues: [] });

    useEffect(() => {
        invoke('getIssues')
            .then((issues) => setState({ loading: false, error: '', issues }))
            .catch((e) => setState({
                loading: false,
                error: e.message || 'Failed to load issues',
                issues: [],
            }));
    }, []);

    const sorted = useMemo(
        () => [...state.issues].sort((a, b) => compareKeys(a, b, sortDir)),
        [state.issues, sortDir]
    );

    if (state.loading) {
        return <section className="page"><p>Loading issues…</p></section>;
    }

    if (state.error) {
        return <section className="page page--error"><p>{state.error}</p></section>;
    }

    return (
        <section className="page">
            <h2>Issues</h2>
            {sorted.length === 0 ? (
                <p>No issues found.</p>
            ) : (
                <table className="issues-table">
                    <thead>
                        <tr>
                            <th>
                                <button type="button" className="sort-btn" onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}>
                                    Key {sortDir === 'asc' ? '▲' : '▼'}
                                </button>
                            </th>
                            <th>Summary</th>
                            <th>Status</th>
                            <th>Assignee</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((issue) => (
                            <tr key={issue.key}>
                                <td>{issue.key}</td>
                                <td>{issue.summary}</td>
                                <td>{issue.status}</td>
                                <td>{issue.assignee}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </section>
    );
}

export default IssuesPage;
