import React, { useEffect, useState } from 'react';
import { view } from '@forge/bridge';
import Sidebar from './components/Sidebar';
import BurndownPage from './pages/BurndownPage';
import IssuesPage from './pages/IssuesPage';
import OverviewPage from './pages/OverviewPage';
import { normalizePathname } from './routing';
import './App.css';

function App() {
    const [history, setHistory] = useState(null);
    const [pathname, setPathname] = useState(null);

    useEffect(() => {
        let unlisten;

        const setup = async () => {
            const h = await view.createHistory();
            const sync = () => {
                const next = normalizePathname(h.location?.pathname);
                if (next !== h.location?.pathname) {
                    h.replace(next);
                }
                setPathname(next);
            };

            sync();
            unlisten = h.listen(sync);
            setHistory(h);
        };

        setup();

        return () => {
            if (unlisten) {
                unlisten();
            }
        };
    }, []);

    if (!history || pathname === null) {
        return <p className="app-loading">Loading…</p>;
    }

    return (
        <div className="app-shell">
            <Sidebar history={history} pathname={pathname} />
            <main className="app-main">
                {pathname === '/overview' ? <OverviewPage /> : null}
                {pathname === '/burndown' ? <BurndownPage /> : null}
                {pathname === '/issues' ? <IssuesPage /> : null}
            </main>
        </div>
    );
}

export default App;
