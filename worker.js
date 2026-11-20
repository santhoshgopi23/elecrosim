// ElectroSim Worker. It runs only for /api/* (see run_worker_first in wrangler.jsonc);
// every other page and file is served directly as a static asset.
// POST /api/waitlist stores a Pro-list signup in the KV namespace bound as WAITLIST.
const ROLES = ['Student','Teacher / trainer','Technician / engineer','Training centre / company','Hobbyist',''];
const PRICES = ['Under S$30','S$30 – 60','S$60 – 100','Over S$100','Not sure yet',''];
const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

async function waitlist(request, env) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  if (!env.WAITLIST) return json({ error: 'The list is not set up yet.' }, 503);

  // Only accept submissions from this site itself.
  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: 'Not allowed.' }, 403);

  const raw = await request.text();
  if (raw.length > 2000) return json({ error: 'Request too large.' }, 413);
  let d; try { d = JSON.parse(raw); } catch { return json({ error: 'Invalid request.' }, 400); }

  // Honeypot: bots fill the hidden field. Pretend success, store nothing.
  if (d.website) return json({ ok: true });

  const email = String(d.email || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Please enter a valid email address.' }, 400);
  const role = ROLES.includes(d.role) ? d.role : '';
  const price = PRICES.includes(d.price) ? d.price : '';

  // One record per email. No IP address or other tracking data is stored.
  await env.WAITLIST.put('email:' + email, JSON.stringify({ email, role, price, joined: new Date().toISOString() }));
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/waitlist') return waitlist(request, env);
    return json({ error: 'Not found.' }, 404);
  }
};
