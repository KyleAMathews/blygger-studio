import { ItemRevisionConflict } from './item-revision.ts';
import { CursorPageError } from './cursor-page.ts';
import { z } from 'zod';
import { schemaError } from './schema-error.ts';
import type { OperationDefinition } from './operations.ts';
import { requiredScopes } from './operation-policy.ts';
import { isExtensionEnabled } from './extensions/server.ts';
import { admitApi, withWorkPrincipal } from './security-budgets.ts';
import { hiddenOwnIds, seesPrivate } from './private-access.ts';
import { OWN_SUBSCRIPTION } from './own-subscription.ts';
import { failure, OperationError, type OperationContext, type OperationInput, type OperationResult } from './operation-types.ts';

function parse(schema: unknown, value: unknown): unknown {
  if (!(schema instanceof z.ZodType)) return value;
  return schema.parse(value);
}
function strings(value: unknown): Record<string, string> {
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, value]) => [key, String(value)]));
}
/** Verified request authority enters here once. Domain handlers receive no HTTP context. */
async function executeOperation(definition: OperationDefinition, input: OperationInput, context: OperationContext): Promise<OperationResult> {
  const { route, handler } = definition, required = requiredScopes(route.policy, input);
  if (context.access !== null && required.some(scope => !context.access!.scope.includes(scope))) {
    return failure('forbidden', { error: 'insufficient scope' }, required);
  }
  context = { ...context, env: withWorkPrincipal(context.env, context.access ?? undefined) };
  if (!await admitApi(context.env, route.policy.budget === 'read')) return failure('rate-limit', { error: 'API work budget exceeded' });
  if (route.policy.extension && !context.extensions.some(extension => extension.name === route.policy.extension)) return failure('not-found', { error: 'not found' });
  if (route.policy.extension && !await isExtensionEnabled(context.env.DB, route.policy.extension)) {
    return failure('not-found', { error: `extension ${route.policy.extension} is not enabled` });
  }
  if (input.inputFailure) return input.inputFailure;
  try {
    const request = route.request;
    const body = request?.body?.content['application/json'];
    input = { ...input,
      path: strings(parse(request?.params, input.path)),
      query: strings(parse(request?.query, input.query)),
      body: body && 'schema' in body ? parse(body.schema, input.body === undefined && !request?.body?.required ? {} : input.body) ?? {} : input.body,
    };
    if (input.body === undefined) input.body = {};
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failure('invalid-input', schemaError(error));
    }
    throw error;
  }
  if (seesPrivate(context.access)) return handler(context, input);
  // A hidden item is an id that does not exist, to an access that may not see it (law 1,
  // sealed-content-build-plan §1 0f). The handler runs on an id no item can have, so every
  // answer is an unknown id's by construction and no write can reach the item. No handler
  // decides this for itself. (No unknown-id answer echoes the id; private-scope's walk
  // covers every item-addressed operation, so one that started to would fail it.)
  const keys = ownItemKeys(route.path, input.path);
  const hidden = keys.length && route.policy.itemVisibility !== 'in-statement'
    ? await hiddenOwnIds(context.env.DB, context.access, keys.map(key => input.path[key])) : new Set<string>();
  const unseen = keys.filter(key => hidden.has(input.path[key]));
  if (unseen.length) input = { ...input, path: { ...input.path, ...Object.fromEntries(unseen.map(key => [key, UNSEEN])) } };
  return handler(context, input);
}

/** An item id no item can have: newId draws 128 random bits, and this is the all-zero draw. */
const UNSEEN = '00000000000000000000000000';
/** The path parameters that name one of the owner's own items. */
function ownItemKeys(path: string, params: Record<string, string>): string[] {
  if (path.startsWith('/items/{id}')) return ['id'];
  if (params.sub !== OWN_SUBSCRIPTION) return [];
  // Imports never hold own items, so `/imports/~own/{id}` already answers as unknown.
  return path.includes('{sub}/{remoteId}') ? ['remoteId'] : [];
}

export async function runOperation(definition: OperationDefinition, input: OperationInput, context: OperationContext): Promise<OperationResult> {
  try {
    return await executeOperation(definition, input, context);
  } catch (error) {
    if (error instanceof CursorPageError) return failure(error.kind, { error: error.message, code: error.code });
    if (error instanceof ItemRevisionConflict) return failure('conflict', { error: error.message, code: 'revision-conflict', itemId: error.itemId, expectedRevision: error.expectedRevision });
    if (error instanceof OperationError) return failure(error.kind, { error: error.message });
    console.error('Operation failed', { operation: definition.route.operationId, errorType: error instanceof Error ? error.name : typeof error });
    return failure('internal', { error: 'internal server error' });
  }
}
