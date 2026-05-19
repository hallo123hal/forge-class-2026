import React from 'react';

const links = [
    { to: '/overview', label: 'Overview' },
    { to: '/burndown', label: 'Burndown Chart' },
    { to: '/issues', label: 'Issues' },
];

function Sidebar({ history, pathname }) {
    return (
        <aside className="sidebar">
            <h1 className="sidebar-title">Burn Dashboard</h1>
            <nav className="sidebar-nav">
                {links.map(({ to, label }) => {
                    const isActive = pathname === to;
                    return (
                        <button
                            key={to}
                            type="button"
                            className={isActive ? 'sidebar-link sidebar-link--active' : 'sidebar-link'}
                            onClick={() => history.push(to)}
                        >
                            {label}
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}

export default Sidebar;
