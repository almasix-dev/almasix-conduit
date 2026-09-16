---
title: Wire protocol
description: What Conduit sends on POST /conduit/update — fingerprints, memos, checksums, effects, and assets.
---

You don’t need to speak the wire protocol to build components — the client handles it. This page is for when you’re curious, debugging DevTools, or building something on top of Conduit.

## Endpoint

`POST /conduit/update` sits behind web middleware: session + CSRF + **`signed:relative`**.

Clients must use the signed URL from `@conduitScripts` / `effects.endpoint` — bare `/conduit/update` without a valid signature returns **403**. See [Signed update requests](/configuration/#signed-update-requests).

Send `X-CSRF-TOKEN` (or `_token`) and JSON shaped like this:

```json title="Request body (single component)"
{
  "fingerprint": { "id": "…", "name": "counter", "path": "/", "method": "GET" },
  "serverMemo": {
    "data": { "count": 0, "label": "world" },
    "checksum": "…",
    "errors": {}
  },
  "updates": [["label", "friend"]],
  "calls": [{ "method": "increment", "params": [] }],
  "island": null
}
```

You can also send a batch:

```json
{
  "components": [ { "fingerprint": {…}, "serverMemo": {…}, "updates": [], "calls": [] } ]
}
```

### Response effects

The JSON reply includes a fresh `serverMemo` plus an `effects` object. Common keys:

| Effect | Meaning |
| --- | --- |
| `html` | Full (or root) HTML to morph |
| `islands` | Map of island name → HTML |
| `data` | Latest public property bag |
| `errors` | Validation errors |
| `dispatches` | Events / `$js` payloads to run |
| `queryString` | URL query updates |
| `endpoint` | Rotated signed update URL |

The client applies `data` bindings **before** morphing so the UI moves first, then patches the DOM.

## Checksums

Snapshots are HMAC’d with `conduit.checksum_key` or `app.key`. If someone tampers with `serverMemo.data` in the browser, the checksum fails and the update is rejected. That’s defense in depth on top of signed URLs and CSRF.

## Assets

`@conduitScripts` (or the asset route) serves:

1. Alpine.js (CDN from `conduit.alpine_cdn`, or the CSP build when `csp_safe` is on)
2. `/conduit/conduit.js` — directive binder, morpher, `$wire` magics
3. Boot config: `window.__CONDUIT__ = { base, endpoint, asset }` plus `<meta name="conduit-endpoint">`

In production, many teams bundle Alpine themselves and load only Conduit’s script. Point the config at your asset pipeline and you’re set.

## Coalescing

The browser merges updates/calls that land within `conduit.coalesce_ms` (default **16**) into a single POST. That’s why rapid typing with `wire:model.live` doesn’t fire a request per keystroke — it feels like one smooth stream.

## Mental picture

```
[Browser]  wire:click / $wire.foo()
    → coalesce (~16ms)
    → POST signed /conduit/update  (+ CSRF)
[Server]   verify signature + checksum
    → hydrate component from memo
    → apply updates, run calls
    → render HTML / islands
    → return effects + new memo
[Browser]  apply data bindings
    → run dispatches / $js
    → morph HTML (or island)
```

When something looks wrong, open the Network panel, find the update request, and inspect `calls`, `updates`, and `effects.data`. Nine times out of ten the story is right there.
