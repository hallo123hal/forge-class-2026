import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';

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
        return <section className="page"><p>Loading overview…</p></section>;
    }

    if (state.error) {
        return <section className="page page--error"><p>{state.error}</p></section>;
    }

    const { sprintName, startDate, endDate, totalIssues } = state.data;

    return (
        <section className="page">
            <h2>Overview</h2>
            <dl className="overview-grid">
                <div>
                    <dt>Sprint</dt>
                    <dd>{sprintName}</dd>
                </div>
                <div>
                    <dt>Start date</dt>
                    <dd>{formatDate(startDate)}</dd>
                </div>
                <div>
                    <dt>End date</dt>
                    <dd>{formatDate(endDate)}</dd>
                </div>
                <div>
                    <dt>Total issues</dt>
                    <dd>{totalIssues}</dd>
                </div>
            </dl>
        </section>
    );
}

export default OverviewPage;
