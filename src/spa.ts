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
import type { Env } from './types.ts';

/** Serve the owner UI at the deployment mount. Public pages keep server rendering. */
export function studioSpa(mount: string) {
  const app = new Hono<{ Bindings: Env }>({ strict: false });
  const base = `${mount}/studio`;
  const shell = (body: string, spa = false) =>
    `<!doctype html><html lang="en" class="js"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>blyg studio${spa ? '' : ' — login'}</title><link rel="stylesheet" href="${escapeHtml(base)}/app.css"></head><body>${body}${spa ? `<script defer src="${escapeHtml(base)}/app.js"></script>` : ''}</body></html>`;
  const login = (error = '') =>
    shell(
      `<main><h1>blyg studio</h1>${error ? `<p role="alert">${escapeHtml(error)}</p>` : ''}<form method="post" action="${escapeHtml(base)}/login"><p><input type="password" name="password" placeholder="password" autofocus required></p><p><button type="submit">log in</button></p></form></main>`,
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
    await next();
  });
  app.get('/login', async (c) =>
    (await verifySession(c.env, c.req.header('cookie')))
      ? c.redirect(base)
      : c.html(login()),
  );
  app.post('/login', async (c) => {
    const form = await c.req.formData();
    if (!(await checkPassword(c.env, String(form.get('password') ?? ''))))
      return c.html(login('Wrong password.'), 403);
    c.header('Set-Cookie', await issueSessionCookie(c.env));
    return c.redirect(base);
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
