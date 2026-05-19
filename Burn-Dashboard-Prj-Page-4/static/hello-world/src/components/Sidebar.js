import React from 'react';
import { NavLink } from 'react-router-dom';

const links = [
    { to: '/overview', label: 'Overview' },
    { to: '/burndown', label: 'Burndown Chart' },
    { to: '/issues', label: 'Issues' },
];

function Sidebar() {
    return (
        <aside className="sidebar">
            <h1 className="sidebar-title">Burn Dashboard</h1>
            <nav className="sidebar-nav">
                {links.map(({ to, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className="sidebar-link"
                        activeClassName="sidebar-link--active"
                        exact
                    >
                        {label}
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}

export default Sidebar;
