"""Full-page Conduit routing — ``Route.conduit('/dash', Dashboard)``."""

from __future__ import annotations

import re
from collections.abc import Callable, Mapping
from typing import Any

from almasix.http.response import html
from almasix.prism.helpers import render

from almasix.conduit.manager import Conduit
from almasix.conduit.mechanism import conduit_assets_script, embed_component

_BOOT_MARKERS = (
    "conduit/conduit.js",
    "__CONDUIT__",
    'name="conduit-endpoint"',
    "name='conduit-endpoint'",
)


def resolve_component(target: str | type) -> type:
    if isinstance(target, type):
        return target
    name = str(target)
    # Allow ``app.conduit.dashboard.Dashboard`` or registry name ``dashboard``
    if "." in name and name[0].isupper() is False:
        try:
            return Conduit.registry().resolve(name)
        except KeyError:
            pass
    if "." in name:
        module_path, _, class_name = name.rpartition(".")
        import importlib

        module = importlib.import_module(module_path)
        cls = getattr(module, class_name)
        if isinstance(cls, type):
            return cls
    return Conduit.registry().resolve(name)


def ensure_conduit_assets(body: str) -> str:
    """Inject Conduit + Alpine scripts when the layout omitted ``@conduitScripts``."""
    if any(marker in body for marker in _BOOT_MARKERS):
        return body
    tags = conduit_assets_script()
    if re.search(r"</head\s*>", body, flags=re.IGNORECASE):
        return re.sub(r"</head\s*>", tags + "</head>", body, count=1, flags=re.IGNORECASE)
    if re.search(r"</body\s*>", body, flags=re.IGNORECASE):
        return re.sub(r"</body\s*>", tags + "</body>", body, count=1, flags=re.IGNORECASE)
    return body + tags


def mount_full_page(
    component: str | type,
    *,
    layout: str | None = None,
    params: Mapping[str, Any] | None = None,
    title: str | None = None,
) -> Callable[..., Any]:
    """Return a route action that renders a Conduit component as a full page."""

    async def action(**kwargs: Any) -> Any:
        cls = resolve_component(component)
        name = getattr(cls, "_conduit_name", None) or cls.__name__
        # Prefer kebab registry name when registered
        try:
            # reverse: use class module discovery name
            reg_name = name
            for key, registered in Conduit.registry()._map.items():
                if registered is cls:
                    reg_name = key
                    break
            else:
                # register under kebab of class
                reg_name = re.sub(r"(?<!^)(?=[A-Z])", "-", cls.__name__).lower()
                Conduit.register(reg_name, cls)
        except Exception:
            reg_name = cls.__name__

        merged = {**(params or {}), **kwargs}
        instance = Conduit.component(
            reg_name, **{k: v for k, v in merged.items() if k in cls._public_property_names()}
        )
        layout_name = layout or getattr(cls, "layout", None) or "layouts.app"
        title_text = title or getattr(cls, "title", None) or cls.__name__
        slot = embed_component(instance)
        try:
            body = render(
                layout_name,
                {
                    "slot": slot,
                    "title": title_text,
                    "conduit_html": slot,
                },
            )
            body = ensure_conduit_assets(str(body))
        except Exception:
            # Minimal shell when the app has no layouts.app
            body = (
                "<!DOCTYPE html><html><head><meta charset='utf-8'>"
                f"<title>{title_text}</title>{conduit_assets_script()}</head>"
                f"<body>{slot}</body></html>"
            )
        return html(body)

    return action
