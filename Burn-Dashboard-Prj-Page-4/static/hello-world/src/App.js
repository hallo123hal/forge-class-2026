import React, { useEffect, useState } from 'react';
import { view } from '@forge/bridge';
import { Redirect, Route, Router, Switch } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import BurndownPage from './pages/BurndownPage';
import IssuesPage from './pages/IssuesPage';
import OverviewPage from './pages/OverviewPage';
import './App.css';

const ROUTES = ['/overview', '/burndown', '/issues'];

/**
 * Forge createHistory() paths are relative to the app (e.g. /burndown).
 * Normalize unknown paths so F5 and deep links still resolve.
 */
function normalizePathname(raw) {
    let path = raw || '/';
    if (!path.startsWith('/')) {
        path = `/${path}`;
    }
    path = path.replace(/\/$/, '') || '/';
    if (path === '/' || !ROUTES.includes(path)) {
        return '/overview';
    }
    return path;
}

function AppRouter({ history }) {
    return (
        <Router history={history}>
            <div className="app-shell">
                <Sidebar />
                <main className="app-main">
                    <Switch>
                        <Route exact path="/overview" component={OverviewPage} />
                        <Route exact path="/burndown" component={BurndownPage} />
                        <Route exact path="/issues" component={IssuesPage} />
                        <Redirect exact from="/" to="/overview" />
                        <Redirect to="/overview" />
                    </Switch>
                </main>
            </div>
        </Router>
    );
}

function App() {
    const [history, setHistory] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const setup = async () => {
            const h = await view.createHistory();

            if (cancelled) {
                return;
            }

            const current = normalizePathname(h.location?.pathname);
            if (current !== h.location?.pathname) {
                h.replace(current);
            }

            setHistory(h);
        };

        setup();

        return () => {
            cancelled = true;
        };
    }, []);

    if (!history) {
        return <p className="app-loading">Initializing router…</p>;
    }

    return <AppRouter history={history} />;
}

export default App;
