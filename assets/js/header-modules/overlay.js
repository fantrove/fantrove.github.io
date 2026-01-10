// overlay.js
// ✅ ปรับปรุง: Overlay controller (token-based), priority, ownership, timeout fallback
const OVERLAY_ID = 'instant-loading-overlay';
const STYLE_ID = 'instant-loading-styles';
const DEFAULT_ZINDEX = 15000;
const FADE_DURATION_MS = 360;

function ensureStyles() {
  let style = document.getElementById(STYLE_ID);
  if (style) return style;
  style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
#${OVERLAY_ID} {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.94);
    transition: opacity ${FADE_DURATION_MS}ms cubic-bezier(.7,0,.7,1);
    opacity: 1;
    z-index: ${DEFAULT_ZINDEX};
    -webkit-font-smoothing:antialiased;
    -moz-osx-font-smoothing:grayscale;
    will-change: opacity;
    contain: strict;
}
#${OVERLAY_ID}.hidden {
    opacity: 0 !important;
    pointer-events: none;
}
#${OVERLAY_ID} .content-loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    animation: content-loading-fade-in 240ms ease-in;
}
#${OVERLAY_ID} .spinner-svg {
    margin-bottom: 12px;
    width: 56px;
    height: 56px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}
#${OVERLAY_ID} .spinner-svg svg { width: 100%; height: 100%; }
#${OVERLAY_ID} .spinner-svg-fg {
    stroke: #4285f4;
    stroke-width: 5;
    stroke-linecap: round;
    stroke-dasharray: 90 125;
    animation: instant-spinner-rotate 1s linear infinite;
    fill: none;
}
#${OVERLAY_ID} .spinner-svg-bg {
    stroke: #eee;
    stroke-width: 5;
    fill: none;
}
#${OVERLAY_ID} .loading-message {
    font-size: 1.06rem;
    color: #2196f3;
    text-align: center;
    margin-top: 6px;
    font-weight: 500;
    letter-spacing: 0.02em;
    opacity: 0.94;
    max-width: 86%;
    word-break: break-word;
}
@keyframes content-loading-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes instant-spinner-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;
  document.head.appendChild(style);
  return style;
}

function buildOverlayElement(message = '', zIndex = DEFAULT_ZINDEX) {
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.style.zIndex = String(zIndex);
  overlay.innerHTML = `
    <div class="content-loading-spinner" aria-hidden="true">
      <div class="spinner-svg" aria-hidden="true">
        <svg viewBox="0 0 48 48" focusable="false" aria-hidden="true" role="img">
          <circle class="spinner-svg-bg" cx="24" cy="24" r="20" />
          <circle class="spinner-svg-fg" cx="24" cy="24" r="20" />
        </svg>
      </div>
      <div class="loading-message">${message}</div>
    </div>
  `.trim();
  return overlay;
}

function defaultMessageForLang(lang) {
  if (lang === 'th') return 'กำลังโหลดเนื้อหา...';
  return 'Loading content...';
}

// ---------- Token-based overlay controller ----------
const overlayController = (function() {
  // tokens: Map<tokenId, { scope, message, priority, createdAt, timeoutId, owner }>
  const tokens = new Map();
  let tokenCounter = 1;
  let overlayEl = null;
  let styleEl = null;
  // choose message from highest priority token; if equal priority prefer latest
  function pickActive() {
    if (tokens.size === 0) return null;
    const arr = Array.from(tokens.entries()).map(([id, v]) => ({ id, ...v }));
    // sort by priority asc (lower -> higher), then createdAt desc (newer first)
    arr.sort((a, b) => {
      if ((a.priority || 5) !== (b.priority || 5)) return (a.priority || 5) - (b.priority || 5);
      return b.createdAt - a.createdAt;
    });
    return arr[0];
  }

  function ensureOverlayNode() {
    if (!overlayEl) {
      styleEl = ensureStyles();
      overlayEl = document.getElementById(OVERLAY_ID) || buildOverlayElement('', DEFAULT_ZINDEX);
      if (!document.getElementById(OVERLAY_ID)) document.body.appendChild(overlayEl);
      // force layout
      overlayEl.offsetHeight;
      overlayEl.classList.remove('hidden');
      // expose compatibility hooks
      window.__removeInstantLoadingOverlay = removeAll;
      window.__instantLoadingOverlayShown = true;
    }
    return overlayEl;
  }

  function updateDomFromActive() {
    const act = pickActive();
    if (!act) {
      // hide overlay
      if (overlayEl) {
        overlayEl.classList.add('hidden');
        setTimeout(() => {
          try {
            const el = document.getElementById(OVERLAY_ID);
            if (el && el.parentNode) el.parentNode.removeChild(el);
          } catch (e) {}
          try {
            const s = document.getElementById(STYLE_ID);
            if (s && s.parentNode) s.parentNode.removeChild(s);
          } catch (e) {}
          overlayEl = null;
          styleEl = null;
          try { window.__instantLoadingOverlayShown = false; } catch {}
          try { delete window.__removeInstantLoadingOverlay; } catch {}
        }, FADE_DURATION_MS + 40);
      } else {
        // ensure style removed
        try {
          const s = document.getElementById(STYLE_ID);
          if (s && s.parentNode) s.parentNode.removeChild(s);
        } catch (e) {}
      }
      return;
    }
    // ensure overlay present
    const el = ensureOverlayNode();
    // update message & z-index
    try {
      const msgEl = el.querySelector('.loading-message');
      if (msgEl) msgEl.textContent = act.message || defaultMessageForLang(localStorage.getItem('selectedLang') || 'en');
      el.style.zIndex = String(act.zIndex ?? DEFAULT_ZINDEX);
      el.classList.remove('hidden');
    } catch (e) {}
  }

  function removeToken(tokenId) {
    const t = tokens.get(tokenId);
    if (!t) return false;
    if (t.timeoutId) clearTimeout(t.timeoutId);
    tokens.delete(tokenId);
    updateDomFromActive();
    return true;
  }

  function removeAll() {
    // remove tokens and DOM
    for (const [id, val] of tokens) {
      if (val.timeoutId) clearTimeout(val.timeoutId);
    }
    tokens.clear();
    updateDomFromActive();
  }

  function showToken(opts = {}) {
    // opts: { scope, message, priority, zIndex, autoHideMs, owner }
    const tokenId = `t_${Date.now()}_${tokenCounter++}`;
    const obj = {
      scope: opts.scope || 'manual',
      message: opts.message || '',
      priority: typeof opts.priority === 'number' ? opts.priority : 5,
      zIndex: opts.zIndex,
      createdAt: Date.now(),
      owner: opts.owner || null,
      timeoutId: null
    };
    // set auto-hide fallback
    if (opts.autoHideMs && Number(opts.autoHideMs) > 0) {
      obj.timeoutId = setTimeout(() => {
        // mark failed if owner provided
        try {
          if (obj.owner && window._headerV2_startupManager && obj.scope === 'startup') {
            window._headerV2_startupManager?.markFailed(obj.owner);
          }
        } catch (e) {}
        removeToken(tokenId);
      }, Number(opts.autoHideMs));
    }
    tokens.set(tokenId, obj);
    updateDomFromActive();
    return tokenId;
  }

  function updateToken(tokenId, patch = {}) {
    const t = tokens.get(tokenId);
    if (!t) return false;
    Object.assign(t, patch);
    t.updatedAt = Date.now();
    // if zIndex changed, update
    updateDomFromActive();
    return true;
  }

  function hasActiveTokens() {
    return tokens.size > 0;
  }

  // expose limited API
  return {
    showToken, // returns tokenId
    updateToken,
    hideToken: removeToken,
    removeAll,
    hasActiveTokens,
    _debug_tokens: tokens
  };
})();

// Exported convenience functions for backward compatibility
export function showInstantLoadingOverlay(options = {}) {
  try {
    const lang = options.lang || localStorage.getItem('selectedLang') || 'en';
    const message = typeof options.message === 'string' && options.message.length > 0 ? options.message : defaultMessageForLang(lang);
    // showToken with default priority 5; options.autoHideAfterMs supported as autoHideMs
    const token = overlayController.showToken({
      scope: options.scope || 'manual',
      message,
      priority: options.priority || 5,
      zIndex: options.zIndex ?? DEFAULT_ZINDEX,
      autoHideMs: options.autoHideAfterMs || options.autoHideMs || 0,
      owner: options.owner || null
    });
    // also return token id for caller if they want to hide specifically
    return { overlayNode: document.getElementById(OVERLAY_ID), tokenId: token };
  } catch (err) {
    console.error('showInstantLoadingOverlay error', err);
    return null;
  }
}

export function removeInstantLoadingOverlay(tokenOrAll) {
  try {
    // If token provided, hide only that token
    if (typeof tokenOrAll === 'string' && tokenOrAll.length > 0) {
      overlayController.hideToken(tokenOrAll);
      return;
    }
    // otherwise remove all
    overlayController.removeAll();
  } catch (err) {
    console.error('removeInstantLoadingOverlay error', err);
  }
}

export function updateInstantLoadingOverlay(tokenId, patch = {}) {
  try {
    if (!tokenId) return false;
    return overlayController.updateToken(tokenId, patch);
  } catch (e) {
    return false;
  }
}

export function isOverlayShown() {
  return overlayController.hasActiveTokens();
}

export default {
  showInstantLoadingOverlay,
  removeInstantLoadingOverlay,
  updateInstantLoadingOverlay,
  isOverlayShown,
  controller: overlayController
};