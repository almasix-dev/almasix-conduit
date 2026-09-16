---
title: Installation
description: Install almasix-conduit, wire up the provider, and publish optional config and assets.
---

Conduit lives in its own package — [`almasix-conduit`](https://pypi.org/project/almasix-conduit/) — so you can add reactive components without dragging them into every Almasix app by default.

## Install

```bash title="terminal"
pip install 'almasix[conduit]'
# or
pip install almasix-conduit
```

Either way, the import path stays the same:

```python
from almasix.conduit import Component, Conduit, conduit
```

`ConduitServiceProvider` is discovered automatically through the `almasix.providers` entry-point group. No manual provider registration required for the happy path.

Source: [`almasix-dev/conduit`](https://github.com/almasix-dev/almasix-conduit).

## Optional publishes

Want a local config file or a copy of the JS asset to poke at?

```bash title="terminal"
smith vendor:publish --tag=conduit-config
smith vendor:publish --tag=conduit-assets
```

That drops `config/conduit.py` (endpoint, Alpine CDN, coalesce window, signature TTL, …) and the Conduit client script where your app can vendor it. Defaults already work out of the box — publish when you’re ready to tune.

## Scaffold a component

```bash title="terminal"
smith make:conduit Counter
# or nested: smith make:conduit Forms/Profile
```

That creates an `app/conduit/...` class and a matching Prism view under `resources/views/conduit/`. Embed it with `@conduit('counter')` once `@conduitScripts` is in your layout.

## Layout checklist

Every page that hosts a Conduit component needs the scripts once (usually the app layout):

```html title="resources/views/layouts/app.prism.html"
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>{{ title }}</title>
    @conduitScripts
  </head>
  <body>
    {{ slot }}
  </body>
</html>
```

`@conduitScripts` injects Alpine (CDN, configurable) and `conduit.js`, plus a signed update endpoint in `window.__CONDUIT__`. Without it, buttons will stare blankly at you.

Next up: [Quick start](/quick-start/).
