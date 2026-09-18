/* Keep the floating contact shortcut clear of quote forms on small screens. */
(() => {
  'use strict';
  const form = document.getElementById('quote-form');
  if (!form) return;
  const shortcut = [...document.querySelectorAll('a[href^="https://wa.me/"]')]
    .find(link => getComputedStyle(link).position === 'fixed');
  if (!shortcut) return;
  const mobile = matchMedia('(max-width: 1024px)');
  let formVisible = false;
  let trackingVisible = false;
  const tracking = document.querySelector('.tracking-card');
  const update = () => {
    const editing = form.contains(document.activeElement);
    shortcut.classList.toggle('quote-wa-obscured', mobile.matches && (formVisible || trackingVisible || editing));
  };
  const observer = new IntersectionObserver(entries => {
    formVisible = entries[0].isIntersecting;
    update();
  });
  observer.observe(form);
  if (tracking) {
    const trackingObserver = new IntersectionObserver(entries => {
      trackingVisible = entries[0].isIntersecting;
      update();
    });
    trackingObserver.observe(tracking);
  }
  mobile.addEventListener('change', update);
  form.addEventListener('focusin', update);
  form.addEventListener('focusout', () => requestAnimationFrame(update));
  update();
})();
