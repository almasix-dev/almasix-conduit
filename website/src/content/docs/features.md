---
title: Features
description: What’s in the Conduit box — directives, Alpine, security, islands, uploads, and more.
---

A tour of what ships with Conduit today. If you’re skimming for “does it do X?”, this is the page.

## Interactivity

- **Actions** — `wire:click` (params, `.renderless`, `.preserve-scroll`), `wire:submit`, `wire:init`, `wire:confirm`, `wire:poll`, `wire:intersect`
- **Binding** — `wire:model` (`.live` / `.blur` / `.change` / `.debounce` / `.deep`), `wire:text`, `wire:show`, `wire:bind:*`
- **Loading** — `wire:loading`, `data-loading`, root `conduit-dirty` while in flight
- **Morph** — idiomorph-lite updates with `wire:key` / `wire:ignore`
- **Navigation** — `wire:navigate` + View Transitions when the browser supports them
- **Connectivity** — `wire:offline` / `wire:online`
- **Sort** — `wire:sort` + `wire:sort:item` drag-and-drop → method(order)
- **Refs** — `wire:ref` for imperative element access

## Alpine.js

- `$wire` and `$errors` magics registered on `alpine:init`
- Helpers: `$set`, `$toggle`, `$refresh`, `$dispatch`, `$island`, `$entangle`
- Server `js()` expressions run against `$wire` after the response
- Optional CSP-safe Alpine via `conduit.csp_safe`

See [Alpine and islands](/alpine-and-islands/) for practical recipes.

## Components

- Public state + lifecycle (`mount` / `hydrate` / `booted` / `dehydrate` / `rendering` / `rendered`)
- Nested `@conduit` embeds
- Validation errors → view / `$errors` / effects
- Events via `dispatch` / `dispatch_self` / `dispatch_to`
- Lazy & defer loading with placeholders
- Query-string binding
- Islands (`wire:island`, `island_views`, `$wire.$island`)
- Inline HTML `render()` for tiny self-contained demos
- Full-page components via `Route.conduit()`
- `WithPagination`, `Locked`, and related helpers (`Computed`, `On`, `Modelable`)
- File uploads (`/conduit/upload`)
- `smith make:conduit` scaffolding

## Security & hosting

- Snapshot checksums (HMAC)
- CSRF on the update endpoint
- **Signed update URLs** (HMAC + expiry, rotated on success)
- First-class `APP_BASE_PATH` / subpath hosting — the client never hardcodes `/conduit/update`

## Performance UX

- Request coalescing (~16ms by default)
- Client bindings applied before HTML morph
- Island-scoped morph for big pages
- `.renderless` when you don’t need HTML

## Credits

Conduit’s architecture is inspired by [Livewire](https://livewire.laravel.com/) — thank you, Caleb, for showing how delightful server-driven UI can feel. Conduit is its own package for Almasix: Python components, Prism views, and a security model built for this stack.
