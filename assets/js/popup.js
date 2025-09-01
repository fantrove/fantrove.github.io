/**
 * PopupUI v3.1 — Template loading fixes + script execution + more robust remote fetch
 * - Fixes issues where templates (both <template> selectors and remote fragments) failed to load or execute scripts.
 * - Improvements:
 *   - TemplateRegistry.resolveTemplateHtml: properly serializes <template> content (not the <template> element).
 *   - _fetchRemoteTemplate: more robust handling of responses and localStorage (fails gracefully).
 *   - PopupInstance.setContent: when given a selector that points to a <template>, use template.content.cloneNode(true).
 *   - PopupInstance._renderTemplateToBody: after inserting fragment, re-insert/execute <script> tags so inline/remote scripts run.
 *   - Better error logging for template resolution failures.
 *
 * Keep the rest of PopupUI functionality (history sync, body-lock, template registry, slots, auto-load CSS).
 */

(function (window, document) {
  'use strict';
  if (!window || !document) return;

  const DEFAULT_CSS_PATH = 'assets/css/popup.css';
  const CSS_LOAD_TIMEOUT = 4000;
  const FOCUSABLE = 'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

  const $ = (s, ctx = document) => (ctx || document).querySelector(s);
  const $$ = (s, ctx = document) => Array.from((ctx || document).querySelectorAll(s));
  const isHTMLElement = (v) => v && v.nodeType === 1;
  const isTemplateSelector = (s) => typeof s === 'string' && s.trim().startsWith('#');

  // ---------------- Template Registry ----------------
  class TemplateRegistry {
    constructor() {
      this.map = new Map();
      this.fetching = new Map();
    }

    register(name, source, opts = {}) {
      // source: { html }, { selector }, { fetch, version, ttl }
      this.map.set(name, { source, opts });
      return true;
    }

    unregister(name) {
      return this.map.delete(name);
    }

    get(name) {
      return this.map.get(name) || null;
    }

    async _fetchRemoteTemplate(name, fetchSpec) {
      const url = fetchSpec.fetch;
      const version = fetchSpec.version || '';
      const cacheKey = `popuptpl::${name}::${version}`;
      // Try read cache safely
      try {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          try {
            const obj = JSON.parse(cachedRaw);
            if (!obj.ttl || (Date.now() < obj.ts + obj.ttl)) {
              return obj.html;
            } else {
              localStorage.removeItem(cacheKey);
            }
          } catch (e) {
            // corrupt cache -> remove
            try { localStorage.removeItem(cacheKey); } catch (_) {}
          }
        }
      } catch (e) {
        // localStorage unavailable -> continue
      }

      if (this.fetching.has(cacheKey)) return this.fetching.get(cacheKey);

      const p = fetch(url, { credentials: 'same-origin' })
        .then(async (r) => {
          // Try to get text even on non-2xx to provide better debug info
          const text = await r.text().catch(() => '');
          if (!r.ok && !text) throw new Error('Failed to fetch template: HTTP ' + r.status);
          return text;
        })
        .then(html => {
          try {
            const ttl = (fetchSpec.ttl || 0) * 1000;
            const obj = { html, ts: Date.now(), ttl };
            try { localStorage.setItem(cacheKey, JSON.stringify(obj)); } catch (e) { /* ignore storage errors */ }
          } catch (e) { /* ignore */ }
          return html;
        })
        .finally(() => { this.fetching.delete(cacheKey); });

      this.fetching.set(cacheKey, p);
      return p;
    }

    // IMPORTANT: Returns the HTML string for a template name.
    async resolveTemplateHtml(name) {
      const entry = this.get(name);
      if (!entry) throw new Error('Template not found: ' + name);
      const { source } = entry;
      if (source.html) return source.html;

      if (source.selector) {
        const el = document.querySelector(source.selector);
        if (!el) throw new Error('Selector not found: ' + source.selector);

        // If it's a <template>, serialize the CONTENT of the template (not the <template> element).
        if (el.tagName && el.tagName.toLowerCase() === 'template') {
          try {
            // Serialize child nodes of template.content to preserve structure (including scripts)
            const children = Array.from(el.content.childNodes);
            const serializer = new XMLSerializer();
            return children.map(n => {
              // Text nodes -> textContent, others serialized
              if (n.nodeType === Node.TEXT_NODE) return n.textContent;
              try { return serializer.serializeToString(n); } catch (e) { return (n.outerHTML || ''); }
            }).join('');
          } catch (e) {
            // fallback to innerHTML (widely supported)
            return el.innerHTML || '';
          }
        } else {
          // Not a template element; return outerHTML
          return el.outerHTML || el.innerHTML || '';
        }
      }

      if (source.fetch) {
        return await this._fetchRemoteTemplate(name, source);
      }

      throw new Error('Unknown template source for ' + name);
    }

    // Render template to a DocumentFragment, perform {{key}} replacement and slots insertion.
    async render(name, data = {}, slots = {}, opts = {}) {
      const entry = this.get(name);
      if (!entry) throw new Error('Template not found: ' + name);
      const registryOpts = entry.opts || {};
      const rawDefault = registryOpts.raw !== undefined ? registryOpts.raw : (opts.raw !== undefined ? opts.raw : true);

      const html = await this.resolveTemplateHtml(name);
      // normalize slot comments to data-popup-slot markers
      const normalizedHtml = html.replace(/<!--\s*slot:([^>\s]+)\s*-->/g, (m, p1) => `<div data-popup-slot="${p1}"></div>`);

      const tpl = document.createElement('template');
      tpl.innerHTML = normalizedHtml;

      // TreeWalk to replace text and attributes with {{key}} interpolation
      const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null, false);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);

      const replaceInTextNode = (node, dataObj, rawFlag) => {
        if (node.nodeType !== Node.TEXT_NODE) return;
        let text = node.nodeValue;
        text = text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (m, key) => {
          const v = lookupPath(dataObj, key.trim());
          if (v === undefined || v === null) return '';
          return rawFlag ? String(v) : escapeHtml(String(v));
        });
        node.nodeValue = text;
      };

      const replaceAttrs = (el, dataObj, rawFlag) => {
        if (!el.attributes) return;
        const attrs = Array.from(el.attributes);
        attrs.forEach(attr => {
          if (!attr || !attr.value) return;
          const newVal = attr.value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (m, key) => {
            const v = lookupPath(dataObj, key.trim());
            if (v === undefined || v === null) return '';
            return rawFlag ? String(v) : escapeHtml(String(v));
          });
          if (newVal !== attr.value) el.setAttribute(attr.name, newVal);
        });
      };

      nodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) replaceInTextNode(node, data, rawDefault);
        else if (node.nodeType === Node.ELEMENT_NODE) replaceAttrs(node, data, rawDefault);
      });

      // slot injection
      const slotEls = tpl.content.querySelectorAll('[data-popup-slot]');
      slotEls.forEach(slotEl => {
        const slotName = slotEl.getAttribute('data-popup-slot');
        const content = (slots && slots[slotName] !== undefined) ? slots[slotName] : null;
        if (content === null || content === undefined) {
          return;
        }
        if (isHTMLElement(content)) {
          slotEl.replaceWith(content);
        } else if (typeof content === 'string') {
          const frag = document.createRange().createContextualFragment(content);
          slotEl.replaceWith(frag);
        } else if (content instanceof DocumentFragment) {
          slotEl.replaceWith(content);
        } else {
          const frag = document.createRange().createContextualFragment(String(content));
          slotEl.replaceWith(frag);
        }
      });

      return tpl.content.cloneNode(true);
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function lookupPath(obj, path) {
    if (!path) return undefined;
    const parts = path.split('.');
    let cur = obj;
    for (let p of parts) {
      if (cur == null) return undefined;
      cur = cur[p];
    }
    return cur;
  }

  // ---------------- Popup Manager ----------------
  const registry = new TemplateRegistry();

  const PopupUI = {
    _instances: new Map(),
    _stack: [],
    _bodyLockCount: 0,
    _cssPath: null,
    _cssLoaded: false,
    _cssPromise: null,
    registry,
    _historyMap: new Map(),
    _historyTokens: [],

    setCssPath(path) { this._cssPath = path; return this; },

    registerTemplate(name, source, opts) { return registry.register(name, source, opts); },
    unregisterTemplate(name) { return registry.unregister(name); },
    getTemplate(name) { return registry.get(name); },

    create(options = {}) {
      const opts = Object.assign({}, PopupInstance.DEFAULTS, options);
      const id = opts.id || `popup-${Math.random().toString(36).slice(2, 9)}`;
      if (this._instances.has(id)) {
        const existing = this._instances.get(id);
        existing.opts = Object.assign({}, existing.opts, opts);
        if (opts.content) existing.setContent(opts.content);
        return existing;
      }
      const inst = new PopupInstance(id, opts);
      this._instances.set(id, inst);
      return inst;
    },

    open(idOrOptions) {
      if (typeof idOrOptions === 'string') {
        const inst = this.get(idOrOptions);
        if (inst) inst.open();
        return inst || null;
      }
      const inst = (idOrOptions && idOrOptions.id && this.get(idOrOptions.id)) ? this.get(idOrOptions.id) : this.create(idOrOptions);
      inst.open();
      return inst;
    },

    get(id) { return this._instances.get(id) || null; },

    close(id, opts = {}) {
      const inst = this.get(id);
      if (inst) inst.close(opts);
      return inst;
    },

    destroy(id) {
      const inst = this.get(id);
      if (inst) { inst.destroy(); this._instances.delete(id); }
    },

    // Body-lock behavior (LanguageManager parity)
    scrollPosition: 0,
    FADE_DURATION: 300,

    _pushOpen(inst) {
      this._stack.push(inst);
      this._lockBodyScroll();
    },

    _popOpen(inst) {
      const idx = this._stack.lastIndexOf(inst);
      if (idx !== -1) this._stack.splice(idx, 1);
      this._unlockBodyScroll();
    },

    _lockBodyScroll() {
      if (this._bodyLockCount === 0) {
        this.scrollPosition = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        document.body.style.position = 'fixed';
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.overflowY = 'scroll';
        document.body.style.top = `-${this.scrollPosition}px`;
        document.body.classList.add('scroll-lock');
      }
      this._bodyLockCount++;
    },

    _unlockBodyScroll() {
      this._bodyLockCount = Math.max(0, this._bodyLockCount - 1);
      if (this._bodyLockCount === 0) {
        document.body.classList.remove('scroll-lock');
        document.body.style.position = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflowY = '';
        document.body.style.top = '';
        window.scrollTo(0, this.scrollPosition);
      }
    },

    _loadCssIfNeeded(cssPath) {
      if (this._cssLoaded) return Promise.resolve();
      if (this._cssPromise) return this._cssPromise;
      const path = cssPath || this._cssPath || PopupUI._detectCssFromScript() || DEFAULT_CSS_PATH;

      const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).find(node => {
        if (node.tagName.toLowerCase() === 'style') return node.hasAttribute('data-popup-ui-inline');
        if (node.hasAttribute('data-popup-ui')) return true;
        const href = node.getAttribute('href') || '';
        if (!href) return false;
        if (href.indexOf('popup.css') !== -1) return true;
        if (path && href.indexOf(path) !== -1) return true;
        return false;
      });

      if (existing) {
        this._cssLoaded = true;
        this._cssPromise = Promise.resolve();
        return this._cssPromise;
      }

      this._cssPromise = new Promise((resolve) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = path;
        link.setAttribute('data-popup-ui', '1');
        link.crossOrigin = 'anonymous';
        let resolved = false;
        const finish = () => {
          if (resolved) return;
          resolved = true;
          this._cssLoaded = true;
          resolve();
        };
        link.onload = finish;
        link.onerror = finish;
        setTimeout(finish, CSS_LOAD_TIMEOUT);
        (document.head || document.documentElement).appendChild(link);
      });

      return this._cssPromise;
    },

    _detectCssFromScript() {
      try {
        const scripts = document.getElementsByTagName('script');
        for (let i = scripts.length - 1; i >= 0; i--) {
          const s = scripts[i];
          const src = s.getAttribute('src') || '';
          if (!src) continue;
          if (src.indexOf('popup.js') !== -1 || src.indexOf('popup.min.js') !== -1) {
            const v = s.getAttribute('data-popup-css') || s.dataset.popupCss || null;
            if (v) return v;
          }
        }
      } catch (e) {}
      return null;
    },

    _initialized: false,
    init() {
      if (this._initialized) return;

      document.addEventListener('click', (ev) => {
        const trigger = ev.target.closest && ev.target.closest('.popup-trigger');
        if (!trigger) return;
        ev.preventDefault();

        const tmplName = trigger.getAttribute('data-popup-template');
        const inline = trigger.getAttribute('data-popup-content');
        const dataRaw = trigger.getAttribute('data-popup-data');
        const optionsJson = trigger.getAttribute('data-popup-options');
        let parsedOpts = null;
        if (optionsJson) {
          try { parsedOpts = JSON.parse(optionsJson); } catch (e) { parsedOpts = null; }
        }
        let data = {};
        if (dataRaw) {
          try { data = JSON.parse(dataRaw); } catch (e) { data = {}; }
        }

        if (!tmplName && inline) {
          const inst = PopupUI.create(Object.assign({}, parsedOpts || {}, { content: inline }));
          inst.open();
          return;
        }
        if (!tmplName) return;

        const opts = Object.assign({}, parsedOpts || {}, { template: tmplName, data });
        const inst = PopupUI.create(opts);
        inst.open();
      });

      // popstate handler for history-synced popups
      window.addEventListener('popstate', (e) => {
        const state = e.state;
        if (state && state.__popupUI) {
          const token = state.popupUID;
          const inst = PopupUI._historyMap.get(token);
          if (inst && !inst.opened) {
            try { inst.open({ suppressHistory: true }); } catch (err) { console.error(err); }
            return;
          }
          return;
        }

        // If state is not our popup state => user navigated back past popup entry
        const top = PopupUI._stack.length ? PopupUI._stack[PopupUI._stack.length - 1] : null;
        if (top && top.opts && top.opts._historyToken) {
          try { top.close({ suppressHistory: true }); } catch (err) { console.error(err); }
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Esc') {
          const top = this._stack.length ? this._stack[this._stack.length - 1] : null;
          if (top && top.opts && top.opts.closeOnEsc) top.close();
        }
      });

      this._initialized = true;
    }
  };

  // ---------------- PopupInstance ----------------
  function PopupInstance(id, opts) {
    this.id = id;
    this.opts = Object.assign({}, PopupInstance.DEFAULTS, opts || {});
    this.opened = false;
    this._els = null;
    this._previousActive = null;
    this._trapHandler = null;
    this._create();
  }

  PopupInstance.DEFAULTS = {
    id: null,
    content: null,
    template: null,
    data: {},
    slots: {},
    classes: '',
    overlayClass: '',
    cssPath: null,
    closeOnOverlay: true,
    closeOnEsc: true,
    focusTrap: true,
    ariaLabel: 'Dialog',
    width: null,
    animation: true,
    persistent: true,
    beforeOpen: null,
    afterOpen: null,
    beforeClose: null,
    afterClose: null,
    raw: true,
    history: true,
    stableId: null
  };

  PopupInstance.prototype._create = function () {
    const overlay = document.createElement('div');
    overlay.className = `popup-overlay ${this.opts.overlayClass || ''}`.trim();
    overlay.setAttribute('data-popup-id', this.id);
    overlay.setAttribute('aria-hidden', 'true');

    const container = document.createElement('div');
    container.className = `popup-container ${this.opts.classes || ''}`.trim();
    container.setAttribute('role', 'presentation');

    const dialog = document.createElement('div');
    dialog.className = 'popup';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', this.opts.ariaLabel || 'Dialog');
    if (this.opts.width) dialog.style.maxWidth = this.opts.width;

    const header = document.createElement('div');
    header.className = 'popup-header';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'popup-close-btn';
    closeBtn.type = 'button';
    closeBtn.innerHTML = '&#10005;';
    closeBtn.setAttribute('aria-label', 'Close dialog');

    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'popup-body';

    const footer = document.createElement('div');
    footer.className = 'popup-footer';

    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    container.appendChild(dialog);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && this.opts.closeOnOverlay) this.close();
    });
    closeBtn.addEventListener('click', () => this.close());

    this._els = { overlay, container, dialog, header, body, footer, closeBtn };
  };

  PopupInstance.prototype.setContent = function (content) {
    const body = this._els.body;
    while (body.firstChild) body.removeChild(body.firstChild);
    if (content === undefined || content === null) return this;

    if (typeof content === 'string') {
      try {
        const sel = document.querySelector(content);
        if (sel) {
          // If selector points to <template>, append its content (not the template element)
          if (sel.tagName && sel.tagName.toLowerCase() === 'template' && sel.content) {
            body.appendChild(sel.content.cloneNode(true));
          } else {
            body.appendChild(sel.cloneNode(true));
          }
          // Execute any scripts inside appended content
          runScripts(body);
          return this;
        }
      } catch (e) {
        // not a selector -> treat as HTML below
      }
      const tpl = document.createElement('template');
      tpl.innerHTML = content;
      body.appendChild(tpl.content.cloneNode(true));
      runScripts(body);
      return this;
    }

    if (isHTMLElement(content)) {
      body.appendChild(content);
      runScripts(body);
      return this;
    }

    if (content instanceof DocumentFragment) {
      body.appendChild(content);
      runScripts(body);
      return this;
    }

    return this;
  };

  PopupInstance.prototype._renderTemplateToBody = async function () {
    if (!this.opts.template) return;
    const name = this.opts.template;
    const data = this.opts.data || {};
    const slots = this.opts.slots || {};
    const rawOpt = (this.opts.raw !== undefined) ? this.opts.raw : undefined;
    const fragment = await registry.render(name, data, slots, { raw: rawOpt });
    const body = this._els.body;
    while (body.firstChild) body.removeChild(body.firstChild);
    body.appendChild(fragment);
    // After appending, execute any script tags inside the fragment so inline scripts run.
    runScripts(body);
  };

  // Execute scripts found inside a container: recreate them to trigger execution.
  function runScripts(container) {
    try {
      const scripts = container.querySelectorAll('script');
      scripts.forEach(oldScript => {
        try {
          const newScript = document.createElement('script');
          // copy attributes
          Array.from(oldScript.attributes || []).forEach(a => newScript.setAttribute(a.name, a.value));
          // inline script: copy text
          if (oldScript.textContent && !oldScript.src) {
            newScript.textContent = oldScript.textContent;
          }
          // replace old script with new (this executes the script)
          oldScript.parentNode && oldScript.parentNode.replaceChild(newScript, oldScript);
        } catch (e) {
          // ignore individual script errors
          console.error('PopupUI: script execution error', e);
        }
      });
    } catch (e) {
      // ignore
    }
  }

  // Clear hover/focus (kept from previous improvement)
  PopupInstance.prototype._clearHoverAndFocus = function () {
    try {
      const active = document.activeElement;
      if (active && typeof active.blur === 'function') {
        try { active.blur(); } catch (e) {}
      }

      let hovered;
      try {
        hovered = document.querySelectorAll(':hover');
      } catch (e) {
        hovered = [];
      }
      if (hovered && hovered.length) {
        const arr = Array.from(hovered);
        for (let i = arr.length - 1; i >= 0; i--) {
          const el = arr[i];
          try {
            const mouseOut = new MouseEvent('mouseout', { bubbles: true, cancelable: true, view: window });
            const mouseLeave = new MouseEvent('mouseleave', { bubbles: false, cancelable: false, view: window });
            el.dispatchEvent(mouseOut);
            el.dispatchEvent(mouseLeave);
          } catch (e) {}
        }
      }

      const hoverClasses = ['is-hover', 'hover', 'hovered', 'isHovered', 'popup-hover'];
      hoverClasses.forEach(cls => {
        try {
          document.querySelectorAll('.' + cls).forEach(n => n.classList.remove(cls));
        } catch (e) {}
      });

      try {
        if (document.body && typeof document.body.focus === 'function') document.body.focus({ preventScroll: true });
      } catch (e) {
        try {
          document.body.setAttribute('tabindex', '-1');
          document.body.focus({ preventScroll: true });
          document.body.removeAttribute('tabindex');
        } catch (e2) {}
      }
    } catch (e) {
      console.error('PopupUI: clearHoverAndFocus error', e);
    }
  };

  // History serialization helpers (unchanged from v3)
  function serializeSnapshot(opts) {
    const snap = {};
    if (opts.template) snap.template = opts.template;
    if (opts.data) {
      try { snap.data = JSON.parse(JSON.stringify(opts.data)); } catch (e) { snap.data = {}; }
    }
    if (opts.slots) {
      snap.slots = {};
      for (const k in opts.slots) {
        const v = opts.slots[k];
        if (typeof v === 'string') snap.slots[k] = v;
        else if (isHTMLElement(v)) snap.slots[k] = v.outerHTML;
        else if (v instanceof DocumentFragment) snap.slots[k] = (new XMLSerializer()).serializeToString(v);
        else {
          try { snap.slots[k] = JSON.stringify(v); } catch (e) {}
        }
      }
    }
    if (opts.content && typeof opts.content === 'string') snap.content = opts.content;
    if (opts.width) snap.width = opts.width;
    if (opts.classes) snap.classes = opts.classes;
    if (opts.overlayClass) snap.overlayClass = opts.overlayClass;
    if (opts.stableId) snap.stableId = opts.stableId;
    return snap;
  }

  function makeToken() {
    return 'pui_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  PopupInstance.prototype.open = function (openOpts = {}) {
    if (this.opened) return this;
    if (typeof this.opts.beforeOpen === 'function') {
      try { this.opts.beforeOpen.call(this); } catch (e) { console.error(e); }
    }

    const cssPath = this.opts.cssPath || PopupUI._cssPath || PopupUI._detectCssFromScript() || DEFAULT_CSS_PATH;
    PopupUI._loadCssIfNeeded(cssPath).then(async () => {
      this._els.overlay.appendChild(this._els.container);
      document.body.appendChild(this._els.overlay);

      if (this.opts.template) {
        try { await this._renderTemplateToBody(); } catch (e) {
          console.error('Template render failed for', this.opts.template, e);
          this.setContent(`<div class="popup-error">Template load failed</div>`);
        }
      } else if (this.opts.content) {
        this.setContent(this.opts.content);
      }

      this._previousActive = document.activeElement;

      requestAnimationFrame(() => {
        this._els.overlay.classList.add('popup-visible');
        this._els.container.classList.add('popup-visible');
        this._els.overlay.setAttribute('aria-hidden', 'false');
        PopupUI._pushOpen(this);

        if (this.opts.focusTrap) {
          const first = this._els.container.querySelector(FOCUSABLE);
          (first || this._els.closeBtn || this._els.container).focus();
        }

        // HISTORY push
        const suppressHistory = !!openOpts.suppressHistory;
        if (this.opts.history !== false && !suppressHistory) {
          try {
            const token = makeToken();
            this.opts._historyToken = token;
            const snapshot = serializeSnapshot(this.opts);
            const state = { __popupUI: true, popupUID: token, snapshot };
            history.pushState(state, document.title);
            PopupUI._historyMap.set(token, this);
            PopupUI._historyTokens.push(token);
          } catch (e) {
            console.error('PopupUI: history push failed', e);
          }
        }

        if (typeof this.opts.afterOpen === 'function') {
          try { this.opts.afterOpen.call(this); } catch (e) { console.error(e); }
        }
      });

      if (this.opts.focusTrap) {
        this._trapHandler = this._onKeyDown.bind(this);
        this._els.overlay.addEventListener('keydown', this._trapHandler);
      }

      this.opened = true;
    }).catch(async () => {
      // fallback open even if CSS fails
      this._els.overlay.appendChild(this._els.container);
      document.body.appendChild(this._els.overlay);
      if (this.opts.template) {
        try { await this._renderTemplateToBody(); } catch (e) { this.setContent(`<div class="popup-error">Template load failed</div>`); }
      } else if (this.opts.content) {
        this.setContent(this.opts.content);
      }
      requestAnimationFrame(() => {
        this._els.overlay.classList.add('popup-visible');
        this._els.container.classList.add('popup-visible');
        this._els.overlay.setAttribute('aria-hidden', 'false');
        PopupUI._pushOpen(this);
      });
      this.opened = true;
    });
    return this;
  };

  PopupInstance.prototype._onKeyDown = function (e) {
    if (e.key === 'Tab') {
      const focusables = Array.from(this._els.container.querySelectorAll(FOCUSABLE)).filter(n => n.offsetParent !== null);
      if (!focusables.length) {
        e.preventDefault();
        return;
      }
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  PopupInstance.prototype.close = function (closeOpts = {}) {
    if (!this.opened) return this;

    if (typeof this.opts.beforeClose === 'function') {
      try { this.opts.beforeClose.call(this); } catch (e) { console.error(e); }
    }

    const suppressHistory = !!closeOpts.suppressHistory;
    const token = this.opts._historyToken;
    const state = history.state;
    const shouldUseHistoryBack = (!suppressHistory && token && state && state.__popupUI && state.popupUID === token);

    if (shouldUseHistoryBack) {
      try {
        history.back();
        return this;
      } catch (e) {
        console.error('PopupUI: history.back failed', e);
      }
    }

    this._els.overlay.classList.remove('popup-visible');
    this._els.container.classList.remove('popup-visible');
    this._els.overlay.setAttribute('aria-hidden', 'true');

    if (this._trapHandler) {
      this._els.overlay.removeEventListener('keydown', this._trapHandler);
      this._trapHandler = null;
    }

    const cleanup = () => {
      try {
        if (this._els.overlay && this._els.overlay.parentElement) this._els.overlay.parentElement.removeChild(this._els.overlay);
      } catch (e) {}
      PopupUI._popOpen(this);

      try { this._clearHoverAndFocus(); } catch (e) {}

      if (this.opts._historyToken) {
        PopupUI._historyMap.delete(this.opts._historyToken);
        const ti = PopupUI._historyTokens.lastIndexOf(this.opts._historyToken);
        if (ti !== -1) PopupUI._historyTokens.splice(ti, 1);
        delete this.opts._historyToken;
      }

      try { if (this._previousActive && typeof this._previousActive.focus === 'function') this._previousActive.focus(); } catch (e) {}

      if (typeof this.opts.afterClose === 'function') {
        try { this.opts.afterClose.call(this); } catch (e) { console.error(e); }
      }
    };

    if (this.opts.animation) setTimeout(cleanup, 260);
    else cleanup();

    this.opened = false;
    return this;
  };

  PopupInstance.prototype.toggle = function () { return this.opened ? this.close() : this.open(); };

  PopupInstance.prototype.destroy = function () {
    try { if (this.opened) this.close({ suppressHistory: true }); } catch (e) {}
    try { this._clearHoverAndFocus(); } catch (e) {}
    this._els = null;
    this.opened = false;
    if (PopupUI._instances.has(this.id)) PopupUI._instances.delete(this.id);
  };

  // Expose
  PopupUI.init();
  window.PopupUI = PopupUI;
  window.PopupTemplateRegistry = registry;
  window.PopupUIInstances = PopupUI._instances;

})(window, document);