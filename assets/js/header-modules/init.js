// init.js
// ✅ ปรับปรุง: Deferred initialization, phase-based loading, strict readiness checklist
import { showInstantLoadingOverlay } from './overlay.js';
import { _headerV2_utils, ErrorManager, showNotification } from './utils.js';
import dataManagerDefault from './dataManager.js';
import { contentLoadingManager } from './contentLoadingManager.js';
import { contentManager } from './contentManager.js';
import { scrollManager, performanceOptimizer, navigationManager, buttonManager, subNavManager } from './managers.js';
import unifiedCopy from './unifiedCopyToClipboard.js';

function timeoutPromise(ms, value) {
 return new Promise(resolve => setTimeout(() => resolve(value), ms));
}

async function waitForStylesheetsAndMark(timeoutMs = 12000) {
 const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
 if (links.length === 0) {
  try { window._headerV2_startupManager?.markReady('styles'); } catch {}
  return true;
 }
 // Prefer critical indicator: data-critical="true" or rel=preload as style
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
 const ok = results !== null;
 try {
  if (ok) window._headerV2_startupManager?.markReady('styles');
  else window._headerV2_startupManager?.markFailed('styles');
 } catch {}
 return ok;
}

async function waitForFontsAndMark(timeoutMs = 6000) {
 try {
  if (document.fonts && document.fonts.ready) {
   const r = await Promise.race([document.fonts.ready, timeoutPromise(timeoutMs, null)]);
   if (r !== null) {
    try { window._headerV2_startupManager?.markReady('fonts'); } catch {}
    return true;
   }
  }
 } catch (e) {}
 try { window._headerV2_startupManager?.markFailed('fonts'); } catch {}
 return false;
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
 
 // Show overlay early (header.min.js already injected a minimal overlay, but ensure overlay module can update it)
 try { showInstantLoadingOverlay(); } catch {}
 // ensure startup manager has overlay mark
 try { window._headerV2_startupManager?.markReady('overlayInjected'); } catch {}
 
 // Phase 2: Setup core managers (critical for functionality)
 try {
  window._headerV2_performanceOptimizer.setupErrorBoundary();
  window._headerV2_scrollManager.init();
  window._headerV2_performanceOptimizer.init();
  // Mark managers (single marker for core managers)
  try { window._headerV2_startupManager?.markReady('managers'); } catch {}
  try { window._headerV2_startupManager?.markReady('perf'); } catch {}
  
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
   try { window._headerV2_startupManager?.markReady('buttonManager'); } catch {}
  } catch (e) {
   window._headerV2_utils.showNotification('โหลดข้อมูลปุ่มไม่สำเร็จ', 'error');
   console.error('loadConfig error', e);
   try { window._headerV2_startupManager?.markFailed('buttonManager'); } catch {}
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
   try { window._headerV2_startupManager?.markReady('navigation'); } catch {}
  } catch (e) {
   window._headerV2_utils.showNotification('เกิดข้อผิดพลาดในการนำทางเริ่มต้น', 'error');
   console.error('initial navigation error', e);
   try { window._headerV2_startupManager?.markFailed('navigation'); } catch {}
  }
 } catch (error) {
  console.error('init error', error);
  try {
   window._headerV2_utils.showNotification('เกิดข้อผิดพลาดในการโหลดแอพพลิเคชัน กรุณารีเฟรชหน้า', 'error');
  } catch {}
 } finally {
  // FINAL: Strict readiness wait using startup manager
  try {
   // Also launch parallel background checks for styles & fonts, they'll call markReady internally
   waitForStylesheetsAndMark().catch(()=>{});
   waitForFontsAndMark().catch(()=>{});

   // Wait for all required flags or timeout
   const MAX_WAIT = typeof window._headerV2_overlayMaxWaitMs === 'number' ? window._headerV2_overlayMaxWaitMs : 30000;
   const status = await window._headerV2_startupManager.waitForAll(MAX_WAIT);
   if (!status || !status.ok) {
    console.warn('startup readiness did not fully satisfy all requirements within timeout', status);
   }
   // At this point either all required are ready or timed out. Remove overlay.
   try {
    if (typeof window.__removeInstantLoadingOverlay === "function" && window.__instantLoadingOverlayShown) {
     window.__removeInstantLoadingOverlay();
     window.__instantLoadingOverlayShown = false;
    }
   } catch (e) {}
  } catch (e) {
   try {
    if (typeof window.__removeInstantLoadingOverlay === "function" && window.__instantLoadingOverlayShown) {
     window.__removeInstantLoadingOverlay();
     window.__instantLoadingOverlayShown = false;
    }
   } catch (e2) {}
  }
 }
}

export default { init };