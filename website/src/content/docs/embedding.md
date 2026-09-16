---
title: Embedding components
description: Embed Conduit with @conduit, conduit(), or Livewire-style <conduit:name> tags.
---

Three ways to drop a component onto a page. They all end up in the same place: `conduit(name, **params)` → embedded HTML with a dual `conduit:` / `wire:` fingerprint.

## `<conduit:name>` tags (preferred)

Familiar if you’ve used Livewire’s `<livewire:…>` tags:

```html title="resources/views/pages/home.prism.html"
<conduit:counter />
<conduit:forms.profile :user_id="user.id" label="Hi" />
```

Self-closing and paired tags both work; paired tag **bodies are discarded** in 0.2 (no slots yet).

| Tag | Expands to |
| --- | --- |
| `<conduit:counter />` | `@conduit('counter')` |
| `<conduit:forms.profile />` | `@conduit('forms.profile')` |
| `<conduit:forms-profile />` | `@conduit('forms.profile')` |
| `<conduit:counter :count="n" label="x" />` | `@conduit('counter', count=n, label='x')` |

Dynamic attrs use Blade-style `:attr="expr"` or `attr="{{ expr }}"`. Boolean attrs become `True`.

`<flux:…>` is accepted as a rename-window alias and expands the same way.

## `@conduit` directive

```html
@conduit('counter')
@conduit('counter', count=10, label='friend')
@conduitScripts
```

## Python helper

```python
from almasix.conduit import conduit

html = conduit("counter", count=10)
```

## Dual vocabulary on the wire

Inside any component view you can use **either** prefix:

```html
<button type="button" conduit:click="increment">+</button>
<!-- same thing -->
<button type="button" wire:click="increment">+</button>

<span conduit:text="count">{{ count }}</span>
```

Alpine magics:

```html
<span x-text="$conduit.count"></span>
<span x-text="$wire.count"></span>
```

Docs examples prefer `conduit:` / `$conduit` / `<conduit:…>`. `wire:` / `$wire` remain fully supported.

Structural attrs on the root (`id`, `name`, `initial-data`, `lazy`, `defer`) are **dual-emitted** by the server so either client vocabulary can boot the component.

Next: [Directives](/directives/) or [Full-page components](/full-page-components/).
