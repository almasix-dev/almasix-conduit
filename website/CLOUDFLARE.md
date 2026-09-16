# Cloudflare — conduit.almasix.com

Starlight docs in this `website/` directory deploy as Worker static assets.

## Secrets (repo Actions)

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Workers Scripts Edit + Account read |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account id |

## Cutover

1. Merge a PR that includes this Wrangler config; confirm deploy succeeds.
2. Workers & Pages → `almasix-conduit-docs` → Custom domains → add `conduit.almasix.com`.
3. Verify: `curl -I https://conduit.almasix.com/`
