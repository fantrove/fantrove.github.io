/**
 * ModernNavigation - ระบบจัดการการนำทางสมัยใหม่แบบหลายภาษา
 * @class
 */
class ModernNavigation {
 /**
  * @constructor
  * @param {Object} config - ค่า config เริ่มต้น
  */
 constructor(config = {}) {
  // ค่าเริ่มต้นพื้นฐาน
  this.cssPath = config.cssPath || './assets/css/modern-styles.css';
  this.configPath = config.configPath || './assets/json/buttons.json';
  this.activeClass = config.activeClass || 'active';
  this.navItemSelector = config.navItemSelector || '.nav-item';
  
  // Template HTML สำหรับ Navigation
  this.template = `
      <nav class="bottom-nav">
        <!-- Navigation items จะถูกเพิ่มที่นี่โดย JavaScript -->
      </nav>
    `;
  
  // Template HTML สำหรับปุ่มนำทาง
  this.buttonTemplate = `
      <button class="nav-item" data-url="{url}">
        {icon}
        <div class="label">{label}</div>
      </button>
    `;
  
  // ค่าเริ่มต้นสำหรับการจัดการภาษา
  this.defaultLang = 'en';
  this.currentLang = localStorage.getItem('selectedLang') || this.defaultLang;
  
  // เก็บ cache ของข้อมูลการนำทาง
  this.navigationCache = new Map();
  
  // เก็บ reference ของ event listeners
  this._boundClickHandler = this._handleClick.bind(this);
  this._boundScrollHandler = this._handleScroll.bind(this);
  this._boundLangChangeHandler = this._handleLanguageChange.bind(this);
  
  // สถานะการทำงาน
  this._initialized = false;
  this._eventsBound = false;
  this._config = null;
 }
 
 /**
  * เริ่มต้นการทำงานของระบบนำทาง
  * @returns {Promise<void>}
  */
 async init() {
  try {
   if (this._initialized) {
    console.warn('ModernNavigation ถูก initialize แล้ว');
    return;
   }
   
   await Promise.all([
    this._loadCSS(),
    this._loadConfig()
   ]);
   
   this._injectNavigation();
   this._setupNavigation();
   this._updateActiveState();
   this._setupLanguageListener();
   this._initialized = true;
   
  } catch (error) {
   console.error('เกิดข้อผิดพลาดในการ initialize ModernNavigation:', error);
   this._cleanup();
   throw error;
  }
 }
 
 /**
  * แทรก Navigation HTML เข้าไปในหน้าเว็บ
  * @private
  */
 _injectNavigation() {
  const navigationElement = document.createElement('div');
  navigationElement.innerHTML = this.template.trim();
  document.body.appendChild(navigationElement.firstChild);
  this._createNavigationItems();
 }
 
 /**
  * สร้างปุ่มนำทางจาก template และ config
  * @private
  */
 _createNavigationItems() {
  const navContainer = document.querySelector('.bottom-nav');
  if (!navContainer || !this._config?.navigation) return;
  
  navContainer.innerHTML = this._config.navigation.map(item => {
   return this.buttonTemplate
    .replace('{url}', item.url)
    .replace('{icon}', item.icon || '')
    .replace('{label}', item[`${this.currentLang}_label`] || item.en_label || 'Missing Label');
  }).join('');
 }
 
 /**
  * โหลดไฟล์ config สำหรับการนำทาง
  * @private
  * @returns {Promise<void>}
  */
 async _loadConfig() {
  try {
   const cached = this.navigationCache.get('config');
   if (cached && Date.now() - cached.timestamp < 300000) {
    this._config = cached.data;
    return;
   }
   
   const response = await fetch(this.configPath);
   if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
   
   this._config = await response.json();
   
   this.navigationCache.set('config', {
    data: this._config,
    timestamp: Date.now()
   });
   
  } catch (error) {
   console.error('ไม่สามารถโหลด navigation config:', error);
   throw error;
  }
 }
 
 /**
  * อัปเดต labels ตามภาษาที่เลือก
  * @private
  */
 _updateLabels() {
  document.querySelectorAll(this.navItemSelector).forEach(item => {
   const labelElement = item.querySelector('.label');
   if (!labelElement) return;
   
   const itemUrl = item.dataset.url;
   const configItem = this._config?.navigation.find(nav => nav.url === itemUrl);
   if (!configItem) return;
   
   labelElement.textContent = configItem[`${this.currentLang}_label`] ||
    configItem.en_label ||
    'Missing Label';
  });
 }
 
 /**
  * จัดการการคลิกที่รายการนำทาง
  * @private
  * @param {Event} event
  */
 _handleClick(event) {
  const item = event.currentTarget;
  const targetUrl = item.dataset.url;
  
  if (targetUrl && !item.classList.contains(this.activeClass)) {
   if (window.location.pathname.endsWith(targetUrl)) return;
   window.location.href = targetUrl;
  }
 }
 
 /**
  * จัดการ scroll event
  * @private
  */
 _handleScroll() {
  if (!this._scrollTimeout) {
   this._scrollTimeout = window.requestAnimationFrame(() => {
    this._updateActiveState();
    this._scrollTimeout = null;
   });
  }
 }
 
 /**
  * อัพเดทสถานะ active ของรายการนำทาง
  * @private
  */
 _updateActiveState() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll(this.navItemSelector).forEach(item => {
   item.classList.toggle(this.activeClass, item.dataset.url === currentPage);
  });
 }
 
 /**
  * จัดการการเปลี่ยนภาษา
  * @private
  * @param {CustomEvent} event
  */
 _handleLanguageChange(event) {
  this.currentLang = event.detail.language;
  this._updateLabels();
 }
 
 /**
  * ตั้งค่า event listeners
  * @private
  */
 _setupNavigation() {
  if (this._eventsBound) return;
  
  document.querySelectorAll(this.navItemSelector).forEach(item => {
   item.addEventListener('click', this._boundClickHandler);
  });
  
  window.addEventListener('scroll', this._boundScrollHandler, { passive: true });
  this._eventsBound = true;
 }
 
 /**
  * ตั้งค่า event listener สำหรับการเปลี่ยนภาษา
  * @private
  */
 _setupLanguageListener() {
  window.addEventListener('languageChange', this._boundLangChangeHandler);
 }
 
 /**
  * โหลด CSS สำหรับการนำทาง
  * @private
  * @returns {Promise<void>}
  */
 async _loadCSS() {
  return new Promise((resolve, reject) => {
   if (document.querySelector(`link[href="${this.cssPath}"]`)) {
    resolve();
    return;
   }
   
   const link = document.createElement('link');
   link.rel = 'stylesheet';
   link.href = this.cssPath;
   
   link.onload = () => resolve();
   link.onerror = () => reject(new Error(`ไม่สามารถโหลด CSS: ${this.cssPath}`));
   
   document.head.appendChild(link);
  });
 }
 
 /**
  * ทำความสะอาด resources และ event listeners
  * @private
  */
 _cleanup() {
  if (this._eventsBound) {
   document.querySelectorAll(this.navItemSelector).forEach(item => {
    item.removeEventListener('click', this._boundClickHandler);
   });
   
   window.removeEventListener('scroll', this._boundScrollHandler);
   window.removeEventListener('languageChange', this._boundLangChangeHandler);
   
   if (this._scrollTimeout) {
    window.cancelAnimationFrame(this._scrollTimeout);
    this._scrollTimeout = null;
   }
   
   this._eventsBound = false;
  }
 }
 
 /**
  * ยกเลิกการทำงานของ ModernNavigation
  * @public
  */
 destroy() {
  this._cleanup();
  this._initialized = false;
 }
}

// Initialize เมื่อ DOM พร้อม
document.addEventListener('DOMContentLoaded', () => {
 const navigation = new ModernNavigation({
  cssPath: './assets/css/modern-styles.css',
  configPath: './assets/json/template/template.json',
 });
 
 navigation.init().catch(error => {
  console.error('เกิดข้อผิดพลาดในการ initialize navigation:', error);
 });
});