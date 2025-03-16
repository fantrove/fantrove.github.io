class LanguageManager {
  constructor() {
    this.languagesConfig = {};
    this.selectedLang = '';
    this.isLanguageDropdownOpen = false;
    this.languageCache = {};
    this.isUpdatingLanguage = false;
    this.mutationObserver = null;
    
    // เพิ่มตัวแปรสำหรับเก็บตำแหน่งการเลื่อนเดิม
    this.scrollPosition = 0;
  }

  async loadLanguagesConfig() {
    try {
      const storedConfig = localStorage.getItem('languagesConfig');
      if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig);
        if (parsedConfig && typeof parsedConfig === 'object' && Object.keys(parsedConfig).length > 0) {
          this.languagesConfig = parsedConfig;
        }
      }

      if (Object.keys(this.languagesConfig).length === 0) {
        const response = await fetch('./assets/json/language.json');
        if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);

        const newConfig = await response.json();
        if (!newConfig || typeof newConfig !== 'object' || Object.keys(newConfig).length === 0) {
          throw new Error('Invalid or empty language configuration');
        }

        this.languagesConfig = newConfig;
        localStorage.setItem('languagesConfig', JSON.stringify(this.languagesConfig));
      }

      this.handleInitialLanguage();
      this.initializeCustomLanguageSelector();
    } catch (error) {
      console.warn('Error loading languages config:', error);
      this.showError('Failed to load language data.');
    }
  }

  detectBrowserLanguage() {
    const browserLanguages = navigator.languages || [navigator.language || navigator.userLanguage];
    return browserLanguages.map(lang => lang.split('-')[0]).find(lang => this.languagesConfig[lang]) || 'en';
  }

  handleInitialLanguage() {
    document.querySelectorAll('[data-translate]').forEach(el => {
      if (!el.hasAttribute('data-original-text')) {
        el.setAttribute('data-original-text', el.textContent);
      }
    });

    const urlParams = new URLSearchParams(window.location.search);
    const langFromUrl = urlParams.get('lang');

    this.selectedLang = langFromUrl && this.languagesConfig[langFromUrl]
      ? langFromUrl
      : localStorage.getItem('selectedLang') || this.detectBrowserLanguage();

    this.selectedLang === 'en' ? this.updateButtonText() : this.updatePageLanguage(this.selectedLang);
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'language-error';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
  }

  initializeCustomLanguageSelector() {
    const languageContainer = document.getElementById('language-selector-container');
    if (!languageContainer) return;

    this.createOverlay();
    this.createLanguageButton(languageContainer);
    this.createLanguageDropdown();

    // เพิ่ม CSS สำหรับควบคุมการเลื่อน
    this.addScrollLockStyles();

    window.addEventListener('popstate', this.handlePopState.bind(this));
  }

  createOverlay() {
    if (!this.languageOverlay) {
      this.languageOverlay = document.createElement('div');
      this.languageOverlay.id = 'language-overlay';
      document.body.appendChild(this.languageOverlay);
      this.languageOverlay.addEventListener('click', this.closeLanguageDropdown.bind(this));
    }
  }

  createLanguageButton(container) {
    if (!this.languageButton) {
      this.languageButton = document.createElement('button');
      this.languageButton.id = 'language-button';
      this.languageButton.className = container.getAttribute('lang-class') || 'default-lang-class';
      this.updateButtonText();
      this.languageButton.addEventListener('click', this.toggleLanguageDropdown.bind(this));
      container.appendChild(this.languageButton);
    }
  }

  createLanguageDropdown() {
    if (!this.languageDropdown) {
      this.languageDropdown = document.createElement('div');
      this.languageDropdown.id = 'language-dropdown';
      document.body.appendChild(this.languageDropdown);

      const fragment = document.createDocumentFragment();
      Object.entries(this.languagesConfig).forEach(([lang, config]) => {
        const option = document.createElement('div');
        option.className = 'language-option';
        option.textContent = config.label;
        option.dataset.language = lang;
        option.addEventListener('click', () => this.selectLanguage(lang));
        fragment.appendChild(option);
      });

      this.languageDropdown.appendChild(fragment);
    }
  }

  updateButtonText() {
    if (this.languageButton) {
      this.languageButton.textContent = this.languagesConfig[this.selectedLang]?.buttonText || 'Select Language';
    }
  }

  toggleLanguageDropdown() {
    this.isLanguageDropdownOpen ? this.closeLanguageDropdown() : this.openLanguageDropdown();
  }

  handlePopState() {
    if (this.isLanguageDropdownOpen) this.closeLanguageDropdown();
    this.selectedLang = localStorage.getItem('selectedLang') || 'en';
    this.updatePageLanguage(this.selectedLang);
  }

  openLanguageDropdown() {
    if (this.isLanguageDropdownOpen) return;

    // เก็บตำแหน่งการเลื่อนปัจจุบัน
    this.scrollPosition = window.scrollY;

    this.isLanguageDropdownOpen = true;
    this.languageOverlay.style.display = 'block';
    this.languageDropdown.style.display = 'block';

    // ล็อคการเลื่อนหน้า
    document.body.classList.add('scroll-lock');
    document.body.style.top = `-${this.scrollPosition}px`;

    setTimeout(() => {
      this.languageOverlay.classList.add('fade-in');
      this.languageDropdown.classList.add('fade-in');
    }, 10);
  }

  closeLanguageDropdown() {
    if (!this.isLanguageDropdownOpen) return;

    this.isLanguageDropdownOpen = false;
    this.languageOverlay.classList.remove('fade-in');
    this.languageDropdown.classList.remove('fade-in');

    // ปลดล็อคการเลื่อนหน้าและคืนค่าตำแหน่งการเลื่อน
    document.body.classList.remove('scroll-lock');
    document.body.style.top = '';
    window.scrollTo(0, this.scrollPosition);

    history.replaceState({}, '', window.location.pathname + window.location.hash);

    setTimeout(() => {
      this.languageOverlay.style.display = 'none';
      this.languageDropdown.style.display = 'none';
    }, 300);
  }

  async selectLanguage(language) {
    if (!this.languagesConfig[language]) {
      console.warn(`Unsupported language: ${language}. Falling back to English.`);
      language = 'en';
    }

    this.selectedLang = language;
    this.updateButtonText();
    await this.updatePageLanguage(language);

    const url = new URL(window.location);
    url.searchParams.set('lang', language);
    history.replaceState({}, '', url);

    localStorage.setItem('selectedLang', language);

    this.closeLanguageDropdown();
  }

  resetToEnglishContent() {
    document.querySelectorAll('[data-translate]').forEach(el => {
      const originalText = el.getAttribute('data-original-text');
      if (originalText) el.textContent = originalText;
    });
  }

  async updatePageLanguage(language) {
    if (this.isUpdatingLanguage) return;
    this.isUpdatingLanguage = true;

    document.documentElement.lang = language;

    this.restoreOriginalStyles();

    if (language === 'en') {
      this.resetToEnglishContent();
      this.updateButtonText();
      this.isUpdatingLanguage = false;
      return;
    }

    try {
      let languageData = this.languageCache[language];
      if (!languageData) {
        languageData = await this.loadLanguageData(language);
        if (Object.keys(languageData).length === 0) {
          this.resetToEnglishContent();
          this.updateButtonText();
          this.isUpdatingLanguage = false;
          return;
        }
        this.languageCache[language] = languageData;
      }

      this.translatePage(languageData);
    } finally {
      this.updateButtonText();
      this.isUpdatingLanguage = false;
    }
  }

  translatePage(languageData) {
    document.querySelectorAll('[data-translate]').forEach(el => {
      const key = el.getAttribute('data-translate');
      if (languageData[key]) {
        this.replaceTextOnly(el, languageData[key]);
      }
    });
  }

  async loadLanguageData(languageCode) {
    try {
      const response = await fetch(`./assets/json/lang/${languageCode}.json`);
      if (!response.ok) throw new Error(`Failed to fetch: ${languageCode} - ${response.statusText}`);

      const data = await response.json();
      if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        throw new Error(`Invalid or empty language data for ${languageCode}`);
      }

      return data;
    } catch (error) {
      console.warn(`Error loading language data for ${languageCode}:`, error);
      this.showError(`Failed to load language data for ${languageCode}.`);
      return {};
    }
  }

replaceTextOnly(element, newText) {
    // สร้างอาร์เรย์เก็บโหนดข้อความที่ต้องการแปล
    const textNodesToTranslate = [];
    
    // ฟังก์ชันสำหรับการหาโหนดข้อความที่ควรแปล
    const findTextNodes = (node) => {
        for (let child of node.childNodes) {
            // ถ้าเป็นโหนดข้อความและมีเนื้อหา
            if (child.nodeType === Node.TEXT_NODE && child.textContent.trim() !== '') {
                textNodesToTranslate.push(child);
            }
            // ถ้าเป็นอิลิเมนต์ที่ไม่ใช่ img หรือ svg ให้ค้นหาต่อในลูก
            else if (child.nodeType === Node.ELEMENT_NODE && 
                     !['IMG', 'SVG'].includes(child.nodeName) &&
                     !child.closest('svg')) {
                findTextNodes(child);
            }
            // ถ้าเป็น img หรือ svg ให้ข้ามไป
        }
    };

    // เริ่มค้นหาโหนดข้อความที่ต้องแปล
    findTextNodes(element);

    // แปลเฉพาะโหนดข้อความที่พบ
    textNodesToTranslate.forEach(textNode => {
        if (textNode.textContent.trim() !== '') {
            textNode.textContent = newText;
        }
    });
}

  observeMutations() {
    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const translatableElements = node.querySelectorAll('[data-translate]');
              translatableElements.forEach(el => {
                if (!el.hasAttribute('data-original-text')) {
                  el.setAttribute('data-original-text', el.textContent);
                }
              });
              if (this.selectedLang !== 'en') {
                this.updatePageLanguage(this.selectedLang);
              }
            }
          });
        }
      });
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  disconnectObserver() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
  }

  storeOriginalStyles() {
    document.querySelectorAll('[data-translate]').forEach(el => {
      if (!el.hasAttribute('data-original-style')) {
        el.setAttribute('data-original-style', el.style.cssText);
      }
    });
  }

  restoreOriginalStyles() {
    document.querySelectorAll('[data-translate]').forEach(el => {
      if (el.hasAttribute('data-original-style')) {
        el.style.cssText = el.getAttribute('data-original-style');
      }
    });
  }
}

const languageManager = new LanguageManager();

window.addEventListener('DOMContentLoaded', () => {
  languageManager.loadLanguagesConfig();
  languageManager.observeMutations();
  languageManager.storeOriginalStyles();
});