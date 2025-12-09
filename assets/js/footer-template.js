// Auto Footer Injection Script
// Advanced, optimized & production ready
// Usage: Just include this JS. Footer will inject itself everywhere automatically.

/* --- [BEGIN: Wave Effect Loader] --- */
(function() {
 // ตรวจสอบว่ามี wave-effect.min.js อยู่แล้วหรือยัง ถ้ายังไม่มีให้เพิ่มเข้าไป
 var waveScriptSrc = "https://marcufer.github.io/Marcumat.js/wave-effect.min.ts";
 if (!document.querySelector('script[src="' + waveScriptSrc + '"]')) {
  var script = document.createElement('script');
  script.src = waveScriptSrc;
  script.async = true;
  document.head.appendChild(script);
 }
})();
/* --- [END: Wave Effect Loader] --- */

// --- CONFIGURABLES ---
const FOOTER_CSS_PATH = "/assets/css/general.min.css";
const FOOTER_TEMPLATE_PATH = "/assets/template-html/footer-template.html";

// --- CORE FUNCTION ---
(function injectFooter() {
 // Only inject once
 if (window.__fantroveFooterInjected) return;
 window.__fantroveFooterInjected = true;
 
 // Helper: Load CSS if not present
 function ensureFooterCSS() {
  if (![...document.styleSheets].some(s => s.href && s.href.includes(FOOTER_CSS_PATH))) {
   const link = document.createElement("link");
   link.rel = "stylesheet";
   link.href = FOOTER_CSS_PATH;
   link.type = "text/css";
   document.head.appendChild(link);
  }
 }
 
 // Helper: Insert HTML at end of <body>
 function injectFooterHTML(footerHTML) {
  // Remove existing <footer> if exists (only one allowed)
  const old = document.querySelector("footer");
  if (old) old.remove();
  // Insert
  document.body.insertAdjacentHTML("beforeend", footerHTML);
 }
 
 // Helper: Fetch template (supports caching)
 function fetchFooterTemplate() {
  return fetch(FOOTER_TEMPLATE_PATH, { cache: "force-cache" })
   .then(r => r.ok ? r.text() : Promise.reject("Footer template not found"));
 }
 
 // If DOM already loaded, inject, else wait.
 function ready(fn) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
  else fn();
 }
 
 // Do it
 ready(() => {
  ensureFooterCSS();
  fetchFooterTemplate()
   .then(injectFooterHTML)
   .catch(err => {
    // fallback to minimal footer if fetch fails
    injectFooterHTML(`
          <footer style="text-align:center;padding:1em;color:#8ea1b8;background:#fff;">
            <span>&copy; FANTROVE</span>
          </footer>
        `);
    console.error("[FANTROVE] Footer injection failed:", err);
   });
 });
})();