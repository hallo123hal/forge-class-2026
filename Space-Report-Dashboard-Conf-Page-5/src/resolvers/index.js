import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

const PAGE_LIMIT = 50;
const LABEL_TO_ADD = 'review-needed';

const getSpaceKey = (req) => {
  const key = req.context?.extension?.space?.key;
  if (!key) {
    throw new Error('Cannot determine current Confluence space key.');
  }
  return key;
};

const requestJson = async (path) => {
  const response = await api.asApp().requestConfluence(path, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Confluence API failed (${response.status}): ${message}`);
  }

  return response.json();
};

const buildSearchRoute = ({ cql, limit, start, expand }) => {
  const limitText = String(limit);
  const startText = String(start);

  if (expand) {
    return route`/wiki/rest/api/content/search?cql=${cql}&limit=${limitText}&start=${startText}&expand=${expand}`;
  }

  return route`/wiki/rest/api/content/search?cql=${cql}&limit=${limitText}&start=${startText}`;
};

const getSpacePages = async (spaceKey) => {
  let total = 0;
  let start = 0;
  const cql = `space="${spaceKey}" AND type=page`;

  while (true) {
    const data = await requestJson(buildSearchRoute({ cql, limit: PAGE_LIMIT, start }));
    const count = data.results?.length ?? 0;
    total += count;

    if (count < PAGE_LIMIT) {
      break;
    }

    start += PAGE_LIMIT;
  }

  return total;
};

const getNewestPages = async (spaceKey) => {
  const cql = `space="${spaceKey}" AND type=page ORDER BY created DESC`;
  const data = await requestJson(buildSearchRoute({ cql, limit: 5, start: 0, expand: 'history' }));
  return (data.results ?? []).map((page) => ({
    id: page.id,
    title: page.title,
    createdAt: page.history?.createdDate ?? null,
    webui: page._links?.webui ?? null
  }));
};

const getSpaceLabels = async (spaceKey) => {
  const counts = new Map();
  let start = 0;
  const cql = `space="${spaceKey}" AND type=page`;

  while (true) {
    const data = await requestJson(
      buildSearchRoute({ cql, limit: PAGE_LIMIT, start, expand: 'metadata.labels' })
    );
    const pages = data.results ?? [];
    for (const page of pages) {
      const labels = page.metadata?.labels?.results ?? [];
      for (const label of labels) {
        const name = label.name;
        if (!name) {
          continue;
        }
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }

    if (pages.length < PAGE_LIMIT) {
      break;
    }

    start += PAGE_LIMIT;
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, usageCount]) => ({ name, usageCount }));
};

resolver.define('getSpaceHealth', async (req) => {
  const spaceKey = getSpaceKey(req);
  const [totalPages, newestPages, labels] = await Promise.all([
    getSpacePages(spaceKey),
    getNewestPages(spaceKey),
    getSpaceLabels(spaceKey)
  ]);

  return {
    spaceKey,
    totalPages,
    newestPages,
    labels
  };
});

resolver.define('addReviewLabel', async (req) => {
  const spaceKey = getSpaceKey(req);
  const pageId = req.payload?.pageId;

  if (!pageId) {
    throw new Error('Missing required pageId.');
  }

  const response = await api.asApp().requestConfluence(route`/wiki/rest/api/content/${pageId}/label`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{ prefix: 'global', name: LABEL_TO_ADD }])
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Cannot add label to page ${pageId} (${response.status}): ${message}`);
  }

  return {
    success: true,
    spaceKey,
    pageId,
    label: LABEL_TO_ADD
  };
});

export const handler = resolver.getDefinitions();
