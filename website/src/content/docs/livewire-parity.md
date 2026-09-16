---
title: Livewire parity
description: Livewire 4 feature parity matrix for almasix.conduit.
---

All rows **complete**. Machine source: `almasix.conduit.parity.PARITY`.

| Feature | Status |
| --- | --- |
| wire:click (+ params, async/renderless/preserve-scroll) | complete |
| wire:model / .live / .blur / .change / .debounce / .deep | complete |
| wire:submit | complete |
| snapshot + checksum + CSRF | complete |
| **signed update URLs (HMAC + expiry)** | complete |
| request coalescing | complete |
| idiomorph-lite morph + wire:key / ignore | complete |
| Alpine $wire + $errors | complete |
| wire:text / wire:show / wire:bind (client) | complete |
| **APP_BASE_PATH / subpath hosting** | complete |
| nested `@conduit` | complete |
| validation errors | complete |
| events / $dispatch / $js / $entangle | complete |
| wire:loading + data-loading | complete |
| wire:dirty / ignore / poll / init / confirm | complete |
| lazy / defer | complete |
| file uploads | complete |
| query-string binding | complete |
| wire:intersect / wire:ref / wire:sort | complete |
| wire:island scoped updates | complete |
| wire:navigate + View Transitions | complete |
| wire:offline / wire:online | complete |
| inline HTML `render()` (SFC-style) | complete |
| Route.conduit() full-page components | complete |
| WithPagination / Computed / Locked / On | complete |
| CSP-safe Alpine (`conduit.csp_safe`) | complete |
| `smith make:conduit` | complete |

## Starter kits

Web starter kits will consume Conduit for interactive islands. Kits are **later** —
Conduit itself is exhausted.
