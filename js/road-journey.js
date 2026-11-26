/* CANXANSA kara yolu sayfasi: yazilar, adimlar, olcum ve 3D sahnenin tembel yuklenmesi.
   3D modul (road-3d.min.js) sayfa yuklendikten sonra gelir; o zamana kadar kapak gorseli gorunur. */
(() => {
  const root = document.documentElement, $ = id => document.getElementById(id);
  const jr = $('jr'); if (!jr) return;
  const stage = $('stage');
  const howItWorks = $('how-road-freight-works');
  const qs = new URLSearchParams(location.search), DEBUG = qs.has('jrdebug');
  const nav = navigator;
  const lowPower = (nav.connection && nav.connection.saveData) || (nav.deviceMemory && nav.deviceMemory <= 2);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
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
  const videoDetails = $('jr-video-fallback');
  const videoTemplate = $('jr-video-template');
  if (videoDetails && videoTemplate) {
    let video;
    videoDetails.addEventListener('toggle', () => {
      if (!videoDetails.open) {
        if (video) video.pause();
        return;
      }
      if (video) return;
      const content = videoTemplate.content.cloneNode(true);
      video = content.querySelector('video');
      videoDetails.appendChild(content);
    });
  }
  if (reducedMotion.matches || lowPower) { root.classList.add('jr-rm'); return; }
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
    const l = scene !== null && p >= .262 && p < .488;
    if (l !== light) { light = l; jr.classList.toggle('studio', l); }
  }

  let scene = null, queued = false, started = false;
  const span = () => jr.offsetHeight - stage.clientHeight;
  const progress = () => clamp(-jr.getBoundingClientRect().top / Math.max(1, span()));
  function tick() {
    queued = false;
    if (root.classList.contains('jr-rm')) return;
    last = DEBUG && qs.has('jrp') ? clamp(Number(qs.get('jrp')) || 0) : progress();
    if (!scene && !DEBUG) return;
    ui(last);
    if (scene) {
      try {
        scene.draw(last);
      } catch (error) {
        fallback(error);
      }
    }
  }
  const req = () => { if (!queued) { queued = true; requestAnimationFrame(tick); } };
  const scrollListener = new AbortController();
  function onScroll() {
    const p = progress();
    if (p > .005 && p < 1) go3d();
    req();
  }
  addEventListener('scroll', onScroll, {passive: true, signal: scrollListener.signal});
  steps.forEach(button => button.addEventListener('click', () => {
    go3d();
    scrollTo({top: jr.getBoundingClientRect().top + scrollY + span() * Number(button.dataset.p), behavior: 'smooth'});
  }));
  function go3d() {
    if (started || root.classList.contains('jr-rm')) return;
    started = true;
    // Let the first actual scroll or step click paint before initializing WebGL.
    setTimeout(load3d, 0);
  }

  // Keep the static introduction usable if WebGL fails before or after startup.
  const canvas = $('jr-canvas');
  const fadeEl = $('jr-fade');
  function fallback(error) {
    if (root.classList.contains('jr-rm')) return;
    const journey = jr.getBoundingClientRect();
    const anchorBefore = howItWorks.getBoundingClientRect().top;
    const atLaterScene = journey.top < -stage.clientHeight && journey.bottom > 0;
    const hiddenFocus = document.activeElement?.closest('#steps, .jr-block:not(#B0)');
    scene = null;
    scrollListener.abort();
    ui(0);
    jr.classList.remove('ready', 'studio');
    if (fadeEl) fadeEl.style.opacity = 0;
    for (const label of $('jr-labels').children) label.classList.remove('on');
    if (DEBUG && qs.has('jrp')) {
      for (const property of ['position', 'left', 'right', 'z-index']) stage.style.removeProperty(property);
    }
    root.classList.add('jr-rm');
    window.__jrReady = false;
    if (atLaterScene && videoDetails) {
      videoDetails.scrollIntoView({block: 'start', behavior: 'instant'});
      if (hiddenFocus) videoDetails.querySelector('summary')?.focus({preventScroll: true});
    } else if (journey.bottom <= 0) {
      const offset = howItWorks.getBoundingClientRect().top - anchorBefore;
      if (offset) scrollTo({top: scrollY + offset, behavior: 'instant'});
    }
    if (hiddenFocus && !atLaterScene) blocks[0].querySelector('.jr-btn')?.focus({preventScroll: true});
    if (error instanceof Error) console.warn('Road journey 3D unavailable', error);
  }
  reducedMotion.addEventListener?.('change', event => {
    if (event.matches) fallback();
  }, {signal: scrollListener.signal});
  function load3d() {
    if (root.classList.contains('jr-rm')) return;
    canvas.addEventListener('webglcontextlost', fallback, {once: true});
    import('/js/road-3d.min.js?v=20261126v9').then(m => m.start({
      canvas, stage, fadeEl, initialProgress: () => last,
      onReady: s => {
        if (root.classList.contains('jr-rm')) return;
        scene = s;
        jr.classList.add('ready');
        req();
        window.__jrReady = true;
      }
    })).catch(fallback);
  }
  if (qs.has('jrposter')) setTimeout(() => document.querySelectorAll('body > *:not(main), .jr-block, .jr-progress, .jr-skip, .jr-credit, .jr-labels, .jr-shade, a[aria-label="WhatsApp"]').forEach(e => e.style.visibility = 'hidden'), 50);
  if (DEBUG && qs.has('jrp')) { stage.style.position = 'fixed'; stage.style.left = 0; stage.style.right = 0; stage.style.zIndex = 50; }
  if (DEBUG) {
    if (document.readyState === 'complete') go3d();
    else addEventListener('load', go3d, {once: true});
  }
  req();
})();
