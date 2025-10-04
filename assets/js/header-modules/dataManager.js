// dataManager.js
// แยกจากต้นฉบับ: ให้เป็นอ็อบเจ็กต์ที่สามารถผูกกับ window ได้
import { _headerV2_utils } from './utils.js';

const dataManager = {
    constants: {
        FETCH_TIMEOUT: 5000,
        RETRY_DELAY: 300,
        MAX_RETRIES: 1,
        CACHE_DURATION: 2 * 60 * 60 * 1000,
        API_DATABASE_PATH: '/assets/db/db.min.json',
        BUTTONS_CONFIG_PATH: '/assets/json/buttons.min.json'
    },
    cache: new Map(),
    apiCache: null,
    apiCacheTimestamp: 0,
    _dbPromise: null,
    _jsonDbIndex: null,
    _jsonDbIndexReady: false,
    _jsonDbIndexPromise: null,

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

    // NOTE: We keep the IndexedDB helper methods in the file for compatibility,
    // but we no longer use them in fetchWithRetry. This ensures we don't persist
    // fetched content across page reloads.
    _openIndexedDB() {
        // kept for compatibility but unused
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
        // unused now — return null to indicate no persistent cache
        return null;
    },

    async _setToIndexedDB(key, data) {
        // unused now — do nothing
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
                    await this.fetchWithRetry(this.constants.BUTTONS_CONFIG_PATH).catch(()=>{});
                } finally {
                    resolve();
                }
            };
            if ('requestIdleCallback' in window) requestIdleCallback(doWarmup, { timeout: 2000 });
            else setTimeout(doWarmup, 1200);
        });
        return this._warmupPromise;
    },

    async fetchWithRetry(url, options = {}) {
        // Important change:
        // - Do NOT read/write IndexedDB anymore.
        // - Use only in-memory cache (this.cache) for session-lifetime caching.
        const key = `${url}-${JSON.stringify(options)}`;
        const cached = this.getCached(key);
        if (cached) return cached;

        try {
            // Skip any persistent DB retrieval — we intentionally do not persist across reloads.
        } catch (err) {}

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

            if (url === this.constants.API_DATABASE_PATH) {
                const text = await response.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (err) {
                    data = null;
                }
                if (data) {
                    if (options.cache !== false) {
                        // only in-memory cache; do not persist to IndexedDB
                        this.setCache(key, data);
                    }
                    // build json index for in-memory DB (no persistence)
                    this._buildJsonDbIndex(data, text).catch(()=>{});
                    return data;
                } else {
                    // fallback if parsing failed
                    const parsed = JSON.parse(text);
                    if (options.cache !== false) {
                        this.setCache(key, parsed);
                    }
                    this._buildJsonDbIndex(parsed, text).catch(()=>{});
                    return parsed;
                }
            } else {
                const data = await response.json();
                if (options.cache !== false) {
                    this.setCache(key, data);
                }
                return data;
            }
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

    async loadApiDatabase() {
        this._warmup();
        if (this.apiCache && Date.now() - this.apiCacheTimestamp < this.constants.CACHE_DURATION) {
            if (!this._jsonDbIndexReady) this._buildJsonDbIndex(this.apiCache).catch(()=>{});
            return this.apiCache;
        }
        try {
            const db = await this.fetchWithRetry(this.constants.API_DATABASE_PATH);
            this.apiCache = db;
            this.apiCacheTimestamp = Date.now();
            try {
                await this._buildJsonDbIndex(db);
            } catch {}
            return db;
        } catch (e) {
            if (this.apiCache) return this.apiCache;
            throw e;
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