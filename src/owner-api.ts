import { routes } from "./contract/routes.ts";
import { contractApp } from "./contract/app.ts";
import { verifySession } from "./auth.ts";
import { api } from "./api.ts";
import { importerApi } from "./importer/api.ts";
import { mentionsApi } from "./mentions/api.ts";
import { verifyBearer, bearerChallenge, authLocations } from './oauth.ts';
import { matchOperation, operationScopes, type OwnerAccess } from './permissions.ts';
import spec from "../openapi.json";
import { readApi } from "./read-api.ts";

export function createOwnerApi(access?: OwnerAccess) {
const ownerApi = contractApp();
ownerApi.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  const origin = c.req.header('origin');
  const bearer = c.req.header('authorization');
  const delegated = access ?? (bearer ? await verifyBearer(c.req.raw, c.env, 'api') : null);
  if (!delegated) {
    if (bearer || !await verifySession(c.env, c.req.header('cookie'))) {
      c.header('WWW-Authenticate', bearerChallenge(c.req.url, c.env, 'api'));
      return c.json({ error: 'unauthorized' }, 401);
    }
    if (origin && origin !== new URL(c.req.url).origin || c.req.header('sec-fetch-site') === 'cross-site') return c.json({ error: 'cross-origin owner request denied' }, 403);
  } else {
    const operation = matchOperation(c.req.method, c.req.path.replace(/^\/api(?=\/|$)/, ''));
    const required = operation ? operationScopes(operation[0]) : ['owner:read'];
    // Changing response display edits the public page immediately, without publish.
    if (operation?.[0] === 'updateItem') {
      const body = await c.req.raw.clone().json().catch(() => ({})) as { responses?: unknown };
      if (body.responses !== undefined) required.push('owner:publish');
    }
    if (required.some(scope => !delegated.scope.includes(scope))) {
      c.header('WWW-Authenticate', bearerChallenge(c.req.url, c.env, 'api', required.join(' '), true));
      return c.json({ error: 'insufficient scope' }, 403);
    }
  }
  return next();
});
ownerApi.route("/", api);
ownerApi.route("/", importerApi);
ownerApi.route("/", mentionsApi);
ownerApi.route("/", readApi);

ownerApi.get('/openapi.json', c => {
  const document = structuredClone(spec);
  const { issuer } = authLocations(c.req.url, c.env);
  document.components.securitySchemes.ownerOAuth.flows.authorizationCode.authorizationUrl = issuer + '/oauth2/authorize';
  document.components.securitySchemes.ownerOAuth.flows.authorizationCode.tokenUrl = issuer + '/oauth2/token';
  document.servers = [{ url: new URL(c.req.url).origin }];
  return c.json(document);
});

ownerApi.all("*", (c) => {
  const path = c.req.path.replace(/^\/api(?=\/|$)/, "");
  const methods = Object.values(routes).filter((route) => new RegExp(`^${route.path.replace(/\{\w+\}/g, "[^/]+")}/?$`).test(path)).map((route) => route.method.toUpperCase());
  if (methods.length) {
    c.header("Allow", [...new Set(methods.flatMap((method) => method === "GET" ? ["GET", "HEAD"] : [method]))].join(", "));
    return c.json({ error: "method not allowed" }, 405);
  }
  return c.json({ error: "not found" }, 404);
});

return ownerApi;
}
export const ownerApi = createOwnerApi();
