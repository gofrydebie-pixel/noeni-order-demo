/* Noeni Thai Kitchen — customer delivery tracking (checkpoints, no live GPS). */
(function () {
  const C = window.NTK_CONFIG;
  const { esc, parseDay, dayKey, routeById, apiGet, store } = window.NTK;
  const $ = (s) => document.querySelector(s);

  const TXT = {
    nl: {
      title: 'Volg je levering', loading: 'Even laden…',
      demo: 'Demo: deze pagina volgt de voorbeeldroute uit de keukenpagina op dit toestel.', demoPick: 'Bekijk als:',
      sOrdered: 'Bestelling ontvangen', sOrderedSub: 'We koken alles vers op de leverdag.',
      sStarted: 'Chauffeur vertrokken', sStartedWait: 'De route start rond {start}.', sStartedAt: 'Vertrokken om {time}.',
      sQueue: 'Onderweg naar jou', sQueueAhead: 'Nog {n} stops voor jou.', sQueueOne: 'Nog 1 stop voor jou.', sQueueNext: 'Jij bent de volgende!',
      sDone: 'Geleverd', sDoneAt: 'Geleverd om {time}. Smakelijk!',
      tFuture: 'Levering op {date}', tFutureSub: 'Kom op de leverdag terug om de chauffeur te volgen.',
      tWaiting: 'Je bestelling wordt klaargemaakt', tWaitingSub: 'De chauffeur vertrekt rond {start}.',
      tAhead: 'Nog {n} stops voor jou', tOne: 'Nog 1 stop voor jou', tNext: 'Jij bent de volgende!', tNextSub: 'De chauffeur is onderweg naar jou.',
      tDone: 'Geleverd', tDoneSub: 'Om {time}. Smakelijk eten!',
      tPickup: 'Afhalen op {date}', tPickupSub: 'In Sint-Denijs-Westrem. Volgen is enkel voor leveringen.', tPicked: 'Afgehaald', tPickedSub: 'Smakelijk eten!',
      count: '{done} van {total} stops geleverd', lYours: 'jouw stop', lDone: 'geleverd', lTodo: 'nog te doen',
      yourTime: 'Jouw tijdvak', lastUpdate: 'Laatste update', none: '–',
      auto: 'Deze pagina ververst elke minuut vanzelf. Andere klanten zie je hier niet, enkel hoeveel stops er voor jou zijn.',
      errTitle: 'Deze link werkt niet', errText: 'Kijk of je de volledige link uit de mail gebruikt.', netErr: 'Geen verbinding. We proberen het zo opnieuw.',
      help: 'Vragen? Bel Noeni op <a href="tel:{tel}">{phone}</a>.', order: 'Bestelling',
    },
    fr: {
      title: 'Suivre ma livraison', loading: 'Chargement…',
      demo: 'Démo : cette page suit la tournée d’exemple de la page cuisine sur cet appareil.', demoPick: 'Voir en tant que :',
      sOrdered: 'Commande reçue', sOrderedSub: 'Nous cuisinons tout frais le jour de la livraison.',
      sStarted: 'Chauffeur parti', sStartedWait: 'La tournée commence vers {start}.', sStartedAt: 'Parti à {time}.',
      sQueue: 'En route vers vous', sQueueAhead: 'Encore {n} arrêts avant vous.', sQueueOne: 'Encore 1 arrêt avant vous.', sQueueNext: 'Vous êtes le prochain !',
      sDone: 'Livré', sDoneAt: 'Livré à {time}. Bon appétit !',
      tFuture: 'Livraison le {date}', tFutureSub: 'Revenez le jour de la livraison pour suivre le chauffeur.',
      tWaiting: 'Votre commande est en préparation', tWaitingSub: 'Le chauffeur part vers {start}.',
      tAhead: 'Encore {n} arrêts avant vous', tOne: 'Encore 1 arrêt avant vous', tNext: 'Vous êtes le prochain !', tNextSub: 'Le chauffeur est en route vers vous.',
      tDone: 'Livré', tDoneSub: 'À {time}. Bon appétit !',
      tPickup: 'Enlèvement le {date}', tPickupSub: 'À Sint-Denijs-Westrem. Le suivi est réservé aux livraisons.', tPicked: 'Enlevé', tPickedSub: 'Bon appétit !',
      count: '{done} sur {total} arrêts livrés', lYours: 'votre arrêt', lDone: 'livré', lTodo: 'à faire',
      yourTime: 'Votre créneau', lastUpdate: 'Dernière mise à jour', none: '–',
      auto: 'Cette page s’actualise chaque minute. Vous ne voyez pas les autres clients, seulement le nombre d’arrêts avant vous.',
      errTitle: 'Ce lien ne fonctionne pas', errText: 'Vérifiez que vous utilisez le lien complet de l’e-mail.', netErr: 'Pas de connexion. Nouvel essai dans un instant.',
      help: 'Des questions ? Appelez Noeni au <a href="tel:{tel}">{phone}</a>.', order: 'Commande',
    },
    en: {
      title: 'Follow your delivery', loading: 'Loading…',
      demo: 'Demo: this page follows the sample route from the kitchen page on this device.', demoPick: 'View as:',
      sOrdered: 'Order received', sOrderedSub: 'We cook everything fresh on delivery day.',
      sStarted: 'Driver on the road', sStartedWait: 'The route starts around {start}.', sStartedAt: 'Left at {time}.',
      sQueue: 'On the way to you', sQueueAhead: '{n} stops before you.', sQueueOne: '1 stop before you.', sQueueNext: 'You’re next!',
      sDone: 'Delivered', sDoneAt: 'Delivered at {time}. Enjoy!',
      tFuture: 'Delivery on {date}', tFutureSub: 'Come back on delivery day to follow the driver.',
      tWaiting: 'Your order is being prepared', tWaitingSub: 'The driver leaves around {start}.',
      tAhead: '{n} stops before you', tOne: '1 stop before you', tNext: 'You’re next!', tNextSub: 'The driver is on the way to you.',
      tDone: 'Delivered', tDoneSub: 'At {time}. Enjoy your meal!',
      tPickup: 'Pickup on {date}', tPickupSub: 'In Sint-Denijs-Westrem. Tracking is for deliveries only.', tPicked: 'Picked up', tPickedSub: 'Enjoy your meal!',
      count: '{done} of {total} stops delivered', lYours: 'your stop', lDone: 'delivered', lTodo: 'still to go',
      yourTime: 'Your time slot', lastUpdate: 'Last update', none: '–',
      auto: 'This page refreshes every minute. You don’t see other customers here, only how many stops are before you.',
      errTitle: 'This link doesn’t work', errText: 'Check that you used the full link from the email.', netErr: 'No connection. Trying again shortly.',
      help: 'Questions? Call Noeni on <a href="tel:{tel}">{phone}</a>.', order: 'Order',
    },
  };
  const LOCALE = { nl: 'nl-BE', fr: 'fr-BE', en: 'en-GB' };

  const params = new URLSearchParams(location.search);
  const pickLang = () => { const l = (navigator.language || 'nl').slice(0, 2); return TXT[l] ? l : 'nl'; };
  const state = {
    lang: TXT[params.get('lang')] ? params.get('lang') : store.get('ntk_lang', null) || pickLang(),
    token: params.get('t') || '',
    info: null,
  };
  const t = (k, v = {}) => Object.entries(v).reduce((s, [a, b]) => s.replaceAll(`{${a}}`, b), TXT[state.lang][k] ?? k);
  const demo = !C.apiUrl;

  const longDay = (d) => new Intl.DateTimeFormat(LOCALE[state.lang], { weekday: 'long', day: 'numeric', month: 'long' }).format(parseDay(d));
  const clock = (iso) => (iso ? new Intl.DateTimeFormat(LOCALE[state.lang], { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' }).format(new Date(iso)) : '');
  const routeName = (id) => routeById(id)?.name?.[state.lang] || routeById(id)?.name?.nl || '';

  // ---------- data ----------
  async function load() {
    if (demo) {
      state.info = window.NTK_DEMO.track(state.token);
      return;
    }
    const res = await apiGet({ action: 'track', t: state.token }, { timeout: 15000 });
    state.info = res.track;
  }

  // ---------- view ----------
  function step(cls, n, title, sub) {
    return `<li class="t-step ${cls}"><span class="t-dot" aria-hidden="true">${cls === 'done' ? '✓' : n}</span>
      <div><b>${esc(title)}</b>${sub ? `<span class="t-sub">${sub}</span>` : ''}</div></li>`;
  }

  function render() {
    const i = state.info;
    $('#loading').hidden = true;
    $('#help').hidden = false;
    $('#help').innerHTML = t('help', { tel: esc(C.business.phone), phone: esc(C.business.phoneDisplay) });
    if (!i) {
      $('#card').hidden = true;
      $('#error').hidden = false;
      $('#error').innerHTML = `<h1>${esc(t('errTitle'))}</h1><p>${esc(t('errText'))}</p>`;
      return;
    }
    $('#error').hidden = true;
    $('#card').hidden = false;
    const kicker = `${esc(t('order'))} ${esc(i.id)} · ${esc(longDay(i.date))}${i.method === 'pickup' ? '' : ` · ${esc(routeName(i.route))}`}`;

    if (i.method === 'pickup') {
      $('#card').innerHTML = `<p class="t-kicker">${kicker}</p>
        <div class="t-title"><h1>${esc(i.delivered ? t('tPicked') : t('tPickup', { date: longDay(i.date) }))}</h1>
        <p>${esc(i.delivered ? t('tPickedSub') : t('tPickupSub'))}</p></div>`;
      return;
    }

    const start = (i.window || '').split(/[–-]/)[0].trim();
    const today = dayKey(new Date());
    let title, sub;
    if (i.delivered) { title = t('tDone'); sub = t('tDoneSub', { time: clock(i.deliveredAt) || '' }); }
    else if (!i.started && i.date > today) { title = t('tFuture', { date: longDay(i.date) }); sub = t('tFutureSub'); }
    else if (!i.started) { title = t('tWaiting'); sub = t('tWaitingSub', { start }); }
    else if (i.ahead === 0) { title = t('tNext'); sub = t('tNextSub'); }
    else { title = i.ahead === 1 ? t('tOne') : t('tAhead', { n: i.ahead }); sub = ''; }

    // Checkpoints: ordered → driver left → stops before you → delivered
    const s2 = i.started || i.delivered ? 'done' : 'now';
    const s3 = i.delivered ? 'done' : i.started ? 'now' : 'todo';
    const s4 = i.delivered ? 'done' : 'todo';
    // The headline already says how many stops are left, so this step only shows the bar.
    const bar = i.started && !i.delivered && i.progress?.length
      ? `<span class="t-bar" role="img" aria-label="${esc(t('count', { done: i.done, total: i.total }))}">${i.progress.map((p) => `<i class="${p}"></i>`).join('')}</span>
         <span class="t-legend"><span><i class="done"></i>${esc(t('lDone'))}</span><span><i class="me"></i>${esc(t('lYours'))}</span><span><i></i>${esc(t('lTodo'))}</span></span>
         <span class="t-count">${esc(t('count', { done: i.done, total: i.total }))}</span>`
      : '';

    $('#card').innerHTML = `<p class="t-kicker">${kicker}</p>
      <div class="t-title"><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div>
      <ol class="t-steps">
        ${step('done', 1, t('sOrdered'), esc(t('sOrderedSub')))}
        ${step(s2, 2, t('sStarted'), esc(i.started ? t('sStartedAt', { time: clock(i.started) }) : t('sStartedWait', { start })))}
        ${step(s3, 3, t('sQueue'), bar)}
        ${step(s4, 4, t('sDone'), i.delivered ? esc(t('sDoneAt', { time: clock(i.deliveredAt) })) : '')}
      </ol>
      <dl class="t-facts">
        <div><dt>${esc(t('yourTime'))}</dt><dd>${esc(i.eta || i.window || t('none'))}</dd></div>
        <div><dt>${esc(t('lastUpdate'))}</dt><dd>${esc(clock(i.lastUpdate) || t('none'))}</dd></div>
      </dl>
      <p class="t-note">${esc(t('auto'))}</p>`;
  }

  function applyText() {
    document.documentElement.lang = LOCALE[state.lang];
    document.title = `${t('title')} · Noeni Thai Kitchen`;
    document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
    $('#loading').textContent = t('loading');
    $('#demoBar').hidden = !demo;
    if (demo) {
      $('#demoText').textContent = t('demo');
      $('#demoPickLabel').textContent = t('demoPick');
      const stops = window.NTK_DEMO.orders().filter((o) => o.method === 'delivery');
      $('#demoPick').innerHTML = stops.map((o) => `<option value="${esc(o.track)}"${o.track === state.token ? ' selected' : ''}>${esc(o.name)} · ${esc(o.city)}</option>`).join('');
    }
  }

  async function refresh() {
    try {
      await load();
      render();
    } catch (err) {
      if (/not found/.test(err.message)) { state.info = null; render(); return; }
      // Keep showing the last known state; only show the message if there is none yet.
      if (!state.info) { $('#loading').hidden = false; $('#loading').textContent = t('netErr'); }
    }
  }

  // ---------- events ----------
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]');
    if (!b) return;
    state.lang = b.dataset.lang;
    store.set('ntk_lang', state.lang);
    applyText();
    if ($('#loading').hidden) render();
  });
  $('#demoPick').addEventListener('change', (e) => {
    state.token = e.target.value;
    history.replaceState(null, '', `?t=${encodeURIComponent(state.token)}&lang=${state.lang}`);
    refresh();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  // Demo: the kitchen page in another tab writes to this browser's storage.
  window.addEventListener('storage', (e) => { if (demo && /^ntk_demo_/.test(e.key || '')) refresh(); });
  setInterval(() => { if (!document.hidden) refresh(); }, demo ? 10000 : 60000);

  // ---------- start ----------
  if (demo && !state.token) {
    // No link given: follow the 7th stop of the sample route, so there are stops before it.
    const stops = window.NTK_DEMO.orders().filter((o) => o.method === 'delivery');
    state.token = (stops[6] || stops[0])?.track || '';
  }
  applyText();
  refresh();
})();
