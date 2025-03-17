/**
 * LanguageManager - ระบบจัดการภาษาสำหรับเว็บไซต์
 * ปรับปรุงล่าสุด: 2025-03-16
 */
class LanguageManager {
  constructor() {
    // ตัวแปรพื้นฐาน
    this.languagesConfig = {};
    this.selectedLang = '';
    this.isLanguageDropdownOpen = false;
    this.languageCache = new Map();
    this.isUpdatingLanguage = false;
    this.mutationObserver = null;
    this.scrollPosition = 0;

    // ค่าคงที่สำหรับการ retry
    this.RETRY_ATTEMPTS = 3;
    this.RETRY_DELAY = 1000; // milliseconds
    this.FADE_DURATION = 300; // milliseconds

    // สถานะการโหลด
    this.isInitialized = false;
    this.pendingTranslations = new Map();
  }

  /**
   * โหลด configuration ภาษาเริ่มต้น
   */
  async loadLanguagesConfig() {
    if (this.isInitialized) return;

    try {
      const storedConfig = this.getStoredConfig();
      if (storedConfig && await this.validateConfig(storedConfig)) {
        this.languagesConfig = storedConfig;
      } else {
        await this.fetchAndSetConfig();
      }

      await this.handleInitialLanguage();
      this.initializeCustomLanguageSelector();
      this.isInitialized = true;
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการโหลดการตั้งค่าภาษา:', error);
      this.showError('ไม่สามารถโหลดข้อมูลภาษาได้ กำลังใช้ภาษาเริ่มต้น');
      this.fallbackToDefaultLanguage();
    }
  }

  /**
   * ดึงข้อมูล config จาก localStorage
   */
  getStoredConfig() {
    try {
      const stored = localStorage.getItem('languagesConfig');
      return stored ? JSON.parse(stored) : null;
    } catch {
      localStorage.removeItem('languagesConfig');
      return null;
    }
  }

  /**
   * ตรวจสอบความถูกต้องของ config
   */
  async validateConfig(config) {
    return config && 
           typeof config === 'object' && 
           Object.keys(config).length > 0 &&
           Object.values(config).every(lang => 
             lang.label && 
             lang.buttonText &&
             typeof lang.label === 'string' &&
             typeof lang.buttonText === 'string'
           );
  }

  /**
   * ดึงและตั้งค่า config ใหม่
   */
  async fetchAndSetConfig() {
    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        const response = await fetch('./assets/json/language.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const newConfig = await response.json();
        if (await this.validateConfig(newConfig)) {
          this.languagesConfig = newConfig;
          localStorage.setItem('languagesConfig', JSON.stringify(newConfig));
          return;
        }
        throw new Error('Invalid config format');
      } catch (error) {
        if (attempt === this.RETRY_ATTEMPTS) throw error;
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
      }
    }
  }

  /**
   * จัดการภาษาเริ่มต้น
   */
  async handleInitialLanguage() {
    this.storeOriginalContent();
    
    const urlParams = new URLSearchParams(window.location.search);
    const langFromUrl = urlParams.get('lang');
    
    this.selectedLang = this.determineInitialLanguage(langFromUrl);
    
    if (this.selectedLang !== 'en') {
      await this.updatePageLanguage(this.selectedLang);
    }
  }

  /**
   * กำหนดภาษาเริ่มต้น
   */
  determineInitialLanguage(langFromUrl) {
    if (langFromUrl && this.languagesConfig[langFromUrl]) {
      return langFromUrl;
    }
    
    const storedLang = localStorage.getItem('selectedLang');
    if (storedLang && this.languagesConfig[storedLang]) {
      return storedLang;
    }
    
    return this.detectBrowserLanguage();
  }

  /**
   * ตรวจจับภาษาของเบราว์เซอร์
   */
  detectBrowserLanguage() {
    const browserLanguages = navigator.languages || [navigator.language || navigator.userLanguage];
    return browserLanguages
      .map(lang => lang.split('-')[0])
      .find(lang => this.languagesConfig[lang]) || 'en';
  }

  /**
   * โหลดข้อมูลภาษา
   */
  async loadLanguageData(languageCode) {
    if (this.languageCache.has(languageCode)) {
      return this.languageCache.get(languageCode);
    }

    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(`./assets/json/lang/${languageCode}.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        if (this.validateLanguageData(data)) {
          this.languageCache.set(languageCode, data);
          return data;
        }
        throw new Error('Invalid language data format');
      } catch (error) {
        if (attempt === this.RETRY_ATTEMPTS) {
          console.error(`ไม่สามารถโหลดภาษา ${languageCode} ได้:`, error);
          this.showError(`ไม่สามารถโหลดภาษา ${languageCode} ได้`);
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
      }
    }
  }

  /**
   * อัพเดทภาษาของหน้าเว็บ
   */
  async updatePageLanguage(language) {
    if (this.isUpdatingLanguage) return;
    
    try {
      this.isUpdatingLanguage = true;
      document.documentElement.lang = language;

      if (language === 'en') {
        this.resetToEnglishContent();
      } else {
        const languageData = await this.loadLanguageData(language);
        if (languageData) {
          await this.translatePageContent(languageData);
        } else {
          this.resetToEnglishContent();
        }
      }

      this.updateButtonText();
      this.updateURLLanguage(language);
      localStorage.setItem('selectedLang', language);
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการอัพเดทภาษา:', error);
      this.showError('เกิดข้อผิดพลาดในการเปลี่ยนภาษา');
      this.resetToEnglishContent();
    } finally {
      this.isUpdatingLanguage = false;
    }
  }

  /**
   * แปลเนื้อหาในหน้าเว็บ
   */
  async translatePageContent(languageData) {
    const elements = document.querySelectorAll('[data-translate]');
    const translations = new Map();

    elements.forEach(el => {
      const key = el.getAttribute('data-translate');
      if (languageData[key]) {
        translations.set(el, languageData[key]);
      }
    });

    await Promise.all(
      Array.from(translations.entries()).map(([element, translation]) => 
        new Promise(resolve => {
          requestAnimationFrame(() => {
            this.replaceTextOnly(element, translation);
            resolve();
          });
        })
      )
    );
  }

  /**
   * แทนที่ข้อความเท่านั้น (ไม่กระทบ HTML)
   */
  replaceTextOnly(element, newText) {
    element.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        node.textContent = newText;
      }
    });
  }

  /**
   * แสดงข้อความแจ้งเตือน
   */
  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'language-error';
    errorDiv.textContent = message;
    
    // สไตล์พื้นฐานสำหรับการแจ้งเตือน
    Object.assign(errorDiv.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: '#ff4444',
      color: 'white',
      padding: '10px 20px',
      borderRadius: '4px',
      zIndex: '9999',
      opacity: '0',
      transition: 'opacity 0.3s ease'
    });

    document.body.appendChild(errorDiv);
    
    // แสดงการแจ้งเตือนด้วย animation
    requestAnimationFrame(() => {
      errorDiv.style.opacity = '1';
      setTimeout(() => {
        errorDiv.style.opacity = '0';
        setTimeout(() => errorDiv.remove(), 300);
      }, 3000);
    });
  }

  /**
   * สังเกตการเปลี่ยนแปลงของ DOM
   */
  observeMutations() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    this.mutationObserver = new MutationObserver((mutations) => {
      let needsUpdate = false;

      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const translatableElements = node.querySelectorAll('[data-translate]');
              if (translatableElements.length > 0) {
                needsUpdate = true;
                translatableElements.forEach(el => {
                  if (!el.hasAttribute('data-original-text')) {
                    el.setAttribute('data-original-text', el.textContent.trim());
                  }
                });
              }
            }
          });
        }
      });

      if (needsUpdate && this.selectedLang !== 'en') {
        this.updatePageLanguage(this.selectedLang);
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * จัดการ UI ของตัวเลือกภาษา
   */
  initializeCustomLanguageSelector() {
    const container = document.getElementById('language-selector-container');
    if (!container) return;

    this.createLanguageElements();
    this.setupEventListeners();
  }

  /**
   * สร้าง UI elements สำหรับตัวเลือกภาษา
   */
  createLanguageElements() {
    // สร้าง overlay
    this.languageOverlay = document.createElement('div');
    this.languageOverlay.id = 'language-overlay';
    document.body.appendChild(this.languageOverlay);

    // สร้างปุ่มเลือกภาษา
    const container = document.getElementById('language-selector-container');
    this.languageButton = document.createElement('button');
    this.languageButton.id = 'language-button';
    this.languageButton.className = container.getAttribute('lang-class') || 'default-lang-class';
    this.updateButtonText();
    container.appendChild(this.languageButton);

    // สร้าง dropdown
    this.languageDropdown = document.createElement('div');
    this.languageDropdown.id = 'language-dropdown';
    this.populateLanguageDropdown();
    document.body.appendChild(this.languageDropdown);
  }

  /**
   * เพิ่มตัวเลือกภาษาใน dropdown
   */
  populateLanguageDropdown() {
    const fragment = document.createDocumentFragment();
    
    Object.entries(this.languagesConfig).forEach(([lang, config]) => {
      const option = document.createElement('div');
      option.className = 'language-option';
      option.textContent = config.label;
      option.dataset.language = lang;
      fragment.appendChild(option);
    });

    this.languageDropdown.appendChild(fragment);
  }

  /**
   * ตั้งค่า event listeners
   */
  setupEventListeners() {
    this.languageButton.addEventListener('click', () => this.toggleLanguageDropdown());
    this.languageOverlay.addEventListener('click', () => this.closeLanguageDropdown());
    
    this.languageDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.language-option');
      if (option) {
        const lang = option.dataset.language;
        if (lang) this.selectLanguage(lang);
      }
    });

    // จัดการ navigation events
    window.addEventListener('popstate', () => {
      if (this.isLanguageDropdownOpen) this.closeLanguageDropdown();
      const urlParams = new URLSearchParams(window.location.search);
      const lang = urlParams.get('lang') || 'en';
      if (lang !== this.selectedLang) {
        this.updatePageLanguage(lang);
      }
    });
  }

  /**
   * สลับการแสดง/ซ่อน dropdown
   */
  toggleLanguageDropdown() {
    this.isLanguageDropdownOpen ? this.closeLanguageDropdown() : this.openLanguageDropdown();
  }

  /**
   * เปิด dropdown
   */
  openLanguageDropdown() {
    if (this.isLanguageDropdownOpen) return;

    this.scrollPosition = window.scrollY;
    this.isLanguageDropdownOpen = true;

    this.languageOverlay.style.display = 'block';
    this.languageDropdown.style.display = 'block';

    document.body.style.top = `-${this.scrollPosition}px`;
    document.body.classList.add('scroll-lock');

    requestAnimationFrame(() => {
      this.languageOverlay.classList.add('fade-in');
      this.languageDropdown.classList.add('fade-in');
    });
  }

  /**
   * ปิด dropdown พร้อม animation fade out
   */
  closeLanguageDropdown() {
    if (!this.isLanguageDropdownOpen) return;

    return new Promise(resolve => {
      this.isLanguageDropdownOpen = false;

      // เริ่ม animation fade out
      this.languageOverlay.classList.remove('fade-in');
      this.languageDropdown.classList.remove('fade-in');
      this.languageOverlay.classList.add('fade-out');
      this.languageDropdown.classList.add('fade-out');

      // คืนค่าการเลื่อนหน้าเว็บ
      document.body.classList.remove('scroll-lock');
      document.body.style.top = '';
      window.scrollTo(0, this.scrollPosition);

      // รอให้ animation เสร็จสิ้น
      setTimeout(() => {
        // ซ่อน elements
        this.languageOverlay.style.display = 'none';
        this.languageDropdown.style.display = 'none';
        
        // ลบ class fade-out
        this.languageOverlay.classList.remove('fade-out');
        this.languageDropdown.classList.remove('fade-out');
        
        resolve();
      }, this.FADE_DURATION);
    });
  }
  
  /**
   * เลือกภาษา
   */
  async selectLanguage(language) {
   if (!this.languagesConfig[language]) {
    console.warn(`ไม่รองรับภาษา: ${language} กำลังใช้ภาษาอังกฤษแทน`);
    language = 'en';
   }
   
   if (this.selectedLang === language) {
    this.closeLanguageDropdown();
    return;
   }
   
   this.selectedLang = language;
   await this.updatePageLanguage(language);
   this.closeLanguageDropdown();
  }
  
  /**
   * อัพเดท URL ตามภาษาที่เลือก
   */
  updateURLLanguage(language) {
   const url = new URL(window.location.href);
   if (language === 'en') {
    url.searchParams.delete('lang');
   } else {
    url.searchParams.set('lang', language);
   }
   history.replaceState({}, '', url.toString());
  }
  
  /**
   * อัพเดทข้อความบนปุ่มเลือกภาษา
   */
  updateButtonText() {
   if (this.languageButton) {
    this.languageButton.textContent = this.languagesConfig[this.selectedLang]?.buttonText || 'Language';
   }
  }
  
  /**
   * เก็บเนื้อหาต้นฉบับ
   */
  storeOriginalContent() {
   document.querySelectorAll('[data-translate]').forEach(el => {
    if (!el.hasAttribute('data-original-text')) {
     el.setAttribute('data-original-text', el.textContent.trim());
    }
    if (!el.hasAttribute('data-original-style')) {
     el.setAttribute('data-original-style', el.style.cssText);
    }
   });
  }
  
  /**
   * คืนค่าเนื้อหาเป็นภาษาอังกฤษ
   */
  resetToEnglishContent() {
   document.querySelectorAll('[data-translate]').forEach(el => {
    const originalText = el.getAttribute('data-original-text');
    const originalStyle = el.getAttribute('data-original-style');
    
    if (originalText) {
     this.replaceTextOnly(el, originalText);
    }
    if (originalStyle) {
     el.style.cssText = originalStyle;
    }
   });
  }
  
  /**
   * ตรวจสอบความถูกต้องของข้อมูลภาษา
   */
  validateLanguageData(data) {
   return data &&
    typeof data === 'object' &&
    Object.keys(data).length > 0 &&
    Object.values(data).every(text =>
     typeof text === 'string' && text.trim().length > 0
    );
  }
  
  /**
   * กลับไปใช้ภาษาเริ่มต้น (อังกฤษ)
   */
  fallbackToDefaultLanguage() {
   this.selectedLang = 'en';
   this.resetToEnglishContent();
   this.updateButtonText();
   this.updateURLLanguage('en');
   localStorage.setItem('selectedLang', 'en');
  }

  /**
   * แสดงข้อความแจ้งเตือนพร้อม animation
   */
  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'language-error';
    errorDiv.textContent = message;

    document.body.appendChild(errorDiv);
    
    // เริ่ม animation แสดงข้อความ
    requestAnimationFrame(() => {
      errorDiv.classList.add('show');
      
      // ซ่อนข้อความอัตโนมัติ
      setTimeout(() => {
        errorDiv.classList.add('hide');
        errorDiv.classList.remove('show');
        
        // ลบ element หลังจาก animation เสร็จสิ้น
        setTimeout(() => errorDiv.remove(), 300);
      }, 3000);
    });
  }


  /**
   * ทำความสะอาดและยกเลิกการทำงานของ LanguageManager
   */
  destroy() {
   // ยกเลิก event listeners
   if (this.languageButton) {
    this.languageButton.remove();
   }
   if (this.languageOverlay) {
    this.languageOverlay.remove();
   }
   if (this.languageDropdown) {
    this.languageDropdown.remove();
   }
   
   // ยกเลิก mutation observer
   if (this.mutationObserver) {
    this.mutationObserver.disconnect();
   }
   
   // ล้าง cache
   this.languageCache.clear();
   
   // ล้างข้อมูลที่บันทึกไว้
   this.isInitialized = false;
   this.isLanguageDropdownOpen = false;
   this.isUpdatingLanguage = false;
  }
  }
  
  // สร้าง instance และเริ่มต้นการทำงาน
  const languageManager = new LanguageManager();
  
  // เริ่มต้นระบบเมื่อโหลดหน้าเว็บ
  window.addEventListener('DOMContentLoaded', () => {
   languageManager.loadLanguagesConfig();
   languageManager.observeMutations();
  });
  
  // Export สำหรับการใช้งานภายนอก
  if (typeof module !== 'undefined' && module.exports) {
   module.exports = languageManager;
  }