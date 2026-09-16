---
title: Quick start
description: Build a counter component end-to-end and understand why Conduit feels like pure JS.
---

Let’s build the classic counter — small enough to fit in your head, complete enough to show the whole loop.

## 1. The component

```python title="app/conduit/counter.py"
from almasix.conduit import Component

class Counter(Component):
    count = 0
    label = "world"

    def increment(self) -> None:
        self.count += 1

    def decrement(self) -> None:
        self.count -= 1

    def reset(self) -> None:
        self.count = 0

    def render(self) -> str:
        return "conduit.counter"
```

Public class attributes (`count`, `label`) become **public state** — snapshotted, checksummed, and syncable from the browser. Public methods become **actions** you can call with `wire:click` or `$wire`.

`render()` returns a Prism view name. Conduit looks it up, passes public properties into the template, and wraps the HTML with the wire fingerprint the client needs.

:::tip[Or scaffold it]
`smith make:conduit Counter` writes the class + view skeleton for you.
:::

## 2. The view

```html title="resources/views/conduit/counter.prism.html"
<div>
  <h1 wire:text="count">{{ count }}</h1>

  <button type="button" wire:click="decrement" data-loading>−</button>
  <button type="button" wire:click="increment" data-loading>+</button>
  <button type="button" wire:click="reset">Reset</button>

  <label>
    Label
    <input type="text" wire:model.live="label" value="{{ label }}">
  </label>
  <p>Hello, <span wire:text="label">{{ label }}</span>!</p>
</div>
```

A few things happening here:

| Attribute | What it does |
| --- | --- |
| `wire:click="increment"` | Calls `Counter.increment()` on the server |
| `wire:text="count"` | Keeps the heading’s text in sync with `count` on the client *and* after morph |
| `wire:model.live="label"` | Syncs the input on every keystroke (coalesced into one request) |
| `data-loading` | Lets CSS react while a request is in flight |

Server-rendered `{{ count }}` is the first paint. After that, Conduit owns the updates.

## 3. Embed it

In a layout (scripts once):

```html title="resources/views/layouts/app.prism.html"
@conduitScripts
```

On a page:

```html title="resources/views/pages/home.prism.html"
@conduit('counter')
```

Or from a controller / route action:

```python title="app/http/controllers/home.py"
from almasix.conduit import conduit
from almasix.prism.helpers import view

def show():
    return view("pages.home", {"body": conduit("counter")})
```

Pass initial state as kwargs when you need them:

```python
conduit("counter", count=10, label="friend")
```

```html
@conduit('counter', count=10, label='friend')
```

## 4. Click around

Load the page. Hit `+`. Watch the number jump.

Under the hood Conduit:

1. Reads the component snapshot from the DOM
2. Queues a call (`increment`) and coalesces any nearby updates (~16ms)
3. `POST`s to a **signed** `/conduit/update` with CSRF
4. Applies returned `data` to client bindings immediately
5. Morphs the HTML (respecting `wire:key` / `wire:ignore`)

You wrote Python. The UI feels like a tiny SPA. That’s the win.

## Why it can feel like pure JS

Conduit optimizes the **happy path** so typing and toggles don’t sit around waiting for the network to redraw:

1. **Client bindings** — `wire:text`, `wire:show`, and `wire:bind:*` update from `$wire` / `serverMemo.data` right after optimistic local writes.
2. **Request coalescing** — updates and calls within ~16ms merge into one `POST /conduit/update`.
3. **Idiomorph-lite morph** — patches attributes and keyed children instead of blindly replacing the root.
4. **Islands** — `wire:island` / `$wire.$island()` scopes HTML morph to a region so the rest of the component stays put.
5. **`.renderless`** — skip HTML when only server state or events matter.
6. **`data-loading`** — loading hooks for CSS without extra roundtrips.

Pair `wire:model.live` with `wire:text` on the same property and you get an input that feels instant while still syncing to the server.

## A slightly richer example

Search box + results list — still one component:

```python title="app/conduit/search.py"
from almasix.conduit import Component

CATALOG = ["Almasix", "Conduit", "Prism", "Articulate"]

class Search(Component):
    query = ""
    results: list[str] = []

    def search(self) -> None:
        q = self.query.strip().lower()
        self.results = [item for item in CATALOG if q in item.lower()] if q else []

    def render(self) -> str:
        return "conduit.search"
```

```html title="resources/views/conduit/search.prism.html"
<div>
  <input type="search" wire:model.live.debounce.300ms="query" placeholder="Search…">
  <button type="button" wire:click="search">Search</button>

  <ul>
    @foreach(results as item)
      <li wire:key="{{ item }}">{{ item }}</li>
    @endforeach
  </ul>

  @if(not results and query)
    <p>No matches for “{{ query }}”.</p>
  @endif
</div>
```

`wire:model.live.debounce.300ms` keeps the network calm while you type. `wire:key` gives the morph algorithm stable identity for list items.

Next: dig into [Components](/components/), or skip ahead to [Alpine and islands](/alpine-and-islands/) if you want the `$wire` story.
