const ROUTE_IDS = ['overview', 'burndown', 'issues'];
const ROUTES = ROUTE_IDS.map((id) => `/${id}`);

/**
 * Forge createHistory() may return a short path (/overview) or a longer
 * Jira-hosted path (.../apps/<id>/<env>/overview). React Router needs /overview.
 */
export function normalizePathname(raw) {
    if (!raw) {
        return '/overview';
    }

    let path = String(raw).split('?')[0].split('#')[0];
    if (!path.startsWith('/')) {
        path = `/${path}`;
    }
    path = path.replace(/\/$/, '') || '/';

    const lastSegment = path.split('/').filter(Boolean).pop();
    if (lastSegment && ROUTE_IDS.includes(lastSegment)) {
        return `/${lastSegment}`;
    }

    if (ROUTES.includes(path)) {
        return path;
    }

    return '/overview';
}

export { ROUTES, ROUTE_IDS };
