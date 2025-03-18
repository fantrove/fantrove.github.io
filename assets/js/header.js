/**
 * header.js - Enhanced version
 * ปรับปรุงประสิทธิภาพและความเสถียร
 */
document.addEventListener('DOMContentLoaded', () => {
    // ประกาศตัวแปรสำหรับใช้ทั้งไฟล์
    const state = {
        isRendering: false,
        debounceTimer: null,
        buttonConfig: null,
        cache: new Map()
    };

    // Element selectors
    const elements = {
        header: document.querySelector('header'),
        navButtons: document.querySelectorAll('nav ul li button'),
        logo: document.querySelector('.logo'),
        navList: document.getElementById('nav-list'),
        subButtonsContainer: document.getElementById('sub-buttons-container')
    };

    // Constants
    const CONSTANTS = {
        ANIMATION_DURATION: 500,
        SCROLL_THRESHOLD: 1.27,
        CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
        FETCH_TIMEOUT: 5000,
        RETRY_DELAY: 2000,
        MAX_RETRIES: 3
    };

    // Error handling
    class AppError extends Error {
        constructor(message, type = 'general', original = null) {
            super(message);
            this.name = 'AppError';
            this.type = type;
            this.original = original;
        }
    }

    // Utils
    const utils = {
        async debounce(func, wait) {
            clearTimeout(state.debounceTimer);
            return new Promise(resolve => {
                state.debounceTimer = setTimeout(() => {
                    resolve(func());
                }, wait);
            });
        },

        isOnline() {
            return navigator.onLine;
        },

        async copyToClipboard(content) {
            try {
                await navigator.clipboard.writeText(content);
                this.showNotification('เนื้อหาถูกคัดลอกไปยังคลิปบอร์ดแล้ว!', 'success');
            } catch (error) {
                throw new AppError('ไม่สามารถคัดลอกข้อความได้', 'clipboard', error);
            }
        },

        showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        }
    };

// NavigationManager ที่ปรับปรุงใหม่
const NavigationManager = {
 // เก็บประวัติการนำทาง
 history: [],
 maxHistory: 50,
 
 // เพิ่มรายการใหม่ในประวัติ
 addEntry(url, type = 'user') {
  this.history.unshift({
   url: this.normalizeUrl(url),
   type,
   timestamp: Date.now()
  });
  if (this.history.length > this.maxHistory) {
   this.history.pop();
  }
 },
 
 // เพิ่มตัวแปรควบคุมการทำงาน
 state: {
  isNavigating: false,
  isInitialLoad: true,
  initialUrl: window.location.hash.replace('#', '') || ''
 },
 
 // ทำความสะอาด URL
 normalizeUrl(url) {
  return url.toLowerCase().trim().replace(/^#/, '');
 },
 
 // เปรียบเทียบ URL อย่างแม่นยำ
 compareUrls(url1, url2) {
  return this.normalizeUrl(url1) === this.normalizeUrl(url2);
 },
 
 // ฟังก์ชันหลักสำหรับการนำทาง
 async navigateTo(route, options = {}) {
  try {
   if (!route) {
    throw new AppError('ไม่ได้ระบุเส้นทางในการนำทาง', 'navigation');
   }
   
   // ป้องกันการเรียกซ้ำขณะกำลังนำทาง
   if (this.state.isNavigating) {
    return;
   }
   
   this.state.isNavigating = true;
   
   // ตรวจสอบว่าเป็นการโหลดครั้งแรกหรือไม่
   const isFirstLoad = this.state.isInitialLoad;
   
   try {
    // เพิ่มรายการในประวัติ
    this.addEntry(route);
    
    // อัพเดท URL ถ้าไม่ได้กำหนดให้ข้าม
    if (!options.skipUrlUpdate) {
     await this.changeURL(route);
    }
    
    // อัพเดทสถานะปุ่ม
    await this.updateButtonStates();
    
    // เลื่อนปุ่มที่ active ไปทางซ้าย
    setTimeout(() => this.scrollActiveButtonToLeft(), 100);
    
    // ถ้าเป็นการโหลดครั้งแรก ให้จัดการพิเศษ
    if (isFirstLoad) {
     this.state.isInitialLoad = false;
     this.state.initialUrl = '';
    }
    
   } finally {
    this.state.isNavigating = false;
   }
   
  } catch (error) {
   this.state.isNavigating = false;
   throw new AppError('เกิดข้อผิดพลาดในการนำทาง', 'navigation', error);
  }
 },
 
 // ปรับปรุงฟังก์ชันเปลี่ยน URL
 async changeURL(url) {
   try {
    const newUrl = url.includes('#') ? url : `#${url}`;
    if (window.location.hash !== newUrl) {
     history.pushState(null, '', newUrl);
     // เพิ่ม Event เพื่อแจ้งการเปลี่ยนแปลง URL
     window.dispatchEvent(new CustomEvent('urlChanged', {
      detail: { url: newUrl }
     }));
    }
   } catch (error) {
    console.error('เกิดข้อผิดพลาดในการเปลี่ยน URL:', error);
    throw new AppError('ไม่สามารถเปลี่ยน URL ได้', 'navigation', error);
   }
  },
  
  // เพิ่มฟังก์ชันตรวจสอบความถูกต้องของ URL
  async validateUrl(url) {
   // ตรวจสอบว่า URL ตรงกับปุ่มที่มีอยู่หรือไม่
   const buttons = document.querySelectorAll('button[data-url]');
   const validUrls = Array.from(buttons).map(btn => btn.getAttribute('data-url'));
   return validUrls.includes(url.replace('#', ''));
  },
 
 // ฟังก์ชันใหม่สำหรับการเลื่อนปุ่ม active ไปทางซ้าย
 scrollActiveButtonToLeft() {
  const activeButton = document.querySelector('nav ul li button.active');
  if (activeButton) {
   const navContainer = document.querySelector('nav ul');
   const buttonOffset = activeButton.offsetLeft;
   
   // คำนวณระยะห่างจากขอบซ้าย (เพิ่ม padding)
   const scrollLeft = Math.max(0, buttonOffset - 20);
   
   // ทำการเลื่อนแบบ smooth
   navContainer.scrollTo({
    left: scrollLeft,
    behavior: 'smooth'
   });
  }
 },
 
 // อัพเดทสถานะปุ่มทั้งหมด
 async updateButtonStates() {
  try {
   const currentUrl = window.location.hash || '';
   const normalizedCurrentUrl = this.normalizeUrl(currentUrl);
   
   // เก็บปุ่มที่ active ไว้ตรวจสอบ
   const activeButtons = new Set();
   
   // รวบรวมปุ่มทั้งหมด
   const allButtons = [
    ...document.querySelectorAll('nav ul li button'),
    ...document.querySelectorAll('.button-sub')
   ];
   
   // ล้าง active state ทั้งหมดก่อน
   allButtons.forEach(button => {
    button.classList.remove('active');
   });
   
   // ตรวจสอบและเปรียบเทียบ URL อย่างละเอียด
   allButtons.forEach(button => {
    const buttonUrl = button.getAttribute('data-url');
    if (!buttonUrl) return;
    
    const normalizedButtonUrl = this.normalizeUrl(buttonUrl);
    
    // ตรวจสอบว่าเป็น URL เดียวกันพอดี
    if (this.compareUrls(normalizedCurrentUrl, normalizedButtonUrl)) {
     button.classList.add('active');
     activeButtons.add(normalizedButtonUrl);
    }
    // กรณีที่เป็น URL แบบมี sub-route
    else if (normalizedCurrentUrl.includes('-')) {
     const [mainRoute, subRoute] = normalizedCurrentUrl.split('-');
     if (this.compareUrls(normalizedButtonUrl, mainRoute) ||
      this.compareUrls(normalizedButtonUrl, subRoute)) {
      if (!activeButtons.has(normalizedButtonUrl)) {
       button.classList.add('active');
       activeButtons.add(normalizedButtonUrl);
      }
     }
    }
   });
   
   // ตรวจสอบความขัดแย้ง
   this.validateActiveStates(activeButtons);
   
   // เลื่อนปุ่ม active ไปทางซ้าย
   setTimeout(() => this.scrollActiveButtonToLeft(), 100);
   
  } catch (error) {
   console.error('Error updating button states:', error);
   throw new AppError('เกิดข้อผิดพลาดในการอัพเดทสถานะปุ่ม', 'button-state', error);
  }
 },
 
 // ตรวจสอบความขัดแย้งของ active states
 validateActiveStates(activeButtons) {
  if (activeButtons.size > 2) {
   console.warn('พบการ active มากกว่า 2 ปุ่ม - กำลังแก้ไข...');
   
   // เก็บเฉพาะปุ่มที่ตรงกับ URL ปัจจุบันที่สุด
   const currentUrl = this.normalizeUrl(window.location.hash);
   const allButtons = document.querySelectorAll('button.active');
   
   allButtons.forEach(button => {
    const buttonUrl = this.normalizeUrl(button.getAttribute('data-url') || '');
    if (!this.isClosestMatch(buttonUrl, currentUrl)) {
     button.classList.remove('active');
    }
   });
  }
 },
 
 // ตรวจสอบความใกล้เคียงของ URL
 isClosestMatch(buttonUrl, currentUrl) {
  if (this.compareUrls(buttonUrl, currentUrl)) return true;
  
  // กรณี sub-route
  if (currentUrl.includes('-')) {
   const [mainRoute, subRoute] = currentUrl.split('-');
   return this.compareUrls(buttonUrl, mainRoute) ||
    this.compareUrls(buttonUrl, subRoute);
  }
  
  return false;
 },
 
 // คำนวณความคล้ายคลึงของ URL
 calculateUrlSimilarity(url1, url2) {
  const normalized1 = this.normalizeUrl(url1);
  const normalized2 = this.normalizeUrl(url2);
  
  if (normalized1 === normalized2) return 1;
  
  // ใช้ Levenshtein Distance algorithm
  const distance = this.levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  
  return 1 - (distance / maxLength);
 },
 
 // คำนวณระยะห่างระหว่างข้อความ (Levenshtein Distance)
 levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
   for (let j = 1; j <= n; j++) {
    if (str1[i - 1] === str2[j - 1]) {
     dp[i][j] = dp[i - 1][j - 1];
    } else {
     dp[i][j] = 1 + Math.min(
      dp[i - 1][j], // ลบ
      dp[i][j - 1], // เพิ่ม
      dp[i - 1][j - 1] // แทนที่
     );
    }
   }
  }
  
  return dp[m][n];
 }
};

// เพิ่ม Event Listener สำหรับการ resize หน้าจอ
window.addEventListener('resize', () => {
 NavigationManager.scrollActiveButtonToLeft();
});

// เพิ่ม Event Listener สำหรับการโหลดหน้าเว็บครั้งแรก
document.addEventListener('DOMContentLoaded', () => {
 NavigationManager.updateButtonStates();
});

    // Content Management
    const ContentManager = {
        async clearContent() {
            const contentElements = document.querySelectorAll('[id^="content-"]');
            
            await Promise.all(Array.from(contentElements).map(element => {
                return new Promise(resolve => {
                    const handleAnimationEnd = () => {
                        element.innerHTML = '';
                        element.classList.remove('fade-out');
                        element.removeEventListener('animationend', handleAnimationEnd);
                        resolve();
                    };

                    element.addEventListener('animationend', handleAnimationEnd);
                    element.classList.add('fade-out');

                    // Fallback
                    setTimeout(handleAnimationEnd, CONSTANTS.ANIMATION_DURATION);
                });
            }));
        },

        async renderContent(data) {
            if (!Array.isArray(data)) {
                throw new AppError('ข้อมูลที่ได้รับไม่ใช่อาร์เรย์', 'render');
            }

            await this.clearContent();
            if (state.isRendering) return;
            
            state.isRendering = true;
            
            try {
                await Promise.all(data.map(async item => {
                    const targetElement = document.getElementById(item.id);
                    if (!targetElement) return;

                    targetElement.innerHTML = '';
                    const container = this.createContainer(item);
                    
                    if (item.group?.items) {
                        await this.renderGroupItems(container, item.group);
                    } else {
                        await this.renderSingleItem(container, item);
                    }
                    
                    targetElement.appendChild(container);
                }));
            } finally {
                state.isRendering = false;
            }
        },

    createContainer(item) {
     const container = document.createElement('div');
     container.className = item.group?.type === 'button' ?
      'button-content-container' : 'card-content-container';
     
     // เพิ่ม custom class สำหรับ container ถ้ามีการระบุ
     if (item.group?.containerClass) {
      container.classList.add(item.group.containerClass);
     }
     
     return container;
    },

    async renderGroupItems(container, group) {
      // เพิ่มการสร้าง Group Header ถ้ามีการระบุ
      if (group.header) {
       const headerElement = this.createGroupHeader(group.header);
       container.appendChild(headerElement);
      }
      
      const renderPromises = group.items.map(item =>
       group.type === 'button' ?
       this.createButton(item.content) :
       this.createCard(item)
      );
      
      const elements = await Promise.all(renderPromises);
      elements.forEach(element => {
       if (element) container.appendChild(element);
      });
     },
     
// ปรับปรุงโครงสร้างของ Group Header ให้เรียบง่ายขึ้น
createGroupHeader(headerConfig) {
  // สร้าง container หลัก
  const headerContainer = document.createElement('div');
  headerContainer.className = 'group-header';
  
  // รับภาษาปัจจุบัน
  const currentLang = localStorage.getItem('selectedLang') || 'en';
  
  // จัดการกับ headerConfig ที่เป็น string
  if (typeof headerConfig === 'string') {
   return this.createSimpleHeader(headerConfig, headerContainer);
  }
  
  // เพิ่ม custom class ถ้ามี
  if (headerConfig.className) {
   headerContainer.classList.add(headerConfig.className);
  }
  
  // สร้างส่วนประกอบต่างๆ
  this.createHeaderComponents(headerContainer, headerConfig, currentLang);
  
  // เพิ่ม event listener สำหรับการเปลี่ยนภาษา
  this.addLanguageChangeListener(headerContainer, headerConfig);
  
  return headerContainer;
 },
 
 // สร้าง header แบบง่าย
 createSimpleHeader(text, container) {
  const headerText = document.createElement('h2');
  headerText.className = 'group-header-text';
  headerText.textContent = text;
  container.appendChild(headerText);
  return container;
 },
 
 // สร้างส่วนประกอบของ header
 createHeaderComponents(container, config, currentLang) {
  // 1. สร้างไอคอน (ถ้ามี)
  if (config.icon) {
   container.appendChild(this.createHeaderIcon(config.icon));
  }
  
  // 2. สร้างส่วนหัว
  const headerContent = document.createElement('div');
  headerContent.className = 'header-content';
  
  // 2.1 สร้างหัวข้อ
  const title = this.createHeaderTitle(config, currentLang);
  headerContent.appendChild(title);
  
  // 2.2 สร้างคำอธิบาย (ถ้ามี)
  if (config.description) {
   const desc = this.createHeaderDescription(config.description, currentLang);
   headerContent.appendChild(desc);
  }
  
  container.appendChild(headerContent);
  
  // 3. สร้างปุ่มเสริม (ถ้ามี)
  if (config.actions) {
   container.appendChild(this.createHeaderActions(config.actions, currentLang));
  }
 },
 
 // สร้างหัวข้อ
 createHeaderTitle(config, currentLang) {
  const title = document.createElement('h2');
  title.className = 'group-header-text';
  
  // เก็บข้อมูลภาษาใน data attributes
  if (typeof config.title === 'object') {
   Object.entries(config.title).forEach(([lang, text]) => {
    title.dataset[`title${lang.toUpperCase()}`] = text;
   });
   title.textContent = config.title[currentLang] || config.title.en;
  } else {
   title.textContent = config.title;
  }
  
  return title;
 },
 
 // สร้างคำอธิบาย
 createHeaderDescription(description, currentLang) {
  const desc = document.createElement('p');
  desc.className = 'group-header-description';
  
  if (typeof description === 'object') {
   Object.entries(description).forEach(([lang, text]) => {
    desc.dataset[`desc${lang.toUpperCase()}`] = text;
   });
   desc.textContent = description[currentLang] || description.en;
  } else {
   desc.textContent = description;
  }
  
  return desc;
 },
 
 // เพิ่ม event listener สำหรับการเปลี่ยนภาษา
 addLanguageChangeListener(container, config) {
  window.addEventListener('languageChange', (event) => {
   const newLang = event.detail.language;
   this.updateHeaderLanguage(container, config, newLang);
  });
 },

        async renderSingleItem(container, item) {
            const element = item.type === 'button' ? 
                await this.createButton(item.content) : 
                await this.createCard(item);
            
            if (element) container.appendChild(element);
        },

    async createButton(content) {
      const button = document.createElement('button');
      button.className = 'button-content';
      button.textContent = content;
      const wrapper = document.createElement('div');
      wrapper.appendChild(button);
      
      button.addEventListener('click', async () => {
       try {
        await utils.copyToClipboard(content);
       } catch (error) {
        utils.showNotification(error.message, 'error');
       }
      });
      
      return this.animateElement(wrapper);
     },
     
async createCard(cardConfig) {
  const lang = localStorage.getItem('selectedLang') || 'en';
  const card = document.createElement('button');
  card.className = 'card';
  const wrapper = document.createElement('div');
  
  // จัดการรูปภาพ
  if (cardConfig.image) {
    const img = document.createElement('img');
    img.className = 'card-image';
    img.src = cardConfig.image;
    img.loading = 'lazy';
    
    // เพิ่มการรองรับ alt text หลายภาษา
    img.alt = cardConfig.imageAlt?.[lang] || cardConfig.imageAlt?.en || '';
    
    card.appendChild(img);
  }
  
  // จัดการหัวข้อ
  const titleDiv = document.createElement('h1');
  titleDiv.className = 'card-title';
  
  // เก็บข้อความหลายภาษาใน data attributes
  if (typeof cardConfig.title === 'object') {
    Object.entries(cardConfig.title).forEach(([langCode, text]) => {
      titleDiv.dataset[`title${langCode.toUpperCase()}`] = text;
    });
    titleDiv.textContent = cardConfig.title[lang] || cardConfig.title.en;
  } else {
    titleDiv.textContent = cardConfig.title;
  }
  card.appendChild(titleDiv);
  
  // จัดการคำอธิบาย
  const descDiv = document.createElement('p');
  descDiv.className = 'card-description';
  
  // เก็บข้อความหลายภาษาใน data attributes
  if (typeof cardConfig.description === 'object') {
    Object.entries(cardConfig.description).forEach(([langCode, text]) => {
      descDiv.dataset[`desc${langCode.toUpperCase()}`] = text;
    });
    descDiv.textContent = cardConfig.description[lang] || cardConfig.description.en;
  } else {
    descDiv.textContent = cardConfig.description;
  }
  card.appendChild(descDiv);
  
  // จัดการลิงก์
  if (cardConfig.link) {
    card.addEventListener('click', () => {
      window.open(cardConfig.link, '_blank', 'noopener');
    });
  }
  
  // เพิ่มคลาสเพิ่มเติม (ถ้ามี)
  if (cardConfig.className) {
    card.classList.add(cardConfig.className);
  }
  
  wrapper.appendChild(card);
  return this.animateElement(wrapper);
},

// เพิ่มในส่วน DataManager หรือ ContentManager
updateCardsLanguage(lang) {
  document.querySelectorAll('.card').forEach(card => {
    // อัพเดทหัวข้อ
    const titleElement = card.querySelector('.card-title');
    if (titleElement) {
      const newTitle = titleElement.dataset[`title${lang.toUpperCase()}`];
      if (newTitle) {
        titleElement.textContent = newTitle;
      }
    }
    
    // อัพเดทคำอธิบาย
    const descElement = card.querySelector('.card-description');
    if (descElement) {
      const newDesc = descElement.dataset[`desc${lang.toUpperCase()}`];
      if (newDesc) {
        descElement.textContent = newDesc;
      }
    }
    
    // อัพเดท alt text ของรูปภาพ
    const imgElement = card.querySelector('.card-image');
    if (imgElement) {
      const newAlt = imgElement.dataset[`alt${lang.toUpperCase()}`];
      if (newAlt) {
        imgElement.alt = newAlt;
      }
    }
  });
},

      
      async animateElement(element) {
       return new Promise(resolve => {
        requestAnimationFrame(() => {
         const handleAnimationEnd = () => {
          element.removeEventListener('animationend', handleAnimationEnd);
          resolve(element);
         };
         
         element.addEventListener('animationend', handleAnimationEnd);
         element.classList.add('fade-in');
         
         // Fallback
         setTimeout(() => handleAnimationEnd(), CONSTANTS.ANIMATION_DURATION);
        });
       });
      }
    };

    // Data Management
    const DataManager = {
        async fetchWithTimeout(url, options = {}, timeout = CONSTANTS.FETCH_TIMEOUT) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
                const response = await fetch(url, { 
                    ...options, 
                    signal: controller.signal,
                    headers: {
                        'Cache-Control': 'no-cache',
                        ...options.headers
                    }
                });

                if (!response.ok) {
                    throw new AppError(`HTTP error! status: ${response.status}`, 'fetch');
                }

                return await response.json();
            } finally {
                clearTimeout(timeoutId);
            }
        },

        async fetchWithRetry(url, retries = CONSTANTS.MAX_RETRIES) {
            try {
                return await this.fetchWithTimeout(url);
            } catch (error) {
                if (retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, CONSTANTS.RETRY_DELAY));
                    return this.fetchWithRetry(url, retries - 1);
                }
                throw error;
            }
        },

        getCached(key) {
            const cached = state.cache.get(key);
            if (!cached) return null;

            const isExpired = Date.now() - cached.timestamp > CONSTANTS.CACHE_DURATION;
            if (isExpired) {
                state.cache.delete(key);
                return null;
            }

            return cached.data;
        },

        setCache(key, data) {
            state.cache.set(key, {
                data,
                timestamp: Date.now()
            });
        }
    };

    // Scroll Management
// ScrollManager ที่ปรับปรุงใหม่ใช้ Animation-based
const ScrollManager = {
 init() {
  // ตัวแปรสำหรับควบคุมสถานะ
  const state = {
   isAnimating: false,
   lastScrollY: window.pageYOffset,
   headerVisible: true,
   animationFrame: null,
   headerHeight: 0,
   scrollDirection: 0,
   scrollTimeout: null
  };
  
  // ค่าคงที่สำหรับการปรับแต่ง
  const SETTINGS = {
   // ระยะ scroll ขั้นต่ำที่จะเริ่มทำงาน (px)
   SCROLL_THRESHOLD: 20,
   // ความเร็วในการแสดง/ซ่อน header (ms)
   ANIMATION_DURATION: 300,
   // ระยะเวลารอก่อนรีเซ็ต header (ms)
   RESET_DELAY: 130,
   // ระยะการเลื่อนขั้นต่ำที่จะเริ่มตรวจจับทิศทาง (px)
   DIRECTION_THRESHOLD: 5,
   // ความเร็วในการ scroll ที่จะทริกเกอร์ animation (px/ms)
   VELOCITY_THRESHOLD: 0.5
  };
  
  // Keyframes สำหรับ animation
  const ANIMATIONS = {
   hideHeader: [
    { transform: 'translateY(0)', offset: 0 },
    { transform: 'translateY(-50%)', offset: 1 }
   ],
   showHeader: [
    { transform: 'translateY(-50%)', offset: 0 },
    { transform: 'translateY(0)', offset: 1 }
   ]
  };
  
  // Animation timing
  const TIMING = {
   duration: SETTINGS.ANIMATION_DURATION,
   easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)', // Material Design easing
   fill: 'forwards'
  };
  
  // ฟังก์ชันสำหรับคำนวณความเร็วการ scroll
  const calculateScrollVelocity = (() => {
   let lastScrollY = window.pageYOffset;
   let lastScrollTime = performance.now();
   
   return () => {
    const currentScrollY = window.pageYOffset;
    const currentTime = performance.now();
    const timeDiff = currentTime - lastScrollTime;
    const scrollDiff = currentScrollY - lastScrollY;
    
    lastScrollY = currentScrollY;
    lastScrollTime = currentTime;
    
    return timeDiff > 0 ? scrollDiff / timeDiff : 0;
   };
  })();
  
  // ฟังก์ชันจัดการ animation
  const animateHeader = (show) => {
   const { header } = elements;
   if (!header || state.isAnimating) return;
   
   // ยกเลิก animation ที่กำลังเล่นอยู่
   header.getAnimations().forEach(animation => animation.cancel());
   
   // สร้างและเริ่ม animation ใหม่
   const animation = header.animate(
    show ? ANIMATIONS.showHeader : ANIMATIONS.hideHeader,
    TIMING
   );
   
   state.isAnimating = true;
   state.headerVisible = show;
   
   animation.onfinish = () => {
    state.isAnimating = false;
   };
  };
  
  // ฟังก์ชันหลักจัดการ scroll
  const handleScroll = () => {
   if (state.animationFrame) {
    cancelAnimationFrame(state.animationFrame);
   }
   
   state.animationFrame = requestAnimationFrame(() => {
    const currentScrollY = window.pageYOffset;
    const scrollDiff = currentScrollY - state.lastScrollY;
    const velocity = calculateScrollVelocity();
    
    // ตรวจสอบทิศทางและความเร็วของการ scroll
    if (Math.abs(scrollDiff) > SETTINGS.DIRECTION_THRESHOLD) {
     const scrollingDown = scrollDiff > 0;
     const velocityTriggered = Math.abs(velocity) > SETTINGS.VELOCITY_THRESHOLD;
     
     // เช็คเงื่อนไขการแสดง/ซ่อน header
     if (currentScrollY > SETTINGS.SCROLL_THRESHOLD) {
      if (scrollingDown && state.headerVisible && velocityTriggered) {
       // ซ่อน header เมื่อเลื่อนลงเร็วๆ
       animateHeader(false);
      } else if (!scrollingDown && !state.headerVisible && velocityTriggered) {
       // แสดง header เมื่อเลื่อนขึ้นเร็วๆ
       animateHeader(true);
      }
     } else if (currentScrollY <= 0 && !state.headerVisible) {
      // แสดง header เมื่ออยู่บนสุด
      animateHeader(true);
     }
    }
    
    state.lastScrollY = currentScrollY;
    state.scrollDirection = scrollDiff;
   });
   
   // รีเซ็ต timeout สำหรับการตรวจสอบการหยุด scroll
   clearTimeout(state.scrollTimeout);
   state.scrollTimeout = setTimeout(() => {
    const currentScrollY = window.pageYOffset;
    if (currentScrollY <= SETTINGS.SCROLL_THRESHOLD && !state.headerVisible) {
     animateHeader(true);
    }
   }, SETTINGS.RESET_DELAY);
  };
  
  // Touch handling สำหรับมือถือ
  let touchStartY = 0;
  let lastTouchY = 0;
  let touchStartTime = 0;
  
  const handleTouchStart = (e) => {
   touchStartY = e.touches[0].clientY;
   lastTouchY = touchStartY;
   touchStartTime = performance.now();
   state.isAnimating = false;
  };
  
  const handleTouchMove = (e) => {
   const currentY = e.touches[0].clientY;
   const touchDiff = currentY - lastTouchY;
   const timeDiff = performance.now() - touchStartTime;
   const velocity = touchDiff / timeDiff;
   
   if (Math.abs(velocity) > SETTINGS.VELOCITY_THRESHOLD) {
    if (velocity > 0 && !state.headerVisible) {
     animateHeader(true);
    } else if (velocity < 0 && state.headerVisible) {
     animateHeader(false);
    }
   }
   
   lastTouchY = currentY;
  };
  
  // Event Listeners
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('touchstart', handleTouchStart, { passive: true });
  window.addEventListener('touchmove', handleTouchMove, { passive: true });
  
  // Resize Observer
  const resizeObserver = new ResizeObserver((entries) => {
   for (const entry of entries) {
    if (entry.target === elements.header) {
     state.headerHeight = entry.contentRect.height;
    }
   }
  });
  
  if (elements.header) {
   resizeObserver.observe(elements.header);
  }
 },
 
 // รีเซ็ต ScrollManager
 reset() {
  const { header } = elements;
  if (header) {
   header.getAnimations().forEach(animation => animation.cancel());
   header.style.transform = 'translateY(0)';
  }
 }
};

    // Button Configuration
    const ButtonManager = {
        async loadConfig() {
            try {
                if (state.buttonConfig) {
                    this.renderMainButtons();
                    return;
                }

                const cached = DataManager.getCached('buttonConfig');
                if (cached) {
                    state.buttonConfig = cached;
                    this.renderMainButtons();
                    return;
                }

                const response = await DataManager.fetchWithRetry('./assets/json/buttons.json');
                state.buttonConfig = response;
                DataManager.setCache('buttonConfig', response);
                
                this.renderMainButtons();
                await NavigationManager.updateButtonStates();

            } catch (error) {
                throw new AppError('ไม่สามารถโหลดการตั้งค่าปุ่มได้', 'config', error);
            }
        },

// ในส่วน ButtonManager ให้แก้ไขฟังก์ชัน renderMainButtons ดังนี้
renderMainButtons() {
  const lang = localStorage.getItem('selectedLang') || 'en';
  const { mainButtons } = state.buttonConfig;
  const { navList } = elements;
  const currentUrl = window.location.hash.replace('#', '') || '';
  
  navList.innerHTML = '';
  
  // สร้างแมพของปุ่มเพื่อเก็บการอ้างอิง
  const buttonMap = new Map();
  let defaultButton = null;
  
  mainButtons.forEach(button => {
   const label = button[`${lang}_label`];
   if (!label) return;
   
   const li = document.createElement('li');
   const mainButton = document.createElement('button');
   mainButton.textContent = label;
   const buttonUrl = button.url || button.jsonFile;
   mainButton.setAttribute('data-url', buttonUrl);
   
   // เก็บการอ้างอิงปุ่มและข้อมูล
   buttonMap.set(buttonUrl, {
    button: mainButton,
    config: button
   });
   
   if (button.isDefault) {
    defaultButton = {
     button: mainButton,
     config: button
    };
   }
   
   mainButton.addEventListener('click', async () => {
    try {
     await ContentManager.clearContent();
     
     if (!button.subButtons && button.url) {
      await NavigationManager.navigateTo(button.url);
     }
     
     if (button.jsonFile) {
      const data = await DataManager.fetchWithRetry(button.jsonFile);
      await ContentManager.renderContent(data);
     } else if (button.subButtons) {
      await this.renderSubButtons(button.subButtons, button.url, lang, currentUrl);
     }
    } catch (error) {
     utils.showNotification(error.message, 'error');
    }
   });
   
   li.appendChild(mainButton);
   navList.appendChild(li);
  });
  
  // ตรวจสอบ URL ปัจจุบันและคลิกปุ่มที่เหมาะสม
  this.handleInitialNavigation(currentUrl, buttonMap, defaultButton);
 },
 
async handleInitialNavigation(currentUrl, buttonMap, defaultButton) {
 try {
  // เก็บ URL เริ่มต้น
  const initialUrl = currentUrl;
  let mainRoute = '';
  let subRoute = '';
  
  // มี URL
  if (initialUrl) {
   [mainRoute, subRoute] = initialUrl.split('-');
   
   // ค้นหาปุ่มที่ตรงกับ URL หลัก
   const mainButtonData = buttonMap.get(mainRoute);
   
   if (mainButtonData) {
    const { button, config } = mainButtonData;
    
    // คลิกปุ่มหลักโดยไม่อัพเดท URL
    await this.triggerButtonClick(button, { skipUrlUpdate: true });
    
    // ถ้ามี sub-route และปุ่มหลักมี subButtons
    if (subRoute && config.subButtons) {
     await new Promise(resolve => setTimeout(resolve, 100));
     
     // หา sub-button และคลิก
     const subButton = document.querySelector(`button[data-url="${initialUrl}"]`);
     if (subButton) {
      await this.triggerButtonClick(subButton);
     } else {
      // ถ้าไม่พบ sub-button ให้ใช้ปุ่ม default
      await this.handleDefaultSubButton(config);
     }
    }
    return;
   }
  }
  
  // กรณีไม่มี URL หรือ URL ไม่ถูกต้อง
  if (defaultButton) {
   await this.triggerButtonClick(defaultButton.button);
  }
  
 } catch (error) {
  console.error('Error handling initial navigation:', error);
  utils.showNotification('เกิดข้อผิดพลาดในการนำทาง กรุณาลองใหม่', 'error');
 }
},

// เพิ่มฟังก์ชันใหม่สำหรับจัดการการคลิกปุ่ม
async triggerButtonClick(button, options = {}) {
 if (button && button.click) {
  // สร้าง custom event สำหรับการคลิก
  const clickEvent = new MouseEvent('click', {
   bubbles: true,
   cancelable: true,
   ...options
  });
  button.dispatchEvent(clickEvent);
 }
},
  
async renderSubButtons(subButtons, mainButtonUrl, lang, initialUrl) {
  const { subButtonsContainer } = elements;
  
  subButtonsContainer.innerHTML = '';
  subButtonsContainer.classList.add('fade-out');
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  let defaultSubButton = null;
  const subButtonMap = new Map();
  
  // เพิ่มฟังก์ชันสำหรับจัดการการคลิกปุ่มย่อย
  const handleSubButtonClick = async (button, fullUrl, jsonFile) => {
   try {
    // ล้าง active state ของปุ่มอื่นๆ ก่อน
    subButtonsContainer.querySelectorAll('.button-sub').forEach(btn => {
     btn.classList.remove('active');
    });
    
    // ทำให้ปุ่มที่ถูกคลิกเป็น active ทันที
    button.classList.add('active');
    
    // เลื่อนปุ่มไปทางซ้ายทันทีที่คลิก
    this.scrollActiveSubButtonIntoView(button);
    
    // อัพเดท URL และโหลดเนื้อหา (ทำงานแบบ async)
    await Promise.all([
     NavigationManager.navigateTo(fullUrl),
     jsonFile ? (async () => {
      try {
       const data = await DataManager.fetchWithRetry(jsonFile);
       await ContentManager.renderContent(data);
      } catch (error) {
       // แสดงข้อผิดพลาดแต่ยังคง active state และตำแหน่งปุ่ม
       utils.showNotification(error.message, 'error');
      }
     })() : Promise.resolve()
    ]);
    
   } catch (error) {
    // แสดงข้อผิดพลาดแต่ยังคง active state และตำแหน่งปุ่ม
    utils.showNotification(error.message, 'error');
   }
  };
  
  subButtons.forEach(button => {
   const label = button[`${lang}_label`];
   if (!label) return;
   
   const subButton = document.createElement('button');
   subButton.className = 'button-sub sub-button';
   subButton.textContent = label;
   
   const fullUrl = button.url ?
    `${mainButtonUrl}-${button.url}` :
    `${mainButtonUrl}-${button.jsonFile}`;
   
   subButton.setAttribute('data-url', fullUrl);
   
   // เก็บการอ้างอิงปุ่มย่อย
   subButtonMap.set(fullUrl, subButton);
   if (button.isDefault) {
    defaultSubButton = subButton;
   }
   
   // ใช้ฟังก์ชันใหม่ในการจัดการการคลิก
   subButton.addEventListener('click', () => {
    handleSubButtonClick(subButton, fullUrl, button.jsonFile);
   });
   
   subButtonsContainer.appendChild(subButton);
  });
  
  // ปรับปรุงการจัดการปุ่มเริ่มต้น
  const matchingSubButton = subButtonMap.get(initialUrl);
  if (matchingSubButton) {
   // ใช้ setTimeout เพื่อให้แน่ใจว่า DOM ได้ render เรียบร้อยแล้ว
   setTimeout(() => {
    handleSubButtonClick(matchingSubButton, initialUrl,
     subButtons.find(b => b.url === initialUrl.split('-')[1])?.jsonFile
    );
   }, 0);
  } else if (defaultSubButton && !initialUrl) {
   setTimeout(() => {
    const defaultButtonConfig = subButtons.find(b => b.isDefault);
    const defaultUrl = `${mainButtonUrl}-${defaultButtonConfig.url || defaultButtonConfig.jsonFile}`;
    handleSubButtonClick(defaultSubButton, defaultUrl, defaultButtonConfig.jsonFile);
   }, 0);
  }
  
  subButtonsContainer.classList.remove('fade-out');
  subButtonsContainer.classList.add('fade-in');
 },
 
 // ปรับปรุงฟังก์ชันเลื่อนปุ่มให้รองรับการทำงานที่เร็วขึ้น
 scrollActiveSubButtonIntoView(activeButton) {
  if (!activeButton) return;
  
  const container = elements.subButtonsContainer;
  if (!container) return;
  
  // ใช้ requestAnimationFrame เพื่อให้การเลื่อนทำงานได้เร็วและนุ่มนวลขึ้น
  requestAnimationFrame(() => {
   const containerLeft = container.getBoundingClientRect().left;
   const buttonLeft = activeButton.getBoundingClientRect().left;
   const scrollLeft = container.scrollLeft;
   
   // เพิ่มการตรวจสอบว่าจำเป็นต้องเลื่อนหรือไม่
   const targetScroll = scrollLeft + (buttonLeft - containerLeft) - 20;
   
   if (Math.abs(container.scrollLeft - targetScroll) > 1) {
    container.scrollTo({
     left: targetScroll,
     behavior: 'smooth'
    });
   }
  });
 }
    };

    // Performance Optimizations
    const PerformanceOptimizer = {
     init() {
      this.setupLazyLoading();
      this.setupPrefetching();
      this.setupErrorBoundary();
     },
     
     setupLazyLoading() {
      if ('loading' in HTMLImageElement.prototype) {
       document.querySelectorAll('img').forEach(img => {
        img.loading = 'lazy';
       });
      } else {
       this.setupIntersectionObserver();
      }
     },
     
     setupIntersectionObserver() {
      const imageObserver = new IntersectionObserver((entries, observer) => {
       entries.forEach(entry => {
        if (entry.isIntersecting) {
         const img = entry.target;
         if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
         }
         observer.unobserve(img);
        }
       });
      });
      
      document.querySelectorAll('img[data-src]').forEach(img => {
       imageObserver.observe(img);
      });
     },
     
     setupPrefetching() {
      const prefetchLinks = new Set();
      
      document.querySelectorAll('a[href], button[data-url]').forEach(element => {
       const url = element.href || element.dataset.url;
       if (url && !prefetchLinks.has(url)) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        link.as = url.endsWith('.json') ? 'fetch' : 'document';
        document.head.appendChild(link);
        prefetchLinks.add(url);
       }
      });
     },
     
     setupErrorBoundary() {
      window.addEventListener('error', event => {
       console.error('Global error:', event.error);
       utils.showNotification(
        'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง',
        'error'
       );
      });
      
      window.addEventListener('unhandledrejection', event => {
       console.error('Unhandled promise rejection:', event.reason);
       utils.showNotification(
        'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
        'error'
       );
      });
     }
    };
    
    // Event Listeners and Initialization
    const initializeApp = async () => {
     try {
      // Initialize scroll handling
      ScrollManager.init();
      
      // Initialize performance optimizations
      PerformanceOptimizer.init();
      
      // Setup button event listeners
      elements.navButtons.forEach(button => {
       button.addEventListener('click', async event => {
        event.preventDefault();
        const route = button.getAttribute('data-url');
        if (route) {
         try {
          await NavigationManager.navigateTo(route);
         } catch (error) {
          utils.showNotification(error.message, 'error');
         }
        }
       });
      });
      
        // ปรับปรุงการจัดการ URL changes
  window.addEventListener('popstate', () => {
   if (!NavigationManager.state.isNavigating) {
    NavigationManager.updateButtonStates();
   }
  });
  
  window.addEventListener('hashchange', (event) => {
   if (!NavigationManager.state.isNavigating) {
    const newHash = event.newURL.split('#')[1] || '';
    NavigationManager.navigateTo(newHash);
   }
  });
  
  // เพิ่มการจัดการ beforeunload
  window.addEventListener('beforeunload', () => {
   NavigationManager.state.isInitialLoad = true;
  });
      
      // Setup network status monitoring
      window.addEventListener('online', () => {
       utils.showNotification('การเชื่อมต่อกลับมาแล้ว', 'success');
      });
      
      window.addEventListener('offline', () => {
       utils.showNotification('ขาดการเชื่อมต่ออินเทอร์เน็ต', 'warning');
      });
      
      // Handle URL changes
      window.addEventListener('popstate', () => {
       NavigationManager.updateButtonStates();
      });
      
      window.addEventListener('hashchange', () => {
       NavigationManager.updateButtonStates();
      });
      
      // Load initial configuration
      await ButtonManager.loadConfig();
      
     } catch (error) {
      console.error('Initialization error:', error);
      utils.showNotification(
       'เกิดข้อผิดพลาดในการเริ่มต้นแอปพลิเคชัน กรุณารีเฟรชหน้า',
       'error'
      );
     }
    };
    
    // เพิ่ม Event Listener สำหรับการเปลี่ยนภาษา
window.addEventListener('languageChange', (event) => {
  const newLang = event.detail.language;
  this.updateCardsLanguage(newLang);
});
    
    // Start the application
    if (document.readyState === 'loading') {
     document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
     initializeApp();
    }
    });