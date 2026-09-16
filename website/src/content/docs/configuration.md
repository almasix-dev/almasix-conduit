---
title: Configuration
description: Signed update URLs, APP_BASE_PATH subpath hosting, Alpine CDN, and config/conduit.py knobs.
---

Conduit works with zero config. When you’re ready to tune security, hosting, or Alpine, publish the config and dig in:

```bash title="terminal"
smith vendor:publish --tag=conduit-config
```

## Signed update requests

Every `POST /conduit/update` must present a **valid relative signature** (`signed:relative`). Snapshot checksums alone aren’t enough — the endpoint itself is locked down:

1. `@conduitScripts` embeds a short-lived signed endpoint in `window.__CONDUIT__.endpoint` and `<meta name="conduit-endpoint">`.
2. The route carries `middleware=["signed:relative"]`.
3. Each successful update can rotate `effects.endpoint` so long-lived tabs stay fresh.
4. Signatures cover the **internal** path (`/conduit/update?expires&signature`). `APP_BASE_PATH` is prefixed only for the browser — subpath mounts keep verifying correctly.

Bare `/conduit/update` without a signature returns **403**. CSRF still applies (**419** when the session token is missing).

Knob: `conduit.signature_ttl_minutes` (default `720`).

Turn signed updates off only if you fully understand the tradeoff (`signed_updates` in config) — the default is the secure path.

## Subpath hosting (`APP_BASE_PATH`)

Serving interactive components under a public prefix (`/my-app`, `/apps/foo`) is a classic footgun. Conduit follows Almasix’s subpath story end-to-end:

1. Route URIs stay unprefixed (`POST /conduit/update`) inside the app.
2. The HTTP kernel mounts ASGI at `APP_BASE_PATH`.
3. `@conduitScripts` emits **prefixed** URLs via `url()` and an inline `window.__CONDUIT__ = { base, endpoint, asset }` plus the meta tags.
4. The JS client **never** hardcodes `/conduit/update`. It reads boot config (or derives the prefix from the script `src`), and `withBase()` guards `wire:navigate` / root-absolute paths.

```bash title="terminal"
# .env
APP_BASE_PATH=/my-app
```

The browser then posts to `/my-app/conduit/update` and loads `/my-app/conduit/conduit.js`. Confirm those URLs in DevTools after setting `APP_BASE_PATH`.

## Alpine

```python title="config/conduit.py (excerpt)"
"alpine_cdn": "https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js",
"alpine_csp_cdn": "https://cdn.jsdelivr.net/npm/@alpinejs/csp@3.x.x/dist/cdn.min.js",
"csp_safe": False,
```

- Point `alpine_cdn` at your own mirror or pinned version.
- Set `csp_safe = True` to load the Alpine CSP build when your CSP disallows unsafe eval-style expressions.
- Or skip CDN injection entirely and ship Alpine from your bundler — just make sure Alpine initializes so Conduit can register `$wire` on `alpine:init`.

## Full config shape

```python title="config/conduit.py"
config = {
    "endpoint": "/conduit/update",
    "asset_url": "/conduit/conduit.js",
    "inject_assets": True,
    "checksum_key": None,  # falls back to app.key
    "signature_ttl_minutes": 720,
    "signed_updates": True,
    "alpine_cdn": "https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js",
    "alpine_csp_cdn": "https://cdn.jsdelivr.net/npm/@alpinejs/csp@3.x.x/dist/cdn.min.js",
    "csp_safe": False,
    "coalesce_ms": 16,
}
```

| Key | Role |
| --- | --- |
| `endpoint` / `asset_url` | Internal paths (subpath applied for the browser) |
| `inject_assets` | Whether `@conduitScripts` injects script tags |
| `checksum_key` | HMAC key for snapshots (`None` → `app.key`) |
| `coalesce_ms` | Client batching window for updates/calls |
| `signed_updates` | Require signed update URLs |

When in doubt, leave the defaults. They’re chosen so a fresh Almasix app can embed `@conduit('counter')` and have a good day.
