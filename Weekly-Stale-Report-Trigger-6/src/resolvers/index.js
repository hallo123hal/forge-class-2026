import Resolver from '@forge/resolver';
import { storage } from '@forge/api';
import { LATEST_REPORT_KEY } from '../generateStaleReport';

const resolver = new Resolver();

resolver.define('getStaleReport', async () => {
  const report = await storage.get(LATEST_REPORT_KEY);
  return report ?? null;
});

export const handler = resolver.getDefinitions();
