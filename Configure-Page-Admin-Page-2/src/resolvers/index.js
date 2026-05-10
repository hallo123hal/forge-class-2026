import Resolver from '@forge/resolver';
import { getAppContext } from '@forge/api';
import { kvs } from '@forge/kvs';

const resolver = new Resolver();

const API_KEY_STORAGE_KEY = 'settings.apiKey';

resolver.define('saveApiKey', async ({ payload }) => {
  const apiKey = typeof payload?.apiKey === 'string' ? payload.apiKey.trim() : '';
  await kvs.set(API_KEY_STORAGE_KEY, apiKey);

  return {
    success: true,
    hasValue: Boolean(apiKey),
  };
});

resolver.define('getApiKey', async () => {
  const apiKey = await kvs.get(API_KEY_STORAGE_KEY);

  return {
    apiKey: typeof apiKey === 'string' ? apiKey : '',
  };
});

/**
 * Jira URL format: /jira/settings/apps/configure/{appId}/{envId}
 * envId must be the Forge environment UUID (environmentAri.environmentId), not the word "development".
 */
resolver.define('getConfigurePath', async () => {
  const appContext = getAppContext();
  const appId = appContext.appAri.appId;
  const envId = appContext.environmentAri.environmentId;

  return {
    path: `/jira/settings/apps/configure/${appId}/${envId}`,
  };
});

export const handler = resolver.getDefinitions();
