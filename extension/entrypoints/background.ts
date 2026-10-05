import { browser } from 'wxt/browser';
import { connectManual, connectOAuth } from '../lib/connect.ts';
import { serve } from '../lib/messages.ts';
import { storageArea } from '../lib/storage.ts';
import { TokenStore } from '../lib/tokens.ts';

// The only place tokens live (spec §3.4). Everything here is registered
// synchronously, so a worker woken by a message finds its listener.
export default defineBackground(() => {
  const local = storageArea(browser.storage.local), session = storageArea(browser.storage.session);
  const fetchFn = (input: string, init?: RequestInit) => fetch(input, init);
  const store = new TokenStore(local, session, fetchFn);
  serve(async (request) => {
    switch (request.type) {
      case 'status':
        return store.status();
      case 'connect':
        return connectOAuth(request.url, {
          fetchFn,
          store,
          local,
          redirectUri: browser.identity.getRedirectURL(),
          launch: (url) => browser.identity.launchWebAuthFlow({ url, interactive: true }),
        });
      case 'connect-manual':
        return connectManual(request.url, request.token, { fetchFn, store });
      case 'access-token':
        return store.accessToken();
      case 'disconnect':
        await store.disconnect();
        return store.status();
    }
  });
});
