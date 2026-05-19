/*!
 * CANXANSA Cookie Consent — GDPR + GA4 Consent Mode v2
 * Default: all analytics/ad signals DENIED until user clicks Accept.
 * Storage: localStorage key "canxansa_consent" → "granted" | "denied".
 * Re-open with: window.CanxansaConsent.open()
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'canxansa_consent';
  var dl = (window.dataLayer = window.dataLayer || []);
  function gtag() { dl.push(arguments); }

  // ---- 1. Apply stored consent (or keep default = denied) ----
  var stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}

  if (stored === 'granted') {
    gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted'
    });
  } else if (stored === 'denied') {
    gtag('consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied'
    });
  }

  // ---- 2. Inject styles ----
  var css = '' +
    '#cxc-banner{position:fixed;left:24px;right:24px;bottom:24px;max-width:560px;margin:0 auto;' +
    'background:#0a0a0a;border:1px solid #2e2e2e;border-left:3px solid #e8521a;border-radius:2px;' +
    'padding:20px 24px;z-index:9999;font-family:"DM Sans",sans-serif;color:#f5f0eb;' +
    'box-shadow:0 8px 32px rgba(0,0,0,0.5);font-weight:300;font-size:13px;line-height:1.6;' +
    'transform:translateY(20px);opacity:0;transition:transform .35s ease,opacity .35s ease;}' +
    '#cxc-banner.cxc-show{transform:translateY(0);opacity:1;}' +
    '#cxc-banner .cxc-title{font-family:"Bebas Neue",sans-serif;font-size:18px;letter-spacing:2px;' +
    'color:#e8521a;margin-bottom:8px;}' +
    '#cxc-banner p{margin:0 0 14px;color:#888;}' +
    '#cxc-banner a{color:#e8521a;text-decoration:none;}' +
    '#cxc-banner a:hover{text-decoration:underline;}' +
    '#cxc-banner .cxc-actions{display:flex;gap:10px;flex-wrap:wrap;}' +
    '#cxc-banner button{font-family:"DM Sans",sans-serif;font-size:12px;font-weight:500;' +
    'letter-spacing:1px;text-transform:uppercase;padding:10px 18px;border-radius:2px;' +
    'cursor:pointer;border:1px solid #2e2e2e;background:transparent;color:#f5f0eb;' +
    'transition:background .2s,border-color .2s;}' +
    '#cxc-banner button:hover{border-color:#888;}' +
    '#cxc-banner button.cxc-accept{background:#e8521a;border-color:#e8521a;color:#f5f0eb;}' +
    '#cxc-banner button.cxc-accept:hover{background:#c44010;border-color:#c44010;}' +
    '@media (max-width:640px){#cxc-banner{left:12px;right:12px;bottom:12px;padding:16px 18px;}' +
    '#cxc-banner button{flex:1;min-width:0;padding:10px 12px;}}';

  var style = document.createElement('style');
  style.id = 'cxc-style';
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);

  // ---- 3. Banner DOM ----
  function getPrivacyHref() {
    return '/privacy/';
  }
  function getCookiePolicyHref() {
    return '/cookie-policy/';
  }

  function buildBanner() {
    if (document.getElementById('cxc-banner')) return document.getElementById('cxc-banner');
    var banner = document.createElement('div');
    banner.id = 'cxc-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML =
      '<div class="cxc-title">COOKIES.</div>' +
      '<p>We use cookies to operate this site and, only with your consent, Google Analytics to understand how visitors use it. No advertising or tracking. ' +
      'See our <a href="' + getCookiePolicyHref() + '">Cookie Policy</a> and <a href="' + getPrivacyHref() + '">Privacy Policy</a>.</p>' +
      '<div class="cxc-actions">' +
        '<button type="button" class="cxc-accept" data-action="accept">Accept</button>' +
        '<button type="button" data-action="reject">Reject</button>' +
      '</div>';
    document.body.appendChild(banner);

    banner.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.tagName === 'BUTTON' && t.dataset.action) {
        setConsent(t.dataset.action === 'accept');
      }
    });
    return banner;
  }

  function showBanner() {
    var b = buildBanner();
    requestAnimationFrame(function () { b.classList.add('cxc-show'); });
  }

  function hideBanner() {
    var b = document.getElementById('cxc-banner');
    if (!b) return;
    b.classList.remove('cxc-show');
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 350);
  }

  function setConsent(granted) {
    var value = granted ? 'granted' : 'denied';
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) {}
    gtag('consent', 'update', {
      ad_storage: value,
      ad_user_data: value,
      ad_personalization: value,
      analytics_storage: value
    });
    hideBanner();
  }

  // ---- 4. Show banner on first visit ----
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  if (stored !== 'granted' && stored !== 'denied') {
    ready(showBanner);
  }

  // ---- 5. Public API to re-open ----
  window.CanxansaConsent = {
    open: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      ready(showBanner);
    },
    accept: function () { setConsent(true); },
    reject: function () { setConsent(false); },
    status: function () {
      try { return localStorage.getItem(STORAGE_KEY) || 'pending'; } catch (e) { return 'pending'; }
    }
  };
})();
