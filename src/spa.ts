import { Hono } from 'hono';
import script from '../build/studio-spa.txt';
import style from '../build/studio-spa-style.txt';
import {
  checkPassword,
  clearSessionCookie,
  issueSessionCookie,
  verifySession,
} from './auth.ts';
import { escapeHtml } from './util.ts';
import { authorizationServer, ownerLoginRateLimit } from './oauth.ts';
import { verifyOAuthQueryParams } from '@better-auth/oauth-provider';
import type { Env } from './types.ts';

/** Serve the owner UI at the deployment mount. Public pages keep server rendering. */
export function studioSpa(mount: string) {
  const app = new Hono<{ Bindings: Env }>({ strict: false });
  const base = `${mount}/studio`;
  const returnTo = (value: unknown) => typeof value === 'string' && value.startsWith(base + '/auth/oauth2/authorize?') && !value.includes('\\') ? value : base;
  const shell = (body: string, spa = false) =>
    `<!doctype html><html lang="en" class="js"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="authorization_endpoint" href="${escapeHtml(base)}/auth/oauth2/authorize"><link rel="oauth-metadata" href="${escapeHtml(base)}/auth/.well-known/openid-configuration"><title>blyg studio${spa ? '' : ' — login'}</title><link rel="stylesheet" href="${escapeHtml(base)}/app.css"></head><body>${body}${spa ? `<script defer src="${escapeHtml(base)}/app.js"></script>` : ''}</body></html>`;
  const login = (error = '', next = base, oauthQuery?: string) =>
    shell(
      `<main><h1>blyg studio</h1>${error ? `<p role="alert">${escapeHtml(error)}</p>` : ''}<form method="post" action="${escapeHtml(base)}/login"><input type="hidden" name="return_to" value="${escapeHtml(next)}">${oauthQuery === undefined ? '' : `<input type="hidden" name="oauth_query" value="${escapeHtml(oauthQuery)}">`}<p><input type="password" name="password" placeholder="password" autofocus required></p><p><button type="submit">log in</button></p></form></main>`,
    );
  app.get('/app.js', (c) =>
    c.body(script, 200, {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'no-cache',
    }),
  );
  app.get('/app.css', (c) =>
    c.body(style, 200, {
      'Content-Type': 'text/css; charset=utf-8',
      'Cache-Control': 'no-cache',
    }),
  );
  app.use('*', async (c, next) => {
    c.header('Cache-Control', 'no-store');
    c.header('Content-Security-Policy', "frame-ancestors 'none'");
    c.header('X-Frame-Options', 'DENY');
    c.header('Referrer-Policy', 'same-origin');
    await next();
  });
  app.get('/login', async (c) => {
    const oauthQuery = c.req.query('oauth_query') ?? (c.req.query('sig') === undefined ? undefined : new URL(c.req.url).search.slice(1));
    if (oauthQuery !== undefined) {
      const server = await authorizationServer(c.req.url, c.env);
      if (!await verifyOAuthQueryParams(oauthQuery, (await server.$context).secret)) return c.json({ error: 'invalid_request' }, 400);
      return c.html(login('', base, oauthQuery));
    }
    return await verifySession(c.env, c.req.header('cookie'))
      ? c.redirect(base)
      : c.html(login('', returnTo(c.req.query('return_to'))));
  });
  app.post('/login', async (c) => {
    if (c.req.header('origin') && c.req.header('origin') !== new URL(c.req.url).origin || c.req.header('sec-fetch-site') === 'cross-site') return c.json({ error: 'cross-origin login denied' }, 403);
    const limited = await ownerLoginRateLimit(c.req.raw, c.env);
    if (limited) return limited;
    const form = await c.req.formData(), query = form.get('oauth_query');
    const server = query === null ? undefined : await authorizationServer(c.req.url, c.env);
    if (query !== null && (typeof query !== 'string' || !await verifyOAuthQueryParams(query, (await server!.$context).secret))) return c.json({ error: 'invalid_request' }, 400);
    if (!(await checkPassword(c.env, String(form.get('password') ?? ''))))
      return c.html(login('Wrong password.', returnTo(form.get('return_to')), query === null ? undefined : String(query)), 403);
    const ownerCookie = await issueSessionCookie(c.env);
    if (server && typeof query === 'string') {
      const headers = new Headers(c.req.raw.headers);
      headers.set('cookie', ownerCookie.split(';')[0]);
      headers.set('origin', new URL(c.req.url).origin);
      headers.set('accept', 'application/json');
      headers.set('content-type', 'application/json');
      const body = { oauth_query: query };
      const request = new Request(new URL(base + '/auth/internal/owner-session', c.req.url), { method: 'POST', headers, body: JSON.stringify(body) });
      const response = await server.api.ownerSession({ headers, body, request, asResponse: true });
      if (!response.ok) return response;
      const continuation = await response.json() as { url: string };
      c.header('Set-Cookie', ownerCookie);
      for (const cookie of response.headers.getSetCookie()) c.header('Set-Cookie', cookie, { append: true });
      return c.redirect(continuation.url);
    }
    c.header('Set-Cookie', ownerCookie);
    return c.redirect(returnTo(form.get('return_to')));
  });
  app.post('/logout', (c) => {
    c.header('Set-Cookie', clearSessionCookie());
    return c.redirect(`${base}/login`);
  });
  app.get('*', async (c) => {
    if (!(await verifySession(c.env, c.req.header('cookie'))))
      return c.redirect(`${base}/login`);
    return c.html(
      shell(
        `<div id="studio-root" data-mount="${escapeHtml(mount)}"></div>`,
        true,
      ),
    );
  });
  return app;
}
