// contentLoadingManager.js
// ✅ ปรับปรุง: token-based overlay usage, integration with overlayController
import { showInstantLoadingOverlay, removeInstantLoadingOverlay, updateInstantLoadingOverlay } from './overlay.js';

const LOADING_CONTAINER_ID = 'content-loading';
const SPINNER_ID = 'headerv2-spinner';

export const contentLoadingManager = {
 LOADING_CONTAINER_ID,
 spinnerElement: null,
 _messageCache: {},
 _overlayToken: null, // token id returned from overlayController when used
 
 createSpinner(message = '') {
  if (this.spinnerElement && document.body.contains(this.spinnerElement)) {
   this.updateMessage(message);
   return this.spinnerElement;
  }
  const spinner = document.createElement('div');
  spinner.id = SPINNER_ID;
  spinner.className = 'content-loading-spinner';
  spinner.style.pointerEvents = 'none';
  spinner.innerHTML = `
      <div aria-hidden="true" class="spinner-svg" style="width:48px;height:48px;display:inline-block">
        <svg viewBox="0 0 48 48" width="48" height="48" focusable="false">
          <circle cx="24" cy="24" r="20" stroke="#eee" stroke-width="5" fill="none"></circle>
          <circle class="spinner-svg-fg" cx="24" cy="24" r="20" stroke="#4285f4" stroke-width="5" stroke-linecap="round" stroke-dasharray="90 125" style="animation:rotate 1s linear infinite"></circle>
        </svg>
      </div>
      <div class="loading-message" style="margin-top:8px;font-weight:500;color:#2196f3">${message || this.getDefaultMessage()}</div>
    `;
  if (!document.getElementById('headerv2-loading-styles')) {
   const s = document.createElement('style');
   s.id = 'headerv2-loading-styles';
   s.textContent = `
        @keyframes rotate{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        .content-loading-spinner{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px}
      `;
   document.head.appendChild(s);
  }
  this.spinnerElement = spinner;
  return spinner;
 },
 
 show(messageOrOptions = '') {
  try {
   // If startupManager blocks individual loaders, use/update the existing overlay token instead of adding an in-container spinner
   const startup = window._headerV2_startupManager;
   const msg = (typeof messageOrOptions === 'string') ? messageOrOptions : (messageOrOptions && messageOrOptions.message) || '';
   if (startup && startup.blockIndividualLoaders && startup.isInitialOverlayActive) {
    // update initial overlay via overlay API (this will update the singleton overlay message)
    // If there is an initial token id stored globally, try update, else create a dedicated startup-scope token
    try {
     if (startup._initialTokenId) {
      updateInstantLoadingOverlay(startup._initialTokenId, { message: msg });
      return startup._initialTokenId;
     } else {
      const t = showInstantLoadingOverlay({ message: msg, scope: 'startup', priority: 1, owner: 'startup', autoHideMs: 0 });
      // showInstantLoadingOverlay returns { overlayNode, tokenId } or token wrapper
      if (t && t.tokenId) { startup._initialTokenId = t.tokenId; }
      return startup._initialTokenId || null;
     }
    } catch (e) {
     // fallback to in-container spinner (best-effort)
     console.error('contentLoadingManager startup overlay update failed', e);
    }
   }
   
   // Normal path: show a token for this manager, store it locally
   // If already have overlay token, update message
   if (this._overlayToken) {
    updateInstantLoadingOverlay(this._overlayToken, { message: msg });
    return this._overlayToken;
   }
   
   const res = showInstantLoadingOverlay({ message: msg, scope: 'content', priority: 4, autoHideMs: 15000, owner: 'contentLoadingManager' });
   const tokenId = res && res.tokenId ? res.tokenId : (typeof res === 'string' ? res : null);
   this._overlayToken = tokenId;
   return tokenId;
  } catch (err) {
   console.error('contentLoadingManager overlay show error', err);
  }
  
  // Fallback legacy in-container spinner
  try {
   const container = document.getElementById(this.LOADING_CONTAINER_ID);
   if (!container) return;
   const existing = container.querySelector('#' + SPINNER_ID);
   if (existing) {
    this.updateMessage(messageOrOptions && messageOrOptions.message ? messageOrOptions.message : (typeof messageOrOptions === 'string' ? messageOrOptions : ''));
    return null;
   }
   const spinner = this.createSpinner(typeof messageOrOptions === 'string' ? messageOrOptions : (messageOrOptions && messageOrOptions.message ? messageOrOptions.message : ''));
   container.appendChild(spinner);
   return null;
  } catch (e) {
   return null;
  }
 },
 
 hide(tokenOrNothing) {
  try {
   const startup = window._headerV2_startupManager;
   // If startup initial overlay active, do not remove it here; it will be removed by init orchestration
   if (startup && startup.isInitialOverlayActive) {
    // If this manager created its own token (not the startup token), hide it normally
    if (this._overlayToken) {
     removeInstantLoadingOverlay(this._overlayToken);
     this._overlayToken = null;
    }
    return;
   }
   
   // if token passed, hide that token; else hide our local token if exists
   if (typeof tokenOrNothing === 'string') {
    removeInstantLoadingOverlay(tokenOrNothing);
    if (this._overlayToken === tokenOrNothing) this._overlayToken = null;
    return;
   }
   
   if (this._overlayToken) {
    removeInstantLoadingOverlay(this._overlayToken);
    this._overlayToken = null;
    return;
   }
   
   // fallback: legacy removal
   try {
    const container = document.getElementById(this.LOADING_CONTAINER_ID);
    if (!container) return;
    const spinner = container.querySelector('#' + SPINNER_ID);
    if (spinner && spinner.parentNode) spinner.parentNode.removeChild(spinner);
    this.spinnerElement = null;
   } catch (e) {
    this.spinnerElement = null;
   }
  } catch (err) {
   console.error('contentLoadingManager hide error', err);
  }
 },
 
 updateMessage(message = '') {
  try {
   // Update overlay if present
   if (window._headerV2_startupManager && window._headerV2_startupManager._initialTokenId) {
    updateInstantLoadingOverlay(window._headerV2_startupManager._initialTokenId, { message });
    return;
   }
  } catch (e) {}
  try {
   if (this._overlayToken) {
    updateInstantLoadingOverlay(this._overlayToken, { message });
    return;
   }
  } catch (e) {}
  if (!this.spinnerElement) return;
  const msg = this.spinnerElement.querySelector('.loading-message');
  if (msg) msg.textContent = message || this.getDefaultMessage();
 },
 
 getDefaultMessage() {
  const lang = localStorage.getItem('selectedLang') || 'en';
  const cacheKey = `msg-${lang}`;
  if (this._messageCache[cacheKey]) return this._messageCache[cacheKey];
  const msg = lang === 'th' ? 'กำลังโหลดเนื้อหา...' : 'Loading content...';
  this._messageCache[cacheKey] = msg;
  return msg;
 }
};

export default contentLoadingManager;