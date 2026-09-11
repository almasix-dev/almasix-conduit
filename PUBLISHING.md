# Publishing almasix-conduit

Trusted Publishing (OIDC) is configured in `.github/workflows/publish.yml`.
Before the first upload, register a **pending publisher** while logged in as the
PyPI owner (`coolsam`):

1. Open https://pypi.org/manage/account/publishing/
2. Under **Pending publishers**, add:

| Field | Value |
|-------|-------|
| PyPI Project Name | `almasix-conduit` |
| Owner | `almasix-dev` |
| Repository name | `conduit` |
| Workflow name | `publish.yml` |
| Environment name | `pypi` |

3. Optionally add a TestPyPI pending publisher with Environment `testpypi`.
4. Re-run the failed Publish workflow on the `v0.1.0` release, or cut a new
   GitHub Release on a matching `vX.Y.Z` tag.
