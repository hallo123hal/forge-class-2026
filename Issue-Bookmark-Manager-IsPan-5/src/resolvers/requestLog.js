/**
 * Environment-driven request logging for dev / staging / production workflow.
 * Values are set per Forge environment via `forge variables set`.
 */
export const APP_VERSION = process.env.APP_VERSION ?? 'unknown';
export const API_DEBUG_MODE = process.env.API_DEBUG_MODE === 'true';

const buildRequestSummary = (req, functionName) => ({
  functionName,
  appVersion: APP_VERSION,
  accountId:
    req.context?.accountId ?? req.context?.principal?.accountId ?? null,
  issueKey:
    req.payload?.issueKey ?? req.context?.extension?.issue?.key ?? null,
  payloadKeys: Object.keys(req.payload ?? {}),
  hasCursor: req.payload?.cursor !== undefined,
});

/**
 * Logs every incoming resolver request with APP_VERSION.
 * Debug mode logs full payload; otherwise logs a compact summary only.
 */
export const logRequestReceived = (req, functionName) => {
  const summary = buildRequestSummary(req, functionName);

  if (API_DEBUG_MODE) {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'INFO',
        event: 'request_received',
        mode: 'debug',
        ...summary,
        payload: req.payload ?? {},
        context: {
          extensionIssueKey: req.context?.extension?.issue?.key ?? null,
          cloudId: req.context?.cloudId ?? null,
        },
      })
    );
    return;
  }

  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: 'INFO',
      event: 'request_received',
      mode: 'summary',
      ...summary,
    })
  );
};
