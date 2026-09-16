---
title: Wire protocol
description: POST /conduit/update payload, checksums, and Conduit JS assets.
---

### Endpoint

`POST /conduit/update` (web middleware: session + CSRF + **`signed:relative`**).
Clients must use the signed URL from `@conduitScripts` / `effects.endpoint` —
see [Signed update requests](/configuration/#signed-update-requests).

Send `X-CSRF-TOKEN` (or `_token`) and JSON:

```json title="examples/conduit.json"
{
  "fingerprint": { "id": "...", "name": "counter" },
  "serverMemo": { "data": { "count": 0 }, "checksum": "...", "errors": {} },
  "updates": [["count", 1]],
  "calls": [{ "method": "increment", "params": [] }],
  "island": null
}
```

Response effects may include `html`, `islands`, `data`, `errors`, `dispatches`,
`queryString`. The client applies `data` bindings **before** morphing so the UI
moves first.

### Checksums

Snapshots HMAC with `conduit.checksum_key` or `app.key`. Tampered memos are
rejected.

### Assets

`/conduit/conduit.js` plus Alpine (CDN configurable via `conduit.alpine_cdn`).
Prefer bundling Alpine yourself and loading only Conduit’s script in production.
