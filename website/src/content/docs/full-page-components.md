---
title: Full-page components
description: Build entire routes with Route.conduit — layouts, route params, query strings, nested islands, and Alpine on the page.
---

When a whole screen *is* the component — a dashboard, a settings page, a checkout flow — you don’t want to invent a controller just to call `conduit("…")`. **Full-page components** mount a Conduit class as the route itself.

This is the pattern most “real” Conduit apps lean on. Islands and nested `@conduit` embeds still work *inside* the page; the page root is just one big component.

## The 30-second version

```python title="app/conduit/dashboard.py"
from almasix.conduit import Component

class Dashboard(Component):
    title = "Dashboard"
    layout = "layouts.app"
    visits = 0

    def refresh(self) -> None:
        self.visits += 1

    def render(self) -> str:
        return "conduit.dashboard"
```

```html title="resources/views/conduit/dashboard.prism.html"
<div>
  <h1>{{ title }}</h1>
  <p>Visits: <span conduit:text="visits">{{ visits }}</span></p>
  <button type="button" conduit:click="refresh" data-loading>Refresh</button>
</div>
```

```python title="routes/web.py"
from almasix.routing import Route
from app.conduit.dashboard import Dashboard

Route.conduit("/dashboard", Dashboard)
```

```html title="resources/views/layouts/app.prism.html"
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>{{ title }}</title>
    @conduitScripts
  </head>
  <body>
    <nav>…</nav>
    {{ slot }}
  </body>
</html>
```

Visit `/dashboard`. Conduit resolves the component, embeds it into `layouts.app` as `slot`, and the page is live. No separate controller action required.

:::tip[Dual vocabulary]
Examples here use `conduit:` and `$conduit`. `wire:` and `$wire` are fully supported aliases — same behavior.
:::

:::note[Scripts]
Put `@conduitScripts` in your layout (once) — that’s the happy path. If a layout forgets them, Conduit **safety-nets** and injects assets before `</head>` (or `</body>`). The emergency fallback shell (missing layout) also injects automatically.
:::

## `Route.conduit` signature

```python
Route.conduit(
    uri,
    component,          # class, registry name, or "pkg.module.Class"
    *,
    layout=None,        # Prism layout view name
    title=None,         # document title
    params=None,        # extra initial public props
    **route_kwargs,     # middleware, name, etc. — same as Route.get
)
```

Under the hood Almasix registers a **GET** route whose action is `mount_full_page(...)`.

### What you can pass as `component`

| Form | Example | Notes |
| --- | --- | --- |
| Class | `Dashboard` | Auto-registers as kebab name (`dashboard`) if needed |
| Registry name | `"dashboard"` | Resolved via `Conduit.registry()` / `app.conduit.*` |
| Import path | `"app.conduit.dashboard.Dashboard"` | Imported dynamically |

```python
Route.conduit("/dash", Dashboard)
Route.conduit("/dash", "dashboard")
Route.conduit("/dash", "app.conduit.dashboard.Dashboard")
```

## Layout & title resolution

Priority, top wins:

**Layout**

1. `layout=` argument on `Route.conduit`
2. `Component.layout` class attribute
3. Default `"layouts.app"`

**Title**

1. `title=` argument on `Route.conduit`
2. `Component.title` class attribute (also a public property if you declare it that way)
3. The class name

```python
class Billing(Component):
    layout = "layouts.account"
    title = "Billing"

    def render(self) -> str:
        return "conduit.billing"

Route.conduit("/billing", Billing)
# same as:
Route.conduit("/billing", Billing, layout="layouts.account", title="Billing")
```

### What the layout receives

Conduit renders the layout with:

| Key | Value |
| --- | --- |
| `slot` | Embedded component HTML (the usual layout slot) |
| `conduit_html` | Same string — alias if your layout uses a different name |
| `title` | Resolved page title |

Your layout should output `{{ slot }}` (or `{{ conduit_html }}`) where the page body goes, and `@conduitScripts` in `<head>` or before `</body>`.

## Route parameters → public state

Path (and action) kwargs that match **public property names** are passed into the component on first mount:

```python title="app/conduit/show_post.py"
class ShowPost(Component):
    post_id = 0
    title = ""
    body = ""

    def mount(self, post_id: int = 0) -> None:
        post = Post.find_or_fail(post_id)
        self.post_id = post.id
        self.title = post.title
        self.body = post.body

    def render(self) -> str:
        return "conduit.show-post"
```

```python title="routes/web.py"
Route.conduit("/posts/{post_id}", ShowPost)
```

Hitting `/posts/42` sets `post_id=42` on the instance (filtered to public props), then `mount` runs. Lock anything the client shouldn’t rewrite:

```python
from almasix.conduit import Component, Locked

class ShowPost(Component):
    post_id = Locked(0)
    ...
```

### Static `params=`

Seed props that aren’t in the URL:

```python
Route.conduit(
    "/onboarding",
    Onboarding,
    params={"step": 1, "plan": "trial"},
)
```

URL kwargs still win when both supply the same key (`merged = {**params, **kwargs}`).

## Query-string binding on a full page

Full-page components are perfect for shareable filters:

```python title="app/conduit/users_index.py"
from almasix.conduit import Component, WithPagination

class UsersIndex(Component):
    layout = "layouts.app"
    title = "Users"
    query = ""
    query_string = ["query", "page"]

    def search(self) -> None:
        self.page = 1

    def render(self) -> str:
        return "conduit.users-index"
```

```html title="resources/views/conduit/users-index.prism.html"
<div>
  <form conduit:submit="search">
    <input type="search" conduit:model.live.debounce.300ms="query" value="{{ query }}">
    <button type="submit">Search</button>
  </form>
  <!-- list + pagination … -->
</div>
```

`query` and `page` sync to the URL via Conduit’s query-string effect. Bookmark `/users?query=ada&page=2` and the component hydrates from that on the next visit (combined with route props).

## Nested components inside a full page

The page is still normal Conduit HTML — nest freely:

```html title="resources/views/conduit/settings.prism.html"
<div>
  <h1>Settings</h1>
  <conduit:forms.profile :user_id="user_id" />
  <conduit:forms.password />
</div>
```

```python
class Settings(Component):
    user_id = Locked(0)
    layout = "layouts.app"

    def mount(self, user_id: int = 0) -> None:
        self.user_id = user_id

    def render(self) -> str:
        return "conduit.settings"

Route.conduit("/settings/{user_id}", Settings)
```

Each child gets its own snapshot and component root. Parent and children talk through events / shared props you pass at embed time.

## Islands on a full page

Big dashboards: keep chrome stable, refresh a region:

```html
<div>
  <header>…</header>
  <div conduit:island="stats">
    <span conduit:text="visits">{{ visits }}</span>
  </div>
  <button type="button" conduit:click="refreshStats" conduit:island="stats">Refresh</button>
</div>
```

Or from Alpine on the same page: `$conduit.$island('stats')`. See [Alpine and islands](/alpine-and-islands/).

## Alpine on a full-page root

Same rules as embeds — `$conduit` is the page component:

```html
<div x-data="{ sidebar: true }">
  <aside x-show="sidebar" x-transition>…</aside>
  <button type="button" @click="sidebar = !sidebar">Menu</button>
  <button type="button" @click="$conduit.refresh()">Reload data</button>
</div>
```

Local Alpine state for UI chrome; `$conduit` for anything that must survive a refresh or hit the server.

## Inline HTML `render()` (sketch mode)

`render()` usually returns a Prism view name. For tiny full-page sketches you can return HTML directly:

```python
class Hello(Component):
    name = "world"

    def render(self) -> str:
        return """
        <div>
          <h1>Hello, <span conduit:text="name">{{ name }}</span></h1>
          <input conduit:model.live="name" value="{{ name }}">
        </div>
        """

Route.conduit("/hello", Hello, layout="layouts.app")
```

Conduit detects a string that looks like markup (`lstrip().startswith("<")`) and skips the view resolver. Great for spikes; prefer a Prism view once the page grows.

## Fallback shell

If the layout view fails to render (missing `layouts.app`, bad name, etc.), Conduit serves a minimal document:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>…</title>
    <!-- conduit_assets_script() injected here -->
  </head>
  <body><!-- embedded component --></body>
</html>
```

Handy for tests and brand-new apps. Production apps should ship a real layout with `@conduitScripts` so you control chrome, CSS, and CSP.

## Middleware, naming, and friends

`Route.conduit` accepts the same route options as other Almasix routes (`middleware=`, `name=`, …):

```python
Route.conduit(
    "/admin",
    AdminDashboard,
    name="admin.dashboard",
    middleware=["auth", "can:admin"],
)
```

## Mental model

```
GET /dashboard
  → Route.conduit action (mount_full_page)
  → resolve component class
  → Conduit.component(name, **public props from route/params)
  → embed_component → HTML with conduit:id (+ wire:id alias) / snapshot
  → render layout(slot=…, title=…)
  → HTML response

Later clicks / $conduit calls
  → same POST /conduit/update protocol as any embed
```

Full-page isn’t a different runtime. It’s the same Conduit component, promoted to “own the URL.”

## Checklist

1. Component with `render()` → view (or inline HTML)
2. Layout includes `@conduitScripts` and `{{ slot }}`
3. `Route.conduit("/path", Component)` (optional `layout`, `title`, `params`)
4. Lock sensitive props; use `query_string` for shareable filters
5. Nest `<conduit:…>` / islands / Alpine as needed

Next: [Directives](/directives/) for the `conduit:*` vocabulary on the page, or [Alpine and islands](/alpine-and-islands/) for `$conduit` patterns on full-page roots.
