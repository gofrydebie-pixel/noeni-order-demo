/* Demo mode (no apiUrl yet): sample orders and route runs, kept in this browser.
   Shared by the kitchen dashboard and the tracking page. */
(function () {
  const MENU = window.NTK_MENU;
  const { store } = window.NTK;

  function orders() {
    const first = ['Lotte', 'Wout', 'Sarah', 'Jens', 'Elke', 'Pieter', 'Marie', 'Tom', 'Fien', 'Arne', 'Nathalie', 'Bram', 'Ines', 'Koen', 'Lien', 'Ruben'];
    const last = ['Peeters', 'Janssens', 'Maes', 'Claes', 'Wouters', 'De Smet', 'Willems', 'Goossens', 'Mertens', 'Dubois', 'Lambert', 'Desmet', 'Van Damme', 'Hermans', 'Martens', 'Verbeke'];
    const towns = [['9000', 'Gent'], ['9050', 'Gentbrugge'], ['9051', 'Sint-Denijs-Westrem'], ['9030', 'Mariakerke'], ['9820', 'Merelbeke'], ['9200', 'Dendermonde'], ['9300', 'Aalst'], ['9700', 'Oudenaarde'], ['9100', 'Sint-Niklaas'], ['9800', 'Deinze']];
    const streets = ['Kerkstraat', 'Stationsstraat', 'Molenstraat', 'Schoolstraat', 'Dorpsstraat', 'Nieuwstraat', 'Kapellestraat', 'Veldstraat'];
    const picks = [['padthai', 'm'], ['padthai', 'l'], ['panang', 'm'], ['massaman', 'l'], ['khaosoy', 'm'], ['pho', 'm'], ['guaytiao', 'l'], ['zoetzuur', 'm'], ['kanomjeen', 'm'], ['tomkha', 'x'], ['tomyam', 'x'], ['verseloempia', 'x'], ['loempia', 'x'], ['kimchi', 'x'], ['tiramisu', 'x'], ['kanomchan', 'x'], ['portie', 'rijst']];
    const notes = ['', '', '', '', 'Graag extra pikant', 'Zonder pinda', '', 'Extra limoen'];
    let seed = 7;
    const rnd = (n) => { seed = (seed * 9301 + 49297) % 233280; return Math.floor((seed / 233280) * n); };
    const date = '2026-11-07';
    const out = [];
    for (let i = 0; i < 16; i++) {
      const pickup = i % 6 === 5;
      const lines = [];
      let subtotal = 0;
      while (subtotal < 35 + rnd(40)) {
        const [id, variant] = picks[rnd(picks.length)];
        const item = MENU.find((x) => x.id === id);
        const v = item.variants.find((x) => x.id === variant);
        const ex = lines.find((l) => l.id === id && l.variant === variant);
        if (ex) ex.qty++; else lines.push({ id, variant, qty: 1 + rnd(2), price: v.price, note: item.spicy || id === 'padthai' ? notes[rnd(notes.length)] : '' });
        subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
      }
      const fee = pickup ? 0 : subtotal >= 90 ? 0 : subtotal >= 70 ? 2 : 3;
      const [pc, city] = towns[rnd(towns.length)];
      const payment = ['cash', 'payconiq', 'transfer'][rnd(3)];
      const id = `NTK-1107-${String(i + 1).padStart(3, '0')}`;
      out.push({
        id, date, route: pickup ? 'pickup' : 'ovl', method: pickup ? 'pickup' : 'delivery',
        name: `${first[i]} ${last[rnd(last.length)]}`, email: `${first[i].toLowerCase()}@example.com`, phone: `04${70 + rnd(29)} ${10 + rnd(89)} ${10 + rnd(89)} ${10 + rnd(89)}`,
        street: pickup ? '' : `${streets[rnd(streets.length)]} ${1 + rnd(120)}`, postcode: pickup ? '' : pc, city: pickup ? '' : city,
        subtotal, fee, total: subtotal + fee, payment, ogm: window.NTK.ogm(`261107${String(i + 1).padStart(4, '0')}`),
        paid: payment === 'transfer' && rnd(2) === 1, delivered: false, deliveredAt: '', eta: '', etaSent: false,
        remarks: i === 2 ? 'Bel aan bij de buren als niemand thuis is' : i === 9 ? 'Poortcode 1234' : '', lines,
        lang: 'nl', track: id, // in demo mode the order number doubles as the tracking token
      });
    }
    // Orders placed on this device in demo mode
    for (const o of store.get('ntk_demo_orders', [])) out.push({ ...o, track: o.track || o.id });
    const over = store.get('ntk_demo_over', {});
    return out.map((o) => ({ ...o, ...(over[o.id] || {}) }));
  }

  const runs = () => store.get('ntk_demo_runs', {});
  function saveRun(date, route, run) {
    const all = runs();
    all[`${date}|${route}`] = run;
    store.set('ntk_demo_runs', all);
  }

  // Same rules as trackInfo() in Code.gs, so the demo behaves like the real thing.
  function track(token) {
    const all = orders();
    const me = all.find((o) => o.track === token);
    if (!me) return null;
    const base = { id: me.id, date: me.date, route: me.route, method: me.method, lang: me.lang, name: String(me.name).split(' ')[0],
      eta: me.eta, window: window.NTK_CONFIG.rules.deliveryWindow, delivered: me.delivered, deliveredAt: me.deliveredAt || '' };
    if (me.method === 'pickup') return base;
    const stops = all.filter((o) => o.date === me.date && o.route === me.route);
    const run = runs()[`${me.date}|${me.route}`] || { started: '', order: [] };
    const pos = (o) => { const i = run.order.indexOf(o.id); return i < 0 ? 1e6 : i; };
    stops.sort((a, b) => pos(a) - pos(b) || a.postcode.localeCompare(b.postcode) || String(a.street).localeCompare(String(b.street)));
    const mine = stops.findIndex((o) => o.id === me.id);
    const times = stops.map((o) => o.deliveredAt).filter(Boolean).concat(run.started ? [run.started] : []).sort();
    return Object.assign(base, {
      started: run.started || '', total: stops.length, done: stops.filter((o) => o.delivered).length, position: mine + 1,
      ahead: stops.slice(0, mine).filter((o) => !o.delivered).length,
      progress: stops.map((o) => (o.id === me.id ? 'me' : o.delivered ? 'done' : 'todo')),
      lastUpdate: times[times.length - 1] || '',
    });
  }

  window.NTK_DEMO = { orders, runs, saveRun, track };
})();
