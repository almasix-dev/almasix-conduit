# almasix-conduit

Server-driven reactive components for [Almasix](https://github.com/almasix-dev/almasix).
Import path stays `almasix.conduit` (namespace package under the core `almasix` dist).

**0.2** ships full-page routes, `<conduit:…>` tags, and a dual `conduit:` / `wire:` + `$conduit` / `$wire` vocabulary.

Inspired by [Livewire](https://livewire.laravel.com/)’s architecture — thank you, Caleb — Conduit is its own package for the Almasix/Python world.

```bash
pip install 'almasix[conduit]'
# or
pip install almasix-conduit
```

```python
from almasix.conduit import Component, Conduit, conduit
from almasix.routing import Route

class Counter(Component):
    count = 0

    def increment(self) -> None:
        self.count += 1

    def render(self) -> str:
        return "conduit.counter"

Route.conduit("/counter", Counter)
```

```html
<!-- embed anywhere -->
<conduit:counter />
<!-- or -->
@conduit('counter')

<button type="button" conduit:click="increment">+</button>
<span x-text="$conduit.count"></span>
```

`wire:*` and `$wire` still work — use whichever you prefer.

`ConduitServiceProvider` is discovered automatically via the `almasix.providers`
entry-point group when this package is installed.

Docs: [conduit.almasix.com](https://conduit.almasix.com/).

## Develop

```bash
pip install -e ".[dev]"
ruff check src tests && ruff format --check src tests
pytest -q
```

## Release

Tag `vX.Y.Z` matching `project.version` and publish a GitHub Release. The
publish workflow uses PyPI Trusted Publishing (OIDC).

## License

[MIT](LICENSE)
