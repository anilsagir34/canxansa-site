/* Keep destination selection on the origin hub. Country guides stay ordinary links. */
(() => {
  'use strict';
  const form = document.getElementById('quote-form');
  if (!form) return;
  const destination = form.elements.namedItem('destination');
  const route = form.elements.namedItem('route');
  const context = form.querySelector('.quote-route-context');
  if (!destination || !route || !context) return;
  const originRoute = route.value;
  const updateRoute = () => {
    const option = destination.options[destination.selectedIndex];
    const selected = destination.value && destination.value !== 'Other';
    route.value = selected ? originRoute + ' to ' + option.textContent.trim() : originRoute;
    context.textContent = selected ? route.value : '';
    context.hidden = !selected;
  };
  destination.addEventListener('change', updateRoute);
  document.querySelectorAll('[data-quote-destination]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const value = link.dataset.quoteDestination;
      if (![...destination.options].some(option => option.value === value)) return;
      destination.value = value;
      updateRoute();
      // Allow the native #contact navigation; preserve other entered form fields.
      destination.focus({ preventScroll: true });
    });
  });
  form.addEventListener('reset', () => {
    route.value = originRoute;
    context.textContent = '';
    context.hidden = true;
  });
  updateRoute();
})();
