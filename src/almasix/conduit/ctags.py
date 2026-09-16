"""Rewrite ``<conduit:name>`` / ``<flux:name>`` tags into ``@conduit`` directives."""

from __future__ import annotations

import re
from typing import Any

_ATTR = re.compile(r"""([:@]?[a-zA-Z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))""")
_ECHO_ONLY = re.compile(r"^\s*\{\{\s*(.+?)\s*\}\}\s*$", re.DOTALL)

_PREFIXES = ("conduit", "flux")


def expand_conduit_tags(source: str) -> str:
    """Convert ``<conduit:*>`` / ``<flux:*>`` into ``@conduit(...)`` directives."""
    while True:
        nxt = _expand_one_self(source)
        if nxt != source:
            source = nxt
            continue
        nxt = _expand_one_block(source)
        if nxt == source:
            break
        source = nxt
    return source


def _expand_one_self(source: str) -> str:
    for prefix in _PREFIXES:
        pattern = re.compile(
            rf"<{prefix}:([a-zA-Z0-9_.-]+)(\s[^>]*)?\s*/>",
            re.IGNORECASE,
        )
        match = pattern.search(source)
        if not match:
            continue
        name = _component_name(match.group(1))
        kwargs = _kwargs_expr(match.group(2) or "")
        replacement = f"@conduit({name!r}{kwargs})"
        return source[: match.start()] + replacement + source[match.end() :]
    return source


def _expand_one_block(source: str) -> str:
    """Replace the innermost ``<conduit:name>…</conduit:name>`` (body discarded)."""
    candidates: list[tuple[int, int, int, str]] = []
    for prefix in _PREFIXES:
        open_re_global = re.compile(
            rf"<{prefix}:([a-zA-Z0-9_.-]+)(\s[^>]*)?>",
            re.IGNORECASE,
        )
        for open_match in open_re_global.finditer(source):
            # Skip self-closing already handled; if tag ends with /> it's self.
            tag_slice = source[open_match.start() : open_match.end()]
            if tag_slice.rstrip().endswith("/>"):
                continue
            raw_name = open_match.group(1)
            close_re = re.compile(
                rf"</{prefix}:{re.escape(raw_name)}\s*>",
                re.IGNORECASE,
            )
            open_re = re.compile(
                rf"<{prefix}:{re.escape(raw_name)}(?:\s[^>]*)?>",
                re.IGNORECASE,
            )
            depth = 1
            pos = open_match.end()
            end_match = None
            while depth and pos < len(source):
                next_open = open_re.search(source, pos)
                next_close = close_re.search(source, pos)
                if next_close is None:
                    break
                if next_open is not None and next_open.start() < next_close.start():
                    depth += 1
                    pos = next_open.end()
                else:
                    depth -= 1
                    if depth == 0:
                        end_match = next_close
                        break
                    pos = next_close.end()
            if end_match is None:
                continue
            name = _component_name(raw_name)
            kwargs = _kwargs_expr(open_match.group(2) or "")
            replacement = f"@conduit({name!r}{kwargs})"
            span = end_match.end() - open_match.start()
            candidates.append((span, open_match.start(), end_match.end(), replacement))

    if not candidates:
        return source
    _, start, end, replacement = min(candidates, key=lambda item: item[0])
    return source[:start] + replacement + source[end:]


def _component_name(raw: str) -> str:
    """``forms.profile`` / ``forms-profile`` → dotted registry name."""
    return raw.replace(":", ".").replace("-", ".")


class _Expr:
    __slots__ = ("code",)

    def __init__(self, code: str) -> None:
        self.code = code


def _kwargs_expr(raw: str) -> str:
    """Build ``, key=value, …`` for ``@conduit('name', …)``."""
    attrs = _parse_attrs(raw)
    if not attrs:
        return ""
    parts: list[str] = []
    for key, value in attrs.items():
        py_key = key.replace("-", "_")
        if isinstance(value, _Expr):
            parts.append(f"{py_key}={value.code}")
        elif value is True:
            parts.append(f"{py_key}=True")
        else:
            parts.append(f"{py_key}={value!r}")
    return ", " + ", ".join(parts)


def _parse_attrs(raw: str) -> dict[str, Any]:
    attrs: dict[str, Any] = {}
    for match in _ATTR.finditer(raw):
        key = match.group(1)
        dynamic = key.startswith(":") or key.startswith("@")
        key = key.lstrip(":@")
        if match.group(2) is not None:
            value: Any = match.group(2)
        elif match.group(3) is not None:
            value = match.group(3)
        elif match.group(4) is not None:  # pragma: no cover
            value = match.group(4)
        else:  # pragma: no cover
            value = True
        if dynamic and isinstance(value, str):
            attrs[key] = _Expr(value.strip())
        elif isinstance(value, str):
            echo = _ECHO_ONLY.match(value)
            if echo:
                attrs[key] = _Expr(echo.group(1).strip())
            else:
                attrs[key] = value
        else:  # pragma: no cover
            attrs[key] = value

    for token in re.findall(r"(?<![\w:.-])([a-zA-Z_][\w:.-]*)(?=(\s|$|/))", raw):
        name = token if isinstance(token, str) else token[0]
        if name in attrs or name.lower() in {"conduit", "flux"}:
            continue
        if not re.search(rf"{re.escape(name)}\s*=", raw):
            attrs.setdefault(name, True)
    return attrs
