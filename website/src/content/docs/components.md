---
title: Components
description: Public state, lifecycle hooks, actions, validation, nesting, and lazy loading.
---

### Public state

Class attributes that are not methods become public properties (snapshotted,
checksummed, syncable):

```python title="examples/conduit.py"
class Search(Component):
    query = ""
    page = 1
    query_string = ["query", "page"]
```

### Lifecycle

| Hook | When |
| --- | --- |
| `mount()` | First create |
| `hydrate()` | After snapshot restore |
| `booted()` | After mount/hydrate |
| `dehydrate()` | Before snapshot |
| `rendering()` / `rendered(html)` | Around Prism render |

### Actions

```python title="examples/conduit.py"
def save(self) -> None:
    self.validate()
    self.dispatch("saved", id=self.id)

def quiet(self) -> None:
    self.do_work()
    self.renderless()  # no HTML morph
```

Call from the browser with `wire:click="save"`, `wire:click="add(1)"`, or
`$wire.save()`.

### Validation

```python title="app/models/example.py"
from pydantic import BaseModel, Field

class Rules(BaseModel):
    label: str = Field(min_length=1)

class Form(Component):
    label = ""
    rules = Rules

    def save(self) -> None:
        self.validate()
```

Errors land in `component.errors` / `$errors` / `effects.errors`.

### Nested components

```html title="resources/views/examples/conduit.prism.html"
@conduit('counter')
@conduit('forms.profile', user_id=user.id)
```

### Lazy / defer

```python title="examples/conduit.py"
class Heavy(Component):
    lazy = True           # load when scrolled into view
    # defer = True        # load on next frame after paint
    lazy_placeholder = "conduit.placeholders.spinner"
```
