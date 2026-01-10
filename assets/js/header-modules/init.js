// init.js
// ✅ ปรับปรุง: Deferred initialization, strict startup readiness, ensure initial overlay token lifecycle managed
import { showInstantLoadingOverlay, removeInstantLoadingOverlay } from './overlay.js';
import { _headerV2_utils, ErrorManager, showNotification } from './utils.js';
import dataManagerDefault from './dataManager.js';
import { contentLoadingManager } from './contentLoadingManager.js';
import { contentManager } from './contentManager.js';
import { scrollManager, performanceOptimizer, navigationManager, buttonManager, subNavManager } from './managers.js';
import unifiedCopy from './unifiedCopyToClipboard.js';

function timeoutPromise(ms, value) {
 return new Promise(resolve => setTimeout(() => resolve(value), ms));
}

async function waitForStylesheets(timeoutMs = 12000) {
 const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
 if (links.length === 0) return true;
 const critical = links.filter(l => l.dataset && l.dataset.critical === "true");
 const toWait = (critical.length > 0) ? critical : links;
 const promises = toWait.map(link => new Promise(resolve => {
  if (link.sheet) return resolve(true);
  const onLoad = () => { cleanup(); resolve(true); };
  const onError = () => { cleanup(); resolve(false); };
  function cleanup() { link.removeEventListener('load', onLoad); link.removeEventListener('error', onError); }
  link.addEventListener('load', onLoad);
  link.addEventListener('error', onError);
  try { if (link.sheet) { cleanup(); resolve(true); } } catch (e) {}
 }));
 const results = await Promise.race([Promise.all(promises), timeoutPromise(timeoutMs, null)]);
 return results !== null;
}

async function waitForFonts(timeoutMs = 6000) {
 try {
  if (document.fonts && document.fonts.ready) {
   const r = await Promise.race([document.fonts.ready, timeoutPromise(timeoutMs, null)]);
   return r !== null;
  }
 } catch (e) {}
 return true;
}

async function waitForContentManagerCompletion(timeoutMs = 20000) {
 try {
  const mgr = window._headerV2_contentManager || contentManager;
  if (mgr && mgr._renderCompletionPromise) {
   const r = await Promise.race([mgr._renderCompletionPromise, timeoutPromise(timeoutMs, null)]);
   return r !== null;
  }
 } catch (e) {}
 return true;
}

async function waitForAppFullyReady(options = {}) {
 const maxWait = typeof window._headerV2_overlayMaxWaitMs === 'number' ? window._headerV2_overlayMaxWaitMs : (options.maxWait || 30000);
 const tasks = [
  waitForFonts(Math.min(8000, maxWait)),
  waitForStylesheets(Math.min(12000, maxWait)),
  waitForContentManagerCompletion(Math.min(20000, maxWait))
 ];
 try {
  const dbPromise = (window._headerV2_dataManager || dataManagerDefault).loadApiDatabase?.();
  if (dbPromise) tasks.push(Promise.race([dbPromise, timeoutPromise(Math.min(10000, maxWait), null)]));
 } catch (e) {}
 const all = Promise.all(tasks);
 const res = await Promise.race([all, timeoutPromise(maxWait, null)]);
 if (res === null) {
  console.warn('waitForAppFullyReady: timed out after', maxWait, 'ms');
  return false;
 }
 return true;
}

export async function init() {
 // Phase 1: Critical path initialization (synchronous binding)
 window._headerV2_utils = _headerV2_utils;
 window._headerV2_errorManager = _headerV2_utils.errorManager;
 window._headerV2_dataManager = dataManagerDefault;
 window._headerV2_contentLoadingManager = contentLoadingManager;
 window._headerV2_contentManager = contentManager;
 window._headerV2_scrollManager = scrollManager;
 window._headerV2_performanceOptimizer = performanceOptimizer;
 window._headerV2_navigationManager = navigationManager;
 window._headerV2_buttonManager = buttonManager;
 window._headerV2_subNavManager = subNavManager;
 window.unifiedCopyToClipboard = unifiedCopy;
 
 // Ensure DOM elements exist
 function ensureElement(selector, tag = 'div', id = '') {
  let el = document.querySelector(selector);
  if (!el) {
   el = document.createElement(tag);
   if (id) el.id = id;
   document.body.appendChild(el);
  }
  return el;
 }
 const header = ensureElement('header', 'header');
 const navList = ensureElement('#nav-list', 'ul', 'nav-list');
 const subButtonsContainer = ensureElement('#sub-buttons-container', 'div', 'sub-buttons-container');
 const contentLoading = ensureElement('#content-loading', 'div', 'content-loading');
 const logo = ensureElement('.logo', 'div', 'logo');
 
 window._headerV2_elements = { header, navList, subButtonsContainer, contentLoading, logo };
 
 // Ensure initial overlay token exists (header.min.js should have injected DOM, but create token-seat for startup)
 try {
  const startup = window._headerV2_startupManager;
  if (startup) {
    // create initial overlay token if not exists
    if (!startup._initialTokenId && typeof showInstantLoadingOverlay === 'function') {
      const res = showInstantLoadingOverlay({ message: 'Preparing interface...', scope: 'startup', priority: 1, autoHideMs: 0, owner: 'startup' });
      if (res && res.tokenId) startup._initialTokenId = res.tokenId;
    }
    // keep blockIndividualLoaders true until we explicitly finish startup
    startup.blockIndividualLoaders = true;
    startup.isInitialOverlayActive = true;
  } else {
    // fallback: call showInstantLoadingOverlay to ensure overlay present
    try { showInstantLoadingOverlay({ message: 'Preparing interface...', scope: 'startup', priority: 1, autoHideMs: 0, owner: 'startup' }); } catch {}
  }
 } catch (e) {}

 // Phase 2: Setup core managers (critical for functionality)
 try {
  window._headerV2_performanceOptimizer.setupErrorBoundary();
  window._headerV2_scrollManager.init();
  window._headerV2_performanceOptimizer.init();
  
  // Network status events
  window.addEventListener('online', () => {
   window._headerV2_utils.showNotification('การเชื่อมต่อกลับมาแล้ว', 'success');
   window._headerV2_buttonManager.loadConfig().catch(() => {});
  }, { passive: true });
  
  window.addEventListener('offline', () => {
   window._headerV2_utils.showNotification('ขาดการเชื่อมต่ออินเทอร์เน็ต', 'warning');
  }, { passive: true });
  
  // History events
  window.addEventListener('popstate', async () => {
   try {
    const url = window.location.search;
    const navMgr = window._headerV2_navigationManager;
    if (!navMgr) throw new Error('navigationManager missing');
    if (!url || url === '?') {
     const defaultRoute = await navMgr.getDefaultRoute();
     await navMgr.navigateTo(defaultRoute, { skipUrlUpdate: true, isPopState: true });
    } else {
     await navMgr.navigateTo(url, { skipUrlUpdate: true, isPopState: true });
    }
   } catch (e) {
    window._headerV2_utils.showNotification('เกิดข้อผิดพลาดในการนำทางย้อนกลับ', 'error');
    console.error('popstate error', e);
   }
  }, { passive: true });
  
  // Language change events
  window.addEventListener('languageChange', (event) => {
   const newLang = event.detail?.language || 'en';
   try {
    if (window._headerV2_buttonManager.updateButtonsLanguage)
     window._headerV2_buttonManager.updateButtonsLanguage(newLang);
    if (window._headerV2_contentManager.updateCardsLanguage)
     window._headerV2_contentManager.updateCardsLanguage(newLang);
   } catch (e) {
    window._headerV2_utils.showNotification('เกิดข้อผิดพลาดการเปลี่ยนภาษา', 'error');
   }
  }, { passive: true });
  
  // Resize events with debouncing
  let resizeTimeout;
  window.addEventListener('resize', () => {
   clearTimeout(resizeTimeout);
   resizeTimeout = setTimeout(() => {
    try {
     if (window._headerV2_navigationManager.scrollActiveButtonsIntoView)
      window._headerV2_navigationManager.scrollActiveButtonsIntoView();
    } catch (e) {
     window._headerV2_utils.showNotification('เกิดข้อผิดพลาด resize', 'error');
    }
   }, 150);
  }, { passive: true });
  
  // Load button config
  try {
   await window._headerV2_buttonManager.loadConfig();
  } catch (e) {
   window._headerV2_utils.showNotification('โหลดข้อมูลปุ่มไม่สำเร็จ', 'error');
   console.error('loadConfig error', e);
  }
  
  // Initial navigation
  try {
   const navMgr = window._headerV2_navigationManager;
   const url = window.location.search;
   if (!url || url === '?') {
    const defaultRoute = await navMgr.getDefaultRoute();
    await navMgr.navigateTo(defaultRoute, { skipUrlUpdate: true });
   } else {
    await navMgr.navigateTo(url, { skipUrlUpdate: true });
   }
  } catch (e) {
   window._headerV2_utils.showNotification('เกิดข้อผิดพลาดในการนำทางเริ่มต้น', 'error');
   console.error('initial navigation error', e);
  }
 } catch (error) {
  console.error('init error', error);
  try {
   window._headerV2_utils.showNotification('เกิดข้อผิดพลาดในการโหลดแอพพลิเคชัน กรุณารีเฟรชหน้า', 'error');
  } catch {}
 } finally {
  // FINAL: Wait for fonts / critical styles / content render / DB warmup before removing overlay.
  try {
   // also start background checks for styles & fonts
   waitForStylesheets().then(ok => {
     if (ok) window._headerV2_startupManager?.markReady('styles');
     else window._headerV2_startupManager?.markFailed('styles');
   }).catch(()=>{});
   waitForFonts().then(ok => {
     if (ok) window._headerV2_startupManager?.markReady('fonts');
     else window._headerV2_startupManager?.markFailed('fonts');
   }).catch(()=>{});
   // also attempt to warm DB (dataManager marks itself ready when done)
   try { window._headerV2_dataManager._warmup?.(); } catch (e) {}
   // Wait for all required marks or timeout
   const MAX_WAIT = typeof window._headerV2_overlayMaxWaitMs === 'number' ? window._headerV2_overlayMaxWaitMs : 30000;
   const status = await window._headerV2_startupManager.waitForAll(MAX_WAIT);
   if (!status || !status.ok) {
    console.warn('startup readiness did not fully satisfy all requirements within timeout', status);
    // fallback behavior: still remove overlay but notify
    window._headerV2_utils.showNotification('บางส่วนของหน้าโหลดช้ากว่าที่คาดไว้ — กำลังแสดงหน้า', 'warning');
   }
   // Remove initial overlay token
   try {
    const startup = window._headerV2_startupManager;
    if (startup && startup._initialTokenId) {
      removeInstantLoadingOverlay(startup._initialTokenId);
      startup._initialTokenId = null;
    } else {
      // fallback: call removeInstantLoadingOverlay() (removes all tokens)
      removeInstantLoadingOverlay();
    }
    // disable blocking so later loaders can show their own overlays
    if (startup) {
      startup.blockIndividualLoaders = false;
      startup.isInitialOverlayActive = false;
    }
   } catch (e) {
    console.error('Error removing initial overlay', e);
   }
  } catch (e) {
   try {
    removeInstantLoadingOverlay();
    if (window._headerV2_startupManager) {
      window._headerV2_startupManager.blockIndividualLoaders = false;
      window._headerV2_startupManager.isInitialOverlayActive = false;
    }
   } catch (e2) {}
  }
 }
}

export default { init };