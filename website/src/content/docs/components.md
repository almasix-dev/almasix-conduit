---
title: Components
description: Public state, lifecycle, actions, validation, nesting, lazy loading, and helpers like Computed and Locked.
---

A Conduit component is a Python class with public state, actions, and a `render()` method. That’s the unit of interactivity.

## Public state

Class attributes that aren’t methods (and don’t start with `_`) become **public properties**. They’re snapshotted into the page, checksummed, and syncable from the browser via `wire:model` / `$wire`.

```python title="app/conduit/search.py"
from almasix.conduit import Component

class Search(Component):
    query = ""
    page = 1
    query_string = ["query", "page"]  # keep URL in sync
```

`query_string` mirrors listed properties onto the URL query string — handy for shareable search/filter UIs.

### Locked properties

Some state should travel with the snapshot but never be writable from the client (think `user_id`). Mark it locked:

```python title="app/conduit/profile.py"
from almasix.conduit import Component, Locked

class Profile(Component):
    user_id = Locked(0)  # client cannot $set this
    name = ""

    def mount(self, user_id: int = 0) -> None:
        self.user_id = user_id
```

Attempts to update a locked property from the wire raise — the server stays honest.

### Derived values

Keep writable public state small. Derive the rest in methods and read them from the view via `this` (Conduit passes the component instance into the render context):

```python title="app/conduit/cart.py"
from almasix.conduit import Component

class Cart(Component):
    items: list[dict] = []

    def total(self) -> float:
        return sum(float(i.get("price", 0)) for i in self.items)
```

```html title="resources/views/conduit/cart.prism.html"
<p>Total: {{ this.total() }}</p>
```

There’s also a `@Computed` helper in `almasix.conduit` for marking derived methods — handy when you want that intent visible in the class body.

## Lifecycle

| Hook | When |
| --- | --- |
| `mount(**kwargs)` | First create — set up from route/embed params |
| `hydrate()` | After snapshot restore on a subsequent request |
| `booted()` | After mount *or* hydrate, before render |
| `dehydrate()` | Before the snapshot is written for the client |
| `rendering()` | Immediately before `render()` |
| `rendered(html)` | After HTML is produced — return possibly modified HTML |

```python title="app/conduit/dashboard.py"
class Dashboard(Component):
    user_id = 0
    greeting = ""

    def mount(self, user_id: int = 0) -> None:
        self.user_id = user_id
        self.greeting = f"Hey, #{user_id}"

    def booted(self) -> None:
        # Runs on first load and every wire request
        ...
```

## Actions

Any public method can be an action. Call it from HTML or Alpine:

```python title="app/conduit/todos.py"
class Todos(Component):
    title = ""
    items: list[str] = []

    def add(self) -> None:
        text = self.title.strip()
        if not text:
            self.add_error("title", "Give the todo a name.")
            return
        self.items = [*self.items, text]
        self.title = ""

    def remove(self, index: int) -> None:
        self.items = [item for i, item in enumerate(self.items) if i != index]

    def quiet_ping(self) -> None:
        self.notify_elsewhere()
        self.renderless()  # skip HTML morph — state/events only
```

```html title="resources/views/conduit/todos.prism.html"
<form wire:submit="add">
  <input wire:model="title" placeholder="New todo">
  <button type="submit">Add</button>
</form>

<ul>
  @foreach(items as item)
    <li wire:key="{{ loop.index0 }}">
      {{ item }}
      <button type="button" wire:click="remove({{ loop.index0 }})">×</button>
    </li>
  @endforeach
</ul>
```

From Alpine: `$wire.add()`, `$wire.remove(0)`, `$wire.title = 'Buy milk'`.

### Events

Broadcast browser events from the server after an action:

```python
def save(self) -> None:
    self.validate()
    self.dispatch("saved", id=self.record_id)
```

Conduit turns that into a `CustomEvent` on `window`. Alpine (or plain JS) can listen:

```html
<div x-data @saved.window="console.log($event.detail)">
  ...
</div>
```

Helpers related to targeting: `dispatch_self`, `dispatch_to`. Run a snippet of JS after the response with `self.js("$wire.$el.querySelector('input')?.focus()")` — great for focus and scroll.

### Toggle helper

```python
self.toggle("open")  # flips a boolean public property
# or from the client: $wire.$toggle('open')
```

## Validation

Point `rules` at a Pydantic model (or pass rules into `validate()`):

```python title="app/conduit/signup.py"
from pydantic import BaseModel, Field
from almasix.conduit import Component

class Rules(BaseModel):
    email: str = Field(min_length=3)
    name: str = Field(min_length=1)

class Signup(Component):
    email = ""
    name = ""
    rules = Rules

    def save(self) -> None:
        self.validate()
        # persist…
```

```html title="resources/views/conduit/signup.prism.html"
<form wire:submit="save">
  <input type="email" wire:model="email">
  @if(errors.get('email'))
    <p class="error">{{ errors['email'][0] }}</p>
  @endif

  <input wire:model="name">
  @if(errors.get('name'))
    <p class="error">{{ errors['name'][0] }}</p>
  @endif

  <button type="submit">Sign up</button>
</form>
```

Errors land in `component.errors`, the view’s `errors`, Alpine’s `$errors`, and `effects.errors`. Use `add_error` / `reset_error_bag` for handmade messages.

## Nesting

Components compose. Embed children from Prism or Python:

```html title="resources/views/conduit/settings.prism.html"
<section>
  <h1>Settings</h1>
  <conduit:forms.profile :user_id="user_id" />
  <conduit:forms.password />
  <!-- or @conduit('forms.profile', user_id=user_id) -->
</section>
```

```python
from almasix.conduit import conduit

html = conduit("forms.profile", user_id=user.id)
```

Registry names are dotted (`forms.profile` → `app.conduit.forms.profile.Profile` by convention). Register explicitly when you prefer:

```python
from almasix.conduit import Conduit
from app.conduit.counter import Counter

Conduit.register("counter", Counter)
```

## Lazy / defer

Heavy widgets don’t need to block first paint:

```python title="app/conduit/analytics.py"
class Analytics(Component):
    lazy = True  # load when scrolled into view
    # defer = True  # load on next frame after paint
    lazy_placeholder = "conduit.placeholders.spinner"
```

## Pagination

```python title="app/conduit/users_table.py"
from almasix.conduit import Component, WithPagination

class UsersTable(Component, WithPagination):
    per_page = 20

    def render(self) -> str:
        users = self.paginate(User.query().order_by("name"))
        # pass users into the view via render context / properties as you prefer
        return "conduit.users-table"
```

`page` syncs like any other public property — add `next_page` / `prev_page` actions (or `$wire.page = n` from Alpine) and re-render the table.

## Inline HTML render

Prefer a view file for anything real, but tiny demos can return HTML from `render()` if your setup supports it — keep the component self-contained while you sketch. See [Full-page components](/full-page-components/#inline-html-render-sketch-mode) for using that with `Route.conduit`.

## Full-page components

When the route *is* the component (dashboards, settings, resource screens), use `Route.conduit(...)`.

That’s a major Conduit pattern — layouts, route params → public state, query strings, nesting, islands — covered in full here:

**[Full-page components →](/full-page-components/)**

Next: the [Directives](/directives/) vocabulary, or [Alpine and islands](/alpine-and-islands/) for `$wire` deep-dives.
