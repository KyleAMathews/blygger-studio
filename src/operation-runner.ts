import { ItemRevisionConflict } from './item-revision.ts';
import { CursorPageError } from './cursor-page.ts';
import { z } from 'zod';
import { schemaError } from './schema-error.ts';
import type { OperationDefinition } from './operations.ts';
import { requiredScopes } from './operation-policy.ts';
import { isExtensionEnabled } from './extensions/server.ts';
import { admitApi, withWorkPrincipal } from './security-budgets.ts';
import { privateItemHidden, seesPrivate } from './private-access.ts';
import { PRIVATE_REASON, UNKNOWN_REASON } from './transclusion.ts';
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
  // A private item is invisible, not forbidden, to an access without owner:private:
  // every operation that names one answers as for an unknown id, so the 404 says nothing.
  // getItem decides visibility in the statement that reads the item (R01, R07).
  if (route.path.startsWith('/items/{id}') && route.operationId !== 'getItem' && input.path.id && await privateItemHidden(context.env.DB, context.access, input.path.id)) {
    return failure('not-found', { error: 'not found' });
  }
  // Adding answers as for an unknown item; removing is idempotent, so its handler answers as for a non-member.
  // addHopperItem decides in its handler, after the hopper check, so both answers match an unknown id's (R12).
  if (route.method !== 'delete' && route.operationId !== 'addHopperItem' && input.path.sub === OWN_SUBSCRIPTION && input.path.remoteId && await privateItemHidden(context.env.DB, context.access, input.path.remoteId)) {
    return failure('not-found', { error: 'item not found' });
  }
  const result = await handler(context, input);
  return seesPrivate(context.access) ? result : { ...result, value: concealPrivate(result.value) } as OperationResult;
}

/**
 * A private item is an unknown one to an access without owner:private, in diagnostics too
 * (studio#178 R13): a `reason`, `error` or `message` that says "item is private", alone or
 * ending the message, says "unknown item", so a preview, generation or publish error cannot
 * tell the two apart. Only those diagnostic fields: content is never rewritten.
 */
const DIAGNOSTIC_KEYS = new Set(['reason', 'error', 'message']);
function concealPrivate(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(concealPrivate);
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return value;
  return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, DIAGNOSTIC_KEYS.has(key) && typeof v === 'string'
    ? v === PRIVATE_REASON ? UNKNOWN_REASON : v.endsWith(`: ${PRIVATE_REASON}`) ? `${v.slice(0, -PRIVATE_REASON.length)}${UNKNOWN_REASON}` : v
    : concealPrivate(v)]));
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
