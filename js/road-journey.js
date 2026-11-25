/* CANXANSA kara yolu sayfasi: yazilar, adimlar, olcum ve 3D sahnenin tembel yuklenmesi.
   3D modul (road-3d.min.js) sayfa yuklendikten sonra gelir; o zamana kadar kapak gorseli gorunur. */
(() => {
  const root = document.documentElement, $ = id => document.getElementById(id);
  const jr = $('jr'); if (!jr) return;
  const stage = $('stage');
  const qs = new URLSearchParams(location.search), DEBUG = qs.has('jrdebug');
  const nav = navigator;
  const lowPower = (nav.connection && nav.connection.saveData) || (nav.deviceMemory && nav.deviceMemory <= 2);
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches || lowPower;
  const gt = (n, p) => { if (typeof window.gtag === 'function') window.gtag('event', n, p || {}); };
  const clamp = v => Math.max(0, Math.min(1, v));
  let last = 0;

  document.querySelectorAll('[data-quote-mode]').forEach(a => a.addEventListener('click', () => {
    const s = $('quote-transport_mode'); if (s) { s.value = a.dataset.quoteMode; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }));
  document.querySelectorAll('[data-cta]').forEach(a => a.addEventListener('click', () => {
    const c = a.dataset.cta;
    if (c === 'skip') gt('journey_skip', { at: Math.round(last * 100) });
    else if (/whatsapp/.test(c)) gt('whatsapp_click', { event_category: 'contact', event_label: 'journey_' + c });
    else gt('journey_cta_click', { cta: c });
  }));
  const sel = $('quote-transport_mode'); if (sel && !sel.value) sel.value = 'road-ftl';
  if (RM) { root.classList.add('jr-rm'); return; }
  if (DEBUG) root.classList.add('jr-debug');

  const blocks = [0, 1, 2, 3, 4, 5].map(i => $('B' + i));
  const steps = [...$('steps').children];
  const RANGES = [[-1, .05], [.29, .385], [.395, .47], [.565, .68], [.72, .875], [.9, 2]];
  const seen = new Set();
  let cur = 0, light = null;
  function ui(p) {
    let bi = -1; RANGES.forEach((r, i) => { if (p >= r[0] && p < r[1]) bi = i; });
    if (bi !== cur) { if (cur >= 0) blocks[cur].classList.remove('on'); if (bi >= 0) blocks[bi].classList.add('on'); cur = bi; if (bi > 0 && !seen.has(bi)) { seen.add(bi); gt('journey_scene_view', { scene: bi }); } }
    const si = p < .385 ? 0 : p < .5 ? 1 : p < .7 ? 2 : p < .89 ? 3 : 4;
    steps.forEach((b, i) => { const on = i === si && p > .26; b.classList.toggle('on', on); b.classList.toggle('done', i < si && p > .26); if (on) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    const l = p >= .262 && p < .488;
    if (l !== light) { light = l; jr.classList.toggle('light', l); }
  }

  let scene = null, queued = false;
  const span = () => jr.offsetHeight - stage.clientHeight;
  const progress = () => clamp(-jr.getBoundingClientRect().top / span());
  function tick() { queued = false; last = DEBUG && qs.has('jrp') ? +qs.get('jrp') : progress(); ui(last); if (scene) scene.draw(last); }
  const req = () => { if (!queued) { queued = true; requestAnimationFrame(tick); } };
  addEventListener('scroll', req, { passive: true });
  steps.forEach(b => b.addEventListener('click', () => scrollTo({ top: jr.getBoundingClientRect().top + scrollY + span() * parseFloat(b.dataset.p), behavior: 'smooth' })));

  // 3D: WebGL2 varsa, sayfa yuklendikten sonra
  const gl2 = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } })();
  function load3d() {
    if (!gl2) return;
    import('/js/road-3d.min.js?v=20261126d').then(m => m.start({
      canvas: $('jr-canvas'), stage, fadeEl: $('jr-fade'), debug: DEBUG,
      onReady: s => { scene = s; jr.classList.add('ready'); req(); window.__jrReady = true; }
    })).catch(e => { console.warn('3D yuklenemedi', e); });
  }
  if (qs.has('jrposter')) setTimeout(() => document.querySelectorAll('body > *:not(main), .jr-block, .jr-progress, .jr-skip, .jr-credit, .jr-labels, .jr-shade, a[aria-label="WhatsApp"]').forEach(e => e.style.visibility = 'hidden'), 50);
  if (DEBUG && qs.has('jrp')) { stage.style.position = 'fixed'; stage.style.left = 0; stage.style.right = 0; stage.style.zIndex = 50; }
  // ilk etkilesimde ya da sayfa yuklendikten birkac saniye sonra (acilis hizi icin)
  let started = false;
  const go3d = () => { if (started) return; started = true; ['scroll', 'pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(e => removeEventListener(e, go3d)); load3d(); };
  if (DEBUG) { if (document.readyState === 'complete') go3d(); else addEventListener('load', go3d); }
  else {
    ['scroll', 'pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(e => addEventListener(e, go3d, { passive: true, once: true }));
    const later = () => setTimeout(() => (window.requestIdleCallback || setTimeout)(go3d, { timeout: 2000 }), 6000);
    if (document.readyState === 'complete') later(); else addEventListener('load', later);
  }
  req();
})();
