---
title: Alpine and islands
description: Alpine $wire magics and Livewire 4–style island-scoped morph updates.
---

## Alpine `$wire`

```html title="resources/views/examples/conduit.prism.html"
<button @click="$wire.increment()">+</button>
<span x-text="$wire.count"></span>
```

Magics: `$wire`, `$errors`. Helpers: `$wire.$set`, `$toggle`, `$refresh`,
`$dispatch`, `$island('stats')`.

## Islands (Livewire 4)

Mark a region:

```html title="resources/views/examples/conduit.prism.html"
<div wire:island="stats">
  <p wire:text="visits">{{ visits }}</p>
</div>
<button wire:click="refreshStats" wire:island="stats">Refresh</button>
```

Or declare island views on the component:

```python title="examples/conduit.py"
class Dashboard(Component):
    island_views = {"stats": "conduit.dashboard.stats"}
```

Only that island’s HTML is applied when the request targets it.
