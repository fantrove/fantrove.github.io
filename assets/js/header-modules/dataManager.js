// dataManager.js
// ปรับปรุงเพื่อรองรับโครงสร้างใหม่ของ fantrove-data/
// - รองรับ full domain override (window._headerV2_dataManagerConfig.dataBase)
// - อ่าน categories-list/{type}.json ที่มีโครงสร้าง { id, name, groups: [ {id, file} ] }
// - อ่าน categories/{type}/{group-file}.json ที่มีโครงสร้าง { name: {...}, data: [ ... ] }
// - ประกอบเป็น db แบบเดิม (db.type -> [ { id, name, category: [ {id, name, data} ] } ])
// - สร้าง index (apiMap, idMap, textMap, catToTypeMap) แบบ lazy เพื่อให้โมดูลอื่นใช้งานได้เหมือนเดิม
import { _headerV2_utils } from './utils.js';

const dataManager = {
  constants: {
    FETCH_TIMEOUT: 5000,
    RETRY_DELAY: 300,
    MAX_RETRIES: 1,
    CACHE_DURATION: 2 * 60 * 60 * 1000,
    FANTROVE_DATA_ORIGIN: 'https://fantrove.github.io',
    FANTROVE_DATA_REPO: 'fantrove-data',
    BUTTONS_CONFIG_PATH: '/assets/json/buttons.min.json'
  },

  cache: new Map(),
  apiCache: null,
  apiCacheTimestamp: 0,

  _jsonDbIndex: null,
  _jsonDbIndexReady: false,
  _jsonDbIndexPromise: null,

  _fetchQueue: [],
  _fetchInProgress: new Map(),
  _queueProcessing: false,

  _indexWorker: null,
  _indexWorkerSupported: typeof Worker !== 'undefined' && typeof URL !== 'undefined',

  _initIndexWorker() {
    if (this._indexWorker) return;
    if (!this._indexWorkerSupported) return;
    try {
      this._indexWorker = new Worker('/assets/js/header-index-worker.js');
    } catch (err) {
      this._indexWorker = null;
    }
  },

  // => dataBase resolution
  getDataBase() {
    try {
      const cfg = window._headerV2_dataManagerConfig && window._headerV2_dataManagerConfig.dataBase;
      if (cfg && typeof cfg === 'string' && cfg.length > 0) return cfg.replace(/\/$/, '');
    } catch (e) {}
    try {
      const origin = this.constants.FANTROVE_DATA_ORIGIN || '';
      const repo = this.constants.FANTROVE_DATA_REPO || 'fantrove-data';
      if (origin) return `${origin.replace(/\/$/, '')}/${repo.replace(/^\/|\/$/g, '')}`;
    } catch (e) {}
    return '/fantrove-data';
  },

  resolveDataUrl(pathSegment) {
    if (!pathSegment) return pathSegment;
    if (/^https?:\/\//i.test(pathSegment)) return pathSegment;
    const base = this.getDataBase();
    const trimmed = String(pathSegment).replace(/^\/+/, '');
    return `${base}/${trimmed}`;
  },

  // Priority fetch queue
  async _enqueueFetch(url, options = {}, priority = 5) {
    return new Promise((resolve, reject) => {
      const task = { url, options, priority: priority || 5, resolve, reject, timestamp: Date.now() };
      this._fetchQueue.push(task);
      this._fetchQueue.sort((a, b) => a.priority - b.priority);
      this._processFetchQueue();
    });
  },

  async _processFetchQueue() {
    if (this._queueProcessing || this._fetchQueue.length === 0) return;
    this._queueProcessing = true;
    while (this._fetchQueue.length > 0) {
      if (this._fetchInProgress.size >= 2) {
        await new Promise(r => setTimeout(r, 50));
        continue;
      }
      const task = this._fetchQueue.shift();
      const taskId = `${task.url}-${task.priority}-${task.timestamp}`;
      this._fetchInProgress.set(taskId, true);
      this._performFetch(task.url, task.options)
        .then(result => { task.resolve(result); this._fetchInProgress.delete(taskId); })
        .catch(err => { task.reject(err); this._fetchInProgress.delete(taskId); });
    }
    this._queueProcessing = false;
  },

  getCached(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  },

  setCache(key, data, expiry = this.constants.CACHE_DURATION) {
    this.cache.set(key, { data, expiry: Date.now() + expiry });
  },

  clearCache() {
    this.cache.clear();
    this.apiCache = null;
    this.apiCacheTimestamp = 0;
    this._jsonDbIndex = null;
    this._jsonDbIndexReady = false;
    this._jsonDbIndexPromise = null;
  },

  _warmupPromise: null,
  async _warmup() {
    if (this._warmupPromise) return this._warmupPromise;
    this._warmupPromise = new Promise(resolve => {
      const doWarmup = async () => {
        try {
          if (!window._headerV2_utils.isOnline()) return resolve();
          const base = this.getDataBase();
          await this._enqueueFetch(`${base}/categories-list/symbols.json`, { cache: 'force-cache' }, 9).catch(()=>{});
          await this._enqueueFetch(`${base}/categories-list/emoji.json`, { cache: 'force-cache' }, 9).catch(()=>{});
        } finally { resolve(); }
      };
      if ('requestIdleCallback' in window) requestIdleCallback(doWarmup, { timeout: 2000 });
      else setTimeout(doWarmup, 1200);
    });
    return this._warmupPromise;
  },

  async _performFetch(url, options = {}) {
    const key = `${url}-${JSON.stringify(options)}`;
    const cached = this.getCached(key);
    if (cached) return cached;

    try {
      if (!window._headerV2_utils.isOnline()) throw new Error('Offline');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.constants.FETCH_TIMEOUT);
      const response = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers },
        signal: controller.signal,
        cache: options.cache === 'reload' ? 'reload' : 'no-store'
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Fetch error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      let data = null;
      try { data = JSON.parse(text); } catch (err) { data = null; }
      if (data === null) throw new Error('Invalid JSON response');
      if (options.cache !== false) this.setCache(key, data);
      return data;
    } catch (err) {
      window._headerV2_utils.errorManager.showError(key, err, {
        duration: 1200, type: 'error', dismissible: true, position: 'top-right'
      });
      throw err;
    }
  },

  // Public fetch API (accepts absolute or relative-to-pages path)
  async fetchWithRetry(url, options = {}, priority = 5) {
    // If url is a full URL, let it pass. Else assume pages/...
    let resolved;
    if (/^https?:\/\//i.test(url)) resolved = url;
    else {
      // if caller passed leading "pages/..." or "pages/..." variants, respect; otherwise map plain filenames into pages/
      const cleaned = String(url).replace(/^\/+/, '').replace(/^fantrove-data\/?/, '');
      resolved = this.resolveDataUrl(cleaned.startsWith('pages/') ? cleaned : `pages/${cleaned}`);
    }
    return this._enqueueFetch(resolved, options, priority);
  },

  // Load categories-list/{type}.json
  async loadCategoriesList(type) {
    if (!type) throw new Error('type required for categories list');
    const resolved = this.resolveDataUrl(`categories-list/${type}.json`);
    try {
      const obj = await this._enqueueFetch(resolved, { cache: 'no-store' }, 4);
      // Accept object { id, name, groups } or array fallback
      if (Array.isArray(obj)) return obj;
      if (obj && Array.isArray(obj.groups)) return obj.groups;
      // backwards compatibility: support obj.items
      if (obj && Array.isArray(obj.items)) return obj.items;
      return [];
    } catch (err) {
      return [];
    }
  },

  // Load categories/{type}/{filename}.json
  async _loadCategoryFile(type, filename) {
    if (!type || !filename) return null;
    const clean = filename.endsWith('.json') ? filename : `${filename}.json`;
    // filename may already include "categories/..." path in categories-list
    let path = clean;
    // If filename contains 'categories/' or starts with '/', remove leading slash and use as-is relative to base
    path = String(clean).replace(/^\/+/, '');
    // If filename provided was "categories/emoji/faces.json", just use it
    const resolved = this.resolveDataUrl(path);
    try {
      const data = await this._enqueueFetch(resolved, { cache: 'no-store' }, 3);
      return data;
    } catch (err) {
      return null;
    }
  },

  // Build db.type structure from categories-list + category files
  async _buildDbFromCategories() {
    if (this.apiCache && (Date.now() - this.apiCacheTimestamp < this.constants.CACHE_DURATION)) return this.apiCache;

    const candidateTypes = []; // will be discovered by reading categories-list folder
    // For flexibility, attempt to fetch categories-list root entries by trying a set of known names
    const tryTypes = ['emoji', 'symbols'];
    for (const typeName of tryTypes) {
      candidateTypes.push(typeName);
    }

    const typeArr = [];
    for (const typeName of candidateTypes) {
      try {
        const groups = await this.loadCategoriesList(typeName).catch(()=>[]);
        const categories = [];
        for (const g of groups) {
          try {
            // g could be string filename or object { id, file }
            let fileName = null;
            let entryId = null;
            let entryName = null;
            if (typeof g === 'string') {
              fileName = g;
              entryId = g.replace(/\.json$/, '');
            } else if (typeof g === 'object' && g !== null) {
              fileName = g.file || g.filename || g.path || null;
              entryId = g.id || (fileName ? fileName.replace(/\.json$/, '').split('/').pop() : null);
              entryName = g.name || g.title || null;
            }
            if (!fileName && entryId) fileName = `${entryId}.json`;
            if (!fileName) continue;
            const content = await this._loadCategoryFile(typeName, fileName);
            if (!content) continue;
            // Expect content: { name: {...}, data: [ ... ] } OR array directly
            let dataArray = [];
            if (Array.isArray(content)) dataArray = content;
            else if (content && Array.isArray(content.data)) dataArray = content.data;
            else if (content && Array.isArray(content.items)) dataArray = content.items;
            else dataArray = [];
            const catId = entryId || (content.id ? content.id : fileName.replace(/\.json$/, '').split('/').pop());
            const catName = entryName || content.name || content.title || {};
            categories.push({ id: catId, name: catName, data: dataArray });
          } catch (err) {
            // ignore
          }
        }
        typeArr.push({ id: typeName, name: typeName, category: categories });
      } catch (err) {
        // ignore per-type errors
      }
    }

    const db = { type: typeArr };
    this.apiCache = db;
    this.apiCacheTimestamp = Date.now();
    return db;
  },

  // Build index maps (apiMap, idMap, textMap, catToTypeMap)
  async _buildJsonDbIndex(db, rawText) {
    if (this._jsonDbIndexReady && this._jsonDbIndex) return this._jsonDbIndex;
    if (this._jsonDbIndexPromise) return this._jsonDbIndexPromise;

    this._jsonDbIndexPromise = new Promise((resolve) => {
      const tryWorker = () => {
        try {
          this._initIndexWorker();
          if (this._indexWorker && rawText) {
            const onmsg = (e) => {
              const { type, payload } = e.data || {};
              if (type === 'indexReady') {
                try {
                  const apiMap = new Map(payload.apiEntries || []);
                  const idMap = new Map(payload.idEntries || []);
                  const textMap = new Map(payload.textEntries || []);
                  const catToTypeMap = new Map(payload.catToTypeEntries || []);
                  this._jsonDbIndex = { apiMap, idMap, textMap, catToTypeMap };
                  this._jsonDbIndexReady = true;
                  this._indexWorker.removeEventListener('message', onmsg);
                  resolve(this._jsonDbIndex);
                } catch (err) {
                  this._indexWorker.removeEventListener('message', onmsg);
                  fallbackIndex();
                }
              } else if (type === 'indexError') {
                this._indexWorker.removeEventListener('message', onmsg);
                fallbackIndex();
              }
            };
            this._indexWorker.addEventListener('message', onmsg);
            try {
              this._indexWorker.postMessage({ type: 'parseAndIndex', payload: { text: rawText } });
              setTimeout(() => { if (!this._jsonDbIndexReady) fallbackIndex(); }, 6000);
              return;
            } catch (e) {
              this._indexWorker.removeEventListener('message', onmsg);
            }
          }
        } catch (e) {}
        fallbackIndex();
      };

      const fallbackIndex = () => {
        const apiMap = new Map();
        const idMap = new Map();
        const textMap = new Map();
        const catToTypeMap = new Map();

        function walk(obj, parentType) {
          if (Array.isArray(obj)) {
            obj.forEach(item => walk(item, parentType));
          } else if (typeof obj === 'object' && obj !== null) {
            if (obj.api) apiMap.set(obj.api, obj);
            if (obj.id) idMap.set(obj.id, obj);
            if (obj.text) textMap.set(obj.text, obj);
            // If this is a type object with a category array, map its categories to this type
            if (obj.id && Array.isArray(obj.category)) {
              for (const cat of obj.category) {
                if (cat && cat.id) catToTypeMap.set(cat.id, { id: obj.id, name: obj.name });
              }
            }
            for (const key in obj) {
              if (Object.prototype.hasOwnProperty.call(obj, key)) walk(obj[key], parentType);
            }
          }
        }

        try { walk(db?.type || db); } catch (err) {}
        this._jsonDbIndex = { apiMap, idMap, textMap, catToTypeMap };
        this._jsonDbIndexReady = true;
        resolve(this._jsonDbIndex);
      };

      if (rawText) tryWorker(); else fallbackIndex();
    });

    await this._jsonDbIndexPromise;
    return this._jsonDbIndex;
  },

  async loadApiDatabase() {
    this._warmup();
    if (this.apiCache && (Date.now() - this.apiCacheTimestamp < this.constants.CACHE_DURATION)) {
      if (!this._jsonDbIndexReady) this._buildJsonDbIndex(this.apiCache).catch(()=>{});
      return this.apiCache;
    }
    try {
      const db = await this._buildDbFromCategories();
      try { await this._buildJsonDbIndex(db); } catch {}
      return db;
    } catch (e) {
      if (this.apiCache) return this.apiCache;
      throw e;
    }
  },

  async fetchApiContent(apiCode) {
    if (!apiCode) throw new Error('apiCode required');
    const db = await this.loadApiDatabase();
    const idx = this._jsonDbIndexReady ? this._jsonDbIndex : (await this._buildJsonDbIndex(db));
    if (idx && idx.apiMap.has(apiCode)) {
      const node = idx.apiMap.get(apiCode);
      return node.text || node;
    }
    function findApiValue(obj, targetApi) {
      if (Array.isArray(obj)) {
        for (const item of obj) {
          const found = findApiValue(item, targetApi);
          if (found) return found;
        }
      } else if (typeof obj === 'object' && obj !== null) {
        if (obj.api === targetApi) return obj.text || obj;
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const found = findApiValue(obj[key], targetApi);
            if (found) return found;
          }
        }
      }
      return null;
    }
    const content = findApiValue(db, apiCode);
    if (!content) throw new Error(`API code not found: ${apiCode}`);
    return content;
  },

  async fetchCategoryGroup(categoryId) {
    if (!categoryId) throw new Error('categoryId required');
    const idRaw = categoryId.replace(/_category$/, '');
    const db = await this.loadApiDatabase();
    if (Array.isArray(db?.type)) {
      for (const typeObj of db.type) {
        if (Array.isArray(typeObj.category)) {
          for (const cat of typeObj.category) {
            if (cat.id === idRaw) {
              const currentLang = localStorage.getItem('selectedLang') || 'en';
              const header = {
                title: (cat.name && (typeof cat.name === 'object')) ? (cat.name[currentLang] || cat.name.en || cat.id) : (cat.name || cat.id),
                description: typeObj.name && (typeof typeObj.name === 'object') ? (typeObj.name[currentLang] || typeObj.name.en || '') : (typeObj.name || ''),
                typeId: typeObj.id,
                categoryId: cat.id,
                className: "auto-category-header"
              };
              const data = Array.isArray(cat.data) ? cat.data : (cat.data ? [cat.data] : []);
              return { id: cat.id, name: cat.name, data, header };
            }
          }
        }
      }
    }
    throw new Error(`Category not found: ${categoryId}`);
  }
};

export default dataManager;