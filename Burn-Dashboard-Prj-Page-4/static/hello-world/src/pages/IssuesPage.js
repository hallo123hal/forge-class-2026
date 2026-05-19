import React, { useMemo, useState } from 'react';
import { mockIssues } from '../data/mockData';

function compareKeys(a, b, direction) {
    const result = a.key.localeCompare(b.key, undefined, { numeric: true });
    return direction === 'asc' ? result : -result;
}

function IssuesPage() {
    const [sortDir, setSortDir] = useState('asc');

    const sorted = useMemo(
        () => [...mockIssues].sort((a, b) => compareKeys(a, b, sortDir)),
        [sortDir]
    );

    const toggleSort = () => {
        setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    };

    return (
        <section className="page">
            <h2>Issues</h2>
            <table className="issues-table">
                <thead>
                    <tr>
                        <th>
                            <button type="button" className="sort-btn" onClick={toggleSort}>
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
        </section>
    );
}

export default IssuesPage;
