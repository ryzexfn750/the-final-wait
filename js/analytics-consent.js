import { SITE_CONFIG } from './config.js?v=45';

const ID = String(SITE_CONFIG.gaMeasurementId || '').trim();
const CONSENT_KEY = 'tfw_analytics';
const DISABLE_KEY = 'ga-disable-' + ID;
let initialized = false;
let tagLoaded = false;

function readConsent() {
  try { return localStorage.getItem(CONSENT_KEY); } catch { return null; }
}
function saveConsent(value) {
  try {
    if (value === null) localStorage.removeItem(CONSENT_KEY);
    else localStorage.setItem(CONSENT_KEY, value);
  } catch {}
}

function blockAnalytics() {
  window[DISABLE_KEY] = true;
  if (tagLoaded && typeof window.gtag === 'function') {
    window.gtag('consent', 'update', { analytics_storage: 'denied' });
  }
}

function enableAnalytics() {
  if (!ID) return;
  window[DISABLE_KEY] = false;
  if (tagLoaded) {
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('event', 'page_view');
    return;
  }
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function() { window.dataLayer.push(arguments); };

  // Basic consent mode: the tag is not fetched until the user opts in.
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });
  window.gtag('consent', 'update', { analytics_storage: 'granted' });
  window.gtag('js', new Date());
  window.gtag('config', ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ID);
  script.dataset.tfwAnalytics = 'true';
  document.head.appendChild(script);
  tagLoaded = true;
}

export function track(name, params = {}) {
  if (readConsent() !== 'yes' || window[DISABLE_KEY] ||
      typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

function getConsentUI() {
  let banner = document.getElementById('analyticsConsent');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'analyticsConsent';
    banner.className = 'analytics-consent glass';
    banner.hidden = true;
    banner.innerHTML = '<div><strong>OPTIONAL GOOGLE ANALYTICS COOKIES</strong><p>May Google Analytics use optional cookies to measure visits? This is independent of your account and newsletter preferences. <a href="community-privacy.html">Privacy Notice</a>.</p></div>' +
      '<div class="consent-actions"><button type="button" id="analyticsDecline">DECLINE</button><button type="button" id="analyticsAccept">ACCEPT</button></div>';
    document.body.appendChild(banner);
  }
  if (banner.dataset.tfwConsentBound !== '1') {
    banner.dataset.tfwConsentBound = '1';
    banner.querySelector('#analyticsAccept')?.addEventListener('click', () => {
      saveConsent('yes'); banner.hidden = true; enableAnalytics();
    });
    banner.querySelector('#analyticsDecline')?.addEventListener('click', () => {
      saveConsent('no'); banner.hidden = true; blockAnalytics();
    });
  }
  return banner;
}

// Reuse the existing analytics ACCEPT/DECLINE buttons inside registration,
// without adding a mandatory checkbox or coupling it to newsletter consent.
window.__tfwAnalyticsConsent = Object.freeze({
  mount(target = null) {
    const banner = getConsentUI();
    if (target?.isConnected) {
      target.appendChild(banner);
      banner.classList.add('tfw-consent-in-gate');
    } else {
      (document.querySelector('footer') || document.body).appendChild(banner);
      banner.classList.remove('tfw-consent-in-gate');
    }
    banner.hidden = ['yes','no'].includes(readConsent());
  },
  open() {
    const banner = getConsentUI();
    banner.hidden = false;
    banner.querySelector('#analyticsDecline')?.focus();
  }
});

export function initAnalytics() {
  if (initialized || !ID) return;
  // Navigation renders the other pages in same-origin iframes. The outer
  // document owns analytics; embedded copies must not fire duplicate tags.
  if (new URLSearchParams(location.search).has('tfw_embed')) return;
  initialized = true;
  const state = readConsent();
  if (state === 'yes') enableAnalytics();
  else blockAnalytics();
  const banner = getConsentUI();
  banner.hidden = state === 'yes' || state === 'no';
  window.dispatchEvent(new Event('tfw:analytics-ready'));
}

// A consent change made in a legal iframe must also update the persistent host.
window.addEventListener('storage', event => {
  if (event.key !== CONSENT_KEY || !initialized) return;
  if (readConsent() === 'yes') enableAnalytics();
  else blockAnalytics();
  getConsentUI().hidden = true;
});
