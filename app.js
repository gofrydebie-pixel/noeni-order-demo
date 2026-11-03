/* Noeni Thai Kitchen — order page. */
(function () {
  const C = window.NTK_CONFIG;
  const MENU = window.NTK_MENU;
  const CATS = window.NTK_CATEGORIES;
  const I18N = window.NTK_I18N;
  const { esc, fmt, parseDay, deadlineFor, deliveryFee, routesForPostcode, routeById, upcomingDates, pickupDates, ogm, epcPayload, qrSvg, api, apiGet, applyRemoteConfig, store } = window.NTK;

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const desktop = matchMedia('(min-width: 1024px)');

  const profile = store.get('ntk_profile', {});
  const state = {
    lang: store.get('ntk_lang', null) || pickLang(),
    cart: store.get('ntk_cart', {}),
    notes: store.get('ntk_notes', {}),
    spicier: store.get('ntk_spicier', {}),
    method: profile.method || 'delivery',
    postcode: profile.postcode || store.get('ntk_postcode', ''),
    cat: 'all', q: '', notSpicy: false,
    step: 'cart',
    sending: false,
  };

  function pickLang() {
    const l = (navigator.language || 'nl').slice(0, 2);
    return ['nl', 'fr', 'en'].includes(l) ? l : 'nl';
  }

  // ---------- text helpers ----------
  function t(key, vars = {}) {
    let s = I18N[state.lang][key] ?? I18N.nl[key] ?? key;
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
    return s;
  }
  const L = (v) => (v && typeof v === 'object' ? v[state.lang] ?? v.nl : v ?? '');
  const money = (n) => fmt(n, I18N[state.lang].locale);
  const dayFmt = (day, opts = { weekday: 'short', day: 'numeric', month: 'short' }) => new Intl.DateTimeFormat(I18N[state.lang].locale, opts).format(parseDay(day));
  const deadlineFmt = (d) => new Intl.DateTimeFormat(I18N[state.lang].locale, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(d);
  const routeName = (id) => (id === 'pickup' ? t('pickup') : L(routeById(id)?.name) || id);

  function countdown(ms) {
    const m = Math.max(0, Math.floor(ms / 60000));
    const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
    if (d > 0) return `${d}${t('d')} ${h}${t('h')}`;
    if (h > 0) return `${h}${t('h')} ${mm}${t('m')}`;
    return `${mm} ${t('m')}`;
  }

  // ---------- cart model ----------
  const findItem = (id) => MENU.find((i) => i.id === id);
  function lines() {
    const out = [];
    for (const [key, qty] of Object.entries(state.cart)) {
      if (!qty) continue;
      const [id, vid] = key.split(':');
      const item = findItem(id);
      const v = item?.variants.find((x) => x.id === vid);
      if (!item || !v || v.soldOut) continue;
      out.push({ key, item, v, qty, total: qty * v.price });
    }
    // Keep menu order in the cart.
    const order = MENU.map((i) => i.id);
    return out.sort((a, b) => order.indexOf(a.item.id) - order.indexOf(b.item.id));
  }
  function totals(method = state.method) {
    const ls = lines();
    const subtotal = ls.reduce((s, l) => s + l.total, 0);
    const count = ls.reduce((s, l) => s + l.qty, 0);
    const fee = ls.length ? deliveryFee(subtotal, method) : 0;
    return { ls, subtotal, count, fee, total: subtotal + fee };
  }
  function setQty(key, qty) {
    qty = Math.max(0, Math.min(C.rules.maxPerItem, qty));
    if (qty) state.cart[key] = qty; else delete state.cart[key];
    store.set('ntk_cart', state.cart);
    refreshQty(key);
    renderCart();
  }
  function noteFor(item) {
    const parts = [];
    if (state.spicier[item.id]) parts.push(t('spicier'));
    if (state.notes[item.id]) parts.push(state.notes[item.id]);
    return parts.join(' · ');
  }
  const itemName = (item) => L(item.name);
  const variantLabel = (item, v) => [L(v.label), v.size].filter(Boolean).join(' · ');

  // ---------- static text ----------
  function applyStatic() {
    document.documentElement.lang = t('htmlLang');
    $$('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
    $$('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
    $('#heroPostcode').placeholder = t('postcodePh');
    $('#search').placeholder = t('search');
    $('#fRemarks').placeholder = t('remarksPh');
    $('#sheetBack').setAttribute('aria-label', t('back'));
    $('#deliverySub').textContent = t('deliverySub', { window: C.rules.deliveryWindow });
    $('#how2').textContent = t('how2', { hour: C.rules.deadlineHour });
    $('#how3').textContent = t('how3', { window: C.rules.deliveryWindow });
    const fees = C.rules.deliveryFees;
    $('#facts').innerHTML = [
      t('infoMin', { min: money(C.rules.minimumOrder) }),
      t('infoFees', { f3: money(fees[2].fee), f2: money(fees[1].fee), t2: money(fees[1].from), t3: money(fees[0].from) }),
      t('infoSpicy'),
    ].map((s) => `<li>${esc(s)}</li>`).join('');
    const B = C.business;
    $('#contactText').innerHTML = esc(t('contactText', { email: '§E', phone: '§P' }))
      .replace('§E', `<a href="mailto:${esc(B.email)}">${esc(B.email)}</a>`)
      .replace('§P', `<a href="tel:${esc(B.phone)}">${esc(B.phoneDisplay)}</a>`);
    $('#lateCall').href = `tel:${B.phone}`;
    $('#demoBar').hidden = Boolean(C.apiUrl);
    $('#demoBar').textContent = t('demo');
    const banner = L(C.banner);
    $('#banner').hidden = !banner;
    $('#banner').textContent = banner;
  }

  // ---------- hero: next delivery + countdown ----------
  function heroDates() {
    const pc = state.postcode;
    const routes = routesForPostcode(pc);
    if (routes === null) return { routes: null, dates: upcomingDates(null) };
    return { routes, dates: routes.length ? upcomingDates(routes) : [] };
  }

  function renderHero() {
    const box = $('#nextBox');
    const { routes, dates } = heroDates();
    const now = new Date();
    let late = null;

    if (routes && !routes.length) {
      box.innerHTML = `<p class="next-none">${esc(t('noRoute'))}</p>`;
    } else {
      // One upcoming date per route, max 2 lines, soonest first.
      const seen = new Set();
      const picks = dates.filter((d) => !seen.has(d.route) && seen.add(d.route)).slice(0, routes ? 2 : 1);
      box.innerHTML = picks.map((d) => {
        const dl = deadlineFor(d.date);
        const open = now < dl;
        if (!open && !late) late = d;
        const label = routes ? t('nextFor', { route: routeName(d.route) }) : `${t('nextGeneral')} · ${routeName(d.route)}`;
        return `<div class="next-item">
          <p class="next-label">${esc(label)}</p>
          <p class="next-date">${esc(dayFmt(d.date, { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
          <p class="next-dl">${open
            ? `${esc(t('orderBefore', { deadline: deadlineFmt(dl) }))} <span class="pill">${esc(t('left', { t: countdown(dl - now) }))}</span>`
            : `<span class="pill pill-warn">${esc(t('lateDate'))}</span>`}</p>
        </div>`;
      }).join('');
    }

    $('#lateBox').hidden = !late;
    if (late) $('#lateText').textContent = t('closedText', { phone: C.business.phoneDisplay });

    // Delivery calendar
    const mine = routes || [];
    $('#calList').innerHTML = upcomingDates(null).map((d) => `
      <li class="${mine.includes(d.route) ? 'is-mine' : ''}">
        <span class="cal-date">${esc(dayFmt(d.date))}</span>
        <span class="cal-route">${esc(routeName(d.route))}</span>
      </li>`).join('') + (C.pickup.enabled ? `<li class="cal-pickup"><span class="cal-date">↺</span><span class="cal-route">${esc(t('pickupEvery'))}</span></li>` : '');

    $('#reorderBtn').hidden = !(store.get('ntk_last', null) && !lines().length);
  }

  // ---------- menu ----------
  function renderChips() {
    const counts = Object.fromEntries(CATS.map((c) => [c.id, MENU.filter((i) => i.cat === c.id).length]));
    $('#catChips').innerHTML = [{ id: 'all', label: null }, ...CATS].map((c) => `
      <button type="button" role="tab" class="chip" data-act="cat" data-cat="${c.id}" aria-selected="${state.cat === c.id}">
        ${esc(c.label ? L(c.label) : t('all'))}${c.label ? ` <span class="chip-n">${counts[c.id]}</span>` : ''}
      </button>`).join('');
  }

  function matches(item) {
    if (state.cat !== 'all' && item.cat !== state.cat) return false;
    if (state.notSpicy && item.spicy) return false;
    const q = state.q.trim().toLowerCase();
    if (!q) return true;
    const hay = [itemName(item), L(item.sub), L(item.ing), item.ing.nl, typeof item.name === 'string' ? item.name : item.name.nl].join(' ').toLowerCase();
    return q.split(/\s+/).every((w) => hay.includes(w));
  }

  function controlHtml(key, qty, soldOut, label) {
    if (soldOut) return `<span class="sold">${esc(t('soldOut'))}</span>`;
    if (!qty) return `<button type="button" class="add" data-act="inc" data-key="${key}" aria-label="${esc(t('add'))}: ${esc(label)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>`;
    return `<div class="stepper">
      <button type="button" data-act="dec" data-key="${key}" aria-label="${esc(t('less'))}: ${esc(label)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg></button>
      <output aria-live="polite">${qty}</output>
      <button type="button" data-act="inc" data-key="${key}" aria-label="${esc(t('more'))}: ${esc(label)}"${qty >= C.rules.maxPerItem ? ' disabled' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>
    </div>`;
  }

  function cardHtml(item) {
    const name = itemName(item);
    const inCart = item.variants.some((v) => state.cart[`${item.id}:${v.id}`]);
    const showLabels = item.variants.length > 1 || item.variants[0].size;
    const note = state.notes[item.id] || '';
    const badges = [
      item.spicy ? `<span class="badge badge-spicy" title="${esc(t('spicyInfo'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3c-1 1-1.5 2-1.4 3.2M15.5 6.4c2.7.4 4.2 2.6 3.3 5.6C17.4 17 11 21 5 21c-1.5 0-2-1.3-1-2.2 3-2.5 4.8-5.6 6.4-9.4 1-2.3 3-3.4 5.1-3z"/></svg>${esc(t('spicy'))}</span>` : '',
      item.frozen ? `<span class="badge badge-frozen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M4 6l16 12M20 6 4 18"/></svg>${esc(t('frozen'))}</span>` : '',
    ].join('');
    return `<article class="card${item.img ? '' : ' no-img'}${inCart ? ' in-cart' : ''}${item.soldOut ? ' is-sold' : ''}" data-item="${item.id}">
      ${item.img ? `<div class="card-img"><img src="img/${item.img}" alt="${esc(name)}" loading="lazy" decoding="async" data-fallback></div>` : ''}
      <div class="card-body">
        <div class="card-title">
          <h3>${esc(name)}</h3>
          ${badges ? `<div class="badges">${badges}</div>` : ''}
        </div>
        <p class="card-sub">${esc(L(item.sub))}</p>
        ${L(item.ing) ? `<details class="ing"><summary>${esc(t('ingredients'))}</summary><p>${esc(L(item.ing))}</p></details>` : ''}
        <ul class="variants">
          ${item.variants.map((v) => {
            const key = `${item.id}:${v.id}`;
            const label = showLabels ? variantLabel(item, v) : '';
            return `<li class="variant${v.soldOut ? ' is-sold' : ''}">
              <span class="v-label">${esc(label)}</span>
              <span class="v-price">${esc(money(v.price))}</span>
              <span class="v-ctrl" data-ctrl="${key}">${controlHtml(key, state.cart[key] || 0, v.soldOut, `${name} ${label}`.trim())}</span>
            </li>`;
          }).join('')}
        </ul>
        <div class="card-extra">
          ${item.spicy ? `<label class="check small"><input type="checkbox" data-act="spicier" data-id="${item.id}"${state.spicier[item.id] ? ' checked' : ''}><span>${esc(t('spicier'))}</span></label>` : ''}
          <button type="button" class="btn-link small" data-act="note" data-id="${item.id}" aria-expanded="${Boolean(note)}">+ ${esc(t('noteAdd'))}</button>
        </div>
        <div class="note-wrap"${note ? '' : ' hidden'}>
          <textarea rows="2" data-note="${item.id}" placeholder="${esc(t('notePh'))}" aria-label="${esc(t('noteAdd'))}: ${esc(name)}">${esc(note)}</textarea>
        </div>
      </div>
    </article>`;
  }

  function renderMenu() {
    const groups = CATS.map((c) => ({ c, items: MENU.filter((i) => i.cat === c.id && matches(i)) })).filter((g) => g.items.length);
    $('#menuList').innerHTML = groups.map((g) => `
      <section class="cat" id="cat-${g.c.id}" aria-labelledby="h-${g.c.id}">
        <h3 class="cat-title" id="h-${g.c.id}">${esc(L(g.c.label))}</h3>
        <div class="cards ${g.c.id === 'mains' || g.c.id === 'soups' || g.c.id === 'rolls' ? 'cards-big' : ''}">${g.items.map(cardHtml).join('')}</div>
      </section>`).join('');
    $('#noResults').hidden = groups.length > 0;
    // Hide photos that fail to load (e.g. a dish without a picture yet).
    $$('img[data-fallback]', $('#menuList')).forEach((img) => img.addEventListener('error', () => {
      img.closest('.card').classList.add('no-img');
      img.parentElement.remove();
    }, { once: true }));
  }

  function refreshQty(key) {
    const [id] = key.split(':');
    const item = findItem(id);
    const v = item.variants.find((x) => `${id}:${x.id}` === key);
    $$(`[data-ctrl="${key}"]`).forEach((el) => {
      const hadFocus = el.contains(document.activeElement);
      const act = document.activeElement?.dataset?.act;
      el.innerHTML = controlHtml(key, state.cart[key] || 0, v.soldOut, `${itemName(item)} ${variantLabel(item, v)}`);
      if (hadFocus) (el.querySelector(`[data-act="${act}"]:not([disabled])`) || el.querySelector('button'))?.focus();
    });
    const card = $(`.card[data-item="${id}"]`);
    if (card) card.classList.toggle('in-cart', item.variants.some((x) => state.cart[`${id}:${x.id}`]));
  }

  // ---------- cart ----------
  function progressHtml(tt) {
    const min = C.rules.minimumOrder;
    const fees = C.rules.deliveryFees; // highest threshold first
    let msg, pct, ok = false;
    if (tt.subtotal < min) {
      msg = t('minLeft', { x: money(min - tt.subtotal), min: money(min) });
      pct = tt.subtotal / min;
    } else if (state.method === 'pickup') {
      return '';
    } else {
      const next = [...fees].reverse().find((f) => tt.subtotal < f.from);
      if (next) {
        const isFree = next.fee === 0;
        msg = isFree ? t('toFree', { x: money(next.from - tt.subtotal) }) : t('toCheaper', { x: money(next.from - tt.subtotal), fee: money(next.fee) });
        pct = tt.subtotal / fees[0].from;
      } else {
        msg = t('freeReached'); pct = 1; ok = true;
      }
    }
    return `<div class="progress${ok ? ' ok' : ''}"><div class="progress-bar"><span style="width:${Math.min(100, pct * 100).toFixed(1)}%"></span></div><p>${esc(msg)}</p></div>`;
  }

  // Quick-add sides and desserts that aren't in the cart yet.
  const SUGGEST = ['verseloempia', 'tiramisu', 'kanomchan', 'kimchi', 'loempia', 'muffin'];
  function suggestionsHtml() {
    const picks = SUGGEST.map(findItem)
      .filter((i) => i && !i.soldOut && !i.variants.some((v) => state.cart[`${i.id}:${v.id}`]))
      .slice(0, 3);
    if (!picks.length) return '';
    return `<div class="suggest"><p>${esc(t('suggest'))}</p><div class="suggest-row">${picks.map((i) => {
      const v = i.variants.find((x) => !x.soldOut);
      return `<button type="button" class="suggest-btn" data-act="inc" data-key="${i.id}:${v.id}">+ ${esc(itemName(i))} <span>${esc(money(v.price))}</span></button>`;
    }).join('')}</div></div>`;
  }

  function cartHtml({ withButton }) {
    const tt = totals();
    if (!tt.ls.length) return `<h2 class="cart-h">${esc(t('yourOrder'))}</h2><p class="muted cart-empty">${esc(t('empty'))}</p>`;
    const feeLabel = state.method === 'pickup' ? t('pickupFee') : t('deliveryFee');
    return `<div class="cart-top"><h2 class="cart-h">${esc(t('yourOrder'))}</h2><button type="button" class="btn-link small" data-act="clear">${esc(t('clear'))}</button></div>
      <ul class="lines">${tt.ls.map((l) => {
        const note = noteFor(l.item);
        const vl = l.item.variants.length > 1 ? L(l.v.label) : '';
        return `<li class="line">
          <div class="line-main">
            <span class="line-name">${esc(itemName(l.item))}${vl ? ` <small>${esc(vl)}</small>` : ''}</span>
            ${note ? `<span class="line-note">${esc(note)}</span>` : ''}
          </div>
          <span class="v-ctrl" data-ctrl="${l.key}">${controlHtml(l.key, l.qty, false, `${itemName(l.item)} ${vl}`)}</span>
          <span class="line-total">${esc(money(l.total))}</span>
        </li>`;
      }).join('')}</ul>
      ${suggestionsHtml()}
      <div class="method-switch" role="group">
        <button type="button" data-act="method" data-method="delivery" aria-pressed="${state.method === 'delivery'}">${esc(t('delivery'))}</button>
        <button type="button" data-act="method" data-method="pickup" aria-pressed="${state.method === 'pickup'}">${esc(t('pickup'))}</button>
      </div>
      ${progressHtml(tt)}
      <dl class="sums">
        <div><dt>${esc(t('subtotal'))}</dt><dd>${esc(money(tt.subtotal))}</dd></div>
        <div><dt>${esc(feeLabel)}</dt><dd>${tt.fee ? esc(money(tt.fee)) : esc(t('free'))}</dd></div>
        <div class="sum-total"><dt>${esc(t('total'))}</dt><dd>${esc(money(tt.total))}</dd></div>
      </dl>
      ${withButton ? `<button type="button" class="btn btn-primary btn-block" data-act="checkout"${tt.subtotal < C.rules.minimumOrder ? ' disabled' : ''}>${esc(t('checkout'))}</button>` : ''}`;
  }

  function renderCart() {
    $('#cartSide').innerHTML = cartHtml({ withButton: true });
    if (state.step === 'cart') $('#stepCart').innerHTML = cartHtml({ withButton: true });
    const tt = totals();
    $('#bar').hidden = !tt.count;
    $('#barCount').textContent = tt.count;
    $('#barTotal').textContent = money(tt.total);
    if (state.step === 'details') renderSummary();
    $('#reorderBtn').hidden = !(store.get('ntk_last', null) && !tt.ls.length);
  }

  // ---------- sheet ----------
  const sheet = $('#sheet');
  function openSheet(step) {
    window.NTK.guideClose();
    showStep(step);
    if (!sheet.open) sheet.showModal();
    document.body.classList.add('locked');
  }
  function closeSheet() {
    if (sheet.open) sheet.close();
  }
  sheet.addEventListener('close', () => {
    document.body.classList.remove('locked');
    if (state.step === 'done') { state.step = 'cart'; }
  });
  sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });

  function showStep(step) {
    state.step = step;
    $('#stepCart').hidden = step !== 'cart';
    $('#stepDetails').hidden = step !== 'details';
    $('#stepDone').hidden = step !== 'done';
    $('#sheetTitle').textContent = step === 'cart' ? t('yourOrder') : step === 'details' ? t('stepDetails') : '';
    $('#sheetBack').hidden = step === 'done' || (step === 'cart') || (step === 'details' && desktop.matches);
    if (step === 'cart') $('#stepCart').innerHTML = cartHtml({ withButton: true });
    if (step === 'details') prepareDetails();
    $('.sheet-body').scrollTop = 0;
  }
  $('#sheetBack').addEventListener('click', () => (state.step === 'details' && !desktop.matches ? showStep('cart') : closeSheet()));
  $('#sheetClose').addEventListener('click', closeSheet);

  // ---------- details form ----------
  const form = $('#stepDetails');
  const F = (name) => form.elements[name];

  function prepareDetails() {
    const p = store.get('ntk_profile', {});
    for (const k of ['name', 'email', 'phone', 'street', 'city']) if (!F(k).value && p[k]) F(k).value = p[k];
    if (!F('postcode').value) F('postcode').value = state.postcode || p.postcode || '';
    form.querySelector(`input[name="method"][value="${state.method}"]`).checked = true;
    renderPayChoices(p.payment);
    syncMethod();
    clearErrors();
  }

  function renderPayChoices(preferred) {
    const methods = C.payment.methods.filter((m) => m !== 'transfer' || C.payment.iban);
    const current = form.querySelector('input[name="payment"]:checked')?.value || (methods.includes(preferred) ? preferred : methods[0]);
    $('#payChoices').innerHTML = methods.map((m) => `
      <label class="choice">
        <input type="radio" name="payment" value="${m}"${m === current ? ' checked' : ''}>
        <span class="choice-box"><strong>${esc(t(`pay_${m}`))}</strong><small>${esc(t(`pay_${m}_sub`))}</small></span>
      </label>`).join('');
  }

  function syncMethod() {
    state.method = form.querySelector('input[name="method"]:checked').value;
    $('#addrFields').hidden = state.method === 'pickup';
    renderDates();
    renderSummary();
    renderCart();
  }

  function renderDates() {
    const sel = F('date');
    const prev = sel.value;
    let dates = [];
    const note = $('#routeNote');
    note.hidden = true;
    if (state.method === 'pickup') {
      dates = pickupDates();
    } else {
      const routes = routesForPostcode(F('postcode').value.trim());
      if (routes && routes.length) {
        dates = upcomingDates(routes);
        note.hidden = false;
        note.className = 'route-note span2';
        note.textContent = t('routeAuto', { route: routes.map(routeName).join(' / ') });
      } else if (routes) {
        note.hidden = false;
        note.className = 'route-note span2 is-bad';
        note.textContent = t('errRoute');
      }
    }
    const now = new Date();
    sel.innerHTML = `<option value="">${esc(t('chooseDate'))}</option>` + dates.map((d) => {
      const dl = deadlineFor(d.date);
      const late = now >= dl;
      const label = `${dayFmt(d.date, { weekday: 'long', day: 'numeric', month: 'long' })}${d.route !== 'pickup' ? ` · ${routeName(d.route)}` : ''} (${late ? t('lateDate') : t('deadlineFor', { deadline: deadlineFmt(dl) })})`;
      return `<option value="${d.date}|${d.route}">${esc(label)}</option>`;
    }).join('');
    const firstOpen = dates.find((d) => now < deadlineFor(d.date));
    if (prev && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
    else if (firstOpen) sel.value = `${firstOpen.date}|${firstOpen.route}`;
    dateHint();
  }

  function dateHint() {
    const v = F('date').value;
    const h = $('#dateHint');
    if (!v) { h.textContent = ''; return; }
    const [date] = v.split('|');
    const late = new Date() >= deadlineFor(date);
    h.innerHTML = late
      ? `${esc(t('closedText', { phone: C.business.phoneDisplay }))} <a href="tel:${esc(C.business.phone)}">${esc(t('call'))}</a>`
      : '';
    h.classList.toggle('is-warn', late);
  }

  function renderSummary() {
    const tt = totals();
    $('#detailsSummary').innerHTML = `
      <dl class="sums">
        <div><dt>${esc(tt.count === 1 ? t('item') : t('items', { n: tt.count }))}</dt><dd>${esc(money(tt.subtotal))}</dd></div>
        <div><dt>${esc(state.method === 'pickup' ? t('pickupFee') : t('deliveryFee'))}</dt><dd>${tt.fee ? esc(money(tt.fee)) : esc(t('free'))}</dd></div>
        <div class="sum-total"><dt>${esc(t('total'))}</dt><dd>${esc(money(tt.total))}</dd></div>
      </dl>`;
  }

  function clearErrors() {
    $$('.err', form).forEach((e) => { e.textContent = ''; });
    $$('[aria-invalid]', form).forEach((e) => e.removeAttribute('aria-invalid'));
    $('#formErr').hidden = true;
  }
  function fieldError(name, msg) {
    const el = $(`.err[data-for="${name}"]`, form);
    if (el) el.textContent = msg;
    F(name)?.setAttribute('aria-invalid', 'true');
  }

  function validate() {
    clearErrors();
    const v = (n) => F(n).value.trim();
    const bad = [];
    const need = (n) => { if (!v(n)) { fieldError(n, t('errRequired')); bad.push(n); return false; } return true; };
    if (state.method === 'delivery') {
      need('street');
      if (need('postcode')) {
        const routes = routesForPostcode(v('postcode'));
        if (routes === null) { fieldError('postcode', t('errPostcode')); bad.push('postcode'); }
        else if (!routes.length) { fieldError('postcode', t('errRoute')); bad.push('postcode'); }
      }
      need('city');
    }
    if (!v('date')) { fieldError('date', t('errDate')); bad.push('date'); }
    need('name');
    if (need('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'))) { fieldError('email', t('errEmail')); bad.push('email'); }
    if (need('phone') && !/^\+?[\d\s/.()-]{9,18}$/.test(v('phone'))) { fieldError('phone', t('errPhone')); bad.push('phone'); }
    if (bad.length) { F(bad[0]).focus(); return false; }
    const tt = totals();
    if (tt.subtotal < C.rules.minimumOrder) return formError(t('errMin', { min: money(C.rules.minimumOrder) }));
    if (C.ordersOpen === false) return formError(t('errClosed'));
    return true;
  }
  function formError(msg) {
    const e = $('#formErr');
    e.textContent = msg; e.hidden = false;
    e.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return false;
  }

  form.addEventListener('change', (e) => {
    if (e.target.name === 'method') syncMethod();
    if (e.target.name === 'date') dateHint();
  });
  F('postcode').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (e.target.value.length === 4 || !e.target.value) renderDates();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.sending || !validate()) return;
    const v = (n) => F(n).value.trim();
    const [date, route] = v('date').split('|');
    const tt = totals();
    const order = {
      lang: state.lang, method: state.method, date, route,
      name: v('name'), email: v('email'), phone: v('phone'),
      street: state.method === 'delivery' ? v('street') : '',
      postcode: state.method === 'delivery' ? v('postcode') : '',
      city: state.method === 'delivery' ? v('city') : '',
      remarks: v('remarks'),
      payment: form.querySelector('input[name="payment"]:checked')?.value || 'cash',
      items: tt.ls.map((l) => ({ id: l.item.id, variant: l.v.id, qty: l.qty, note: noteFor(l.item) })),
      website: F('website').value,
      clientTotal: tt.total,
    };

    state.sending = true;
    const btn = $('#placeBtn');
    btn.disabled = true; btn.textContent = t('sending');
    try {
      const res = C.apiUrl ? await api({ action: 'order', order }) : demoSubmit(order, tt);
      if (F('remember').checked) {
        store.set('ntk_profile', { name: order.name, email: order.email, phone: order.phone, street: v('street'), postcode: v('postcode'), city: v('city'), payment: order.payment, method: order.method });
      } else {
        store.del('ntk_profile');
      }
      store.set('ntk_last', { cart: state.cart, notes: state.notes, spicier: state.spicier });
      const snapshot = { order, res, tt };
      state.cart = {}; store.set('ntk_cart', {});
      renderDone(snapshot);
      showStep('done');
      renderCart();
      renderMenu();
    } catch (err) {
      console.error(err);
      formError(t('errSend', { email: C.business.email }));
    } finally {
      state.sending = false;
      btn.disabled = false; btn.textContent = t('place');
    }
  });

  // Demo mode: keep the order in this browser so the kitchen page can show it.
  function demoSubmit(order, tt) {
    const all = store.get('ntk_demo_orders', []);
    const n = all.length + 101; // stays clear of the kitchen page's sample orders
    const [, mm, dd] = order.date.split('-');
    const id = `NTK-${mm}${dd}-${String(n).padStart(3, '0')}`;
    const ref = ogm(`${order.date.replaceAll('-', '').slice(2)}${String(n).padStart(4, '0')}`);
    all.push({ ...order, id, ogm: ref, created: new Date().toISOString(), subtotal: tt.subtotal, fee: tt.fee, total: tt.total, paid: false, delivered: false, eta: '',
      lines: tt.ls.map((l) => ({ id: l.item.id, variant: l.v.id, name: itemName(l.item), vlabel: l.item.variants.length > 1 ? L(l.v.label) : '', qty: l.qty, price: l.v.price, note: noteFor(l.item) })) });
    store.set('ntk_demo_orders', all);
    return { ok: true, id, ogm: ref, subtotal: tt.subtotal, fee: tt.fee, total: tt.total };
  }

  // ---------- done ----------
  function renderDone({ order, res, tt }) {
    const P = C.payment;
    const when = order.method === 'pickup'
      ? `${dayFmt(order.date, { weekday: 'long', day: 'numeric', month: 'long' })} · ${t('pickup')} (${C.business.pickupAddress})`
      : `${dayFmt(order.date, { weekday: 'long', day: 'numeric', month: 'long' })} · ${C.rules.deliveryWindow}`;
    const total = res.total ?? tt.total;
    let pay = '';
    if (order.payment === 'transfer' && P.iban) {
      const svg = qrSvg(epcPayload({ name: P.accountName, iban: P.iban, bic: P.bic, amount: total, text: res.ogm }));
      pay = `<div class="pay">
        <h3>${esc(t('payNowTitle'))}</h3>
        <div class="pay-grid">
          ${svg ? `<div class="qr">${svg}</div>` : ''}
          <div>
            <p class="muted">${esc(t('payNowText'))}</p>
            <dl class="kv">
              <div><dt>${esc(t('beneficiary'))}</dt><dd>${esc(P.accountName)}</dd></div>
              <div><dt>${esc(t('iban'))}</dt><dd><span>${esc(P.iban)}</span> <button type="button" class="btn-link small" data-copy="${esc(P.iban.replace(/\s/g, ''))}">${esc(t('copy'))}</button></dd></div>
              <div><dt>${esc(t('amount'))}</dt><dd>${esc(money(total))}</dd></div>
              <div><dt>${esc(t('reference'))}</dt><dd><span>${esc(res.ogm)}</span> <button type="button" class="btn-link small" data-copy="${esc(res.ogm)}">${esc(t('copy'))}</button></dd></div>
            </dl>
          </div>
        </div>
      </div>`;
    } else {
      pay = `<div class="pay"><p>${esc(t(order.payment === 'payconiq' ? 'payPayconiqText' : 'payCashText', { total: money(total) }))}</p></div>`;
    }
    $('#stepDone').innerHTML = `
      <div class="done-head">
        <div class="done-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
        <h2>${esc(t('thanks', { name: order.name.split(' ')[0] }))}</h2>
        <p>${esc(t('received'))}</p>
      </div>
      <dl class="kv done-kv">
        <div><dt>${esc(t('orderNo'))}</dt><dd><strong>${esc(res.id)}</strong></dd></div>
        <div><dt>${esc(t('when'))}</dt><dd>${esc(when)}</dd></div>
      </dl>
      <ul class="lines lines-static">${tt.ls.map((l) => `<li class="line"><div class="line-main"><span class="line-name">${l.qty}× ${esc(itemName(l.item))}${l.item.variants.length > 1 ? ` <small>${esc(L(l.v.label))}</small>` : ''}</span>${noteFor(l.item) ? `<span class="line-note">${esc(noteFor(l.item))}</span>` : ''}</div><span class="line-total">${esc(money(l.total))}</span></li>`).join('')}</ul>
      <dl class="sums">
        <div><dt>${esc(t('subtotal'))}</dt><dd>${esc(money(res.subtotal ?? tt.subtotal))}</dd></div>
        <div><dt>${esc(order.method === 'pickup' ? t('pickupFee') : t('deliveryFee'))}</dt><dd>${(res.fee ?? tt.fee) ? esc(money(res.fee ?? tt.fee)) : esc(t('free'))}</dd></div>
        <div class="sum-total"><dt>${esc(t('total'))}</dt><dd>${esc(money(total))}</dd></div>
      </dl>
      ${pay}
      <p class="muted">${esc(t('confirmMail', { email: order.email }))} ${esc(t('checkSpam', { email: C.business.email }))}</p>
      <div class="done-actions">
        <button type="button" class="btn btn-ghost" data-act="ics">${esc(t('addCal'))}</button>
        <button type="button" class="btn btn-ghost" data-act="print">${esc(t('print'))}</button>
        <button type="button" class="btn btn-primary" data-act="new">${esc(t('newOrder'))}</button>
      </div>`;
    $('#stepDone').dataset.ics = JSON.stringify({ date: order.date, pickup: order.method === 'pickup', id: res.id });
  }

  function downloadIcs() {
    const { date, pickup, id } = JSON.parse($('#stepDone').dataset.ics || '{}');
    if (!date) return;
    const d = date.replaceAll('-', '');
    const [from, to] = C.rules.deliveryWindow.split(/[–-]/).map((s) => s.trim().replace(':', '') + '00');
    const next = new Date(parseDay(date).getTime() + 86400000);
    const d2 = `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, '0')}${String(next.getDate()).padStart(2, '0')}`;
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Noeni Thai Kitchen//Order//NL', 'BEGIN:VEVENT',
      `UID:${id}@noenithaikitchen`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
      ...(pickup ? [`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${d2}`] : [`DTSTART:${d}T${from}`, `DTEND:${d}T${to}`]),
      `SUMMARY:${pickup ? t('calPickup') : t('calTitle')} (${id})`,
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = `noeni-${date}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { el.hidden = true; }, 1800);
  }

  // ---------- events ----------
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act], [data-lang], [data-copy]');
    if (!el) return;
    if (el.dataset.lang) { setLang(el.dataset.lang); return; }
    if (el.dataset.copy) { navigator.clipboard?.writeText(el.dataset.copy).then(() => toast(t('copied'))); return; }
    const act = el.dataset.act;
    if (act === 'inc' || act === 'dec') setQty(el.dataset.key, (state.cart[el.dataset.key] || 0) + (act === 'inc' ? 1 : -1));
    else if (act === 'cat') {
      state.cat = el.dataset.cat;
      renderChips(); renderMenu();
      const top = $('#menu').getBoundingClientRect().top + scrollY - 8;
      if (scrollY > top) scrollTo({ top, behavior: 'smooth' });
    } else if (act === 'note') {
      const wrap = el.closest('.card').querySelector('.note-wrap');
      wrap.hidden = !wrap.hidden;
      el.setAttribute('aria-expanded', String(!wrap.hidden));
      if (!wrap.hidden) wrap.querySelector('textarea').focus();
    } else if (act === 'clear') { state.cart = {}; store.set('ntk_cart', {}); renderMenu(); renderCart(); }
    else if (act === 'method') { state.method = el.dataset.method; renderCart(); }
    else if (act === 'checkout') openSheet('details');
    else if (act === 'ics') downloadIcs();
    else if (act === 'print') window.print();
    else if (act === 'new') { closeSheet(); scrollTo({ top: $('#menu').offsetTop - 8, behavior: 'smooth' }); }
    else if (act === 'guide') openGuide();
  });

  document.addEventListener('change', (e) => {
    if (e.target.dataset.act === 'spicier') {
      state.spicier[e.target.dataset.id] = e.target.checked;
      store.set('ntk_spicier', state.spicier);
      renderCart();
    }
  });
  document.addEventListener('input', (e) => {
    if (e.target.dataset.note) {
      state.notes[e.target.dataset.note] = e.target.value;
      store.set('ntk_notes', state.notes);
      clearTimeout(renderCart.t);
      renderCart.t = setTimeout(renderCart, 300);
    }
  });

  $('#barBtn').addEventListener('click', () => openSheet(desktop.matches ? 'details' : 'cart'));
  $('#search').addEventListener('input', (e) => { state.q = e.target.value; renderMenu(); });
  $('#notSpicy').addEventListener('change', (e) => { state.notSpicy = e.target.checked; renderMenu(); });
  $('#heroPostcode').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (e.target.value.length === 4 || !e.target.value) {
      state.postcode = e.target.value;
      store.set('ntk_postcode', state.postcode);
      F('postcode').value = state.postcode;
      renderHero();
    }
  });
  $('#reorderBtn').addEventListener('click', () => {
    const last = store.get('ntk_last', null);
    if (!last) return;
    state.cart = last.cart || {}; state.notes = last.notes || {}; state.spicier = last.spicier || {};
    store.set('ntk_cart', state.cart); store.set('ntk_notes', state.notes); store.set('ntk_spicier', state.spicier);
    renderMenu(); renderCart(); renderHero();
    if (desktop.matches) $('#menu').scrollIntoView({ behavior: 'smooth' }); else openSheet('cart');
  });

  function setLang(l) {
    state.lang = l;
    store.set('ntk_lang', l);
    renderAll();
    if (document.querySelector('.guide')) openGuide(); // restart it in the new language
    if (sheet.open && state.step !== 'done') showStep(state.step);
  }

  function renderAll() {
    applyStatic();
    renderHero();
    renderChips();
    renderMenu();
    renderCart();
  }

  // ---------- first-time guide ----------
  function openGuide() {
    window.NTK.guide({
      id: 'order',
      labels: { step: t('guideStep'), back: t('guideBack'), next: t('guideNext'), done: t('guideDone'), skip: t('guideSkip'), close: t('guideClose') },
      steps: [
        { title: t('g1t'), text: t('g1'), before: () => scrollTo({ top: 0, behavior: 'smooth' }) },
        { title: t('g2t'), text: t('g2'), target: '.where' },
        { title: t('g3t'), text: t('g3', { min: money(C.rules.minimumOrder) }), target: '#menuList .card', offset: 170 },
        { title: t('g4t'), text: t('g4'), target: '#cartSide' },
        { title: t('g5t'), text: t('g5') },
      ],
      onClose: () => { if (!state.postcode) $('#heroPostcode').focus({ preventScroll: true }); },
    });
  }

  // ---------- start ----------
  $('#heroPostcode').value = state.postcode;
  renderAll();
  setInterval(renderHero, 30000);
  // Show the guide once to new visitors; returning customers (saved details or a past order) skip it.
  if (!window.NTK.guideSeen('order') && !store.get('ntk_profile', null) && !store.get('ntk_last', null)) setTimeout(() => { if (!sheet.open) openGuide(); }, 900);

  if (C.apiUrl) {
    apiGet({ action: 'config' }).then((res) => { applyRemoteConfig(res.config); renderAll(); }).catch((err) => console.warn('Config not loaded, using defaults', err));
  }
})();
