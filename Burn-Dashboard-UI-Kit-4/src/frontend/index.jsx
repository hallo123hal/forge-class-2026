import React, { useEffect, useMemo, useState } from 'react';
import ForgeReconciler, {
    Box,
    Button,
    DynamicTable,
    EmptyState,
    Heading,
    Inline,
    LineChart,
    SectionMessage,
    Spinner,
    Stack,
    Strong,
    Text,
} from '@forge/react';
import { invoke, view } from '@forge/bridge';

const ROUTE_IDS = ['overview', 'burndown', 'issues'];
const NAV_LINKS = [
    { to: '/overview', label: 'Overview' },
    { to: '/burndown', label: 'Burndown Chart' },
    { to: '/issues', label: 'Issues' },
];

const issuesHead = {
    cells: [
        { key: 'issueKey', content: 'Key', isSortable: true, width: 14 },
        { key: 'summary', content: 'Summary', isSortable: true, shouldTruncate: true },
        { key: 'status', content: 'Status', isSortable: true, width: 16 },
        { key: 'assignee', content: 'Assignee', isSortable: true, width: 18 },
    ],
};

function normalizePathname(raw) {
    if (!raw) {
        return '/overview';
    }
    let path = String(raw).split('?')[0].split('#')[0];
    if (!path.startsWith('/')) {
        path = `/${path}`;
    }
    path = path.replace(/\/$/, '') || '/';
    const last = path.split('/').filter(Boolean).pop();
    if (last && ROUTE_IDS.includes(last)) {
        return `/${last}`;
    }
    return ROUTE_IDS.map((id) => `/${id}`).includes(path) ? path : '/overview';
}

function formatDate(iso) {
    if (!iso) {
        return '—';
    }
    return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function toLineChartData(points) {
    const rows = [];
    (points || []).forEach(({ day, ideal, actual }) => {
        rows.push([day, ideal, 'Ideal']);
        rows.push([day, actual, 'Actual']);
    });
    return rows;
}

/** @param {{ label: string; value: string | number }} props */
function StatTile({ label, value }) {
    return (
        <Box padding="space.200" backgroundColor="color.background.neutral">
            <Stack space="space.050">
                <Text>{label}</Text>
                <Text>
                    <Strong>{value}</Strong>
                </Text>
            </Stack>
        </Box>
    );
}

function NavBar({ history, pathname }) {
    return (
        <Inline space="space.100">
            {NAV_LINKS.map(({ to, label }) => (
                <Button
                    key={to}
                    appearance={pathname === to ? 'primary' : 'default'}
                    onClick={() => history.push(to)}
                >
                    {label}
                </Button>
            ))}
        </Inline>
    );
}

function OverviewPage() {
    const [state, setState] = useState({ loading: true, error: '', data: null });

    useEffect(() => {
        invoke('getOverview')
            .then((data) => setState({ loading: false, error: '', data }))
            .catch((e) => setState({
                loading: false,
                error: e.message || 'Failed to load overview',
                data: null,
            }));
    }, []);

    if (state.loading) {
        return <Spinner label="Loading overview" />;
    }

    if (state.error) {
        return (
            <SectionMessage appearance="error">
                <Text>{state.error}</Text>
            </SectionMessage>
        );
    }

    const { sprintName, startDate, endDate, totalIssues } = state.data;

    return (
        <Stack space="space.200">
            <Heading size="medium">Overview</Heading>
            <Inline space="space.200" alignBlock="stretch">
                <StatTile label="Sprint" value={sprintName} />
                <StatTile label="Start date" value={formatDate(startDate)} />
                <StatTile label="End date" value={formatDate(endDate)} />
                <StatTile label="Total issues" value={totalIssues} />
            </Inline>
        </Stack>
    );
}

function BurndownPage() {
    const [state, setState] = useState({
        loading: true,
        error: '',
        points: [],
        sprintName: '',
    });

    useEffect(() => {
        invoke('getBurndown')
            .then((result) => setState({
                loading: false,
                error: '',
                points: result.data || [],
                sprintName: result.sprintName || '',
            }))
            .catch((e) => setState({
                loading: false,
                error: e.message || 'Failed to load burndown',
                points: [],
                sprintName: '',
            }));
    }, []);

    const chartData = useMemo(() => toLineChartData(state.points), [state.points]);

    if (state.loading) {
        return <Spinner label="Loading burndown" />;
    }

    if (state.error) {
        return (
            <SectionMessage appearance="error">
                <Text>{state.error}</Text>
            </SectionMessage>
        );
    }

    if (chartData.length === 0) {
        return (
            <EmptyState
                header="No burndown data"
                description="No issues found for the current sprint or time window."
            />
        );
    }

    return (
        <Stack space="space.200">
            <Heading size="medium">Burndown Chart</Heading>
            <Text>
                {state.sprintName
                    ? `Ideal vs actual — ${state.sprintName}`
                    : 'Ideal vs actual remaining issues (last 14 days)'}
            </Text>
            <LineChart
                data={chartData}
                xAccessor={0}
                yAccessor={1}
                colorAccessor={2}
                title="Sprint burndown"
                subtitle="Ideal vs actual remaining work"
                height={360}
                colorPalette={['#0052CC', '#FF5630']}
            />
        </Stack>
    );
}

/** @param {Record<string, string>} issue */
function issueToRow(issue) {
    return {
        key: issue.key,
        cells: [
            { key: issue.key, content: <Text>{issue.key}</Text> },
            { key: issue.summary, content: <Text>{issue.summary || '—'}</Text> },
            { key: issue.status, content: <Text>{issue.status}</Text> },
            { key: issue.assignee, content: <Text>{issue.assignee}</Text> },
        ],
    };
}

function IssuesPage() {
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

    const rows = useMemo(
        () => state.issues.map(issueToRow),
        [state.issues]
    );

    if (state.loading) {
        return <Spinner label="Loading issues" />;
    }

    if (state.error) {
        return (
            <SectionMessage appearance="error">
                <Text>{state.error}</Text>
            </SectionMessage>
        );
    }

    return (
        <Stack space="space.200">
            <Heading size="medium">Issues</Heading>
            {rows.length === 0 ? (
                <EmptyState header="No issues" description="No issues found in this project or sprint." />
            ) : (
                <DynamicTable
                    caption="Project issues"
                    head={issuesHead}
                    rows={rows}
                    rowsPerPage={10}
                    defaultSortKey="issueKey"
                    defaultSortOrder="ASC"
                    emptyView="No issues found."
                />
            )}
        </Stack>
    );
}

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
        return <Spinner label="Initializing router" />;
    }

    return (
        <Stack space="space.300">
            <Heading size="large">Burn Dashboard (UI Kit)</Heading>
            <NavBar history={history} pathname={pathname} />
            <Box padding="space.100">
                {pathname === '/overview' ? <OverviewPage /> : null}
                {pathname === '/burndown' ? <BurndownPage /> : null}
                {pathname === '/issues' ? <IssuesPage /> : null}
            </Box>
        </Stack>
    );
}

ForgeReconciler.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
