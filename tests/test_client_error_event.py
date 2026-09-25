"""The browser client announces failed updates so apps can show feedback."""

from __future__ import annotations

from pathlib import Path

import almasix.conduit

CLIENT = Path(almasix.conduit.__file__).parent / "resources" / "js" / "conduit.js"


def test_client_dispatches_conduit_error_for_every_failure_path() -> None:
    source = CLIENT.read_text(encoding="utf-8")
    # HTTP failure, protocol error (e.g. checksum mismatch), and uncaught call error.
    assert source.count('new CustomEvent("conduit:error"') == 3
    assert "effects.errors._method" in source
