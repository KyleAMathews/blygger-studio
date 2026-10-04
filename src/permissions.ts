import { routes } from './contract/routes.ts';

import type { OwnerScope } from './auth-scopes.ts';
export { OWNER_SCOPES, SCOPE_DESCRIPTIONS } from './auth-scopes.ts';
export interface OwnerAccess { scope: string[]; clientId: string; userId: string }
const draft = new Set(['createItem', 'updateItem', 'deleteItem', 'restoreItem', 'uploadMedia', 'generateItem', 'draftNote', 'preview']);
const publish = new Set(['publishItem', 'withdrawItem', 'pinItem', 'refreshItem', 'deleteMedia']);
export function operationScopes(operation: string): OwnerScope[] {
  const route = routes[operation as keyof typeof routes];
  if (!route) throw new Error(`Unknown operation: ${operation}`);
  if (route.method === 'get') return ['owner:read'];
  if (draft.has(operation)) return ['owner:draft'];
  if (publish.has(operation)) return ['owner:publish'];
  return ['owner:manage'];
}
export function matchOperation(method: string, path: string) {
  return Object.entries(routes).find(([, route]) => (method === 'HEAD' ? 'get' : method.toLowerCase()) === route.method && new RegExp(`^${route.path.replace(/\{\w+\}/g, '[^/]+')}/?$`).test(path));
}
