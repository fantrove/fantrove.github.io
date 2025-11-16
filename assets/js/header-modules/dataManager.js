// dataManager.js
// ✅ ปรับปรุง: Priority queue, incremental parsing, smart memory management
// ✅ เพิ่มการรองรับ fantrove-data repository (distributed structure)
// Note: This file is an enhanced version of the original with new helpers:
//  - setRepositoryBase(baseUrl)
//  - loadCategoryList(categoryType)
//  - loadCategoryGroup(groupId, categoryType)
//  - loadPageBundle(pageName)
//  - loadApiDatabase() tries old monolithic db first, then falls back to building an aggregated virtual DB
import { _headerV2_utils } from './utils.js';

const dataManager = {
    constants: {
        FETCH_TIMEOUT: 5000,
        RETRY_DELAY: 300,
        MAX_RETRIES: 1,
        CACHE_DURATION: 2 * 60 * 60 * 1000,
        // Backward-compatible monolithic DB path (try first)
        API_DATABASE_PATH: '/assets/db/db.min.json',
        BUTTONS_CONFIG_PATH: '/assets/json/buttons.min.json',
        // New distributed data repository base & paths (can be overridden)
        DATA_REPO_BASE: 'https://fantrove.github.io/fantrove-data/',
        CATEGORIES_LIST_PATH: 'categories-list/',
        CATEGORIES_PATH: 'categories/',
        PAGES_PATH: 'pages/'
    },
    cache: new Map(),
    apiCache: null,
    apiCacheTimestamp: 0,
    _dbPromise: null,
    _jsonDbIndex: null,
    _jsonDbIndexReady: false,
    _jsonDbIndexPromise: null,

    // ✅ NEW: Priority queue system
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

    // ✅ NEW: Priority-based fetch queue
    async _enqueueFetch(url, options = {}, priority = 5) {
        return new Promise((resolve, reject) => {
            const task = {
                url,
                options,
                priority: priority || 5, // 1=highest, 10=lowest
                resolve,
                reject,
                timestamp: Date.now()
            };

            this._fetchQueue.push(task);
            this._fetchQueue.sort((a, b) => a.priority - b.priority);
            this._processFetchQueue();
        });
    },

    async _processFetchQueue() {
        if (this._queueProcessing || this._fetchQueue.length === 0) return;

        this._queueProcessing = true;

        while (this._fetchQueue.length > 0) {
            // Limit concurrent fetches to 2
            if (this._fetchInProgress.size >= 2) {
                await new Promise(r => setTimeout(r, 50));
                continue;
            }

            const task = this._fetchQueue.shift();
            const taskId = `${task.url}-${task.priority}`;

            this._fetchInProgress.set(taskId, true);

            this._performFetch(task.url, task.options)
                .then(result => {
                    task.resolve(result);
                    this._fetchInProgress.delete(taskId);
                })
                .catch(err => {
                    task.reject(err);
                    this._fetchInProgress.delete(taskId);
                });
        }

        this._queueProcessing = false;
    },

    _openIndexedDB() {
        if (this._dbPromise) return this._dbPromise;
        this._dbPromise = new Promise((resolve, reject) => {
            try {
                const req = indexedDB.open('HeaderV2DB', 5);
                req.onupgradeneeded = e => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('json')) db.createObjectStore('json');
                };
                req.onsuccess = e => resolve(e.target.result);
                req.onerror = e => reject(e.target.error);
            } catch (err) {
                reject(err);
            }
        });
        return this._dbPromise;
    },

    async _getFromIndexedDB(key) {
        return null;
    },

    async _setToIndexedDB(key, data) {
        // unused — do nothing
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
                    // Low priority warmup (priority 9)
                    await this._enqueueFetch(
                        this.constants.BUTTONS_CONFIG_PATH,
                        { cache: 'force-cache' },
                        9
                    ).catch(()=>{});
                } finally {
                    resolve();
                }
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

            // For remote db we handle JSON
            const text = await response.text();
            let data;
            try { data = JSON.parse(text); } catch (e) { data = null; }
            if (data && options.cache !== false) this.setCache(key, data);
            if (options.rawText) return { data, rawText: text };
            return data;
        } catch (err) {
            window._headerV2_utils.errorManager.showError(key, err, {
                duration: 1200,
                type: 'error',
                dismissible: true,
                position: 'top-right'
            });
            throw err;
        }
    },

    // ✅ NEW: Priority-aware fetch
    async fetchWithRetry(url, options = {}, priority = 5) {
        return this._enqueueFetch(url, options, priority);
    },

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
                            setTimeout(() => {
                                if (!this._jsonDbIndexReady) fallbackIndex();
                            }, 6000);
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
                function walk(obj) {
                    if (Array.isArray(obj)) {
                        obj.forEach(item => walk(item));
                    } else if (typeof obj === 'object' && obj !== null) {
                        if (obj.api) apiMap.set(obj.api, obj);
                        if (obj.id) idMap.set(obj.id, obj);
                        if (obj.text) textMap.set(obj.text, obj);
                        if (obj.category && Array.isArray(obj.category) && obj.id) {
                            for (const cat of obj.category) {
                                catToTypeMap.set(cat.id, obj);
                            }
                        }
                        for (const key in obj) {
                            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                                walk(obj[key]);
                            }
                        }
                    }
                }
                try {
                    walk(db?.type || db);
                } catch (err) {}
                this._jsonDbIndex = { apiMap, idMap, textMap, catToTypeMap };
                this._jsonDbIndexReady = true;
                resolve(this._jsonDbIndex);
            };

            if (rawText) {
                tryWorker();
            } else {
                fallbackIndex();
            }
        });

        await this._jsonDbIndexPromise;
        return this._jsonDbIndex;
    },

    // Set alternate repository base for distributed data
    setRepositoryBase(baseUrl) {
        try {
            if (typeof baseUrl === 'string' && baseUrl.length > 0) {
                if (!baseUrl.endsWith('/')) baseUrl += '/';
                this.constants.DATA_REPO_BASE = baseUrl;
            }
        } catch {}
    },

    // Load a categories-list file (e.g., emoji.json or symbols.json)
    async loadCategoryList(categoryType = 'emoji') {
        const url = `${this.constants.DATA_REPO_BASE}${this.constants.CATEGORIES_LIST_PATH}${categoryType}.json`;
        try {
            const data = await this.fetchWithRetry(url, {}, 4);
            return data;
        } catch (e) {
            // fallback: try to find category in monolithic db
            try {
                const db = await this.loadApiDatabase();
                // attempt to locate by id
                const idRaw = categoryType.replace(/_category$/, '');
                if (Array.isArray(db?.type)) {
                    for (const t of db.type) {
                        if (t.id === categoryType || t.id === idRaw) {
                            // Build a categories-list object from monolithic structure
                            const groups = (t.category || []).map(g => ({ id: g.id, file: null, name: g.name }));
                            return { id: t.id, name: t.name, groups };
                        }
                    }
                }
            } catch {}
            throw new Error(`Cannot load category list: ${categoryType}`);
        }
    },

    // Load a single category group file from distributed repo (e.g., categories/emoji/faces.json)
    async loadCategoryGroup(groupId, categoryType = 'emoji') {
        if (!groupId) throw new Error('groupId required');
        const url = `${this.constants.DATA_REPO_BASE}${this.constants.CATEGORIES_PATH}${categoryType}/${groupId}.json`;
        try {
            const data = await this.fetchWithRetry(url, {}, 3);
            // If file doesn't contain data property, but is full group, normalize
            if (data && Array.isArray(data.data)) return data;
            if (data && Array.isArray(data)) return { name: { en: groupId }, data };
            if (data && typeof data === 'object') return data;
            // fallback
            throw new Error('Invalid category group format');
        } catch (e) {
            // Fallback: try to locate within monolithic db (existing logic)
            try {
                return await this.fetchCategoryGroup(groupId);
            } catch (err) {
                throw new Error(`Cannot load category group ${groupId} (${categoryType})`);
            }
        }
    },

    // Load a page bundle from distributed repo (pages/*.min.json)
    async loadPageBundle(pageName) {
        if (!pageName) throw new Error('pageName required');
        const url = `${this.constants.DATA_REPO_BASE}${this.constants.PAGES_PATH}${pageName}.min.json`;
        try {
            const data = await this.fetchWithRetry(url, {}, 4);
            return data;
        } catch (e) {
            // fallback: try relative path or existing page paths
            try {
                return await this.fetchWithRetry(pageName, {}, 5);
            } catch (err) {
                throw new Error(`Cannot load page bundle ${pageName}`);
            }
        }
    },

    // Try to load API database (monolithic) first. If not available, build an aggregated virtual DB
    async loadApiDatabase() {
        this._warmup();
        // If apiCache is fresh, return
        if (this.apiCache && Date.now() - this.apiCacheTimestamp < this.constants.CACHE_DURATION) {
            if (!this._jsonDbIndexReady) this._buildJsonDbIndex(this.apiCache).catch(()=>{});
            return this.apiCache;
        }

        // Try monolithic db first (high priority)
        try {
            const db = await this._enqueueFetch(
                this.constants.API_DATABASE_PATH,
                {},
                1
            );
            this.apiCache = db;
            this.apiCacheTimestamp = Date.now();
            try { await this._buildJsonDbIndex(db); } catch {}
            return db;
        } catch (firstErr) {
            // If monolithic fetch fails, attempt to assemble from distributed repository
            try {
                const aggregated = await this._buildAggregatedDbFromDistributed();
                if (aggregated) {
                    this.apiCache = aggregated;
                    this.apiCacheTimestamp = Date.now();
                    try { await this._buildJsonDbIndex(aggregated); } catch {}
                    return aggregated;
                }
            } catch (aggErr) {
                // final fallback: if apiCache exists return it else throw
                if (this.apiCache) return this.apiCache;
                throw firstErr;
            }
        }
    },

    // Build aggregated DB by reading categories-list & categories files from DATA_REPO_BASE
    async _buildAggregatedDbFromDistributed() {
        try {
            const types = [];
            // Known top-level category types to attempt
            const knownTypes = ['emoji', 'symbols'];
            for (const t of knownTypes) {
                try {
                    const list = await this.loadCategoryList(t).catch(()=>null);
                    if (!list) continue;
                    const typeObj = {
                        id: list.id || t,
                        name: list.name || { en: t },
                        category: []
                    };
                    if (Array.isArray(list.groups)) {
                        for (const g of list.groups) {
                            // g.file might be local path or relative; if provided, try to use it; else use data repo path
                            try {
                                const groupPath = g.file
                                    ? (g.file.startsWith('http') ? g.file : `${this.constants.DATA_REPO_BASE}${g.file}`)
                                    : `${this.constants.DATA_REPO_BASE}${this.constants.CATEGORIES_PATH}${t}/${g.id}.json`;
                                const group = await this.fetchWithRetry(groupPath, {}, 3);
                                // Normalize group into expected form { id, name, data: [...] }
                                if (!group) continue;
                                const groupNormalized = {};
                                groupNormalized.id = g.id || group.id || (group.name && group.name.en) || g.id;
                                groupNormalized.name = group.name || g.name || { en: groupNormalized.id };
                                if (Array.isArray(group.data)) groupNormalized.data = group.data;
                                else if (Array.isArray(group)) groupNormalized.data = group;
                                else {
                                    // try to transform object with nested info into data array
                                    groupNormalized.data = group.data || [];
                                }
                                typeObj.category.push(groupNormalized);
                            } catch (err) {
                                // ignore single group failure
                                continue;
                            }
                        }
                    }
                    types.push(typeObj);
                } catch (err) {
                    continue;
                }
            }
            if (types.length > 0) {
                return { type: types };
            }
            throw new Error('No distributed data available');
        } catch (err) {
            throw err;
        }
    },

    async fetchApiContent(apiCode) {
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
        // Existing logic preserved: it tries to locate the category in the loaded db
        const idRaw = categoryId.replace(/_category$/, '');
        const db = await this.loadApiDatabase();
        const idx = this._jsonDbIndexReady ? this._jsonDbIndex : (await this._buildJsonDbIndex(db));
        let found = null, typeName = "", typeId = "";
        if (idx && idx.idMap.has(idRaw)) {
            found = idx.idMap.get(idRaw);
            const typeObj = idx.catToTypeMap.get(idRaw);
            if (typeObj) {
                typeId = typeObj.id;
                typeName = typeObj.name;
            }
        }
        if (!found && Array.isArray(db?.type)) {
            for (const typeObj of db.type) {
                typeId = typeObj.id;
                typeName = typeObj.name;
                if (Array.isArray(typeObj.category)) {
                    for (const cat of typeObj.category) {
                        if (cat.id === idRaw) { found = cat; break; }
                    }
                }
                if (found) break;
            }
        }
        if (!found && Array.isArray(db)) {
            for (const typeObj of db) {
                typeId = typeObj.id;
                typeName = typeObj.name;
                if (Array.isArray(typeObj.category)) {
                    for (const cat of typeObj.category) {
                        if (cat.id === idRaw) { found = cat; break; }
                    }
                }
                if (found) break;
            }
        }
        if (!found) throw new Error(`Category not found: ${categoryId}`);
        const currentLang = localStorage.getItem('selectedLang') || 'en';
        const header = {
            title: found.name?.[currentLang] || found.name?.en || found.id,
            description: typeName?.[currentLang] || typeName?.en || "",
            typeId,
            categoryId: found.id,
            className: "auto-category-header"
        };
        return { id: found.id, name: found.name, data: found.data, header };
    }
};

export default dataManager;