/* First-time guide: a step-by-step card that can point at parts of the page.
   Used by the order page and the kitchen dashboard. Remembered per browser. */
(function () {
  const { esc, store } = window.NTK;
  let current = null;

  function close(done) {
    if (!current) return;
    const { el, opts } = current;
    document.querySelectorAll('.guide-spot').forEach((s) => s.classList.remove('guide-spot'));
    el.remove();
    document.removeEventListener('keydown', onKey);
    current = null;
    store.set(`ntk_guide_${opts.id}`, true);
    opts.onClose?.(done);
  }

  function onKey(e) { if (e.key === 'Escape') close(false); }

  function show(i) {
    const { el, opts } = current;
    const s = opts.steps[i];
    const L = opts.labels;
    current.i = i;
    s.before?.();
    document.querySelectorAll('.guide-spot').forEach((x) => x.classList.remove('guide-spot'));
    const target = s.target && document.querySelector(s.target);
    if (target && target.offsetParent !== null) {
      target.classList.add('guide-spot');
      // Keep the target below the sticky header and above the card.
      const top = target.getBoundingClientRect().top + window.scrollY - (s.offset ?? 90);
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
    const last = i === opts.steps.length - 1;
    el.innerHTML = `
      <div class="guide-top">
        <span class="guide-count">${esc(L.step.replace('{n}', i + 1).replace('{total}', opts.steps.length))}</span>
        <button type="button" class="guide-x" data-g="close" aria-label="${esc(L.close)}">×</button>
      </div>
      <h2 id="guideTitle">${esc(s.title)}</h2>
      <p>${s.html || esc(s.text)}</p>
      <div class="guide-foot">
        <span class="guide-dots" aria-hidden="true">${opts.steps.map((_, n) => `<i${n === i ? ' class="on"' : ''}></i>`).join('')}</span>
        ${i > 0 ? `<button type="button" class="btn btn-ghost" data-g="back">${esc(L.back)}</button>` : `<button type="button" class="btn-link small" data-g="close">${esc(L.skip)}</button>`}
        <button type="button" class="btn btn-primary" data-g="${last ? 'done' : 'next'}">${esc(last ? L.done : L.next)}</button>
      </div>
      ${last && s.extra ? `<div class="guide-extra">${s.extra}</div>` : ''}`;
    el.querySelector('[data-g="next"], [data-g="done"]').focus({ preventScroll: true });
  }

  /** opts: { id, steps: [{title, text|html, target?, offset? (px kept free above the target), before?, extra?}], labels: {step, back, next, done, skip, close}, onClose? } */
  function guide(opts) {
    if (current) close(false);
    const el = document.createElement('div');
    el.className = 'guide';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-labelledby', 'guideTitle');
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-g]');
      if (!b) return;
      const g = b.dataset.g;
      if (g === 'next') show(current.i + 1);
      else if (g === 'back') show(current.i - 1);
      else if (g === 'done') close(true);
      else if (g === 'close') close(false);
      // Other buttons inside the card (e.g. "practice") are handled by the page.
    });
    document.body.appendChild(el);
    document.addEventListener('keydown', onKey);
    current = { el, opts, i: 0 };
    show(0);
  }

  window.NTK.guide = guide;
  window.NTK.guideSeen = (id) => store.get(`ntk_guide_${id}`, false);
  window.NTK.guideClose = () => close(false);
})();
