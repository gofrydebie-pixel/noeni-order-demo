/* Helpers shared by the order page and the kitchen dashboard. */
(function () {
  const C = window.NTK_CONFIG;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fmt = (n, locale = 'nl-BE') =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n);

  // Dates are handled as local "YYYY-MM-DD" strings to avoid timezone drift.
  const parseDay = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  function deadlineFor(day) {
    const d = parseDay(day);
    d.setDate(d.getDate() - C.rules.deadlineDaysBefore);
    d.setHours(C.rules.deadlineHour, 0, 0, 0);
    return d;
  }
  // End of the delivery day: after this a date is no longer offered at all.
  const dayOver = (day, now = new Date()) => { const d = parseDay(day); d.setHours(19, 0, 0, 0); return now > d; };

  function deliveryFee(subtotal, method) {
    if (method === 'pickup') return C.rules.pickupFee;
    const tier = C.rules.deliveryFees.find((t) => subtotal >= t.from);
    return tier ? tier.fee : 0;
  }

  function routesForPostcode(pc) {
    const n = Number(pc);
    if (!/^\d{4}$/.test(String(pc))) return null;
    const hit = C.postcodeRoutes.find((r) => n >= r.from && n <= r.to);
    return hit ? hit.routes : [];
  }
  const routeById = (id) => C.routes.find((r) => r.id === id);

  // Upcoming dates for a set of routes: [{date, route}], soonest first.
  function upcomingDates(routeIds, now = new Date()) {
    const out = [];
    for (const r of C.routes) {
      if (routeIds && !routeIds.includes(r.id)) continue;
      for (const date of r.dates) if (!dayOver(date, now)) out.push({ date, route: r.id });
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }

  function pickupDates(now = new Date()) {
    if (!C.pickup.enabled) return [];
    const out = [];
    const d = new Date(now); d.setHours(0, 0, 0, 0);
    while (d.getDay() !== C.pickup.weekday) d.setDate(d.getDate() + 1);
    for (let i = 0; i < C.pickup.weeksAhead; i++) {
      const k = dayKey(d);
      if (!dayOver(k, now)) out.push({ date: k, route: 'pickup' });
      d.setDate(d.getDate() + 7);
    }
    return out;
  }

  // Belgian structured communication (+++123/4567/89012+++), check = base mod 97.
  function ogm(base10) {
    const base = String(base10).padStart(10, '0').slice(-10);
    let check = Number(BigInt(base) % 97n);
    if (check === 0) check = 97;
    const s = base + String(check).padStart(2, '0');
    return `+++${s.slice(0, 3)}/${s.slice(3, 7)}/${s.slice(7)}+++`;
  }

  // EPC QR ("SEPA QR") payload understood by Belgian banking apps.
  function epcPayload({ name, iban, bic, amount, text }) {
    return ['BCD', '002', '1', 'SCT', bic || '', name.slice(0, 70), iban.replace(/\s/g, ''), `EUR${amount.toFixed(2)}`, '', '', text.slice(0, 140)].join('\n');
  }

  function qrSvg(text) {
    if (!window.qrcode) return '';
    const q = window.qrcode(0, 'M');
    q.addData(text);
    q.make();
    return q.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
  }

  // Talk to the Google Apps Script backend. text/plain avoids a CORS preflight.
  async function api(payload, { timeout = 15000 } = {}) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(C.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), signal: ctrl.signal });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'error');
      return data;
    } finally { clearTimeout(t); }
  }
  async function apiGet(params, { timeout = 8000 } = {}) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(`${C.apiUrl}?${new URLSearchParams(params)}`, { signal: ctrl.signal });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'error');
      return data;
    } finally { clearTimeout(t); }
  }

  // Apply settings coming from the Sheet over the defaults in config.js / menu.js.
  function applyRemoteConfig(remote) {
    if (!remote) return;
    if (remote.routes?.length) C.routes = remote.routes.map((r) => ({ ...(routeById(r.id) || { name: { nl: r.name, fr: r.name, en: r.name } }), id: r.id, dates: r.dates }));
    if (remote.payment) Object.assign(C.payment, Object.fromEntries(Object.entries(remote.payment).filter(([, v]) => v !== '' && v != null)));
    if (remote.banner) C.banner = remote.banner;
    if (typeof remote.ordersOpen === 'boolean') C.ordersOpen = remote.ordersOpen;
    if (remote.menu) {
      for (const item of window.NTK_MENU) {
        for (const v of item.variants) {
          const r = remote.menu[`${item.id}:${v.id}`];
          if (!r) continue;
          if (typeof r.price === 'number') v.price = r.price;
          v.soldOut = r.available === false;
        }
        item.soldOut = item.variants.every((v) => v.soldOut);
      }
    }
  }

  const store = {
    get(k, fallback) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };

  window.NTK = { esc, fmt, parseDay, dayKey, deadlineFor, dayOver, deliveryFee, routesForPostcode, routeById, upcomingDates, pickupDates, ogm, epcPayload, qrSvg, api, apiGet, applyRemoteConfig, store };
})();
