import React from 'react';
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
import { burndownData } from '../data/mockData';

function BurndownPage() {
    return (
        <section className="page">
            <h2>Burndown Chart</h2>
            <p className="page-lead">Ideal vs actual remaining work (mock data)</p>
            <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={360}>
                    <LineChart data={burndownData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#DFE1E6" />
                        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} label={{ value: 'Points', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="ideal"
                            name="Ideal"
                            stroke="#0052CC"
                            strokeWidth={2}
                            dot={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="actual"
                            name="Actual"
                            stroke="#FF5630"
                            strokeWidth={2}
                            activeDot={{ r: 5 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}

export default BurndownPage;
