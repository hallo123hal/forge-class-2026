import Resolver from '@forge/resolver';

const resolver = new Resolver();

resolver.define('getText', () => 'Burn Dashboard resolver is ready.');

export const handler = resolver.getDefinitions();

