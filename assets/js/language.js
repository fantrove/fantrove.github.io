class LanguageManager {
  constructor() {
    this.languagesConfig = {};
    this.selectedLang = '';
    this.languageCache = {};
    this.isUpdatingLanguage = false;
  }

  async loadLanguagesConfig() {
    try {
      const storedConfig = localStorage.getItem('languagesConfig');
      if (storedConfig) {
        this.languagesConfig = JSON.parse(storedConfig);
      }

      if (!Object.keys(this.languagesConfig).length) {
        const response = await fetch('https://jeffy2600ii.github.io/hub.fantrove/assets/json/language.json');
        if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);

        this.languagesConfig = await response.json();
        localStorage.setItem('languagesConfig', JSON.stringify(this.languagesConfig));
      }

      this.handleInitialLanguage();
      this.initializeLanguageSelector();
    } catch (error) {
      console.warn('Error loading languages config:', error);
      this.showAlertAndRefresh('Failed to load language data.');
    }
  }

  detectBrowserLanguage() {
    const browserLang = navigator.language.split('-')[0];
    return this.languagesConfig[browserLang] ? browserLang : 'en';
  }

  handleInitialLanguage() {
    const urlParams = new URLSearchParams(window.location.search);
    const langFromUrl = urlParams.get('lang');
    const storedLang = localStorage.getItem('selectedLang');
    const detectedLang = langFromUrl || storedLang || this.detectBrowserLanguage();

    if (detectedLang !== storedLang) {
      localStorage.setItem('selectedLang', detectedLang);
      this.selectedLang = detectedLang;
      document.documentElement.lang = detectedLang;
      this.updatePageLanguage(detectedLang);
    } else {
      this.selectedLang = storedLang;
      document.documentElement.lang = storedLang;
      this.updatePageLanguage(storedLang);
    }

    this.observeLanguageChanges();
  }

  observeLanguageChanges() {
    const observer = new MutationObserver(() => {
      const newLang = document.documentElement.lang;
      if (newLang !== this.selectedLang) {
        this.selectedLang = newLang;
        localStorage.setItem('selectedLang', newLang);
        this.updatePageLanguage(newLang);
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  async updatePageLanguage(language) {
    if (this.isUpdatingLanguage) return;
    this.isUpdatingLanguage = true;

    if (!this.languagesConfig[language]) {
      console.warn(`Unsupported language: ${language}. Falling back to English.`);
      language = 'en';
    }

    document.documentElement.lang = language;

    if (language === 'en') {
      this.resetToEnglishContent();
      this.isUpdatingLanguage = false;
      return;
    }

    if (!this.languageCache[language]) {
      const languageData = await this.loadLanguageData(language);
      if (!Object.keys(languageData).length) {
        this.resetToEnglishContent();
        this.isUpdatingLanguage = false;
        return;
      }
      this.languageCache[language] = languageData;
    }

    const languageData = this.languageCache[language];
    document.querySelectorAll('[data-translate]').forEach(el => {
      const key = el.getAttribute('data-translate');
      if (languageData[key]) {
        el.textContent = languageData[key];
      }
    });

    this.isUpdatingLanguage = false;
  }

  async loadLanguageData(languageCode) {
    try {
      const response = await fetch(`https://jeffy2600ii.github.io/hub.fantrove/assets/json/lang/${languageCode}.json`);
      if (!response.ok) throw new Error(`Failed to fetch: ${languageCode} - ${response.statusText}`);

      return await response.json();
    } catch (error) {
      console.warn(`Error loading language data for ${languageCode}:`, error);
      return {};
    }
  }

  resetToEnglishContent() {
    document.querySelectorAll('[data-translate]').forEach(el => {
      const originalText = el.getAttribute('data-original-text');
      if (originalText) el.textContent = originalText;
    });
  }

  initializeLanguageSelector() {
    const languageContainer = document.getElementById('language-selector-container');
    if (!languageContainer) return;

    const button = document.createElement('button');
    button.textContent = this.languagesConfig[this.selectedLang]?.buttonText || 'Select Language';
    button.onclick = () => this.toggleLanguageDropdown();
    languageContainer.appendChild(button);
  }

  toggleLanguageDropdown() {
    const dropdown = document.getElementById('language-dropdown');
    if (dropdown) {
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
  }
}

const languageManager = new LanguageManager();
window.addEventListener('DOMContentLoaded', () => languageManager.loadLanguagesConfig());