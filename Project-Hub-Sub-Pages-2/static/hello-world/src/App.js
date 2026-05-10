import React, { useEffect, useState } from 'react';
import { invoke, view } from '@forge/bridge';

const ROUTES = ['/overview', '/recent-issues', '/team'];

const navStyle = {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    borderBottom: '1px solid #DFE1E6',
    paddingBottom: '8px'
};

/**
 * Forge createHistory() paths are relative to the app URL (e.g. /overview).
 * Normalize so we always match ROUTES and avoid React Router + custom navigator edge cases.
 */
function normalizePathname(raw) {
    let p = raw || '/';
    if (!p.startsWith('/')) {
        p = `/${p}`;
    }
    p = p.replace(/\/$/, '') || '/';
    if (p === '/' || !ROUTES.includes(p)) {
        return '/overview';
    }
    return p;
}

function linkStyle(isActive) {
    return {
        color: isActive ? '#0052CC' : '#42526E',
        textDecoration: 'none',
        fontWeight: isActive ? 600 : 400,
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        padding: 0,
        font: 'inherit'
    };
}

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

function NavButton({ history, target, label, pathname }) {
    const active = pathname === target;
    return (
        <button
            type="button"
            style={linkStyle(active)}
            onClick={() => history.push(target)}
        >
            {label}
        </button>
    );
}

function App() {
    const [history, setHistory] = useState(null);
    const [pathname, setPathname] = useState(null);

    useEffect(() => {
        let unsubscribe;

        const setup = async () => {
            const h = await view.createHistory();
            setHistory(h);

            const sync = () => {
                setPathname(normalizePathname(h.location?.pathname));
            };

            sync();
            unsubscribe = h.listen(() => sync());
        };

        setup();
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    if (!history || pathname === null) {
        return <p>Initializing router...</p>;
    }

    return (
        <>
            <nav style={navStyle}>
                <NavButton history={history} target="/overview" label="Overview" pathname={pathname} />
                <NavButton history={history} target="/recent-issues" label="Recent Issues" pathname={pathname} />
                <NavButton history={history} target="/team" label="Team" pathname={pathname} />
            </nav>

            {pathname === '/overview' ? <OverviewPage /> : null}
            {pathname === '/recent-issues' ? <RecentIssuesPage /> : null}
            {pathname === '/team' ? <TeamPage /> : null}
        </>
    );
}

export default App;
