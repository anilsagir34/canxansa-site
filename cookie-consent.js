/* CANXANSA consent. Optional analytics load only after opt-in.
   Existing granted/denied choices remain compatible. No advertising consent. */
(function () {
  'use strict';
  var KEY = 'canxansa_consent';
  var analyticsId = 'G-X19NTBBWNQ';
  var observer;
  var opener;
  function status() {
    try { return localStorage.getItem(KEY) || 'pending'; } catch (e) { return 'pending'; }
  }
  function apply(value) {
    var granted = value === 'granted';
    window['ga-disable-' + analyticsId] = !granted;
    window.dataLayer = window.dataLayer || [];
    (function () { window.dataLayer.push(arguments); })('consent', 'update', {
      ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
      analytics_storage: granted ? 'granted' : 'denied'
    });
    if (granted && !document.getElementById('cx-analytics')) {
      var script = document.createElement('script');
      script.id = 'cx-analytics'; script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + analyticsId;
      document.head.appendChild(script);
    }
    if (!granted) {
      document.cookie.split(';').forEach(function (cookie) {
        var name = cookie.split('=')[0].trim();
        if (!/^_ga(?:_|$)|^_gid$|^_gat/.test(name)) return;
        ['', '; domain=' + location.hostname, '; domain=.' + location.hostname].forEach(function (domain) {
          document.cookie = name + '=; Max-Age=0; path=/' + domain;
        });
      });
    }
  }
  function resize() {
    var banner = document.getElementById('cxc-banner');
    document.documentElement.style.setProperty('--consent-height', banner ? banner.offsetHeight + 'px' : '0px');
  }
  function close() {
    var banner = document.getElementById('cxc-banner');
    if (observer) { observer.disconnect(); observer = null; }
    if (banner) banner.remove();
    document.documentElement.classList.remove('consent-open');
    document.documentElement.style.removeProperty('--consent-height');
    if (opener && document.contains(opener)) opener.focus();
  }
  function save(granted) {
    var value = granted ? 'granted' : 'denied';
    try { localStorage.setItem(KEY, value); } catch (e) {}
    apply(value); close();
  }
  function open(focus) {
    var existing = document.getElementById('cxc-banner');
    if (existing) { if (focus) existing.querySelector('button').focus(); return; }
    opener = focus ? document.activeElement : null;
    var banner = document.createElement('section');
    banner.id = 'cxc-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-labelledby', 'cxc-title');
    banner.setAttribute('aria-describedby', 'cxc-description');
    banner.innerHTML = '<h2 id="cxc-title">Cookie preferences</h2>' +
      '<p id="cxc-description">We use essential cookies to run this site. With your permission, we also use Google Analytics to understand visits. <a href="/cookie-policy/">Cookie Policy</a> · <a href="/privacy/">Privacy Policy</a></p>' +
      '<div class="cxc-actions"><button type="button" data-action="reject">Reject optional</button><button type="button" class="cxc-accept" data-action="accept">Accept all</button></div>' +
      '<button type="button" class="cxc-customize" aria-expanded="false" aria-controls="cxc-options" data-action="customize">Customize</button>' +
      '<div id="cxc-options" hidden><p>Essential cookies are always active.</p><label><input id="cxc-analytics" type="checkbox"> Optional analytics</label><button type="button" data-action="save">Save preferences</button></div>';
    document.body.appendChild(banner);
    banner.querySelector('#cxc-analytics').checked = status() === 'granted';
    banner.addEventListener('click', function (event) {
      var button = event.target.closest('button[data-action]');
      if (!button) return;
      var action = button.dataset.action;
      if (action === 'accept') save(true);
      if (action === 'reject') save(false);
      if (action === 'save') save(banner.querySelector('#cxc-analytics').checked);
      if (action === 'customize') {
        var options = banner.querySelector('#cxc-options');
        options.hidden = !options.hidden;
        button.setAttribute('aria-expanded', String(!options.hidden)); resize();
      }
    });
    document.documentElement.classList.add('consent-open');
    resize();
    if (window.ResizeObserver) { observer = new ResizeObserver(resize); observer.observe(banner); }
    if (focus) banner.querySelector('button').focus();
  }
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  apply(status());
  ready(function () { if (status() !== 'granted' && status() !== 'denied') open(false); });
  window.addEventListener('storage', function (event) {
    if (event.key === KEY) { apply(status()); close(); if (status() === 'pending') open(false); }
  });
  window.CanxansaConsent = {
    open: function () { ready(function () { open(true); }); },
    accept: function () { save(true); }, reject: function () { save(false); }, status: status
  };
})();
