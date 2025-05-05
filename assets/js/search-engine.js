let apiData = null;
let currentResults = [];
let filterCategories = [];
let selectedType = 'all';
let selectedCategory = 'all';
let debounceTimeout = null;
let allKeywordsCache = [];
let emojiSuggestionsCache = [];
let symbolSuggestionsCache = [];

// ภาษา (รองรับหลายภาษา)
const LANG_TEXTS = {
    th: {
        all_types: "ทุกประเภท",
        all_categories: "ทุกหมวดหมู่",
        not_found: "ไม่พบข้อมูลที่ตรงหรือใกล้เคียงกับคำค้นของคุณ",
        copy: "คัดลอก",
        suggestions_for_you: "แนะนำสำหรับคุณ",
        emoji_suggestions: "แนะนำอีโมจิ",
        symbol_suggestions: "แนะนำสัญลักษณ์พิเศษ",
        type: "ประเภท",
        category: "หมวดหมู่",
        emoji: "อีโมจิ",
        symbol: "สัญลักษณ์",
        predicted: "คาดคะเนจากคำค้น",
        typo: "แนะนำจากคำที่อาจสะกดผิด",
        emoji_suggestion_cat: "แนะนำอีโมจิ",
        symbol_suggestion_cat: "แนะนำสัญลักษณ์",
        search_placeholder: "ชื่อ หมวดหมู่",
        search_result_here: "ผลการค้นหาจะแสดงที่นี่"
    },
    en: {
        all_types: "All Types",
        all_categories: "All Categories",
        not_found: "No data found related to your keyword.",
        copy: "Copy",
        suggestions_for_you: "Suggestions For You",
        emoji_suggestions: "Emoji Suggestions",
        symbol_suggestions: "Special Symbol Suggestions",
        type: "Type",
        category: "Category",
        emoji: "Emoji",
        symbol: "Symbol",
        predicted: "Predicted from your input",
        typo: "Suggested for possible typo",
        emoji_suggestion_cat: "Emoji Suggestion",
        symbol_suggestion_cat: "Symbol Suggestion",
        search_placeholder: "Name, Category",
        search_result_here: "Search results will appear here"
    }
};
function t(key) {
    const lang = getLang();
    return (LANG_TEXTS[lang] && LANG_TEXTS[lang][key]) || (LANG_TEXTS["en"][key] || key);
}
function getLang() {
    return localStorage.getItem('selectedLang') || (navigator.language && navigator.language.startsWith('th') ? 'th' : 'en');
}

function updateUILanguage() {
    document.querySelectorAll('.filter-group-label').forEach((el, idx) => {
        if (idx === 0) el.textContent = t('type');
        if (idx === 1) el.textContent = t('category');
    });
    // placeholder ช่องค้นหา
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.placeholder = t('search_placeholder');
    // Suggestions title (ถ้ามี)
    document.querySelectorAll('.suggestions-title-main').forEach(el => {
        el.textContent = t('suggestions_for_you');
    });
    // Suggestions head
    document.querySelectorAll('.suggestions-head').forEach((el) => {
        if (el.textContent.indexOf("อีโมจิ") !== -1 || el.textContent.toLowerCase().includes("emoji")) {
            el.textContent = t('emoji_suggestions');
        }
        if (el.textContent.indexOf("สัญลักษณ์") !== -1 || el.textContent.toLowerCase().includes("symbol")) {
            el.textContent = t('symbol_suggestions');
        }
    });
    // No result
    document.querySelectorAll('.no-result').forEach(el => {
        el.textContent = t('not_found');
    });
    // ข้อความเมื่อยังไม่มีการค้นหา
    document.querySelectorAll('.search-result-here').forEach(el => {
        el.textContent = t('search_result_here');
    });
    // ปุ่ม copy
    document.querySelectorAll('.result-copy-btn').forEach(el => {
        if (!el.title || el.title.toLowerCase().includes("copy") || el.title.includes("คัดลอก")) {
            el.title = t('copy');
            el.innerHTML = t('copy')+' <span class="copy-icon">📋</span>';
        }
    });
}

// Levenshtein Distance
function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            matrix[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
                ? matrix[i - 1][j - 1]
                : Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
        }
    }
    return matrix[b.length][a.length];
}

// Tokenize & Synonym
function tokenizeAndExpand(str) {
    if (!str) return [];
    let tokens = str
        .toLowerCase()
        .replace(/[^a-zA-Z0-9ก-๙_]+/g, " ")
        .split(/\s+/)
        .filter(Boolean);

    const synonymDict = {
        emoji: ['emoticon', 'emotion', 'icon', 'อีโมจิ', 'สัญลักษณ์'],
        emoticon: ['emoji'],
        อีโมจิ: ['emoji', 'สัญลักษณ์'],
        symbol: ['icon', 'สัญลักษณ์', 'character', 'special'],
        'สัญลักษณ์': ['symbol', 'emoji'],
        หมวดหมู่: ['หมวด', 'category', 'กลุ่ม', 'type'],
        code: ['รหัส', 'api', 'identifier'],
        รหัส: ['code', 'api', 'identifier'],
        ชื่อ: ['name', 'title', 'เรียก'],
        name: ['ชื่อ', 'title'],
        กลุ่ม: ['หมวดหมู่', 'category'],
        พิเศษ: ['special', 'symbol'],
        คำ: ['word', 'text']
    };

    let expanded = [...tokens];
    tokens.forEach(token => {
        if (synonymDict[token]) {
            expanded.push(...synonymDict[token]);
        }
    });
    return Array.from(new Set(expanded));
}

function minLevenshteinAmongTokens(query, target) {
    const q = query.toLowerCase();
    const t = target.toLowerCase();
    let minDist = levenshtein(q, t);
    if (t.length > q.length) {
        for (let i = 0; i <= t.length - q.length; i++) {
            const sub = t.slice(i, i + q.length);
            minDist = Math.min(minDist, levenshtein(q, sub));
        }
    }
    return minDist;
}

function generateAllKeywords(apiData) {
    const keywordMap = new Map();
    Object.entries(apiData || {}).forEach(([type, dataValue]) => {
        (dataValue.category || []).forEach(cat => {
            Object.entries(cat).forEach(([k, v]) => {
                if (/_name$|^name$/.test(k) && v) {
                    keywordMap.set(`${type}|category|${v.toLowerCase()}`, {
                        type, category: cat, key: v.toLowerCase(), isCategory: true
                    });
                }
            });
            (cat.data || []).forEach(item => {
                Object.entries(item).forEach(([k, v]) => {
                    if (/_name$|^name$/.test(k) && v) {
                        keywordMap.set(`${type}|item|${v.toLowerCase()}`, {
                            type, category: cat, item, key: v.toLowerCase(), isCategory: false
                        });
                    }
                });
                if (item.text) {
                    keywordMap.set(`${type}|item|${item.text.toLowerCase()}`, {
                        type, category: cat, item, key: item.text.toLowerCase(), isCategory: false
                    });
                }
                if (item.api) {
                    keywordMap.set(`${type}|item|${item.api.toLowerCase()}`, {
                        type, category: cat, item, key: item.api.toLowerCase(), isCategory: false
                    });
                }
            });
        });
    });
    return Array.from(keywordMap.values());
}

function computeRelevanceScore(query, target, baseScore = 100) {
    if (!target) return baseScore;
    let minScore = minLevenshteinAmongTokens(query, target);
    if (target.startsWith(query)) minScore -= 1;
    if (target.includes(query)) minScore -= 0.5;
    return minScore;
}

function getBestKeywordMatches(query, allKeywords, maxCount = 12) {
    if (!query) return [];
    let scored = allKeywords.map(k => {
        let scores = [];
        scores.push(computeRelevanceScore(query, k.key, 100));
        if (k.isCategory) {
            Object.entries(k.category).forEach(([kk, vv]) => {
                if (/_name$|^name$/.test(kk) && vv)
                    scores.push(computeRelevanceScore(query, vv, 110));
            });
        }
        if (k.item) {
            Object.entries(k.item).forEach(([kk, vv]) => {
                if (/_name$|^name$/.test(kk) && vv)
                    scores.push(computeRelevanceScore(query, vv, 120));
            });
            if (k.item.text) scores.push(computeRelevanceScore(query, k.item.text, 120));
            if (k.item.api) scores.push(computeRelevanceScore(query, k.item.api, 125));
        }
        let minScore = Math.min(...scores);
        return { k, score: minScore };
    });
    scored.sort((a, b) => a.score - b.score);
    const best = scored.filter(s => s.score <= 2);
    const seen = new Set();
    const uniqueBest = [];
    for (const { k, score } of best) {
        const uniqKey = k.isCategory
            ? `cat|${k.type}|${k.category.name}`
            : `item|${k.type}|${k.category.name}|${k.item.api || k.item.text || ''}`;
        if (!seen.has(uniqKey)) {
            uniqueBest.push({ ...k, fuzzyScore: score });
            seen.add(uniqKey);
        }
        if (uniqueBest.length >= maxCount) break;
    }
    return uniqueBest;
}

function setupTypeFilter(selected = 'all') {
    const typeFilter = document.getElementById('typeFilter');
    typeFilter.innerHTML = '';
    const optionAll = document.createElement('option');
    optionAll.value = 'all';
    optionAll.textContent = t('all_types');
    typeFilter.appendChild(optionAll);

    if (!apiData) return;
    Object.keys(apiData).forEach(type => {
        let label = type;
        if (apiData[type] && apiData[type][`${getLang()}_name`]) {
            label = apiData[type][`${getLang()}_name`];
        } else if (apiData[type] && apiData[type]['name']) {
            label = apiData[type]['name'];
        } else {
            label = type.charAt(0).toUpperCase() + type.slice(1);
        }
        const opt = document.createElement('option');
        opt.value = type;
        opt.textContent = label;
        typeFilter.appendChild(opt);
    });
    typeFilter.value = selected;
}

function setupCategoryFilter(categories, selected = 'all') {
    const catFilter = document.getElementById('categoryFilter');
    catFilter.innerHTML = '';
    catFilter.style.display = '';
    const optAll = document.createElement('option');
    optAll.value = 'all';
    optAll.textContent = t('all_categories');
    catFilter.appendChild(optAll);
    categories.forEach(({ key, displayName }) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = displayName;
        catFilter.appendChild(opt);
    });
    catFilter.value = selected;
}

function getRandomSuggestions(arr, count = 5) {
    if (!arr || !arr.length) return [];
    const shuffled = arr.slice().sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, arr.length));
}

function smartSearch(apiData, query, typeFilter, allKeywords) {
    query = (query || '').toLowerCase().trim();
    if (!query) return [];
    let results = [];
    Object.entries(apiData).forEach(([type, dataValue]) => {
        if (typeFilter !== 'all' && type !== typeFilter) return;
        (dataValue.category || []).forEach(cat => {
            const catNames = Object.entries(cat)
                .filter(([k]) => k.endsWith('_name') || k === 'name')
                .map(([, v]) => (v || '').toLowerCase());
            (cat.data || []).forEach(item => {
                const itemNames = Object.entries(item)
                    .filter(([k]) => k.endsWith('_name') || k === 'name')
                    .map(([, v]) => (v || '').toLowerCase());
                const matchTokens = [ ...catNames, ...itemNames, (item.text||''), (item.api||'') ];
                let isMatch = matchTokens.some(txt => txt.includes(query));
                let minFuzz = Math.min(...matchTokens.map(txt => minLevenshteinAmongTokens(query, txt)));
                let isFuzzy = !isMatch && minFuzz <= 2;
                if (isMatch || isFuzzy) {
                    results.push({
                        type,
                        category: cat,
                        item,
                        fuzzy: !isMatch && isFuzzy,
                        fuzzyScore: minFuzz
                    });
                }
            });
        });
    });

    if (results.length === 0 && allKeywords && allKeywords.length > 0) {
        const suggestions = getBestKeywordMatches(query, allKeywords, 10);
        results = suggestions.map(s => {
            if (s.isCategory) {
                return {
                    type: s.type,
                    category: s.category,
                    item: ((s.category.data && s.category.data.length) ? s.category.data[0] : { text: '', api: '' }),
                    isSuggestion: true,
                    suggestionType: 'category',
                    suggestionKeyword: s.key,
                    fuzzyScore: s.fuzzyScore
                };
            } else {
                return {
                    type: s.type,
                    category: s.category,
                    item: s.item,
                    isSuggestion: true,
                    suggestionType: 'item',
                    suggestionKeyword: s.key,
                    fuzzyScore: s.fuzzyScore
                };
            }
        });
    }

    results.sort((a, b) => {
        if (!!a.isSuggestion !== !!b.isSuggestion) return !!a.isSuggestion - !!b.isSuggestion;
        if (a.fuzzy !== b.fuzzy) return a.fuzzy - b.fuzzy;
        if ((a.fuzzyScore !== undefined) && (b.fuzzyScore !== undefined)) return a.fuzzyScore - b.fuzzyScore;
        return 0;
    });
    return results;
}

function extractResultCategories(results) {
    const lang = getLang();
    const categories = [];
    const seen = new Set();
    results.forEach(res => {
        const cat = res.category;
        const key = cat.name;
        const displayName = cat[`${lang}_name`] || cat.name;
        if (!seen.has(key)) {
            seen.add(key);
            categories.push({ key, displayName });
        }
    });
    return categories;
}

function showCopyToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'copy-toast-message';
    toast.textContent = msg;
    document.getElementById('copyToast').appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 250);
    }, 1400);
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        showCopyToast(t('copy') + 'แล้ว');
    } catch {
        showCopyToast('ไม่สามารถ' + t('copy') + 'ได้');
    }
}

function renderSuggestionsBlock(lang, emojis = [], symbols = []) {
    let html = '';
    if (emojis.length) {
        html += `<div class="suggestions-head">${t('emoji_suggestions')}</div>`;
        html += emojis.map(obj => renderSuggestionItemWithRealCategory(obj, lang)).join('');
    }
    if (symbols.length) {
        html += `<div class="suggestions-head">${t('symbol_suggestions')}</div>`;
        html += symbols.map(obj => renderSuggestionItemWithRealCategory(obj, lang)).join('');
    }
    return `<div class="suggestions-block-list">${html}</div>`;
}

function renderSuggestionItemWithRealCategory(obj, lang) {
    const typeLabel = t('type');
    const catLabel = t('category');
    let catName = obj.category
        ? (obj.category[`${lang}_name`] || obj.category.name || "")
        : '';
    let typeDisplay = obj.type
        ? (LANG_TEXTS[lang][obj.type] || obj.type)
        : '';
    if (!typeDisplay) typeDisplay = t('emoji');

    return `
    <div class="result-item">
        <div class="result-content-area">
            <div class="result-text-area">
                <span class="result-text">${obj.text || '-'}</span>
                <span class="result-api">${obj.api || ''}</span>
            </div>
            <div class="result-names"></div>
            <div class="result-meta" style="margin-top:13px;">
                <div>
                    <span class="result-meta-label">${typeLabel}:</span>
                    <span class="result-meta-value">${typeDisplay}</span>
                </div>
                <div>
                    <span class="result-meta-label">${catLabel}:</span>
                    <span class="result-meta-value">${catName}</span>
                </div>
            </div>
        </div>
        <button class="result-copy-btn" onclick="window._copyResultText('${encodeURIComponent(obj.text || '')}', event)" title="${t('copy')}">${t('copy')} <span class="copy-icon">📋</span></button>
    </div>
    `;
}

function renderResults(results, showSuggestionsIfNoResult = false) {
    const container = document.getElementById('searchResults');
    container.innerHTML = '';
    const lang = getLang();

    let filtered = results;
    if (selectedCategory !== 'all') {
        filtered = results.filter(res =>
            (res.category.name === selectedCategory)
        );
    }

    if (!filtered.length) {
        let html = `<div class="no-result">${t('not_found')}</div>`;
        if (showSuggestionsIfNoResult) {
            html += `<div class="suggestions-title-main">${t('suggestions_for_you')}</div>`;
            html += renderSuggestionsBlock(
                lang,
                getRandomSuggestions(emojiSuggestionsCache, 4),
                getRandomSuggestions(symbolSuggestionsCache, 4)
            );
        }
        container.innerHTML = html;
        document.getElementById('categoryFilter').style.display = '';
        filterCategories = [];
        updateUILanguage();
        return;
    }

    container.innerHTML = filtered.map((res, idx) => {
        const itemNames = Object.entries(res.item)
            .filter(([k]) => /_name$|^name$/.test(k))
            .map(([, v]) => v)
            .filter(Boolean)
            .map(name => {
                if (typeof name === "object" && name !== null) {
                    return name[getLang()] || name["en"] || Object.values(name)[0] || "";
                }
                return name;
            })
            .join(' / ');
        const typeLabel = t('type');
        const catLabel = t('category');
        let typeDisplay = res.type;
        if (apiData[res.type] && apiData[res.type][`${lang}_name`]) {
            typeDisplay = apiData[res.type][`${lang}_name`];
        } else if (apiData[res.type] && apiData[res.type]['name']) {
            typeDisplay = apiData[res.type]['name'];
        } else {
            typeDisplay = res.type.charAt(0).toUpperCase() + res.type.slice(1);
        }
        const catDisplay = res.category[`${lang}_name`] || res.category.name;
        const copyBtnHtml = `<button class="result-copy-btn" onclick="window._copyResultText('${encodeURIComponent(res.item.text)}', event)" title="${t('copy')}">${t('copy')} <span class="copy-icon">📋</span></button>`;
        let fuzzyHint = '';
        if (res.fuzzy) fuzzyHint = `<div class="fuzzy-hint" style="color:#e08b35;font-size:.98em;font-weight:400; margin-bottom:4px;">${t('typo')}</div>`;
        if (res.isSuggestion) fuzzyHint = `<div class="fuzzy-hint" style="color:#e08b35;font-size:.98em;font-weight:400; margin-bottom:4px;">${t('predicted')}</div>`;
        return `
        <div class="result-item">
            <div class="result-content-area">
                ${fuzzyHint}
                <div class="result-text-area">
                    <span class="result-text">${res.item.text || '-'}</span>
                    <span class="result-api">${res.item.api || ''}</span>
                </div>
                <div class="result-names">${itemNames}</div>
                <div class="result-meta" style="margin-top:13px;">
                    <div>
                        <span class="result-meta-label">${typeLabel}:</span>
                        <span class="result-meta-value">${typeDisplay}</span>
                    </div>
                    <div>
                        <span class="result-meta-label">${catLabel}:</span>
                        <span class="result-meta-value">${catDisplay}</span>
                    </div>
                </div>
            </div>
            ${copyBtnHtml}
        </div>
        `;
    }).join('');
    window._copyResultText = function(text, ev) {
        ev.preventDefault();
        copyText(decodeURIComponent(text));
    };
    updateUILanguage();
}

function prepareSuggestionCaches(apiData) {
    emojiSuggestionsCache = [];
    symbolSuggestionsCache = [];
    if (!apiData) return;
    if (apiData.emoji) {
        apiData.emoji.category.forEach(cat => {
            (cat.data || []).forEach(item => {
                emojiSuggestionsCache.push({
                    text: item.text,
                    api: item.api,
                    category: cat,
                    type: "emoji"
                });
            });
        });
    }
    if (apiData.symbol) {
        apiData.symbol.category.forEach(cat => {
            (cat.data || []).forEach(item => {
                symbolSuggestionsCache.push({
                    text: item.text,
                    api: item.api,
                    category: cat,
                    type: "symbol"
                });
            });
        });
    }
}

function doSearch(e) {
    if (e) e.preventDefault();
    const q = document.getElementById('searchInput').value;
    selectedType = document.getElementById('typeFilter').value;
    selectedCategory = 'all';
    if (!q.trim()) {
        // ถ้าไม่มีคีย์เวิร์ด แสดงข้อความ "ผลการค้นหาจะแสดงที่นี่" (หลายภาษา)
        document.getElementById('searchResults').innerHTML = `<div class="search-result-here" style="text-align:center;color:#969ca8;font-size:1.07em;margin-top:30px;">${t('search_result_here')}</div>`;
        setupCategoryFilter([], 'all');
        filterCategories = [];
        updateUILanguage();
        return;
    }
    currentResults = smartSearch(apiData, q, selectedType, allKeywordsCache);

    filterCategories = extractResultCategories(currentResults);
    setupCategoryFilter(filterCategories, 'all');
    renderResults(currentResults, currentResults.length === 0);
    updateUILanguage();
}

function onTypeChange() {
    selectedType = document.getElementById('typeFilter').value;
    doSearch();
}

function onCategoryChange() {
    selectedCategory = document.getElementById('categoryFilter').value;
    renderResults(currentResults, false);
    updateUILanguage();
}

function setupMobileSelectEnter() {
    ['typeFilter', 'categoryFilter'].forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('change', () => {
            if (id === 'typeFilter') onTypeChange();
            else onCategoryChange();
        });
        el.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                if (id === 'typeFilter') onTypeChange();
                else onCategoryChange();
            }
        });
    });
}

function setupAutoSearchInput() {
    const input = document.getElementById('searchInput');
    input.addEventListener('input', function() {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => doSearch(), 160);
    });
}

// เพิ่มการเปลี่ยนภาษา (ตัวอย่าง: สลับภาษาเมื่อเลือก)
window.setUILanguage = function(lang) {
    localStorage.setItem('selectedLang', lang);
    updateUILanguage();
    setupTypeFilter(selectedType);
    setupCategoryFilter(filterCategories, selectedCategory);
    renderResults(currentResults, currentResults && currentResults.length === 0);
};

fetch('/assets/json/api-database.json')
    .then(res => res.json())
    .then(data => {
        apiData = data;
        allKeywordsCache = generateAllKeywords(apiData);
        prepareSuggestionCaches(apiData);
        setupTypeFilter('all');
        setupMobileSelectEnter();
        setupAutoSearchInput();
        setupCategoryFilter([], 'all');
        // เมื่อโหลดเสร็จให้แสดงข้อความเริ่มต้น
        document.getElementById('searchResults').innerHTML = `<div class="search-result-here" style="text-align:center;color:#969ca8;font-size:1.07em;margin-top:30px;">${t('search_result_here')}</div>`;
        updateUILanguage();
    });

document.getElementById('searchForm').addEventListener('submit', e => { e.preventDefault(); });
document.getElementById('searchInput').addEventListener('keydown', function(e){
    if(e.key === 'Enter') e.preventDefault();
});