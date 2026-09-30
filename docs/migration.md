# Studio migration

Land two complete changes. Keep the public protocol files, public SSR pages, static export, D1 data, R2 objects, and subscription cron behavior intact.

## 1. API and SDK

Keep the existing Studio UI. Put its data access behind authenticated OpenAPI Hono routes, generate a JavaScript/TypeScript SDK with Cloudflare Forge, and use that SDK for both server-rendered reads and browser writes. Keep existing write URLs and legacy preview/search/version URLs working. The latter delegate to the SDK rather than duplicate API logic.

The contract lives in `src/contract/`; `npm run openapi` writes `openapi.json`. The owner can also fetch `/api/openapi.json`. Generation is pinned and CI checks contract and SDK drift. Tests check API response shapes, SDK uploads/errors, and browser flows. Build output is ignored and rebuilt before development, tests, and deployment. Each tagged release publishes the OpenAPI spec, an installable SDK archive, and a bundled Worker with migrations and generic config. A manifest and checksums record the versions and source commit; CI verifies the extracted downloads before publication.

## 2. SPA

Replace all three legacy Studio modules and their inline scripts in one PR with React, TanStack Router, TanStack DB, and Base UI. Keep the present typography, spacing, colors, themes, and features. Preserve mounted Studio URLs, login/logout, previews, bracket search, editor history, attachments, TK generation, subscriptions, hoppers, signals, mentions, and settings.

TanStack DB collections read and write through the SDK. Reading polls the API backed by D1; the existing cron still fetches remote subscriptions. Poll visible reading data every 15 seconds, pause in hidden tabs, refresh on focus, and refresh affected collections after writes. Keep stable item keys across subscriptions, handle deletions and withdrawal, and show errors without discarding cached data or edits. Do not let polling overwrite editor drafts. The API sanitizes imported HTML before the browser sees it.

Delete the old SSR Studio, inline scripts, compatibility adapter, and unused read wrappers in that same PR. Keep public SSR pages. Add browser coverage and visual baselines for desktop/mobile parity and test navigation, polling, mutation failures, and draft retention.

## 3. Desktop compatibility, OAuth, and MCP

Audit [Blygger Desktop](https://github.com/aneeshsathe/blygger-desktop) against our OpenAPI contract before adding OAuth and MCP. Compare its actual Rust API calls and [server extension contracts](https://github.com/aneeshsathe/blygger-desktop/blob/main/docs/SERVER.md), including endpoint paths, request and response shapes, errors, pagination, sync/conflict behavior, and authentication.

Its current requirements include bearer-token owner auth, JSON reads for items and subscriptions, reads for reading/mentions/settings/hoppers, and client-recorded AI provenance. Our read API may overlap, but compatibility must be checked rather than inferred from matching feature names. Reconcile required additions in the canonical OpenAPI Hono routes and regenerate the SDK. Plan how its existing token flow fits the OAuth rollout and preserve disclosure for text generated on the desktop.

Acceptance: run the desktop repository's local Worker integration suite against this Worker checkout and test connect, reads, edits, publish, uploads, conflict handling, and AI provenance. The desktop app must work against our documented API without a separate server fork or undocumented endpoints.

Then add MCP using the same API contract and domain operations; keep authentication in middleware. Do not add desktop-specific extensions, OAuth placeholders, or an MCP server during the first two changes.

## Initial state

The app used Hono on Cloudflare Workers, D1 with 12 migrations, R2 for uploads, and Markdown rendering. Studio was three server-rendered modules with inline JavaScript and direct data-store reads. Public pages and protocol output are separate. TypeScript was strict, with unused-local checks. The baseline suite had 755 tests: 750 passed and five required private deployment configuration. There was no browser suite or CI workflow.
