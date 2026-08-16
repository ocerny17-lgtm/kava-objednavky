# Nastavení Redis (Upstash)

Databáze: `upstash-kv-crimson-dog` (název nevadí)

## Co musí být hotové

1. Vercel → projekt `kava-objednavky` → **Storage**
2. Databáze `upstash-kv-crimson-dog` je **Connected** k projektu (Production)
3. Po připojení vždy **Redeploy** (Deployments → ⋯ → Redeploy)

Vercel doplní env:
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
- nebo `KV_REST_API_URL` / `KV_REST_API_TOKEN`

API (`@upstash/redis`) umí obojí.

## Deploy

Push do `main` na GitHub → Vercel nasadí sám.
