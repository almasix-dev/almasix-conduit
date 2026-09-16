---
title: Directives
description: Livewire wire:* action, binding, and DOM directives supported by Conduit.
---

### Actions

| Directive | Notes |
| --- | --- |
| `wire:click="method"` | Also `method(1, 'x')` |
| `wire:click.renderless` | Skip HTML |
| `wire:click.preserve-scroll` | Keep scrollY |
| `wire:submit="save"` | Prevents default |
| `wire:init="boot"` | Fire once on boot |
| `wire:confirm="…"` | `window.confirm` before action |
| `wire:poll` / `wire:poll.5s` | Interval refresh |
| `wire:intersect` | Viewport enter (+ `.once` / `.half` / `.full`) |
| `wire:island="name"` | Scope the action’s morph |

### Binding

| Directive | Notes |
| --- | --- |
| `wire:model` | Sync on change |
| `wire:model.live` | Sync on input (coalesced) |
| `wire:model.blur` | Sync on blur (v4 client sync timing) |
| `wire:model.live.blur` | Live client + blur network |
| `wire:model.debounce.300ms` | Debounced live |
| `wire:model.deep` | Listen to bubbled child events |
| `wire:text="prop"` | **Client** textContent from memo |
| `wire:show="prop"` | **Client** display toggle |
| `wire:bind:class="…"` | **Client** reactive attribute (v4) |
| `wire:bind:disabled="…"` | Expressions see `data` / `$wire` |

### DOM / loading

| Directive | Notes |
| --- | --- |
| `wire:loading` / `data-loading` | Loading affordances |
| `wire:dirty` | Dirty class while in-flight |
| `wire:ignore` | Skip morph subtree |
| `wire:key` | Morph identity in lists |
| `wire:ref="name"` | `$el.__conduitRefs.name` |
| `wire:sort` + `wire:sort:item` | Basic HTML5 DnD → method(order) |
| `wire:navigate` | Partial SPA visit + View Transitions when available |
