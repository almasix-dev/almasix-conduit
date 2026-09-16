"""Tests for ``<conduit:*>`` / ``<flux:*>`` tag expansion."""

from __future__ import annotations

from almasix.conduit.ctags import expand_conduit_tags


def test_self_closing_simple() -> None:
    assert expand_conduit_tags("<conduit:counter />") == "@conduit('counter')"


def test_self_closing_with_static_and_dynamic_attrs() -> None:
    out = expand_conduit_tags('<conduit:counter :count="n" label="hello" enabled />')
    assert out.startswith("@conduit('counter'")
    assert "count=n" in out
    assert "label='hello'" in out
    assert "enabled=True" in out


def test_dotted_and_kebab_names() -> None:
    assert expand_conduit_tags("<conduit:forms.profile />") == "@conduit('forms.profile')"
    assert expand_conduit_tags("<conduit:forms-profile />") == "@conduit('forms.profile')"


def test_echo_attr() -> None:
    out = expand_conduit_tags('<conduit:counter count="{{ n + 1 }}" />')
    assert "count=n + 1" in out


def test_flux_alias() -> None:
    assert expand_conduit_tags("<flux:counter />") == "@conduit('counter')"


def test_paired_tag_discards_body() -> None:
    src = '<conduit:counter count="1">ignored</conduit:counter>'
    assert expand_conduit_tags(src) == "@conduit('counter', count='1')"


def test_sibling_tags() -> None:
    src = "<div><conduit:a /><conduit:b /></div>"
    out = expand_conduit_tags(src)
    assert out == "<div>@conduit('a')@conduit('b')</div>"
