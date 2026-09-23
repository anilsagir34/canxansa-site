/* Quote form funnel: which fields get filled, which block submission, where people leave.
   Event names carry the field name so they read directly in GA4 > Events without custom dimensions.
   Uses the page's gtag, so nothing is sent unless analytics consent was granted. */
(() => {
  'use strict';
  const form = document.querySelector('#quote-form, #signals-quote-form');
  if (!form || typeof window.gtag !== 'function') return;

  const send = (name, params) => window.gtag('event', name, Object.assign({ form_id: form.id }, params));
  const fields = [...form.elements].filter(el => el.name && el.type !== 'hidden' && el.type !== 'submit');
  const filled = new Set();
  let lastField = '';
  let submitted = false;
  let invalidSent = false;

  fields.forEach(el => {
    el.addEventListener('focus', () => { lastField = el.name; });
    el.addEventListener('input', () => { lastField = el.name; });
    el.addEventListener('change', () => {
      lastField = el.name;
      if (!el.value.trim() || filled.has(el.name)) return;
      filled.add(el.name);
      send('form_field_' + el.name, { fields_filled: filled.size, fields_total: fields.length });
    });
    // Browser validation fires 'invalid' per blocked field; report only the first one of each attempt.
    el.addEventListener('invalid', () => {
      if (invalidSent) return;
      invalidSent = true;
      send('form_invalid_' + el.name, { fields_filled: filled.size });
    });
  });

  form.addEventListener('submit', () => {
    submitted = true;
    send('form_submit_attempt', { fields_filled: filled.size, fields_total: fields.length });
  });
  // Reset per attempt: 'invalid' fires before 'submit', which never fires when validation blocks.
  form.querySelector('[type="submit"]')?.addEventListener('click', () => { invalidSent = false; });

  const leave = () => {
    if (submitted || !filled.size) return;
    submitted = true;
    send('form_abandon_' + (lastField || 'unknown'), {
      fields_filled: filled.size, fields_total: fields.length, transport_type: 'beacon'
    });
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leave(); });
  window.addEventListener('pagehide', leave);
})();
