/**
 * ModernNavigation - ระบบจัดการการนำทางสมัยใหม่
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
    this.templatePath = config.templatePath || './assets/template/navigation-template.html';
    this.activeClass = config.activeClass || 'active';
    this.navItemSelector = config.navItemSelector || '.nav-item';
    
    // เก็บ reference ของ event listeners
    this._boundClickHandler = this._handleClick.bind(this);
    this._boundScrollHandler = this._handleScroll.bind(this);
    
    // สถานะการทำงาน
    this._initialized = false;
    this._eventsBound = false;
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
        this._injectNavigation()
      ]);

      this._setupNavigation();
      this._updateActiveState();
      this._initialized = true;

    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการ initialize ModernNavigation:', error);
      this._cleanup();
      throw error;
    }
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
   * เพิ่ม HTML template ของการนำทาง
   * @private
   * @returns {Promise<void>}
   */
  async _injectNavigation() {
    try {
      const response = await fetch(this.templatePath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const template = await response.text();
      
      // ตรวจสอบว่า template ถูกต้อง
      if (!template.trim()) {
        throw new Error('Navigation template ว่างเปล่า');
      }

      document.body.insertAdjacentHTML('beforeend', template);
    } catch (error) {
      console.error('ไม่สามารถโหลด navigation template:', error);
      throw error;
    }
  }

  /**
   * ตั้งค่า event listeners สำหรับการนำทาง
   * @private
   */
  _setupNavigation() {
    if (this._eventsBound) {
      return;
    }

    const navItems = document.querySelectorAll(this.navItemSelector);
    navItems.forEach(item => {
      item.addEventListener('click', this._boundClickHandler);
    });

    // เพิ่ม scroll listener สำหรับ performance optimization
    window.addEventListener('scroll', this._boundScrollHandler, { passive: true });
    
    this._eventsBound = true;
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
      // ป้องกันการ navigation ซ้ำ
      if (window.location.pathname.endsWith(targetUrl)) {
        return;
      }
      window.location.href = targetUrl;
    }
  }

  /**
   * จัดการ scroll event
   * @private
   */
  _handleScroll() {
    // ใช้ requestAnimationFrame เพื่อ optimize performance
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
   * ทำความสะอาด resources และ event listeners
   * @private
   */
  _cleanup() {
    if (this._eventsBound) {
      document.querySelectorAll(this.navItemSelector).forEach(item => {
        item.removeEventListener('click', this._boundClickHandler);
      });
      
      window.removeEventListener('scroll', this._boundScrollHandler);
      
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
    // สามารถกำหนดค่า config ได้ตามต้องการ
    // cssPath: 'custom-styles.css',
    // templatePath: 'custom-template.html',
  });
  navigation.init().catch(error => {
    console.error('เกิดข้อผิดพลาดในการ initialize navigation:', error);
  });
});