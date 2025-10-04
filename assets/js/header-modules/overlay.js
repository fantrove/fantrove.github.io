// overlay.js
// ES module for instant loading overlay.
// Exports:
//   showInstantLoadingOverlay(options) - show overlay (idempotent)
//   removeInstantLoadingOverlay() - hide and remove overlay
//   isOverlayShown() - boolean
//
// Options:
//   lang: 'en' | 'th' (default from localStorage 'selectedLang' or 'en')
//   message: custom message (overrides lang default)
//   zIndex: CSS z-index for overlay
//   autoHideAfterMs: if provided and >0, overlay will auto-hide after the milliseconds

const OVERLAY_ID = 'instant-loading-overlay';
const STYLE_ID = 'instant-loading-styles';
const DEFAULT_ZINDEX = 15000;
const FADE_DURATION_MS = 360;

/**
 * Create or reuse the style element for the overlay.
 */
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
}
@keyframes content-loading-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes instant-spinner-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;
 document.head.appendChild(style);
 return style;
}

/**
 * Build overlay element (not appended).
 * @param {string} message
 * @param {number|string} zIndex
 */
function buildOverlayElement(message, zIndex) {
 const overlay = document.createElement('div');
 overlay.id = OVERLAY_ID;
 overlay.setAttribute('role', 'status');
 overlay.setAttribute('aria-live', 'polite');
 overlay.style.zIndex = String(zIndex ?? DEFAULT_ZINDEX);
 
 const spinnerWrap = document.createElement('div');
 spinnerWrap.className = 'content-loading-spinner';
 
 const spinnerSvgWrap = document.createElement('div');
 spinnerSvgWrap.className = 'spinner-svg';
 spinnerSvgWrap.setAttribute('aria-hidden', 'true');
 
 // SVG spinner
 spinnerSvgWrap.innerHTML = `
<svg viewBox="0 0 48 48" focusable="false" aria-hidden="true" role="img">
    <circle class="spinner-svg-bg" cx="24" cy="24" r="20" />
    <circle class="spinner-svg-fg" cx="24" cy="24" r="20" />
</svg>`.trim();
 
 const messageEl = document.createElement('div');
 messageEl.className = 'loading-message';
 messageEl.textContent = message || '';
 
 spinnerWrap.appendChild(spinnerSvgWrap);
 spinnerWrap.appendChild(messageEl);
 overlay.appendChild(spinnerWrap);
 
 return overlay;
}

/**
 * Determine default message based on language code.
 * @param {string} lang
 */
function defaultMessageForLang(lang) {
 if (lang === 'th') return 'กำลังโหลดเนื้อหา...';
 return 'Loading content...';
}

/**
 * Show the instant loading overlay.
 * Idempotent: if overlay already present, updates message/zIndex and returns the element.
 *
 * options:
 *   lang: 'th'|'en'
 *   message: override message string
 *   zIndex: number
 *   autoHideAfterMs: number (optional) - automatically remove after ms
 *
 * @param {Object} options
 * @returns {HTMLElement} overlay element
 */
export function showInstantLoadingOverlay(options = {}) {
 try {
  ensureStyles();
  
  const lang = options.lang || localStorage.getItem('selectedLang') || 'en';
  const message = typeof options.message === 'string' && options.message.length > 0 ?
   options.message :
   defaultMessageForLang(lang);
  const zIndex = options.zIndex ?? DEFAULT_ZINDEX;
  
  let overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
   // Update message / z-index if needed
   const msgEl = overlay.querySelector('.loading-message');
   if (msgEl && msgEl.textContent !== message) msgEl.textContent = message;
   overlay.style.zIndex = String(zIndex);
   overlay.classList.remove('hidden');
  } else {
   overlay = buildOverlayElement(message, zIndex);
   // Append as last child of body to ensure it overlays everything
   document.body.appendChild(overlay);
   // force a reflow to make transitions consistent
   // eslint-disable-next-line no-unused-expressions
   overlay.offsetHeight;
   overlay.classList.remove('hidden');
  }
  
  // Optionally auto-hide
  if (options.autoHideAfterMs && Number(options.autoHideAfterMs) > 0) {
   setTimeout(() => {
    removeInstantLoadingOverlay();
   }, Number(options.autoHideAfterMs));
  }
  
  // expose small helper on window for backward compatibility
  window.__removeInstantLoadingOverlay = removeInstantLoadingOverlay;
  window.__instantLoadingOverlayShown = true;
  
  return overlay;
 } catch (err) {
  // graceful fallback: console but do not throw
  // overlay is non-critical
  // eslint-disable-next-line no-console
  console.error('showInstantLoadingOverlay error', err);
  return null;
 }
}

/**
 * Remove overlay (fade out) and cleanup styles if created by this module.
 */
export function removeInstantLoadingOverlay() {
 try {
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
   // still attempt to remove style
   const style = document.getElementById(STYLE_ID);
   if (style && style.parentNode) style.parentNode.removeChild(style);
   window.__instantLoadingOverlayShown = false;
   return;
  }
  // Fade out
  overlay.classList.add('hidden');
  // After fade duration, remove element and style
  setTimeout(() => {
   try {
    const el = document.getElementById(OVERLAY_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
   } catch {}
   try {
    const style = document.getElementById(STYLE_ID);
    if (style && style.parentNode) style.parentNode.removeChild(style);
   } catch {}
   window.__instantLoadingOverlayShown = false;
   // cleanup window helper
   try { delete window.__removeInstantLoadingOverlay; } catch {}
  }, FADE_DURATION_MS + 40);
 } catch (err) {
  // eslint-disable-next-line no-console
  console.error('removeInstantLoadingOverlay error', err);
 }
}

/**
 * Return whether overlay is currently shown (present in DOM and not hidden).
 */
export function isOverlayShown() {
 const overlay = document.getElementById(OVERLAY_ID);
 return !!overlay && !overlay.classList.contains('hidden');
}

export default {
 showInstantLoadingOverlay,
 removeInstantLoadingOverlay,
 isOverlayShown
};