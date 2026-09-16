# Cloudflare — conduit.almasix.com

Starlight docs in this `website/` directory deploy as Worker static assets.

## CI vs deploy

GitHub Actions builds only (no API tokens). **Deploy** is Cloudflare Workers Builds:

| Setting | Value |
|---------|--------|
| Root directory | `website/` |
| Build command | `npm ci && npm run build` |
| Deploy command | `npx wrangler deploy` |
| Project name | `almasix-conduit-docs` |

1. Connect Workers Builds to this repo with the settings above.
2. Custom domains → add `conduit.almasix.com`.
3. Verify: `curl -I https://conduit.almasix.com/`
