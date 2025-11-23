/*
  search-ui-with-keyboard-detection.min.js (v7.0 - KEYBOARD BEHAVIOR DETECTION)
  - ✅ NEW: Keyboard detection to prevent overlay close when keyboard is open
  - ✅ ENHANCED: Smart backdrop detection for search vs close
  - ✅ FIX: Prevent layout shift when opening overlay using placeholder
  - ✅ IMPROVED: Clear distinction between SEARCH STATE vs OVERLAY STATE
  - Detects if mobile/virtual keyboard is open on focus/blur events
  - History only saved on ACTUAL SEARCH, not on overlay open
  - Proper sync between popstate (back button) and overlay close
  - Supports device/browser back button
*/
(function () {
  'use strict';

  const CONFIG = {
    DOM: {
      suggestionContainerId: 'searchSuggestions',
      suggestionBackdropId: 'searchSuggestionBackdrop',
      overlayBackdropId: 'searchOverlayBackdrop',
      overlayContainerId: 'searchOverlayContainer',
      sentinelId: 'search-render-sentinel',
      searchInputId: 'searchInput',
      searchFormId: 'searchForm',
      typeFilterId: 'typeFilter',
      categoryFilterId: 'categoryFilter',
      searchResultsId: 'searchResults',
      copyToastId: 'copyToast',
      searchInputWrapperId: 'search-input-wrapper',
      filterPanelSelector: '.search-filters-panel',
      placeholderId: 'search-wrapper-placeholder'
    },
    RENDER: {
      batchSize: 12,
      sentinelHeight: '36px',
      suggestionMax: 8,
      intersectionThreshold: 0.1,
      intersectionRootMargin: '0px'
    },
    TIMING: {
      debounceMs: 120,
      toastDisplayMs: 1400,
      toastFadeMs: 250,
      focusDelayMs: 20,
      renderDelayMs: 40,
      transitionDelayMs: 350,
      blurDelayMs: 200,
      keyboardDetectionDelayMs: 100
    },
    STORAGE: {
      historyKey: 'searchHistory_v1',
      langKey: 'selectedLang'
    },
    DB: {
      path: '/assets/db/db.min.json'
    },
    LANG: {
      default: 'en',
      autoDetect: true
    },
    TEXTS: {
      th: {
        all_types: 'ทุกประเภท',
        all_categories: 'ทุกหมวดหมู่',
        not_found: 'ไม่พบข้อมูลที่ตรงหรือใกล้เคียง',
        copy: 'คัดลอก',
        copy_failed: 'คัดลอกไม่สำเร็จ',
        suggestion_label: 'คำแนะนำ',
        suggestions_for_you: 'คำแนะนำสำหรับคุณ',
        search_result_here: 'ผลลัพธ์การค้นหาจะปรากฏที่นี่',
        search_placeholder: 'ค้นหาข้อมูล...',
        type: 'ประเภท',
        category: 'หมวดหมู่',
        emoji: 'อีโมจิ'
      },
      en: {
        all_types: 'All Types',
        all_categories: 'All Categories',
        not_found: 'No data found related to your keyword.',
        copy: 'Copy',
        copy_failed: 'Failed to copy',
        suggestion_label: 'Suggestions',
        suggestions_for_you: 'Suggestions for you',
        search_result_here: 'Search results will appear here',
        search_placeholder: 'Search information...',
        type: 'Type',
        category: 'Category',
        emoji: 'Emoji'
      }
    }
  };

  // ========================================
  // STATE WITH CLEAR SEPARATION
  // ========================================
  const State = {
    apiData: null,
    allKeywordsCache: [],

    // ===== SEARCH STATE =====
    currentResults: [],
    currentFilteredResults: [],
    selectedType: 'all',
    selectedCategory: 'all',
    lastCommittedSearchState: null,

    // ===== OVERLAY STATE =====
    overlayOpen: false,
    overlayTransitioning: false,
    preOverlayState: null,
    
    // ===== KEYBOARD STATE (NEW) =====
    // ✅ NEW: Track if virtual keyboard is open on mobile/tablet
    keyboardOpen: false,
    keyboardDetectionTimeout: null,
    lastWindowInnerHeight: 0,
    
    // ===== HISTORY STATE =====
    // KEY: Only push to history on ACTUAL SEARCH, not on overlay open
    searchHistoryPushed: false,
    suppressHistoryPush: false,
    
    // ===== UI STATE =====
    ignoreNextHideSuggestions: false,
    overlayOpenedAt: null,
    originalInputParent: null,
    originalInputNextSibling: null,
    originalPlaceholder: null,

    debounceTimeout: null,
    renderObserver: null,
    currentRenderIndex: 0
  };

  // ========================================
  // SERVICES
  // ========================================
  const LanguageService = {
    getLang: function() {
      return localStorage.getItem(CONFIG.STORAGE.langKey) ||
             (CONFIG.LANG.autoDetect && navigator.language?.startsWith('th') ? 'th' : CONFIG.LANG.default);
    },
    setLang: function(lang) {
      localStorage.setItem(CONFIG.STORAGE.langKey, lang);
    },
    t: function(key) {
      const lang = this.getLang();
      return (CONFIG.TEXTS[lang]?.[key]) || CONFIG.TEXTS[CONFIG.LANG.default][key] || key;
    }
  };

  const DOMService = {
    get: function(id) { return document.getElementById(id); },
    query: function(sel) { return document.querySelector(sel); },
    queryAll: function(sel) { return document.querySelectorAll(sel); },
    create: function(tag, id, className, styles) {
      const el = document.createElement(tag);
      if (id) el.id = id;
      if (className) el.className = className;
      if (styles) Object.assign(el.style, styles);
      return el;
    },
    remove: function(el) { if (el?.parentNode) el.parentNode.removeChild(el); },
    setStyles: function(el, styles) { if (el) Object.assign(el.style, styles); },
    setText: function(el, text) { if (el) el.textContent = text; },
    setHTML: function(el, html) { if (el) el.innerHTML = html; },
    setAttr: function(el, key, value) { if (el) el.setAttribute(key, value); },
    getAttr: function(el, key) { return el?.getAttribute(key); },
    addClass: function(el, cls) { el?.classList?.add(cls); },
    removeClass: function(el, cls) { el?.classList?.remove(cls); },
    hasClass: function(el, cls) { return el?.classList?.contains(cls); },
    on: function(el, ev, handler, opts) { el?.addEventListener(ev, handler, opts); },
    off: function(el, ev, handler) { el?.removeEventListener(ev, handler); }
  };

  const StringService = {
    escapeHtml: function(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },
    encodeUrl: function(s) { return encodeURIComponent(s); },
    decodeUrl: function(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }
  };

  const StorageService = {
    getHistory: function() {
      try { return JSON.parse(sessionStorage.getItem(CONFIG.STORAGE.historyKey) || '[]'); } catch (e) { return []; }
    },
    // ===== ONLY SAVE ON ACTUAL SEARCH =====
    addSearchToHistory: function(state) {
      try {
        const arr = this.getHistory();
        arr.push(Object.assign({}, state, { ts: Date.now() }));
        sessionStorage.setItem(CONFIG.STORAGE.historyKey, JSON.stringify(arr));
      } catch (e) { console.error('Failed to save search history', e); }
    },
    clearHistory: function() { try { sessionStorage.removeItem(CONFIG.STORAGE.historyKey); } catch (e) {} },
    removeLastHistory: function() {
      try {
        const arr = this.getHistory();
        if (arr.length > 0) {
          arr.pop();
          sessionStorage.setItem(CONFIG.STORAGE.historyKey, JSON.stringify(arr));
        }
      } catch (e) { console.error('Failed to remove last history', e); }
    }
  };

  // ✅ NEW SERVICE: Keyboard Detection Service
  const KeyboardService = {
    // ✅ Initialize keyboard detection listeners
    initKeyboardDetection: function() {
      State.lastWindowInnerHeight = window.innerHeight;

      // ✅ Monitor resize events to detect keyboard open/close
      window.addEventListener('resize', () => {
        clearTimeout(State.keyboardDetectionTimeout);
        State.keyboardDetectionTimeout = setTimeout(() => {
          this.updateKeyboardStatus();
        }, CONFIG.TIMING.keyboardDetectionDelayMs);
      }, false);

      // ✅ On input focus, assume keyboard might be opening
      const inputEl = DOMService.get(CONFIG.DOM.searchInputId);
      if (inputEl) {
        DOMService.on(inputEl, 'focus', () => {
          clearTimeout(State.keyboardDetectionTimeout);
          State.keyboardDetectionTimeout = setTimeout(() => {
            this.updateKeyboardStatus();
          }, CONFIG.TIMING.keyboardDetectionDelayMs);
        });

        DOMService.on(inputEl, 'blur', () => {
          // On blur, set keyboard to closed after a delay
          clearTimeout(State.keyboardDetectionTimeout);
          State.keyboardDetectionTimeout = setTimeout(() => {
            State.keyboardOpen = false;
          }, CONFIG.TIMING.keyboardDetectionDelayMs);
        });
      }
    },

    // ✅ Update keyboard status based on viewport height changes
    updateKeyboardStatus: function() {
      const currentHeight = window.innerHeight;
      const heightDiff = State.lastWindowInnerHeight - currentHeight;

      // ✅ If height decreased significantly, keyboard is likely open
      // Typically on mobile, keyboard takes 30-50% of viewport
      if (heightDiff > 100) {
        State.keyboardOpen = true;
      } 
      // ✅ If height increased back, keyboard is likely closed
      else if (heightDiff < -100) {
        State.keyboardOpen = false;
      }

      State.lastWindowInnerHeight = currentHeight;
    },

    // ✅ Check if keyboard is currently open
    isKeyboardOpen: function() {
      return State.keyboardOpen;
    }
  };

  const URLService = {
    parseQueryString: function(qs) {
      const out = {};
      if (!qs) return out;
      qs = qs.replace(/^\?/, '');
      const parts = qs.split('&');
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]; if (!p) continue;
        const idx = p.indexOf('='); if (idx === -1) out[decodeURIComponent(p)] = '';
        else out[decodeURIComponent(p.substring(0, idx))] = decodeURIComponent(p.substring(idx + 1));
      }
      return out;
    },
    buildQueryString: function(obj) {
      const parts = [];
      for (const k in obj) {
        if (obj[k] === undefined || obj[k] === null) continue;
        parts.push(StringService.encodeUrl(k) + '=' + StringService.encodeUrl(obj[k]));
      }
      return parts.length ? ('?' + parts.join('&')) : '';
    },
    readStateFromURL: function() {
      const params = this.parseQueryString(window.location.search || '');
      return { q: params.q || '', type: params.type || 'all', category: params.category || 'all' };
    },
    buildUrlForState: function(state) {
      const params = {};
      if (state.q) params.q = state.q;
      if (state.type && state.type !== 'all') params.type = state.type;
      if (state.category && state.category !== 'all') params.category = state.category;
      return this.buildQueryString(params);
    },
    isStateEqual: function(a, b) {
      if (!a && !b) return true;
      if (!a || !b) return false;
      const aq = (a.q || '').trim();
      const bq = (b.q || '').trim();
      const at = (a.type || 'all'); const bt = (b.type || 'all');
      const ac = (a.category || 'all'); const bc = (b.category || 'all');
      return aq === bq && at === bt && ac === bc;
    },
    // ===== PUSH HISTORY ONLY ON SUCCESSFUL SEARCH =====
    commitSearchState: function(state) {
      if (URLService.isStateEqual(state, State.lastCommittedSearchState)) return;
      
      const url = this.buildUrlForState(state);
      try {
        if (State.searchHistoryPushed) {
          history.replaceState(state, '', url);
          State.searchHistoryPushed = false;
        } else {
          history.pushState(state, '', url);
        }
      } catch (e) {
        try { history.replaceState(state, '', url); } catch (ee) {}
        State.searchHistoryPushed = false;
      }
      
      // ===== SAVE TO SESSION STORAGE ONLY HERE =====
      StorageService.addSearchToHistory(state);
      State.lastCommittedSearchState = { q: state.q || '', type: state.type || 'all', category: state.category || 'all' };
    },
    
    // ===== SYNC OVERLAY CLOSE WITH HISTORY =====
    syncOverlayCloseWithHistory: function() {
      // If overlay was opened but no search done, clean up history
      if (State.searchHistoryPushed) {
        try {
          const stateToRestore = State.lastCommittedSearchState || { q: '', type: 'all', category: 'all' };
          history.replaceState(stateToRestore, '', this.buildUrlForState(stateToRestore));
        } catch (e) {}
        State.searchHistoryPushed = false;
      }
    }
  };

  const NotificationService = {
    showCopyToast: function(msg) {
      const toast = DOMService.create('div', null, 'copy-toast-message');
      DOMService.setText(toast, msg);
      const area = DOMService.get(CONFIG.DOM.copyToastId) || document.body;
      area.appendChild(toast);
      setTimeout(() => {
        DOMService.setStyles(toast, { opacity: '0', transform: 'translateY(-10px)' });
        setTimeout(() => DOMService.remove(toast), CONFIG.TIMING.toastFadeMs);
      }, CONFIG.TIMING.toastDisplayMs);
    },
    async copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
        this.showCopyToast(LanguageService.t('copy') + ' แล้ว');
      } catch {
        this.showCopyToast(LanguageService.t('copy_failed'));
      }
    }
  };

  const RenderingService = {
    renderResultItemHTML: function(res, lang) {
      let itemNames = [];
      if (res.item?.name) itemNames.push(res.item.name[lang] || res.item.name['en'] || '');
      for (const k in (res.item || {})) {
        if (/_name$/.test(k) && res.item[k]) itemNames.push(res.item[k][lang] || res.item[k]['en'] || '');
      }
      itemNames = itemNames.filter(Boolean).join(' / ');
      const typeDisplay = (res.typeObj?.name?.[lang] || res.typeObj?.name?.['en']) || LanguageService.t('emoji');
      const catDisplay = (res.category?.name?.[lang] || res.category?.name?.['en']) || '';
      const text = res.item?.text ? res.item.text : '-';
      const api = res.item?.api ? res.item.api : '';
      const copyTextVal = StringService.encodeUrl(res.item?.text ? res.item.text : (res.itemName || api || ''));

      return `<div class="result-item">
        <div class="result-content-area">
          <div class="result-text-area">
            <span class="result-text">${StringService.escapeHtml(text)}</span>
            ${api ? `<span class="result-api">${StringService.escapeHtml(api)}</span>` : ''}
          </div>
          <div class="result-names">${StringService.escapeHtml(itemNames)}</div>
          <div class="result-meta">
            <span class="result-meta-label">${LanguageService.t('type')}:</span>
            <span class="result-meta-value">${StringService.escapeHtml(typeDisplay)}</span>
            <span class="result-meta-label" style="margin-left:8px">${LanguageService.t('category')}:</span>
            <span class="result-meta-value">${StringService.escapeHtml(catDisplay)}</span>
          </div>
          <button class="result-copy-btn" data-text="${copyTextVal}" aria-label="${LanguageService.t('copy')}">${LanguageService.t('copy')}</button>
        </div>
      </div>`;
    },

    disconnectRenderObserver: function() {
      if (State.renderObserver) {
        try { State.renderObserver.disconnect(); } catch (e) {}
        State.renderObserver = null;
      }
      const old = DOMService.get(CONFIG.DOM.sentinelId);
      DOMService.remove(old);
    },

    renderNextBatch: function() {
      const container = DOMService.get(CONFIG.DOM.searchResultsId);
      if (!container) return;
      const lang = LanguageService.getLang();
      const start = State.currentRenderIndex;
      const end = Math.min(State.currentRenderIndex + CONFIG.RENDER.batchSize, State.currentFilteredResults.length);
      let fragment = '';
      for (let i = start; i < end; i++) {
        fragment += this.renderResultItemHTML(State.currentFilteredResults[i], lang);
      }
      const sentinelEl = DOMService.get(CONFIG.DOM.sentinelId);
      if (sentinelEl) sentinelEl.insertAdjacentHTML('beforebegin', fragment);
      else container.insertAdjacentHTML('beforeend', fragment);
      State.currentRenderIndex = end;
      if (State.currentRenderIndex >= State.currentFilteredResults.length) this.disconnectRenderObserver();
      else {
        if (!DOMService.get(CONFIG.DOM.sentinelId)) {
          const s = DOMService.create('div', CONFIG.DOM.sentinelId, 'search-sentinel', {
            width: '100%', height: CONFIG.RENDER.sentinelHeight, display: 'block'
          });
          container.appendChild(s);
        }
        if (!State.renderObserver) {
          State.renderObserver = new IntersectionObserver((entries) => {
            for (let i = 0; i < entries.length; i++) {
              if (entries[i].isIntersecting) {
                setTimeout(() => {
                  if (State.currentRenderIndex < State.currentFilteredResults.length) this.renderNextBatch();
                }, 50);
              }
            }
          }, {
            root: null,
            rootMargin: CONFIG.RENDER.intersectionRootMargin,
            threshold: CONFIG.RENDER.intersectionThreshold
          });
          const sEl = DOMService.get(CONFIG.DOM.sentinelId);
          if (sEl) State.renderObserver.observe(sEl);
        }
      }
    },

    extractResultCategories: function(results) {
      const lang = LanguageService.getLang();
      let categories = [], seen = Object.create(null);
      for (let i = 0; i < results.length; i++) {
        const cat = results[i].category || { name: '' };
        const key = (cat.name?.[lang] || cat.name?.['en']) || '';
        const displayName = key;
        if (!seen[key]) { seen[key] = 1; categories.push({ key, displayName }); }
      }
      return categories;
    },

    renderResults: function(results, showSuggestionsIfNoResult = false) {
      const container = DOMService.get(CONFIG.DOM.searchResultsId);
      const lang = LanguageService.getLang();
      if (!container) return;

      let filtered = (State.selectedCategory !== 'all')
        ? results.filter(res => ((res.category?.name?.[lang] || res.category?.name?.['en']) || '') === State.selectedCategory)
        : results;

      document.body.style.marginBottom = '60px';

      this.disconnectRenderObserver();
      State.currentFilteredResults = [];
      State.currentRenderIndex = 0;

      if (!filtered.length) {
        let html = `<div class="no-result">${LanguageService.t('not_found')}</div>`;
        if (showSuggestionsIfNoResult) {
          html += `<div class="suggestions-title-main">${LanguageService.t('suggestions_for_you')}</div>`;
          const sample = (State.apiData?.type?.[0]?.category?.[0]?.data) ? State.apiData.type[0].category[0].data.slice(0, 5) : [];
          html += `<div class="suggestions-block-list">${sample.map(it =>
            `<div class="result-item"><div class="result-content-area"><div class="result-text-area"><span class="result-text">${StringService.escapeHtml(it.text || '')}</span></div></div></div>`
          ).join('')}</div>`;
        }
        DOMService.setHTML(container, html);
        const catFilterEl = DOMService.get(CONFIG.DOM.categoryFilterId);
        if (catFilterEl) catFilterEl.style.display = '';
        UIService.updateUILanguage();
        return;
      }

      State.currentFilteredResults = filtered;
      State.currentRenderIndex = 0;
      DOMService.setHTML(container, '');
      this.renderNextBatch();

      if (!window._copyResultTextHandlerSet) {
        DOMService.on(container, 'click', (e) => {
          const btn = e.target.closest('.result-copy-btn');
          if (btn?.hasAttribute('data-text')) {
            e.preventDefault();
            NotificationService.copyText(StringService.decodeUrl(btn.getAttribute('data-text')));
          }
        });
        window._copyResultTextHandlerSet = true;
      }

      UIService.updateUILanguage();
    }
  };

  const FilterService = {
    setupTypeFilter: function(selected = 'all') {
      const typeFilter = DOMService.get(CONFIG.DOM.typeFilterId);
      if (!typeFilter) return;
      let buf = [`<option value="all">${LanguageService.t('all_types')}</option>`];
      if (State.apiData?.type && Array.isArray(State.apiData.type)) {
        const lang = LanguageService.getLang();
        for (let i = 0; i < State.apiData.type.length; i++) {
          const label = State.apiData.type[i].name?.[lang] || State.apiData.type[i].name?.['en'] || '';
          buf.push(`<option value="${StringService.escapeHtml(label)}">${StringService.escapeHtml(label)}</option>`);
        }
      }
      DOMService.setHTML(typeFilter, buf.join(''));
      typeFilter.value = selected;
    },

    setupCategoryFilter: function(categories, selected = 'all') {
      const catFilter = DOMService.get(CONFIG.DOM.categoryFilterId);
      if (!catFilter) return;
      let buf = [`<option value="all">${LanguageService.t('all_categories')}</option>`];
      for (let i = 0; i < categories.length; i++) {
        const { key, displayName } = categories[i];
        buf.push(`<option value="${StringService.escapeHtml(key)}">${StringService.escapeHtml(displayName)}</option>`);
      }
      DOMService.setHTML(catFilter, buf.join(''));
      catFilter.style.display = '';
      catFilter.value = selected;
    }
  };

  const SuggestionService = {
    ensureSuggestionContainer: function() {
      let c = DOMService.get(CONFIG.DOM.suggestionContainerId);
      const overlay = DOMService.get(CONFIG.DOM.overlayContainerId);
      if (!overlay) return null;
      if (!c) {
        c = DOMService.create('div', CONFIG.DOM.suggestionContainerId, 'search-suggestions', {
          position: 'relative', zIndex: '10001', maxHeight: '320px', overflow: 'auto',
          background: '#fff', border: '1px solid #e6e9ee', boxShadow: '0 8px 30px rgba(19,23,40,0.12)', 
          borderRadius: '10px', marginTop: '8px', pointerEvents: 'auto'
        });
        overlay.appendChild(c);
        DOMService.on(c, 'keydown', (ev) => this.handleSuggestionKeydown(ev, c));
        DOMService.on(c, 'click', (ev) => this.handleSuggestionClick(ev), { capture: false });
      }
      return c;
    },

    createSuggestionBackdrop: function() {
      const overlay = DOMService.get(CONFIG.DOM.overlayContainerId);
      if (!overlay) return null;
      let bd = DOMService.get(CONFIG.DOM.suggestionBackdropId);
      if (bd) return bd;

      bd = DOMService.create('div', CONFIG.DOM.suggestionBackdropId, null, {
        position: 'absolute', left: '0', top: '0', right: '0', bottom: '0',
        zIndex: '9999', background: 'transparent', pointerEvents: 'none'
      });

      overlay.insertBefore(bd, overlay.firstChild);
      return bd;
    },

    removeSuggestionBackdrop: function() {
      const bd = DOMService.get(CONFIG.DOM.suggestionBackdropId);
      DOMService.remove(bd);
    },

    hideSuggestions: function() {
      if (State.ignoreNextHideSuggestions) return;
      const c = DOMService.get(CONFIG.DOM.suggestionContainerId);
      if (c) c.style.display = 'none';
      this.removeSuggestionBackdrop();
    },

    handleSuggestionKeydown: function(ev, container) {
      const items = Array.from(container.querySelectorAll('.suggestion-item'));
      if (!items.length) return;
      const active = document.activeElement;
      const idx = items.indexOf(active);
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        const next = (idx === -1) ? items[0] : items[Math.min(items.length - 1, idx + 1)];
        next?.focus?.();
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        const prev = (idx === -1) ? items[items.length - 1] : items[Math.max(0, idx - 1)];
        prev?.focus?.();
      } else if (ev.key === 'Enter') {
        ev.preventDefault();
        if (active?.classList?.contains('suggestion-item')) active?.click?.();
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        this.hideSuggestions();
      }
    },

    handleSuggestionClick: function(ev) {
      const it = ev.target.closest('.suggestion-item');
      if (!it) return;
      ev.stopPropagation?.();
      ev.preventDefault?.();
      let val = it.getAttribute('data-val') || '';
      val = StringService.decodeUrl(val);
      const inputEl = DOMService.get(CONFIG.DOM.searchInputId);
      if (inputEl) inputEl.value = val;
      this.hideSuggestions();
      SearchService.doSearch(null, false);
    },

    renderQuerySuggestions: function(query) {
      if (State.overlayTransitioning) return;
      
      if (!State.overlayOpen) OverlayService.openSearchOverlay();
      const container = this.ensureSuggestionContainer();
      if (!container) return;
      if (!query?.trim()) {
        DOMService.setHTML(container, '');
        container.style.display = 'none';
        this.removeSuggestionBackdrop();
        return;
      }
      const suggestions = window.SearchEngine.querySuggestions(query, CONFIG.RENDER.suggestionMax);
      if (!suggestions?.length) {
        DOMService.setHTML(container, '');
        container.style.display = 'none';
        this.removeSuggestionBackdrop();
        return;
      }
      let html = `<div class="suggestions-head" style="padding:8px 10px;font-weight:600;color:#333;">${LanguageService.t('suggestion_label')}</div>`;
      for (let i = 0; i < suggestions.length; i++) {
        const s = suggestions[i];
        html += `<div class="suggestion-item" role="option" tabindex="0" data-val="${StringService.encodeUrl(s.raw)}" style="padding:8px 10px;border-top:1px solid #f4f6fa;cursor:pointer;display:flex;align-items:center;">
                  <div class="suggestion-body" style="flex:1">${s.highlightedHtml || StringService.escapeHtml(s.raw)}</div>
                  <div class="suggestion-source" style="color:#8b95a6;font-size:12px;margin-left:8px">${StringService.escapeHtml(s.source || '')}</div>
                </div>`;
      }
      DOMService.setHTML(container, html);
      container.style.display = 'block';
      this.createSuggestionBackdrop();
      const inputEl = DOMService.get(CONFIG.DOM.searchInputId);
      if (inputEl) {
        inputEl.onkeydown = (e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const first = container.querySelector('.suggestion-item');
            first?.focus?.();
          } else if (e.key === 'Escape') {
            this.hideSuggestions();
          }
        };
      }
    }
  };

  const OverlayService = {
    // ✅ IMPROVED: Smart backdrop with keyboard detection
    createOverlayBackdrop: function() {
      let backdrop = DOMService.get(CONFIG.DOM.overlayBackdropId);
      if (backdrop) return backdrop;

      backdrop = DOMService.create('div', CONFIG.DOM.overlayBackdropId, 'search-overlay-backdrop', {
        position: 'fixed', left: '0', top: '0', width: '100%', height: '100%',
        background: 'rgba(12,14,18,0.48)', zIndex: '9997', backdropFilter: 'blur(4px)',
        pointerEvents: 'auto', cursor: 'default'
      });

      // ✅ IMPROVED: Enhanced backdrop click handler with keyboard detection
      DOMService.on(backdrop, 'click', (e) => {
        if (e.target === backdrop) {
          e.preventDefault?.();
          e.stopPropagation?.();

          // ✅ NEW: Check if keyboard is open - if so, prevent backdrop close
          if (KeyboardService.isKeyboardOpen()) {
            // Keyboard is open, don't close overlay - just prevent default
            return;
          }

          // Get current input value and compare with state when overlay was opened
          const inputEl = DOMService.get(CONFIG.DOM.searchInputId);
          const currentValue = (inputEl?.value || '').trim();
          const lastQ = (State.preOverlayState?.q || '').trim();

          // ✅ If input changed → perform search, then close overlay
          if (currentValue !== lastQ && currentValue.length > 0) {
            SearchService.doSearch(null, false, { keepOverlay: false });
          } 
          // ✅ Otherwise → just close overlay without searching
          else {
            OverlayService.closeSearchOverlay();
          }
        }
      });

      document.body.appendChild(backdrop);
      return backdrop;
    },

    openSearchOverlay: function() {
      if (State.overlayOpen || State.overlayTransitioning) return;

      const wrapper = DOMService.query('.search-input-wrapper');
      if (!wrapper) return;

      State.overlayTransitioning = true;

      State.originalInputParent = wrapper.parentNode;
      State.originalInputNextSibling = wrapper.nextSibling;
      
      // ✅ CREATE PLACEHOLDER TO PREVENT LAYOUT SHIFT
      const placeholder = DOMService.create('div', CONFIG.DOM.placeholderId, null, {
        width: wrapper.offsetWidth + 'px',
        height: wrapper.offsetHeight + 'px',
        visibility: 'hidden',
        display: 'block'
      });
      State.originalPlaceholder = placeholder;
      State.originalInputParent.insertBefore(placeholder, State.originalInputNextSibling);
      
      const inputEl = DOMService.get(CONFIG.DOM.searchInputId);
      State.preOverlayState = {
        q: inputEl?.value || '',
        type: State.selectedType || 'all',
        category: State.selectedCategory || 'all'
      };

      State.overlayOpenedAt = Date.now();

      this.createOverlayBackdrop();

      let overlay = DOMService.get(CONFIG.DOM.overlayContainerId);
      if (!overlay) {
        overlay = DOMService.create('div', CONFIG.DOM.overlayContainerId, 'search-overlay search-overlay-open', {
          position: 'fixed', left: '0', top: '0', width: '100%', height: '100%',
          zIndex: '9998', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'flex-start', padding: '24px 16px 16px',
          overflow: 'auto', pointerEvents: 'none'
        });
        document.body.appendChild(overlay);
      } else {
        DOMService.setHTML(overlay, '');
      }

      DOMService.addClass(wrapper, 'overlay-elevated');
      DOMService.setStyles(wrapper, {
        width: '100%', maxWidth: '720px', marginTop: '6px',
        pointerEvents: 'auto'
      });
      overlay.appendChild(wrapper);

      SuggestionService.ensureSuggestionContainer();

      if (inputEl) {
        setTimeout(() => {
          try { inputEl.focus(); inputEl.select?.(); } catch (e) {}
        }, CONFIG.TIMING.focusDelayMs);
      }

      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';

      DOMService.on(document, 'keydown', this.overlayEscHandler);
      State.overlayOpen = true;

      const q = inputEl?.value?.trim() || '';
      if (q) {
        setTimeout(() => { 
          SearchService.doSearch(null, true, { keepOverlay: true });
          State.overlayTransitioning = false;
        }, CONFIG.TIMING.renderDelayMs);
      } else {
        State.overlayTransitioning = false;
      }
    },

    overlayEscHandler: function(e) {
      if (e.key === 'Escape') {
        if (State.preOverlayState) {
          const inp = DOMService.get(CONFIG.DOM.searchInputId);
          if (inp) inp.value = State.preOverlayState.q || '';
          State.selectedType = State.preOverlayState.type || 'all';
          State.selectedCategory = State.preOverlayState.category || 'all';
        }

        OverlayService.closeSearchOverlay();
      }
    },

    closeSearchOverlay: function() {
      if (!State.overlayOpen) return;

      State.overlayTransitioning = true;

      // ===== SYNC OVERLAY CLOSE WITH HISTORY =====
      URLService.syncOverlayCloseWithHistory();

      const wrapper = DOMService.query('.search-input-wrapper');
      if (wrapper) {
        DOMService.removeClass(wrapper, 'overlay-elevated');
        DOMService.setStyles(wrapper, { width: '', maxWidth: '', marginTop: '', pointerEvents: '' });
        
        if (State.originalInputParent) {
          if (State.originalInputNextSibling) {
            State.originalInputParent.insertBefore(wrapper, State.originalInputNextSibling);
          } else {
            State.originalInputParent.appendChild(wrapper);
          }
        }
      }

      // ✅ REMOVE PLACEHOLDER
      if (State.originalPlaceholder) {
        DOMService.remove(State.originalPlaceholder);
        State.originalPlaceholder = null;
      }

      const sc = DOMService.get(CONFIG.DOM.suggestionContainerId);
      DOMService.remove(sc);
      SuggestionService.removeSuggestionBackdrop();

      const overlay = DOMService.get(CONFIG.DOM.overlayContainerId);
      DOMService.remove(overlay);

      const backdrop = DOMService.get(CONFIG.DOM.overlayBackdropId);
      DOMService.remove(backdrop);

      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';

      DOMService.off(document, 'keydown', this.overlayEscHandler);

      State.overlayOpen = false;
      State.overlayOpenedAt = null;

      setTimeout(() => {
        State.overlayTransitioning = false;
      }, CONFIG.TIMING.transitionDelayMs);
    }
  };

  const SearchService = {
    doSearch: function(e, preventPush, options) {
      if (e) e.preventDefault?.();
      options = options || {};

      const qEl = DOMService.get(CONFIG.DOM.searchInputId);
      const q = qEl?.value || '';

      const typeFilterEl = DOMService.get(CONFIG.DOM.typeFilterId);
      State.selectedType = typeFilterEl?.value || State.selectedType;
      State.selectedCategory = 'all';

      SuggestionService.hideSuggestions();

      if (!q.trim()) {
        document.body.style.marginBottom = '';
        const placeholderHtml = `<div class="search-result-here" style="text-align:center;color:#969ca8;font-size:1.07em;margin-top:30px;">${LanguageService.t('search_result_here')}</div>`;
        const sr = DOMService.get(CONFIG.DOM.searchResultsId);
        if (sr) DOMService.setHTML(sr, placeholderHtml);
        FilterService.setupCategoryFilter([], 'all');
        UIService.updateUILanguage();
        const stateCleared = { q: '', type: 'all', category: 'all' };
        if (!preventPush && !State.suppressHistoryPush && !URLService.isStateEqual(stateCleared, State.lastCommittedSearchState)) URLService.commitSearchState(stateCleared);
        if (State.overlayOpen && !options.keepOverlay) OverlayService.closeSearchOverlay();
        return;
      }

      const out = window.SearchEngine.search(q, State.selectedType);
      State.currentResults = out.results || [];
      State.allKeywordsCache = out.keywords || [];

      const filterCategories = RenderingService.extractResultCategories(State.currentResults);
      FilterService.setupCategoryFilter(filterCategories, 'all');

      // ===== ONLY COMMIT ACTUAL SEARCH RESULTS =====
      const stateObj = { q: q, type: State.selectedType || 'all', category: 'all' };
      const willCommit = (!preventPush && !State.suppressHistoryPush && !URLService.isStateEqual(stateObj, State.lastCommittedSearchState));
      if (willCommit) {
        URLService.commitSearchState(stateObj);
        State.searchHistoryPushed = true;
      }

      RenderingService.renderResults(State.currentResults, State.currentResults.length === 0);
      if (State.overlayOpen && !options.keepOverlay) OverlayService.closeSearchOverlay();
    }
  };

  const UIService = {
    setupAutoSearchInput: function() {
      const input = DOMService.get(CONFIG.DOM.searchInputId);
      if (!input) return;
      DOMService.setAttr(input, 'enterkeyhint', 'search');
      input.oninput = () => {
        if (State.overlayTransitioning) return;
        
        clearTimeout(State.debounceTimeout);
        State.debounceTimeout = setTimeout(() => { 
          SuggestionService.renderQuerySuggestions(input.value); 
        }, CONFIG.TIMING.debounceMs);
      };
      input.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          SuggestionService.hideSuggestions();
          SearchService.doSearch();
          this.closeMobileKeyboard();
        } else if (e.key === 'ArrowDown') {
          const container = DOMService.get(CONFIG.DOM.suggestionContainerId);
          if (container) {
            const first = container.querySelector('.suggestion-item');
            first?.focus?.();
          }
        }
      };
      DOMService.on(input, 'blur', () => {
        if (State.overlayTransitioning || State.ignoreNextHideSuggestions) return;
        setTimeout(SuggestionService.hideSuggestions.bind(SuggestionService), CONFIG.TIMING.blurDelayMs);
      });
      DOMService.on(input, 'focus', () => {
        if (!State.overlayTransitioning) OverlayService.openSearchOverlay();
      });
      DOMService.on(input, 'click', () => {
        if (!State.overlayTransitioning) OverlayService.openSearchOverlay();
      });
    },

    setupMobileSelectEnter: function() {
      [CONFIG.DOM.typeFilterId, CONFIG.DOM.categoryFilterId].forEach(id => {
        const el = DOMService.get(id);
        if (!el) return;
        el.onchange = () => {
          if (id === CONFIG.DOM.typeFilterId) this.onTypeChange();
          else this.onCategoryChange();
        };
        el.onkeyup = (e) => {
          if (e.key === 'Enter') {
            if (id === CONFIG.DOM.typeFilterId) this.onTypeChange();
            else this.onCategoryChange();
          }
        };
      });
    },

    onTypeChange: function() {
      State.selectedType = DOMService.get(CONFIG.DOM.typeFilterId)?.value;
      SearchService.doSearch();
    },

    onCategoryChange: function() {
      State.selectedCategory = DOMService.get(CONFIG.DOM.categoryFilterId)?.value;
      RenderingService.renderResults(State.currentResults, false);
      this.updateUILanguage();
    },

    closeMobileKeyboard: function() {
      const input = DOMService.get(CONFIG.DOM.searchInputId);
      if (input && document.activeElement === input) input.blur();
    },

    updateUILanguage: function() {
      const input = DOMService.get(CONFIG.DOM.searchInputId);
      const placeholder = LanguageService.t('search_placeholder');
      if (input && input.placeholder !== placeholder) input.placeholder = placeholder;
      const filterGroupLabels = DOMService.queryAll('.search-filters-panel .filter-group-label');
      if (filterGroupLabels.length > 0 && filterGroupLabels[0].textContent !== LanguageService.t('type')) filterGroupLabels[0].textContent = LanguageService.t('type');
      if (filterGroupLabels.length > 1 && filterGroupLabels[1].textContent !== LanguageService.t('category')) filterGroupLabels[1].textContent = LanguageService.t('category');
    }
  };

  function initializeSearchEngine() {
    // ✅ NEW: Initialize keyboard detection
    KeyboardService.initKeyboardDetection();

    fetch(CONFIG.DB.path)
      .then(res => res.json())
      .then(data => {
        State.apiData = data;
        window.SearchEngine.init(State.apiData, {})
          .then(() => {
            State.allKeywordsCache = window.SearchEngine.generateAllKeywords();
            FilterService.setupTypeFilter('all');
            UIService.setupMobileSelectEnter();
            UIService.setupAutoSearchInput();
            FilterService.setupCategoryFilter([], 'all');
            document.body.style.marginBottom = '';
            const placeholderHtml = `<div class="search-result-here" style="text-align:center;color:#969ca8;font-size:1.07em;margin-top:30px;">${LanguageService.t('search_result_here')}</div>`;
            const sr = DOMService.get(CONFIG.DOM.searchResultsId);
            if (sr) DOMService.setHTML(sr, placeholderHtml);
            UIService.updateUILanguage();

            try {
              const hs = window.history?.state;
              if (hs && typeof hs === 'object' && (hs.q !== undefined)) {
                State.lastCommittedSearchState = { q: hs.q || '', type: hs.type || 'all', category: hs.category || 'all' };
              } else {
                const arr = StorageService.getHistory();
                if (arr?.length) {
                  const last = arr[arr.length - 1];
                  State.lastCommittedSearchState = { q: last.q || '', type: last.type || 'all', category: last.category || 'all' };
                } else State.lastCommittedSearchState = null;
              }
            } catch (e) { State.lastCommittedSearchState = null; }

            const initial = URLService.readStateFromURL();
            if (initial?.q) {
              try {
                State.suppressHistoryPush = true;
                const input = DOMService.get(CONFIG.DOM.searchInputId);
                if (input) input.value = initial.q;
                State.selectedType = initial.type || 'all';
                State.selectedCategory = initial.category || 'all';
                FilterService.setupTypeFilter(State.selectedType);
                SearchService.doSearch(null, true);
                try {
                  history.replaceState({ q: initial.q, type: State.selectedType, category: State.selectedCategory }, '', URLService.buildUrlForState(initial));
                } catch (e) {}
                State.lastCommittedSearchState = { q: initial.q || '', type: State.selectedType || 'all', category: State.selectedCategory || 'all' };
              } finally { State.suppressHistoryPush = false; }
            } else {
              try { history.replaceState({ q: '', type: 'all', category: 'all' }, '', window.location.pathname); } catch (e) {}
              State.lastCommittedSearchState = { q: '', type: 'all', category: 'all' };
            }
          });
      })
      .catch(err => console.error('Failed to load api database', err));

    const formEl = DOMService.get(CONFIG.DOM.searchFormId);
    if (formEl) {
      DOMService.on(formEl, 'submit', (e) => { e.preventDefault(); SearchService.doSearch(); UIService.closeMobileKeyboard(); });
    }

    const inputEl = DOMService.get(CONFIG.DOM.searchInputId);
    if (inputEl) {
      DOMService.on(inputEl, 'keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); SearchService.doSearch(); UIService.closeMobileKeyboard(); }
      });
    }
  }

  window.addEventListener('popstate', function(e) {
    const state = e.state || {};
    if (State.overlayOpen && !state.__overlay) {
      if (State.preOverlayState) {
        const inp = DOMService.get(CONFIG.DOM.searchInputId);
        if (inp) inp.value = State.preOverlayState.q || '';
        State.selectedType = State.preOverlayState.type || 'all';
        State.selectedCategory = State.preOverlayState.category || 'all';
      }
      OverlayService.closeSearchOverlay();
      return;
    }
    const st = (e.state && typeof e.state === 'object') ? e.state : URLService.readStateFromURL();
    if (st?.q !== undefined) restoreUIState(st);
  });

  document.addEventListener('click', function(ev) {
    const container = DOMService.get(CONFIG.DOM.suggestionContainerId);
    const input = DOMService.get(CONFIG.DOM.searchInputId);
    if (!container) return;
    if (State.overlayOpen) return;
    if (ev.target === input || container.contains(ev.target)) return;
    SuggestionService.hideSuggestions();
  }, false);

  function restoreUIState(st) {
    try {
      State.suppressHistoryPush = true;
      const input = DOMService.get(CONFIG.DOM.searchInputId);
      if (input) input.value = st.q || '';
      State.selectedType = st.type || 'all';
      State.selectedCategory = st.category || 'all';
      FilterService.setupTypeFilter(State.selectedType);
      SearchService.doSearch(null, true);
    } finally { State.suppressHistoryPush = false; }
  }

  window.__searchUI = {
    init: initializeSearchEngine,
    getConfig: () => CONFIG,
    getState: () => State,
    getServices: () => ({
      Language: LanguageService,
      DOM: DOMService,
      String: StringService,
      Storage: StorageService,
      URL: URLService,
      Notification: NotificationService,
      Rendering: RenderingService,
      Filter: FilterService,
      Suggestion: SuggestionService,
      Overlay: OverlayService,
      Search: SearchService,
      UI: UIService,
      Keyboard: KeyboardService
    }),
    getLastCommittedSearchState: () => State.lastCommittedSearchState,
    getSessionHistory: () => StorageService.getHistory(),
    querySuggestions: (q) => window.SearchEngine.querySuggestions(q, CONFIG.RENDER.suggestionMax),
    isKeyboardOpen: () => KeyboardService.isKeyboardOpen()
  };

  initializeSearchEngine();

})();