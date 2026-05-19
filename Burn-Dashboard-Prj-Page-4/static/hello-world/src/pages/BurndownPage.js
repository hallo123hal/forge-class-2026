import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

function BurndownPage() {
    const [state, setState] = useState({ loading: true, error: '', data: [], sprintName: '' });

    useEffect(() => {
        invoke('getBurndown')
            .then((result) => setState({
                loading: false,
                error: '',
                data: result.data || [],
                sprintName: result.sprintName || '',
            }))
            .catch((e) => setState({
                loading: false,
                error: e.message || 'Failed to load burndown',
                data: [],
                sprintName: '',
            }));
    }, []);

    if (state.loading) {
        return <section className="page"><p>Loading burndown…</p></section>;
    }

    if (state.error) {
        return <section className="page page--error"><p>{state.error}</p></section>;
    }

    return (
        <section className="page">
            <h2>Burndown Chart</h2>
            <p className="page-lead">
                {state.sprintName
                    ? `Ideal vs actual — ${state.sprintName}`
                    : 'Ideal vs actual remaining issues (last 14 days)'}
            </p>
            <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={360}>
                    <LineChart data={state.data} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#DFE1E6" />
                        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="ideal" name="Ideal" stroke="#0052CC" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="actual" name="Actual" stroke="#FF5630" strokeWidth={2} activeDot={{ r: 5 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}

export default BurndownPage;
