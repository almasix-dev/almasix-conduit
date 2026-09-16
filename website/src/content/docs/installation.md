---
title: Installation
description: Install almasix-conduit and publish optional config and assets.
---

Conduit is the separate package
[`almasix-conduit`](https://pypi.org/project/almasix-conduit/)
from [`almasix-dev/conduit`](https://github.com/almasix-dev/conduit).
Install via the Almasix extra or the package directly:

```bash title="terminal"
pip install 'almasix[conduit]'
# or
pip install almasix-conduit
```

Import path stays `from almasix.conduit import …`. The provider is discovered via
the `almasix.providers` entry-point group. Publish optional config/assets:

```bash title="terminal"
smith vendor:publish --tag=conduit-config
smith vendor:publish --tag=conduit-assets
```
