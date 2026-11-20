# Put ElectroSim online (free) – Cloudflare Pages

1. **GitHub:** create a free private repository and upload everything in this folder (the folder's contents, not the folder itself).
2. **Cloudflare:** sign up (free) → Workers & Pages → Create → Pages → Connect to Git → pick the repository.
   Build command: *(leave empty)*. Output directory: `/` (root). Deploy.
3. **Waitlist storage:** Storage & Databases → KV → Create a namespace named `electrosim-waitlist`.
   Then your Pages project → Settings → Bindings → add **KV namespace**, variable name **`WAITLIST`**, choose that namespace. Redeploy.
4. **Domain:** Pages project → Custom domains → add your domain (buy one at Cloudflare Registrar, about US$10–12/year for a .com).
5. **Analytics:** Pages project → Metrics → enable Web Analytics (free, no cookies).
6. **Edit** `legal.html`: replace `contact@YOURDOMAIN.com` with a real address.
7. **Read the list:** KV → your namespace → the entries starting with `email:` (each holds email, role, price range, date).
8. **Spam control (optional):** Cloudflare → Security → add a rate-limiting rule on `/api/waitlist`.

Updating the site later: push to GitHub and Cloudflare redeploys by itself.

Not done yet: Google login, subscription checks and Stripe payments (next steps once there is demand).
Note: no Content-Security-Policy header is set because it must be tested in a browser first; add it after launch.
