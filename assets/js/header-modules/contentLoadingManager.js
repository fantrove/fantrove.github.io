// contentLoadingManager.js
// Lightweight spinner manager — minimal DOM ops, idempotent

const LOADING_CONTAINER_ID = 'content-loading';
const SPINNER_ID = 'headerv2-spinner';

export const contentLoadingManager = {
 LOADING_CONTAINER_ID,
 spinnerElement: null,
 
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
  // minimal style (only if not present)
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
 
 show(message = '') {
  const container = document.getElementById(this.LOADING_CONTAINER_ID);
  if (!container) return;
  // ensure only one spinner appended
  const existing = container.querySelector('#' + SPINNER_ID);
  if (existing) {
   this.updateMessage(message);
   return;
  }
  const spinner = this.createSpinner(message);
  container.appendChild(spinner);
 },
 
 hide() {
  try {
   const container = document.getElementById(this.LOADING_CONTAINER_ID);
   if (!container) return;
   const spinner = container.querySelector('#' + SPINNER_ID);
   if (spinner && spinner.parentNode) {
    spinner.parentNode.removeChild(spinner);
   }
   this.spinnerElement = null;
  } catch (e) {
   // swallow
   this.spinnerElement = null;
  }
 },
 
 updateMessage(message = '') {
  if (!this.spinnerElement) return;
  const msg = this.spinnerElement.querySelector('.loading-message');
  if (msg) msg.textContent = message || this.getDefaultMessage();
 },
 
 getDefaultMessage() {
  const lang = localStorage.getItem('selectedLang') || 'en';
  return lang === 'th' ? 'กำลังโหลดเนื้อหา...' : 'Loading content...';
 }
};

export default contentLoadingManager;