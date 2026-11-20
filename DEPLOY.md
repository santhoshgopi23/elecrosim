# Put ElectroSim online (free) – Cloudflare Workers (static assets)

1. **GitHub:** put everything in this folder (the contents, not the folder itself) in a private repository.
2. **Cloudflare:** Workers & Pages → Create application → Import a repository → pick it.
   - Worker name: `elecrosim` (it must match `"name"` in `wrangler.jsonc`; change both together if you rename it)
   - Build command: leave empty
   - Deploy command: `npx wrangler deploy`
   - Root directory: `/`
3. The first deploy creates the waitlist storage (KV) by itself, because `wrangler.jsonc` declares a `WAITLIST` binding without an id.
   If that step fails: Storage & Databases → KV → create a namespace, copy its id, and put it in `wrangler.jsonc` as `{ "binding": "WAITLIST", "id": "<the id>" }`.
4. **Domain:** your Worker → Settings → Domains & Routes → add a custom domain (about US$10–12/year for a .com at Cloudflare Registrar).
5. **Analytics:** your Worker → Metrics / Observability (free).
6. **Edit** `legal.html`: replace `contact@YOURDOMAIN.com` with a real address.
7. **Read the list:** KV → your namespace → the entries starting with `email:`.
8. **Spam control (optional):** Cloudflare → Security → add a rate-limiting rule on `/api/waitlist`.

Updating later: push to GitHub and Cloudflare redeploys by itself.
Not done yet: Google login, subscription checks and Stripe payments.
No Content-Security-Policy header is set because it must be tested in a browser first.
