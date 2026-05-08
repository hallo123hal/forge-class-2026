import React, { useEffect, useMemo, useState } from 'react';
import { invoke, view } from '@forge/bridge';
import { Navigate, NavLink, Route, Router, Routes } from 'react-router-dom';

const navStyle = {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    borderBottom: '1px solid #DFE1E6',
    paddingBottom: '8px'
};

const linkStyle = ({ isActive }) => ({
    color: isActive ? '#0052CC' : '#42526E',
    textDecoration: 'none',
    fontWeight: isActive ? 600 : 400
});

function OverviewPage() {
    const [state, setState] = useState({ loading: true, error: '', data: null });

    useEffect(() => {
        invoke('getOverview')
            .then((data) => setState({ loading: false, error: '', data }))
            .catch((e) => setState({ loading: false, error: e.message || 'Failed to load data', data: null }));
    }, []);

    if (state.loading) return <p>Loading overview...</p>;
    if (state.error) return <p>{state.error}</p>;

    return (
        <section>
            <h2>Overview</h2>
            <p><strong>Project key:</strong> {state.data.projectKey}</p>
            <p><strong>Project type:</strong> {state.data.projectType}</p>
            <p><strong>Total issues:</strong> {state.data.issueCount}</p>
        </section>
    );
}

function RecentIssuesPage() {
    const [state, setState] = useState({ loading: true, error: '', data: [] });

    useEffect(() => {
        invoke('getRecentIssues')
            .then((data) => setState({ loading: false, error: '', data }))
            .catch((e) => setState({ loading: false, error: e.message || 'Failed to load issues', data: [] }));
    }, []);

    if (state.loading) return <p>Loading issues...</p>;
    if (state.error) return <p>{state.error}</p>;

    return (
        <section>
            <h2>Recent Issues</h2>
            {state.data.length === 0 ? (
                <p>No issues found.</p>
            ) : (
                <ul>
                    {state.data.map((issue) => (
                        <li key={issue.key}>
                            <strong>{issue.key}</strong>: {issue.summary || '(No summary)'} - {issue.status} - {issue.assignee}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function TeamPage() {
    const [state, setState] = useState({ loading: true, error: '', data: [] });

    useEffect(() => {
        invoke('getTeam')
            .then((data) => setState({ loading: false, error: '', data }))
            .catch((e) => setState({ loading: false, error: e.message || 'Failed to load team members', data: [] }));
    }, []);

    if (state.loading) return <p>Loading team...</p>;
    if (state.error) return <p>{state.error}</p>;

    return (
        <section>
            <h2>Team</h2>
            {state.data.length === 0 ? (
                <p>No assignees in the last 7 days.</p>
            ) : (
                <ul>
                    {state.data.map((user) => (
                        <li key={user.accountId}>{user.displayName}</li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function App() {
    const [historyState, setHistoryState] = useState(null);

    useEffect(() => {
        let unsubscribe;

        const setup = async () => {
            const history = await view.createHistory();
            setHistoryState({
                action: history.action,
                location: history.location,
                navigator: history
            });

            unsubscribe = history.listen((location, action) => {
                setHistoryState({
                    action,
                    location,
                    navigator: history
                });
            });
        };

        setup();
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    const router = useMemo(() => {
        if (!historyState) {
            return null;
        }
        return (
            <Router
                navigationType={historyState.action}
                location={historyState.location}
                navigator={historyState.navigator}
            >
                <nav style={navStyle}>
                    <NavLink to="/overview" style={linkStyle}>Overview</NavLink>
                    <NavLink to="/recent-issues" style={linkStyle}>Recent Issues</NavLink>
                    <NavLink to="/team" style={linkStyle}>Team</NavLink>
                </nav>

                <Routes>
                    <Route path="/" element={<Navigate to="/overview" replace />} />
                    <Route path="/overview" element={<OverviewPage />} />
                    <Route path="/recent-issues" element={<RecentIssuesPage />} />
                    <Route path="/team" element={<TeamPage />} />
                </Routes>
            </Router>
        );
    }, [historyState]);

    return router || <p>Initializing router...</p>;
}

export default App;
