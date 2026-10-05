# Blygger Clipper

A Chrome extension that will quote what you read into a draft on your own blyg.
This release connects the extension to your blyg; clipping arrives in the next
release.

## Develop

    npm run ext:dev        # Chromium with the extension, reloading on change
    npm run ext:build      # extension/.output/chrome-mv3
    npm run ext:zip        # a Web Store zip
    npm run test:ext       # unit tests

Load `extension/.output/chrome-mv3` in `chrome://extensions` with Developer
mode on. The development key in `lib/identity.ts` pins the extension ID, so
the OAuth redirect stays the same between builds. The Web Store listing
supplies its own key at publish time.

## Connecting

Type your blyg's address. The clipper finds its OAuth server under the blyg
(no host-root `.well-known`), registers itself, and opens your blyg's consent
page. Untick anything you do not want it to do; it adapts. Revoke it any time
in Studio → Client access. **Advanced: use a token** accepts a token minted
there instead, for tools and tests that cannot open a sign-in window.

## Permissions

`contextMenus`, `sidePanel`, `activeTab`, `scripting`, `identity`, `storage`,
`alarms`. Today the extension uses `identity`, `storage` and the side panel to
connect. `contextMenus`, `sidePanel`, `activeTab` and `scripting` are reserved
for clipping. No host permissions: the extension reaches your blyg over CORS
with its token.

## Privacy

Today the extension sends only your blyg's address to your blyg, to discover and
connect. Once clipping lands, clipped text and the page's title, address and
author will go only to the blyg you connect. Nothing else is collected or sent
anywhere.
