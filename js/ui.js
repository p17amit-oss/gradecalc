/**
 * ui.js — DOM manipulation, result rendering, theme toggle,
 *          nav scroll behavior, FAQ accordion, reveal animations,
 *          number count-up animation.
 */

'use strict';

/* ============================================================
   THEME MANAGEMENT
   ============================================================ */

const Theme = {
  STORAGE_KEY: 'theme',

  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    }
    this._updateToggleIcon();
    document.addEventListener('DOMContentLoaded', () => this._updateToggleIcon());
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const isDark = current === 'dark' ||
      (!current && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(this.STORAGE_KEY, next);
    this._updateToggleIcon();
    if (window.Analytics) window.Analytics.track('dark_mode_toggled', { to_mode: next });
  },

  _updateToggleIcon() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
      (!document.documentElement.hasAttribute('data-theme') &&
       window.matchMedia('(prefers-color-scheme: dark)').matches);

    document.querySelectorAll('[data-theme-icon]').forEach(el => {
      el.innerHTML = isDark ? UI.icons.sun : UI.icons.moon;
    });
  },
};

Theme.init();

/* ============================================================
   RESULT RENDERING
   ============================================================ */

const ResultRenderer = {
  _lastValue: null,

  /**
   * Render a result into a .result-box element
   * @param {HTMLElement} boxEl
   * @param {object} data — from Calculators.*
   */
  render(boxEl, data) {
    if (!boxEl) return;

    if (data.error) {
      this._renderError(boxEl, data.error);
      return;
    }

    boxEl.classList.remove('result-box--hidden');
    boxEl.classList.remove('result-box--revealed');
    // Force reflow so animation re-triggers
    void boxEl.offsetWidth;
    boxEl.classList.add('result-box--revealed');

    const isFirst = this._lastValue === null;
    const prevValue = this._lastValue || 0;
    this._lastValue = data.result;

    boxEl.innerHTML = this._buildHTML(data, prevValue, isFirst);
    this._bindConfidenceTooltip(boxEl);

    if (window.Analytics) {
      window.Analytics.track('conversion_completed', {
        page: window.location.pathname,
        confidence_tier: data.confidence,
        result_range_label: data.resultRange || this._getResultBand(data.result),
      });
    }
  },

  _buildHTML(data, prevValue, isFirst) {
    const conf = data.confidence || 'estimate';
    const badge = this._buildBadge(conf);
    const color = this._resultColor(data.result, data.state);
    const displayResult = data.resultRange || (data.result !== null ? data.result : '');
    const id = 'result-num-' + Date.now();

    let warningHtml = '';
    if (data.warning) {
      warningHtml = `<div class="result-warning-note">⚠️ ${data.warning}</div>`;
    }

    let noteHtml = '';
    if (data.note && conf !== 'high') {
      const cls = conf === 'moderate' ? 'result-warning-note' : 'result-note';
      noteHtml = `<div class="${cls}">${data.note}</div>`;
    }

    let stateHtml = '';
    if (data.message) {
      const cls = data.state === 'impossible' ? 'result-error-note' :
                  data.state === 'achieved'   ? 'result-note' : 'result-note';
      stateHtml = `<div class="${cls}">${data.message}</div>`;
    }

    // Animate number on first show
    const animAttr = isFirst ? '' : `data-from="${prevValue}" data-to="${data.result}"`;

    return `
      <div class="result-header">
        <span id="${id}" class="result-number ${color}" ${animAttr}>
          ${displayResult}
        </span>
        <div class="confidence-tooltip" data-tier="${conf}">
          ${badge}
          <div class="confidence-explanation">${this._confidenceExplain(conf)}</div>
        </div>
      </div>
      ${data.formula ? `<div class="result-meta">Formula: ${this._escHtml(data.formula)}</div>` : ''}
      ${data.source ? `<div class="result-source">Source: ${data.sourceUrl ? `<a href="${data.sourceUrl}" target="_blank" rel="noopener">${this._escHtml(data.source)}</a>` : this._escHtml(data.source)}</div>` : ''}
      ${warningHtml}
      ${noteHtml}
      ${stateHtml}
    `;
  },

  _buildBadge(conf) {
    const labels = {
      high:     'High Confidence',
      moderate: 'Approximate — see note',
      estimate: 'Estimate',
    };
    return `<span class="badge badge--${conf}"><span class="badge__dot"></span>${labels[conf] || conf}</span>`;
  },

  _confidenceExplain(conf) {
    const text = {
      high:     'An official formula exists, published by the institution. This result is exact.',
      moderate: 'A widely accepted approximation — not officially published. Result shown as a range; actual evaluation by your institution may vary.',
      estimate: 'No official standard exists. This is a reasonable approximation based on common practice. Do not use for official applications without verifying with your institution.',
    };
    return text[conf] || '';
  },

  _resultColor(value, state) {
    if (state === 'impossible') return 'result-number--error';
    if (state === 'achieved')   return '';
    if (value === null || value === undefined) return '';
    const n = parseFloat(value);
    if (isNaN(n)) return '';
    if (n >= 3.7 || n >= 90)  return '';             // success (default green in CSS)
    if (n >= 3.0 || n >= 80)  return 'result-number--warning';
    if (n >= 2.0 || n >= 70)  return 'result-number--orange';
    return 'result-number--error';
  },

  _getResultBand(value) {
    const n = parseFloat(value);
    if (isNaN(n)) return 'unknown';
    if (n >= 3.7) return '3.7–4.0';
    if (n >= 3.0) return '3.0–3.6';
    if (n >= 2.0) return '2.0–2.9';
    return 'below-2.0';
  },

  _renderError(boxEl, msg) {
    boxEl.classList.remove('result-box--hidden');
    boxEl.innerHTML = `<div class="result-error-note" style="width:100%">⚠️ ${this._escHtml(msg)}</div>`;
  },

  _bindConfidenceTooltip(boxEl) {
    boxEl.querySelectorAll('.confidence-tooltip').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasOpen = el.classList.contains('open');
        document.querySelectorAll('.confidence-tooltip.open').forEach(o => o.classList.remove('open'));
        if (!wasOpen) {
          el.classList.add('open');
          const tier = el.dataset.tier;
          if (window.Analytics) window.Analytics.track('confidence_badge_clicked', { page: window.location.pathname, tier });
        }
      });
    });
    document.addEventListener('click', () => {
      document.querySelectorAll('.confidence-tooltip.open').forEach(o => o.classList.remove('open'));
    }, { once: true });
  },

  _escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
};

/* ============================================================
   NUMBER COUNT-UP ANIMATION
   ============================================================ */

function animateNumber(el, from, to, duration = 400) {
  if (!el) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = to;
    return;
  }
  const start = performance.now();
  const isFloat = String(to).includes('.');
  const decimals = isFloat ? String(to).split('.')[1]?.length || 1 : 0;

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * eased;
    el.textContent = decimals > 0 ? current.toFixed(decimals) : Math.round(current);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ============================================================
   NAVBAR SCROLL BEHAVIOR
   ============================================================ */

function initNavbar() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        nav.classList.toggle('scrolled', window.scrollY > 10);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ============================================================
   MOBILE NAV DRAWER
   ============================================================ */

function initMobileNav() {
  const hamburger = document.getElementById('nav-hamburger');
  const drawer    = document.getElementById('nav-drawer');
  const overlay   = document.getElementById('nav-overlay');
  const close     = document.getElementById('nav-close');

  if (!hamburger || !drawer) return;

  function openDrawer() {
    drawer.classList.add('open');
    overlay && overlay.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    overlay && overlay.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', openDrawer);
  close && close.addEventListener('click', closeDrawer);
  overlay && overlay.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDrawer();
  });
}

/* ============================================================
   FAQ ACCORDION
   ============================================================ */

function initFAQ() {
  // Use event delegation on document — works regardless of timing or dynamic content
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.faq-question');
    if (!btn) return;

    const item = btn.closest('.faq-item');
    if (!item) return;

    const wasOpen = item.classList.contains('open');

    // Close all open items and reset aria-expanded
    document.querySelectorAll('.faq-item.open').forEach(function(i) {
      i.classList.remove('open');
      const q = i.querySelector('.faq-question');
      if (q) q.setAttribute('aria-expanded', 'false');
    });

    // Toggle clicked item
    if (!wasOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
}

/* ============================================================
   SCROLL REVEAL
   ============================================================ */

function initReveal() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/* ============================================================
   DEBOUNCE
   ============================================================ */

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/* ============================================================
   MULTI-FORMULA RESULT (generic CGPA page)
   ============================================================ */

function renderFormulaGrid(containerEl, cgpa) {
  if (!containerEl || !window.Calculators) return;

  const results = [
    { label: 'Anna University', ...window.Calculators.cgpaToPercentageAnna(cgpa) },
    { label: 'VTU',             ...window.Calculators.cgpaToPercentageVTU(cgpa) },
    { label: 'Mumbai University',...window.Calculators.cgpaToPercentageMumbai(cgpa) },
    { label: 'Generic (×9.5)',   ...window.Calculators.cgpaToPercentageGeneric(cgpa) },
  ];

  containerEl.innerHTML = results.map((r, i) => {
    if (r.error) {
      return `<div class="formula-card"><div class="formula-card__univ">${r.label}</div><div class="formula-card__result result-number--error">Error</div><div class="formula-card__formula">${r.error}</div></div>`;
    }
    const display = r.warning ? '—' : (r.result !== null ? r.result + '%' : '—');
    return `
      <div class="formula-card${i === 0 ? ' formula-card--active' : ''}">
        <div class="formula-card__univ">${r.label}</div>
        <div class="formula-card__result">${r.warning ? '<span style="font-size:1rem;color:var(--color-warning)">⚠ ' + r.warning + '</span>' : display}</div>
        <div class="formula-card__formula">${r.formula || ''}</div>
      </div>`;
  }).join('');
}

/* ============================================================
   AD SLOT MANAGEMENT
   ============================================================ */

function initAdSlots() {
  document.querySelectorAll('.ad-slot').forEach(el => {
    // If AdSense script fails to populate, collapse after 3s
    setTimeout(() => {
      const hasAd = el.querySelector('ins') || el.innerHTML.trim().length > 0;
      if (!hasAd) {
        el.classList.add('ad-slot--hidden');
        if (window.Analytics) {
          window.Analytics.track('ad_slot_failed', {
            page: window.location.pathname,
            slot_position: el.dataset.position || 'unknown',
          });
        }
      } else {
        if (window.Analytics) {
          window.Analytics.track('ad_slot_loaded', {
            page: window.location.pathname,
            slot_position: el.dataset.position || 'unknown',
          });
        }
      }
    }, 3000);
  });
}

/* ============================================================
   ICONS (inline SVG strings)
   ============================================================ */

const UI = {
  icons: {
    moon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`,
    sun:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`,
    chevron: `<svg class="faq-question__chevron" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`,
    close: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`,
    sparkle: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l1.4 4.3 4.6-.1-3.7 2.7 1.4 4.3-3.7-2.7-3.7 2.7 1.4-4.3L6 6.2l4.6.1z"/><circle cx="18" cy="18" r="2"/><circle cx="6" cy="18" r="1.5"/></svg>`,
    send: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>`,
    plus: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>`,
    trash: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>`,
  },
};

/* ============================================================
   INIT ON DOM READY
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileNav();
  initFAQ();
  initReveal();
  initAdSlots();

  // Theme toggle button
  document.querySelectorAll('[data-action="toggle-theme"]').forEach(btn => {
    btn.addEventListener('click', () => Theme.toggle());
  });

  // Page fade-in
  document.querySelector('.page-fade-in')?.classList.add('visible');
});

window.UI = UI;
window.Theme = Theme;
window.ResultRenderer = ResultRenderer;
window.animateNumber = animateNumber;
window.renderFormulaGrid = renderFormulaGrid;
window.debounce = debounce;
