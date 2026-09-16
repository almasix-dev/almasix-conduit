"""Tests for dual wire:/conduit: emission and full-page script injection."""

from __future__ import annotations

from typing import Any

from almasix.conduit.component import Component
from almasix.conduit.manager import Conduit
from almasix.conduit.mechanism import embed_component, snapshot, wrap_root
from almasix.conduit.routing import ensure_conduit_assets, mount_full_page


class _Tiny(Component):
    count = 0

    def render(self) -> str:
        return "<div>hi</div>"


def test_wrap_root_emits_dual_structural_attrs() -> None:
    Conduit.register("tiny-dual", _Tiny)
    c = Conduit.component("tiny-dual")
    c.conduit_id = "abc"
    c.conduit_name = "tiny-dual"
    html = wrap_root(c, "<div>hi</div>", snapshot(c))
    assert 'conduit:id="abc"' in html
    assert 'wire:id="abc"' in html
    assert 'conduit:name="tiny-dual"' in html
    assert 'wire:name="tiny-dual"' in html
    assert "conduit:initial-data=" in html
    assert "wire:initial-data=" in html
    assert "data-conduit" in html


def test_embed_lazy_dual_attrs() -> None:
    class Lazy(_Tiny):
        lazy = True

    Conduit.register("tiny-lazy", Lazy)
    html = embed_component(Conduit.component("tiny-lazy"))
    assert 'conduit:lazy="true"' in html
    assert 'wire:lazy="true"' in html
    assert "conduit:id=" in html
    assert "wire:id=" in html


def test_ensure_conduit_assets_injects_into_head() -> None:
    body = "<html><head><title>T</title></head><body>ok</body></html>"
    out = ensure_conduit_assets(body)
    assert "conduit/conduit.js" in out or "__CONDUIT__" in out
    assert out.index("</head>") > out.lower().index("script")


def test_ensure_conduit_assets_skips_when_present() -> None:
    body = '<html><head><meta name="conduit-endpoint" content="/x"></head><body></body></html>'
    assert ensure_conduit_assets(body) == body


async def test_mount_full_page_injects_when_layout_omits_scripts(
    monkeypatch: Any,
) -> None:
    class Page(Component):
        def render(self) -> str:
            return "<main>page</main>"

    def fake_render(name: str, ctx: dict) -> str:
        return (
            f"<html><head><title>{ctx.get('title')}</title></head><body>{ctx['slot']}</body></html>"
        )

    monkeypatch.setattr("almasix.conduit.routing.render", fake_render)
    Conduit.register("page-inject", Page)
    action = mount_full_page(Page, layout="layouts.app")
    resp = await action()
    body = resp.body.decode() if hasattr(resp, "body") else str(resp)
    assert "main" in body.lower() or "page" in body.lower()
    assert "conduit" in body.lower()
    assert "__CONDUIT__" in body or "conduit.js" in body
