---
title: Directives
description: The wire:* vocabulary — actions, binding, loading, morph, and navigation — with practical examples.
---

Conduit’s HTML vocabulary is `conduit:*` (preferred) or `wire:*` (fully supported alias). Put attributes on elements inside a component root; the client binds them on boot and after each morph.

:::tip[Dual vocabulary]
`conduit:click` and `wire:click` do the same thing. Docs use `conduit:` going forward; keep `wire:` if you like the Livewire muscle memory. Alpine exposes both `$conduit` and `$wire`.
:::

## Actions

Kick off server methods from the browser.

```html
<button type="button" conduit:click="increment">+</button>
<button type="button" conduit:click="add(1)">Add one</button>
<button type="button" conduit:click="save('draft')">Save draft</button>
```

| Directive | Notes |
| --- | --- |
| `wire:click="method"` | Also `method(1, 'x')` — params are evaluated as a JS array literal |
| `wire:click.renderless` | Skip HTML morph (state / events only) |
| `wire:click.preserve-scroll` | Keep `scrollY` across the update |
| `wire:submit="save"` | On a `<form>` — prevents default, calls the method |
| `wire:init="boot"` | Fire once when the component boots |
| `wire:confirm="Delete this?"` | `window.confirm` before the action runs |
| `wire:poll` / `wire:poll="5s"` | Interval `$refresh` (default 5s) |
| `wire:intersect` | Fire when the element enters the viewport (`.once` / `.half` / `.full`) |
| `wire:island="name"` | Scope this action’s HTML morph to a named island |

```html title="Confirm before destroy"
<button
  type="button"
  wire:click="delete"
  wire:confirm="Delete this post? This can’t be undone."
>
  Delete
</button>
```

```html title="Poll a live metric"
<div wire:poll="5s">
  <span wire:text="visitors">{{ visitors }}</span> online
</div>
```

`wire:poll` re-renders on an interval (default 5 seconds). Pair it with client bindings so numbers update without a full page reload.
## Binding

Keep inputs and display nodes tied to public state.

| Directive | Notes |
| --- | --- |
| `wire:model` | Sync on `change` |
| `wire:model.live` | Sync on `input` (coalesced) |
| `wire:model.blur` | Sync on blur |
| `wire:model.live.blur` | Live client updates + network on blur |
| `wire:model.debounce.300ms` | Debounced live sync |
| `wire:model.deep` | Listen to bubbled child events |
| `wire:text="prop"` | **Client** `textContent` from memo |
| `wire:show="prop"` | **Client** display toggle |
| `wire:bind:class="…"` | **Client** reactive attribute |
| `wire:bind:disabled="…"` | Expressions see `data` / `$wire` |

### Instant text + live model

```html
<input type="text" wire:model.live="title" value="{{ title }}">
<h1 wire:text="title">{{ title }}</h1>
```

As you type, `wire:text` updates from the client memo immediately. The server catches up via coalesced requests. Feels local. Stays true.

### Show / hide

```python
def toggle_open(self) -> None:
    self.toggle("open")
```

```html
<button type="button" wire:click="toggle_open">Toggle</button>
<div wire:show="open">
  Revealed when open is truthy.
</div>
```

From Alpine you can also flip it with `$wire.$toggle('open')` or `$wire.open = !$wire.open`.
### Reactive attributes

```html
<button
  type="button"
  wire:click="save"
  wire:bind:disabled="saving"
  wire:bind:class="saving ? 'opacity-50' : ''"
>
  Save
</button>
```

Expressions are evaluated with component `data` and `$wire` in scope.

## Loading & dirty

```html
<button type="button" wire:click="save" data-loading>
  Save
</button>

<span wire:loading style="display:none">Saving…</span>
```

While a request is in flight, Conduit sets `data-loading` on matching nodes and toggles a `conduit-dirty` class on the component root. That’s enough for CSS like:

```css
[data-loading] { opacity: 0.6; pointer-events: none; }
.conduit-dirty { outline: 1px dashed #f59e0b; }
```

`wire:loading` elements are shown when the request starts; pair with Alpine if you want fancier enter/leave transitions (see [Alpine and islands](/alpine-and-islands/)).

## Morph control

| Directive | Notes |
| --- | --- |
| `wire:ignore` | Skip morphing this subtree (charts, third-party widgets) |
| `wire:key` | Stable identity for list children |
| `wire:ref="name"` | Stash the element on `$el.__conduitRefs.name` |

```html
<ul>
  @foreach(items as item)
    <li wire:key="item-{{ item.id }}">{{ item.title }}</li>
  @endforeach
</ul>

<div wire:ignore>
  <!-- Leaflet / Chart.js / anything that hates being remorphed -->
</div>
```

## Sort, navigate, offline

| Directive | Notes |
| --- | --- |
| `wire:sort` + `wire:sort:item` | Basic HTML5 drag-and-drop → method with order |
| `wire:navigate` | Partial SPA-style visit + View Transitions when available |
| `wire:offline` / `wire:online` | Toggle visibility from connectivity |

```html
<a href="/settings" wire:navigate>Settings</a>

<div wire:offline class="banner">You’re offline — changes will sync when you’re back.</div>
```

## Putting it together

A compact settings form using several directives at once:

```html title="resources/views/conduit/settings.prism.html"
<form wire:submit="save">
  <label>
    Display name
    <input type="text" wire:model.blur="name" value="{{ name }}">
  </label>

  <label>
    <input type="checkbox" wire:model.live="notify">
    Email me about updates
  </label>

  <p wire:show="notify">
    We’ll write to <span wire:text="name">{{ name }}</span> when something happens.
  </p>

  <button type="submit" data-loading>
    Save
  </button>
  <span wire:loading style="display:none">Saving…</span>
</form>
```

For Alpine-powered UI on top of the same state, see [Alpine and islands](/alpine-and-islands/).
