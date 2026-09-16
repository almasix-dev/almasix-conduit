---
title: Alpine and islands
description: Practical Alpine.js + $wire patterns, entanglement, errors, and island-scoped morph updates.
---

Conduit and Alpine.js are good friends. Alpine owns little bits of browser-only UI — dropdowns, transitions, focus traps. Conduit owns server state and actions. `$wire` is the handshake.

`@conduitScripts` loads Alpine (CDN by default) and registers the magics. Prefer bundling Alpine yourself in production and pointing `conduit.alpine_cdn` / asset config accordingly — see [Configuration](/configuration/).

## `$wire` in sixty seconds

Inside a Conduit component root, Alpine can read and write public state and call actions:

```html title="resources/views/conduit/counter.prism.html"
<div>
  <p>Server count: <span x-text="$wire.count"></span></p>
  <button type="button" @click="$wire.increment()">+</button>
  <button type="button" @click="$wire.count = 0">Reset</button>
</div>
```

| Expression | What happens |
| --- | --- |
| `$wire.count` | Read public property from the snapshot memo |
| `$wire.count = 3` | Optimistic local write + enqueue sync |
| `$wire.increment()` | Call the server action `increment` |
| `$wire.increment` without `()` | Still a function — call it |

Property sets update `wire:text` / `wire:show` / `wire:bind:*` **immediately**, then the network request coalesces with siblings.

## Magics & helpers

| API | Role |
| --- | --- |
| `$wire` | Proxy to component state + actions |
| `$errors` | Validation error bag for this component |
| `$wire.$set(name, value)` | Set a property and sync |
| `$wire.$toggle(name)` | Flip a boolean on the server |
| `$wire.$refresh()` | Re-render without a custom action |
| `$wire.$dispatch(event, params)` | Fire a browser `CustomEvent` |
| `$wire.$island(name, opts?)` | Refresh / call scoped to an island |
| `$wire.$entangle(name)` | Alpine-friendly get/set object for a property |
| `$wire.$errors` | Same bag as `$errors` |

## Local Alpine state + server state

This is the everyday pattern: Alpine for ephemeral UI, Conduit for truth.

```python title="app/conduit/menu.py"
from almasix.conduit import Component

class Menu(Component):
    items: list[str] = ["Dashboard", "Projects", "Billing"]
    active = "Dashboard"

    def select(self, name: str) -> None:
        self.active = name

    def render(self) -> str:
        return "conduit.menu"
```

```html title="resources/views/conduit/menu.prism.html"
<nav
  x-data="{ open: false }"
  @keydown.escape.window="open = false"
>
  <button type="button" @click="open = !open" :aria-expanded="open">
    Menu
    (<span wire:text="active">{{ active }}</span>)
  </button>

  <div x-show="open" x-transition @click.outside="open = false">
    @foreach(items as item)
      <button
        type="button"
        wire:key="{{ item }}"
        @click="$wire.select('{{ item }}'); open = false"
        :class="$wire.active === '{{ item }}' && 'font-bold'"
      >
        {{ item }}
      </button>
    @endforeach
  </div>
</nav>
```

`open` never touches the server. `active` does. Escape and click-outside stay pure Alpine. That’s the split that keeps things pleasant.

## Transitions & loading flourishes

```html
<button type="button" wire:click="save" data-loading x-data>
  <span wire:loading.remove>Save changes</span>
  <span wire:loading x-transition.opacity>Saving…</span>
</button>

<div
  x-data="{ show: false }"
  x-init="$watch(() => $wire.flash, v => { show = !!v; if (v) setTimeout(() => $wire.flash = '', 2500) })"
>
  <div x-show="show" x-transition.opacity wire:text="flash">{{ flash }}</div>
</div>
```

Use Conduit for the flash message content; Alpine for the fade and the auto-dismiss timer.

## Entangle a property

`$entangle` returns a small object with a `.value` getter/setter — useful when an Alpine plugin or `x-model` wants a bindable target:

```html
<div x-data="{ draft: $wire.$entangle('title') }">
  <input x-model="draft.value">
  <p x-text="draft.value"></p>
</div>
```

Writes go through the same optimistic path as `$wire.title = …`.

## Validation errors from Alpine

```python title="app/conduit/signup.py"
from pydantic import BaseModel, Field
from almasix.conduit import Component

class Rules(BaseModel):
    email: str = Field(min_length=3)

class Signup(Component):
    email = ""
    rules = Rules

    def save(self) -> None:
        self.validate()
```

```html title="resources/views/conduit/signup.prism.html"
<form wire:submit="save" x-data>
  <input type="email" wire:model="email" :class="$errors.email && 'border-red-500'">

  <template x-if="$errors.email">
    <p class="error" x-text="$errors.email[0]"></p>
  </template>

  <button type="submit">Continue</button>
</form>
```

`$errors` updates when the response brings `effects.errors` back. No extra store to keep in sync.

## Dispatch → Alpine

Server:

```python
def publish(self) -> None:
    self.dispatch("toast", message="Published!", tone="success")
```

Client:

```html
<div
  x-data="{ toast: null }"
  @toast.window="toast = $event.detail; setTimeout(() => toast = null, 3000)"
>
  <div x-show="toast" x-transition x-text="toast && toast.message"></div>
</div>
```

One component (or layout shell) can host the toast UI; any Conduit action can fire it.

## Call Conduit from Alpine expressions

Anything you’d put on `wire:click` you can put on `@click` via `$wire`:

```html
<div x-data="{ qty: 1 }">
  <input type="number" x-model.number="qty" min="1">
  <button type="button" @click="$wire.addToCart(qty)">Add to cart</button>
  <button type="button" @click="$wire.$refresh()">Reload</button>
  <button type="button" @click="$wire.$toggle('favorite')">Favorite</button>
</div>
```

## Islands — morph only what changed

Big dashboards hate full-tree morphs. Mark a region as an **island** and refresh just that patch.

```html title="resources/views/conduit/dashboard.prism.html"
<div>
  <header>…stable chrome…</header>

  <div wire:island="stats">
    <p>Visits: <span wire:text="visits">{{ visits }}</span></p>
    <p>Signups: <span wire:text="signups">{{ signups }}</span></p>
  </div>

  <button type="button" wire:click="refreshStats" wire:island="stats">
    Refresh stats
  </button>

  <!-- Alpine can target the same island -->
  <button type="button" @click="$wire.$island('stats')">
    Refresh via $wire
  </button>
  <button type="button" @click="$wire.$island('stats', { method: 'refreshStats' })">
    Call + island
  </button>
</div>
```

Or declare island-specific views on the component:

```python title="app/conduit/dashboard.py"
class Dashboard(Component):
    visits = 0
    signups = 0
    island_views = {"stats": "conduit.dashboard.stats"}

    def refreshStats(self) -> None:
        self.visits, self.signups = fetch_stats()

    def render(self) -> str:
        return "conduit.dashboard"
```

Only the island’s HTML is applied when the request targets it — the header, Alpine dropdowns, and anything else outside stay put. Pair islands with `wire:ignore` for third-party widgets and you’ve got a calm page.

## CSP-safe Alpine

If your Content-Security-Policy blocks `eval`-style Alpine expressions, flip `csp_safe` in config. Conduit will load the Alpine CSP build instead — see [Configuration](/configuration/).

## Mental model

| Concern | Prefer |
| --- | --- |
| Persisted state, validation, DB | Conduit public properties + actions |
| Dropdown open, hover, local tabs | Alpine `x-data` |
| Display server state in Alpine | `x-text="$wire…"` / `$entangle` |
| Call server from Alpine | `@click="$wire.method()"` |
| Morph a slice of the page | `wire:island` / `$wire.$island` |

That’s the whole friendship. Keep truth on the server, keep sparkle in the browser, and let `$wire` carry messages between them.
