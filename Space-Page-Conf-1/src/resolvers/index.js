import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

function logEvent(level, event, payload = {}) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level,
      event,
      ...payload,
    })
  );
}

/** Bridge/invoke expect a real Error; Forge may throw plain objects (e.g. auth). */
function toError(reason) {
  if (reason instanceof Error) return reason;
  const msg =
    reason && typeof reason === 'object' && typeof reason.message === 'string'
      ? reason.message
      : typeof reason === 'string'
        ? reason
        : 'Có lỗi xảy ra';
  return new Error(msg);
}

resolver.define('getSpaceDetails', async (req) => {
  const start = Date.now();
  const functionName = 'getSpaceDetails';
  const spaceKey =
    req.payload?.spaceKey ?? req.context?.extension?.space?.key;
  const accountId =
    req.context?.accountId ?? req.context?.principal?.accountId;

  logEvent('INFO', 'function_called', {
    functionName,
    spaceKey,
    accountId,
  });

  if (!spaceKey) {
    logEvent('ERROR', 'function_failed', {
      functionName,
      spaceKey,
      accountId,
      durationMs: Date.now() - start,
      errorMessage: 'Missing spaceKey',
    });
    throw new Error('Không lấy được space key.');
  }

  const spaceId =
    req.payload?.spaceId ?? req.context?.extension?.space?.id ?? null;

  /** Confluence REST v1 `/wiki/rest/api/space/{key}` returns 410; use v2. */
  const confluencePath = spaceId
    ? route`/wiki/api/v2/spaces/${spaceId}`
    : route`/wiki/api/v2/spaces?${new URLSearchParams({ keys: spaceKey })}`;

  logEvent('INFO', 'api_request_sent', {
    functionName,
    spaceKey,
    spaceId,
    path: spaceId
      ? '/wiki/api/v2/spaces/{id}'
      : '/wiki/api/v2/spaces?keys={spaceKey}',
  });

  try {
    // asUser() can call without a user OAuth token until new scopes are consented → 401.
    // asApp() uses the installation token; read:space:confluence applies after deploy/upgrade.
    const res = await api.asApp().requestConfluence(confluencePath, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Confluence API lỗi: ${res.status}`);
    }

    const body = await res.json();
    const data = spaceId
      ? body
      : body.results?.find((s) => s.key === spaceKey) ?? body.results?.[0];

    if (!data) {
      throw new Error('Không tìm thấy space.');
    }

    const result = {
      key: data.key ?? spaceKey,
      id: data.id ?? spaceId ?? '(Không lấy được)',
      name: data.name ?? '(Không có tên)',
      type: data.type ?? '(Không có type)',
    };

    logEvent('INFO', 'function_succeeded', {
      functionName,
      spaceKey,
      durationMs: Date.now() - start,
      resultSummary: {
        key: result.key,
        name: result.name,
        type: result.type,
      },
    });

    return result;
  } catch (error) {
    const err = toError(error);
    logEvent('ERROR', 'function_failed', {
      functionName,
      spaceKey,
      accountId,
      durationMs: Date.now() - start,
      errorMessage: err.message,
    });
    throw err;
  }
});

export const handler = resolver.getDefinitions();
