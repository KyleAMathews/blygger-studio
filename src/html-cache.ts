/** Only public HTML reads enter Workers Cache. The gateway remains uncached. */
export function publicHtmlRequest(request: Request, mount: string): boolean {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;
  const path = new URL(request.url).pathname;
  if (path === '/api' || path.startsWith('/api/')) return false;
  if (mount && path !== mount && !path.startsWith(mount + '/')) return false;
  const page = path.slice(mount.length).replace(/\/$/, '');
  return page === '' || page === '/archive' || /^\/(?:f|t)\/[^/]+(?:\/v\d+)?$/.test(page) || /^\/h\/[^/]+$/.test(page);
}

/** Public pages ignore query parameters; origins must never share HTML. */
export function publicHtmlKey(request: Request): string {
  const url = new URL(request.url);
  url.search = '';
  url.hash = '';
  url.pathname = url.pathname.replace(/\/$/, '') || '/';
  return url.href;
}

export async function htmlCacheResponse(request: Request, response: Response): Promise<Response> {
  const headers = new Headers(response.headers);
  if (response.status !== 200 ||
      headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'text/html' ||
      headers.has('set-cookie') || /\b(?:private|no-store)\b/i.test(headers.get('cache-control') ?? '')) {
    headers.set('Cache-Control', 'no-store');
    headers.delete('Cloudflare-CDN-Cache-Control');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
  const body = await response.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', body);
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  // Weak validation also works when Cloudflare compresses these HTML bytes.
  const etag = `W/"${hash}"`;
  headers.set('ETag', etag);
  headers.set('Cache-Control', 'no-cache');
  headers.set('Cloudflare-CDN-Cache-Control', 'public, max-age=60, stale-while-revalidate=300, stale-if-error=0');
  return conditionalHtmlResponse(request, new Response(body, { headers }));
}

/** Validate the browser against saved edge bytes without another render. */
export function conditionalHtmlResponse(request: Request, response: Response): Response {
  const etag = response.headers.get('etag');
  const matches = etag && request.headers.get('if-none-match')?.split(',').some(tag =>
    tag.trim() === '*' || tag.trim().replace(/^W\//, '') === etag.replace(/^W\//, ''));
  if (response.status === 200 && matches) {
    const headers = new Headers(response.headers);
    headers.delete('Content-Length');
    return new Response(null, { status: 304, headers });
  }
  return request.method === 'HEAD'
    ? new Response(null, { status: response.status, statusText: response.statusText, headers: response.headers })
    : response;
}
