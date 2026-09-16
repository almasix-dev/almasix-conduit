---
title: Quick start
description: Register a counter component, embed it with @conduit, and feel instant client updates.
---

```python title="app/conduit/counter.py"
from almasix.conduit import Component

class Counter(Component):
    count = 0

    def increment(self) -> None:
        self.count += 1

    def render(self) -> str:
        return "conduit.counter"
```

```html title="resources/views/examples/conduit.prism.html"
<!-- resources/views/conduit/counter.prism.html -->
<div>
  <h1 wire:text="count">{{ count }}</h1>
  <button type="button" wire:click="increment" data-loading>+</button>
  <input type="text" wire:model.live="label">
  <span wire:text="label">{{ label }}</span>
</div>
```

```html title="resources/views/examples/conduit.prism.html"
<!-- layout -->
@conduitScripts
@conduit('counter')
```

```python title="examples/conduit.py"
from almasix.conduit import conduit
from almasix.prism.helpers import view

def show():
    return view("page", {"body": conduit("counter")})
```

## Why it can feel like pure JS

Conduit optimizes the **happy path** so typing and toggles do not wait on the
network for visual feedback:

1. **Client bindings** — `wire:text`, `wire:show`, and `wire:bind:*` update from
   `$wire` / `serverMemo.data` immediately after optimistic local writes.
2. **Request coalescing** — updates/calls within ~16ms merge into one
   `POST /conduit/update` (Livewire-style batching).
3. **Idiomorph-lite morph** — patches attributes and keyed children instead of
   blindly replacing the root (respects `wire:ignore` / `wire:key`).
4. **Islands** — `wire:island` / `$wire.$island()` scopes HTML morph to a
   region so the rest of the component stays put.
5. **`.renderless`** — skip HTML when only server state / events matter.
6. **`data-loading`** — v4-style loading hooks for CSS without extra roundtrips.

Use `wire:model.live` + `wire:text` on the same property for an input that feels
instant while still syncing to the server.
