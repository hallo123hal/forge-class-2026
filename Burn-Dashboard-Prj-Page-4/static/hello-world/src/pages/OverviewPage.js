import React from 'react';
import { sprintOverview } from '../data/mockData';

function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function OverviewPage() {
    const { name, startDate, endDate, totalIssues } = sprintOverview;

    return (
        <section className="page">
            <h2>Overview</h2>
            <dl className="overview-grid">
                <div>
                    <dt>Sprint</dt>
                    <dd>{name}</dd>
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
