---
title: Configuration
description: Signed update URLs, APP_BASE_PATH subpath hosting, and config/conduit.py.
---

## Signed update requests

Every `POST /conduit/update` must present a **valid relative signature**
(`signed:relative`). This is stricter than a client-side snapshot checksum
alone:

1. `@conduitScripts` embeds a short-lived signed endpoint in
   `window.__CONDUIT__.endpoint` / `<meta name="conduit-endpoint">`.
2. The route carries `middleware=["signed:relative"]`.
3. Each successful update rotates `effects.endpoint` so long-lived tabs stay
   fresh.
4. Signatures cover the **internal** path (`/conduit/update?expires&signature`);
   `APP_BASE_PATH` is prefixed only for the browser — so subpath mounts keep
   verifying correctly.

Bare `/conduit/update` without a signature returns **403**. CSRF still applies
(419 when the session token is missing).

Config: `conduit.signature_ttl_minutes` (default 720).

## Subpath hosting (`APP_BASE_PATH`)

Serving interactive components under a public prefix (`/my-app`, `/apps/foo`)
is a common footgun. Conduit is built on Almasix’s existing subpath story:

1. Route URIs stay unprefixed (`POST /conduit/update`) inside the app.
2. The HTTP kernel mounts ASGI at `APP_BASE_PATH` (`almasix.http.subpath`).
3. `@conduitScripts` emits **prefixed** URLs via `url()` and an inline
   `window.__CONDUIT__ = { base, endpoint, asset }` plus
   `<meta name="conduit-endpoint">` / `conduit-base`.
4. The JS client **never** hardcodes `/conduit/update`. It reads that boot
   config (or derives the prefix from the script `src`), and `withBase()`
   guards `wire:navigate` / root-absolute paths.

```bash title="terminal"
# .env
APP_BASE_PATH=/my-app
```

Then the browser posts to `/my-app/conduit/update` and loads
`/my-app/conduit/conduit.js`. Confirm those URLs in DevTools after setting
`APP_BASE_PATH`.

## Configuration

```python title="config/conduit.py"
config = {
    "endpoint": "/conduit/update",
    "asset_url": "/conduit/conduit.js",
    "inject_assets": True,
    "checksum_key": None,
    "signature_ttl_minutes": 720,
    "alpine_cdn": "https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js",
    "coalesce_ms": 16,
    "csp_safe": False,
}
```
