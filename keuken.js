/* Noeni Thai Kitchen — kitchen dashboard. */
(function () {
  const C = window.NTK_CONFIG;
  const MENU = window.NTK_MENU;
  const { esc, fmt, parseDay, dayKey, routeById, api, apiGet, store } = window.NTK;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const TXT = {
    nl: {
      kitchen: 'Keuken', loginTitle: 'Keuken', loginText: 'Vul de keukensleutel in. Je vindt hem in de Google Sheet, tabblad Settings.',
      key: 'Keukensleutel', login: 'Openen', wrongKey: 'Die sleutel klopt niet.', netErr: 'Kon de bestellingen niet laden. Controleer de internetverbinding.',
      demo: 'Demoversie met voorbeeldbestellingen. Na de koppeling met Google Sheets zie je hier de echte bestellingen.',
      day: 'Leverdag', route: 'Route', all: 'Alle routes', refresh: 'Vernieuwen', csv: 'Excel (CSV)', printSlips: 'Pakbonnen afdrukken',
      tabCook: 'Kookplan', tabDeliver: 'Leverlijst', tabOrders: 'Bestellingen', none: 'Geen bestellingen voor deze dag.',
      sOrders: 'bestellingen', sDishes: 'gerechten', sRevenue: 'omzet', sUnpaid: 'nog te ontvangen', sDelivered: 'geleverd',
      dish: 'Gerecht', size: 'Formaat', qty: 'Aantal', notes: 'Opmerkingen', totalPortions: 'Totaal',
      pickup: 'Afhalen', maps: 'Route in Google Maps', mapsPart: 'Route deel {n}', sendEta: 'Stuur uur-mails',
      etaPh: 'bv. 14:00–14:30', eta: 'Uur', paid: 'Betaald', delivered: 'Geleverd', unpaid: 'Niet betaald',
      pay_cash: 'Cash', pay_payconiq: 'Payconiq', pay_transfer: 'Overschrijving',
      etaNone: 'Vul eerst bij elke stop een uur in.', etaSent: '{n} mails verstuurd. Vandaag kan je er nog {q} sturen.', etaDemo: 'Demo: {n} mails zouden verstuurd worden.',
      etaConfirm: '{n} klanten krijgen een mail met hun leveruur. Doorgaan?', saved: 'Bewaard', saveErr: 'Bewaren mislukt',
      search: 'Zoek naam, nummer, gemeente…', order: 'Bestelling', customer: 'Klant', total: 'Totaal', payment: 'Betaling', status: 'Status',
      toPay: 'TE BETALEN', isPaid: 'BETAALD', ref: 'Mededeling', remarks: 'Opmerking', phone: 'Tel', logout: 'Afmelden',
    },
    en: {
      kitchen: 'Kitchen', loginTitle: 'Kitchen', loginText: 'Enter the kitchen key. You find it in the Google Sheet, tab Settings.',
      key: 'Kitchen key', login: 'Open', wrongKey: 'That key is not right.', netErr: 'Could not load the orders. Check the internet connection.',
      demo: 'Demo version with sample orders. Once linked to Google Sheets you see the real orders here.',
      day: 'Delivery day', route: 'Route', all: 'All routes', refresh: 'Refresh', csv: 'Excel (CSV)', printSlips: 'Print packing slips',
      tabCook: 'Cooking list', tabDeliver: 'Delivery list', tabOrders: 'Orders', none: 'No orders for this day.',
      sOrders: 'orders', sDishes: 'dishes', sRevenue: 'revenue', sUnpaid: 'still to receive', sDelivered: 'delivered',
      dish: 'Dish', size: 'Size', qty: 'Qty', notes: 'Notes', totalPortions: 'Total',
      pickup: 'Pickup', maps: 'Route in Google Maps', mapsPart: 'Route part {n}', sendEta: 'Send arrival-time emails',
      etaPh: 'e.g. 14:00–14:30', eta: 'Time', paid: 'Paid', delivered: 'Delivered', unpaid: 'Not paid',
      pay_cash: 'Cash', pay_payconiq: 'Payconiq', pay_transfer: 'Bank transfer',
      etaNone: 'Fill in a time for each stop first.', etaSent: '{n} emails sent. {q} more can be sent today.', etaDemo: 'Demo: {n} emails would be sent.',
      etaConfirm: '{n} customers will get an email with their delivery time. Continue?', saved: 'Saved', saveErr: 'Saving failed',
      search: 'Search name, number, town…', order: 'Order', customer: 'Customer', total: 'Total', payment: 'Payment', status: 'Status',
      toPay: 'TO PAY', isPaid: 'PAID', ref: 'Reference', remarks: 'Note', phone: 'Phone', logout: 'Log out',
    },
  };

  const state = {
    lang: store.get('ntk_k_lang', 'nl'),
    key: store.get('ntk_k_key', ''),
    orders: [],
    day: '', route: 'all', tab: store.get('ntk_k_tab', 'cook'), q: '',
  };
  const t = (k, v = {}) => Object.entries(v).reduce((s, [a, b]) => s.replaceAll(`{${a}}`, b), TXT[state.lang][k] ?? k);
  const money = (n) => fmt(Number(n) || 0, state.lang === 'nl' ? 'nl-BE' : 'en-GB');
  const dayLabel = (d) => new Intl.DateTimeFormat(state.lang === 'nl' ? 'nl-BE' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(parseDay(d));
  const routeLabel = (id) => (id === 'pickup' ? t('pickup') : routeById(id)?.name?.[state.lang] || routeById(id)?.name?.nl || id);

  // Dish and size names from menu.js, so the kitchen sees them in its own language.
  function lineLabel(l) {
    const item = MENU.find((i) => i.id === l.id);
    const v = item?.variants.find((x) => x.id === l.variant);
    const name = item ? (typeof item.name === 'string' ? item.name : item.name[state.lang] || item.name.nl) : l.name;
    const size = v ? [item.variants.length > 1 ? v.label[state.lang] || v.label.nl : '', v.size].filter(Boolean).join(' · ') : l.vlabel;
    return { name, size, order: item ? MENU.indexOf(item) : 999 };
  }

  // ---------- data ----------
  async function load() {
    if (!C.apiUrl) { state.orders = demoOrders(); return; }
    const res = await apiGet({ action: 'orders', key: state.key }, { timeout: 20000 });
    state.orders = res.orders;
  }

  async function save(id, patch) {
    const o = state.orders.find((x) => x.id === id);
    Object.assign(o, patch);
    if (!C.apiUrl) {
      const over = store.get('ntk_demo_over', {});
      over[id] = { ...(over[id] || {}), ...patch };
      store.set('ntk_demo_over', over);
      return;
    }
    try { await api({ action: 'update', key: state.key, id, ...patch }); toast(t('saved')); } catch { toast(t('saveErr')); }
  }

  // ---------- views ----------
  function current() {
    return state.orders.filter((o) => o.date === state.day && (state.route === 'all' || o.route === state.route));
  }

  function renderSelectors() {
    const days = [...new Set(state.orders.map((o) => o.date))].sort();
    const today = dayKey(new Date());
    if (!days.includes(state.day)) state.day = days.find((d) => d >= today) || days[days.length - 1] || '';
    $('#day').innerHTML = days.map((d) => `<option value="${d}"${d === state.day ? ' selected' : ''}>${esc(dayLabel(d))} (${state.orders.filter((o) => o.date === d).length})</option>`).join('');
    const routes = [...new Set(state.orders.filter((o) => o.date === state.day).map((o) => o.route))];
    if (state.route !== 'all' && !routes.includes(state.route)) state.route = 'all';
    $('#route').innerHTML = `<option value="all">${esc(t('all'))}</option>` + routes.map((r) => `<option value="${r}"${r === state.route ? ' selected' : ''}>${esc(routeLabel(r))}</option>`).join('');
  }

  function renderStats(list) {
    const dishes = list.reduce((s, o) => s + o.lines.reduce((a, l) => a + Number(l.qty), 0), 0);
    const revenue = list.reduce((s, o) => s + Number(o.total), 0);
    const unpaid = list.filter((o) => !o.paid).reduce((s, o) => s + Number(o.total), 0);
    const delivered = list.filter((o) => o.delivered).length;
    $('#stats').innerHTML = [
      [list.length, t('sOrders')], [dishes, t('sDishes')], [money(revenue), t('sRevenue')],
      [money(unpaid), t('sUnpaid'), unpaid > 0], [`${delivered}/${list.length}`, t('sDelivered')],
    ].map(([v, l, warn]) => `<div class="stat${warn ? ' warn' : ''}"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('');
  }

  function renderCook(list) {
    const map = new Map();
    for (const o of list) for (const l of o.lines) {
      const lab = lineLabel(l);
      const k = `${l.id}:${l.variant}`;
      const row = map.get(k) || { ...lab, qty: 0, notes: [] };
      row.qty += Number(l.qty);
      if (l.note) row.notes.push(`${l.qty}× ${l.note} (${o.name.split(' ')[0]})`);
      map.set(k, row);
    }
    const rows = [...map.values()].sort((a, b) => a.order - b.order || a.size.localeCompare(b.size));
    const total = rows.reduce((s, r) => s + r.qty, 0);
    $('#tab-cook').innerHTML = `<div class="k-scroll"><table class="k-table">
      <thead><tr><th>${esc(t('dish'))}</th><th>${esc(t('size'))}</th><th class="qty">${esc(t('qty'))}</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr>
        <td>${i && rows[i - 1].name === r.name ? '' : `<strong>${esc(r.name)}</strong>`}${r.notes.length ? `<ul class="k-notes">${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}</td>
        <td>${esc(r.size)}</td><td class="qty big">${r.qty}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="2">${esc(t('totalPortions'))}</td><td class="qty">${total}</td></tr></tfoot>
    </table></div>`;
  }

  const addr = (o) => `${o.street}, ${o.postcode} ${o.city}`;
  const itemsText = (o) => o.lines.map((l) => { const lab = lineLabel(l); return `${l.qty}× ${lab.name}${lab.size ? ` (${lab.size})` : ''}`; }).join(', ');

  function mapsLinks(stops) {
    const out = [];
    let origin = C.business.pickupAddress;
    for (let i = 0; i < stops.length; i += 10) {
      const part = stops.slice(i, i + 10).map(addr);
      const dest = part.pop();
      const p = new URLSearchParams({ api: '1', origin, destination: dest, travelmode: 'driving' });
      if (part.length) p.set('waypoints', part.join('|'));
      out.push(`https://www.google.com/maps/dir/?${p}`);
      origin = dest;
    }
    return out;
  }

  function renderDeliver(list) {
    const groups = {};
    for (const o of list) (groups[o.route] = groups[o.route] || []).push(o);
    $('#tab-deliver').innerHTML = Object.entries(groups).sort(([a], [b]) => (a === 'pickup') - (b === 'pickup') || a.localeCompare(b)).map(([route, os]) => {
      const sorted = os.sort((a, b) => (a.postcode || '').localeCompare(b.postcode || '') || (a.street || '').localeCompare(b.street || ''));
      const isPickup = route === 'pickup';
      const links = isPickup ? [] : mapsLinks(sorted);
      return `<div class="route-block">
        <div class="route-head">
          <h2>${esc(routeLabel(route))} <span class="muted">(${sorted.length})</span></h2>
          <div class="btns">
            ${links.map((u, i) => `<a class="btn btn-ghost" href="${esc(u)}" target="_blank" rel="noopener">${esc(links.length > 1 ? t('mapsPart', { n: i + 1 }) : t('maps'))}</a>`).join('')}
            ${isPickup ? '' : `<button type="button" class="btn btn-dark" data-act="eta" data-route="${route}">${esc(t('sendEta'))}</button>`}
          </div>
        </div>
        <ol class="stops">${sorted.map((o) => `<li class="stop${o.delivered ? ' is-done' : ''}">
          <div class="stop-main">
            <div class="stop-top"><strong>${esc(o.name)}</strong><span class="stop-id">${esc(o.id)}</span>
              <span class="tag ${o.paid ? 'paid' : 'unpaid'}">${esc(o.paid ? t('paid') : `${t('unpaid')} · ${t(`pay_${o.payment}`)}`)}</span>
              <strong>${esc(money(o.total))}</strong></div>
            ${isPickup ? '' : `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr(o))}" target="_blank" rel="noopener">${esc(addr(o))}</a>`}
            <a href="tel:${esc(o.phone.replace(/[^\d+]/g, ''))}">${esc(o.phone)}</a>
            <span class="stop-items">${esc(itemsText(o))}</span>
            ${o.remarks ? `<span class="stop-remarks">${esc(o.remarks)}</span>` : ''}
            <div class="stop-ctrl">
              ${isPickup ? '' : `<label>${esc(t('eta'))} <input type="text" data-eta="${esc(o.id)}" value="${esc(o.eta || '')}" placeholder="${esc(t('etaPh'))}"></label>${o.etaSent ? ' ✓' : ''}`}
              <label class="check small"><input type="checkbox" data-flag="paid" data-id="${esc(o.id)}"${o.paid ? ' checked' : ''}><span>${esc(t('paid'))}</span></label>
              <label class="check small"><input type="checkbox" data-flag="delivered" data-id="${esc(o.id)}"${o.delivered ? ' checked' : ''}><span>${esc(t('delivered'))}</span></label>
            </div>
          </div>
        </li>`).join('')}</ol>
      </div>`;
    }).join('');
  }

  function renderOrders(list) {
    const q = state.q.trim().toLowerCase();
    const rows = list.filter((o) => !q || [o.id, o.name, o.email, o.phone, o.city, o.postcode].join(' ').toLowerCase().includes(q));
    $('#tab-orders').innerHTML = `<label class="search k-search"><input type="search" id="kq" value="${esc(state.q)}" placeholder="${esc(t('search'))}"></label>
      <div class="k-scroll"><table class="k-table">
        <thead><tr><th>${esc(t('order'))}</th><th>${esc(t('customer'))}</th><th>${esc(t('dish'))}</th><th class="qty">${esc(t('total'))}</th><th>${esc(t('payment'))}</th><th>${esc(t('status'))}</th></tr></thead>
        <tbody>${rows.map((o) => `<tr>
          <td><strong>${esc(o.id)}</strong><br><span class="muted small">${esc(routeLabel(o.route))}</span></td>
          <td>${esc(o.name)}<br><a class="small" href="mailto:${esc(o.email)}">${esc(o.email)}</a><br><a class="small" href="tel:${esc(o.phone.replace(/[^\d+]/g, ''))}">${esc(o.phone)}</a></td>
          <td class="small">${esc(itemsText(o))}${o.remarks ? `<br><em>${esc(o.remarks)}</em>` : ''}</td>
          <td class="qty">${esc(money(o.total))}</td>
          <td class="small">${esc(t(`pay_${o.payment}`))}${o.payment === 'transfer' ? `<br><span class="muted">${esc(o.ogm)}</span>` : ''}</td>
          <td><label class="check small"><input type="checkbox" data-flag="paid" data-id="${esc(o.id)}"${o.paid ? ' checked' : ''}><span>${esc(t('paid'))}</span></label><br>
              <label class="check small"><input type="checkbox" data-flag="delivered" data-id="${esc(o.id)}"${o.delivered ? ' checked' : ''}><span>${esc(t('delivered'))}</span></label></td>
        </tr>`).join('')}</tbody>
      </table></div>`;
  }

  function renderSlips(list) {
    $('#slips').innerHTML = list.map((o) => `<div class="slip">
      <h2>${esc(o.name)}</h2>
      <div>${esc(o.id)} · ${esc(dayLabel(o.date))} · ${esc(routeLabel(o.route))}</div>
      ${o.route === 'pickup' ? '' : `<div>${esc(addr(o))}</div>`}
      <div>${esc(t('phone'))}: ${esc(o.phone)}</div>
      <table>${o.lines.map((l) => { const lab = lineLabel(l); return `<tr><td><b>${l.qty}×</b> ${esc(lab.name)} ${esc(lab.size)}${l.note ? `<br><i>${esc(l.note)}</i>` : ''}</td></tr>`; }).join('')}</table>
      ${o.remarks ? `<div><b>${esc(t('remarks'))}:</b> ${esc(o.remarks)}</div>` : ''}
      <div class="box">${o.paid ? esc(t('isPaid')) : `${esc(t('toPay'))}: <b>${esc(money(o.total))}</b> · ${esc(t(`pay_${o.payment}`))}${o.payment === 'transfer' ? ` · ${esc(o.ogm)}` : ''}`}</div>
    </div>`).join('');
  }

  function render() {
    renderSelectors();
    const list = current();
    renderStats(list);
    $('#empty').hidden = list.length > 0;
    $$('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === state.tab)));
    $$('.k-panel').forEach((p) => { p.hidden = !list.length || p.id !== `tab-${state.tab}`; });
    renderCook(list);
    renderDeliver(list);
    renderOrders(list);
    renderSlips(list);
  }

  function applyText() {
    document.documentElement.lang = state.lang;
    $$('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
    $$('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
    $('#demoBar').hidden = Boolean(C.apiUrl);
    $('#demoBar').textContent = t('demo');
  }

  // ---------- actions ----------
  function exportCsv() {
    const list = current();
    const head = ['Order', 'Date', 'Route', 'Name', 'Phone', 'Email', 'Address', 'Items', 'Total', 'Payment', 'Paid', 'Reference', 'Remarks'];
    const rows = list.map((o) => [o.id, o.date, routeLabel(o.route), o.name, o.phone, o.email, o.route === 'pickup' ? '' : addr(o), itemsText(o),
      String(o.total).replace('.', ','), t(`pay_${o.payment}`), o.paid ? 'x' : '', o.ogm, o.remarks]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `noeni-${state.day}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function sendEta(route) {
    const list = current().filter((o) => o.route === route);
    const ready = list.filter((o) => o.eta && !o.etaSent);
    if (!ready.length) return toast(t('etaNone'));
    if (!confirm(t('etaConfirm', { n: ready.length }))) return;
    if (!C.apiUrl) {
      ready.forEach((o) => { o.etaSent = true; });
      toast(t('etaDemo', { n: ready.length }));
      return render();
    }
    try {
      const res = await api({ action: 'sendEta', key: state.key, date: state.day }, { timeout: 60000 });
      toast(t('etaSent', { n: res.sent, q: res.quotaLeft ?? '?' }));
      await refresh();
    } catch { toast(t('saveErr')); }
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { el.hidden = true; }, 2600);
  }

  async function refresh() {
    try {
      await load();
      $('#login').hidden = true;
      $('#dash').hidden = false;
      render();
    } catch (err) {
      const wrong = /key/.test(err.message);
      if (wrong) store.del('ntk_k_key');
      showLogin(wrong ? t('wrongKey') : t('netErr'));
    }
  }

  function showLogin(msg = '') {
    $('#dash').hidden = true;
    $('#login').hidden = false;
    $('#loginErr').textContent = msg;
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-lang], [data-tab], [data-act]');
    if (!el) return;
    if (el.dataset.lang) { state.lang = el.dataset.lang; store.set('ntk_k_lang', state.lang); applyText(); if (!$('#dash').hidden) render(); }
    if (el.dataset.tab) { state.tab = el.dataset.tab; store.set('ntk_k_tab', state.tab); render(); }
    if (el.dataset.act === 'eta') sendEta(el.dataset.route);
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.flag) { save(el.dataset.id, { [el.dataset.flag]: el.checked }).then(render); }
    if (el.dataset.eta !== undefined) save(el.dataset.eta, { eta: el.value.trim() });
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'kq') {
      state.q = e.target.value;
      const pos = e.target.selectionStart;
      renderOrders(current());
      const q = $('#kq'); q.focus(); q.setSelectionRange(pos, pos);
    }
  });
  $('#day').addEventListener('change', (e) => { state.day = e.target.value; state.route = 'all'; render(); });
  $('#route').addEventListener('change', (e) => { state.route = e.target.value; render(); });
  $('#refresh').addEventListener('click', refresh);
  $('#csv').addEventListener('click', exportCsv);
  $('#printSlips').addEventListener('click', () => window.print());
  $('#loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    state.key = $('#key').value.trim();
    store.set('ntk_k_key', state.key);
    refresh();
  });

  // ---------- demo data ----------
  function demoOrders() {
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
      out.push({
        id: `NTK-1107-${String(i + 1).padStart(3, '0')}`, date, route: pickup ? 'pickup' : 'ovl', method: pickup ? 'pickup' : 'delivery',
        name: `${first[i]} ${last[rnd(last.length)]}`, email: `${first[i].toLowerCase()}@example.com`, phone: `04${70 + rnd(29)} ${10 + rnd(89)} ${10 + rnd(89)} ${10 + rnd(89)}`,
        street: pickup ? '' : `${streets[rnd(streets.length)]} ${1 + rnd(120)}`, postcode: pickup ? '' : pc, city: pickup ? '' : city,
        subtotal, fee, total: subtotal + fee, payment, ogm: window.NTK.ogm(`261107${String(i + 1).padStart(4, '0')}`),
        paid: payment === 'transfer' && rnd(2) === 1, delivered: false, eta: '', etaSent: false,
        remarks: i === 2 ? 'Bel aan bij de buren als niemand thuis is' : i === 9 ? 'Poortcode 1234' : '', lines,
      });
    }
    // Orders placed on this device in demo mode
    for (const o of store.get('ntk_demo_orders', [])) out.push({ ...o, lines: o.lines });
    const over = store.get('ntk_demo_over', {});
    return out.map((o) => ({ ...o, ...(over[o.id] || {}) }));
  }

  // ---------- start ----------
  applyText();
  if (!C.apiUrl || state.key) refresh(); else showLogin();
})();
