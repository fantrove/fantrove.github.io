// init.js
// ✅ ปรับปรุง: Deferred initialization, phase-based loading, performance monitoring
// ✅ ปรับปรุงเพิ่มเติม: ตั้งค่าข้อมูล repository base (fantrove-data) และพรีโหลด category lists
import { showInstantLoadingOverlay } from './overlay.js';
import { _headerV2_utils, ErrorManager, showNotification } from './utils.js';
import dataManagerDefault from './dataManager.js';
import { contentLoadingManager } from './contentLoadingManager.js';
import { contentManager } from './contentManager.js';
import { scrollManager, performanceOptimizer, navigationManager, buttonManager, subNavManager } from './managers.js';
import unifiedCopy from './unifiedCopyToClipboard.js';

export async function init() {
 // ✅ Phase 1: Critical path initialization (synchronous binding)
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
 
 // ✅ Ensure DOM elements exist
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
 
 // NEW: Set distributed repository base if not already set
 try {
  // You can change this URL to point to your fantrove-data repo if different
  if (window._headerV2_dataManager && typeof window._headerV2_dataManager.setRepositoryBase === 'function') {
   window._headerV2_dataManager.setRepositoryBase('https://fantrove.github.io/fantrove-data/');
  }
 } catch (e) {
  console.warn('setRepositoryBase failed', e);
 }
 
 // ✅ Show overlay early
 try { showInstantLoadingOverlay(); } catch {}
 
 // ✅ Phase 2: Setup core managers (critical for functionality)
 try {
  window._headerV2_performanceOptimizer.setupErrorBoundary();
  window._headerV2_scrollManager.init();
  window._headerV2_performanceOptimizer.init();
  
  // Attempt to preload category lists (best-effort)
  try {
   if (window._headerV2_dataManager && typeof window._headerV2_dataManager.loadCategoryList === 'function') {
    try {
     const preEmoji = window._headerV2_dataManager.loadCategoryList('emoji');
     const preSymbols = window._headerV2_dataManager.loadCategoryList('symbols');
     const [emojiCategories, symbolCategories] = await Promise.all([preEmoji.catch(() => null), preSymbols.catch(() => null)]);
     window._headerV2_dataManager.categoriesCache = { emoji: emojiCategories, symbols: symbolCategories };
    } catch (e) {
     // silently ignore preload errors
    }
   }
  } catch (e) {}
  
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
  
  // ✅ Load button config
  try {
   await window._headerV2_buttonManager.loadConfig();
  } catch (e) {
   window._headerV2_utils.showNotification('โหลดข้อมูลปุ่มไม่สำเร็จ', 'error');
   console.error('loadConfig error', e);
  }
  
  // ✅ Initial navigation
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
  // ✅ Hide overlay when ready
  try {
   if (typeof window.__removeInstantLoadingOverlay === "function" && window.__instantLoadingOverlayShown) {
    window.__removeInstantLoadingOverlay();
    window.__instantLoadingOverlayShown = false;
   }
  } catch {}
 }
}

export default { init };