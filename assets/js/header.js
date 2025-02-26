document.addEventListener('DOMContentLoaded', () => {    
    const navButtons = document.querySelectorAll('nav ul li button');    
    const header = document.querySelector('header');    
    const logo = document.querySelector('.logo');    
    let lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;    
    const logoHeight = logo.offsetHeight;    
    let currentTop = 0;    
    let rafId = null;    
  
    // ระบบจัดการข้อผิดพลาดที่ชาญฉลาด    
    function handleError(error) {  
        console.error('An error occurred:', error);  
        let errorMessage = error.message || 'An unexpected error occurred. Please try again.';  
    }  
    
    navButtons.forEach(button => {    
        button.addEventListener('click', event => {    
            event.preventDefault();    
            const route = button.getAttribute('data-url');    
            navigateTo(route);    
            activateButton(button);    
        });    
    });    
  
let isChangingContent = false; // ตัวแปรเพื่อป้องกันการเปลี่ยนแปลงข้อความหลายครั้ง



let ticking = false;
window.addEventListener('scroll', function() {    
    if (!ticking) {    
        requestAnimationFrame(() => {    
            try {    
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;    
                const scrollDiff = scrollTop - lastScrollTop;    
                currentTop -= scrollDiff;    
                if (currentTop > 0) currentTop = 0;    
                if (currentTop < -logoHeight * 1.27) currentTop = -logoHeight * 1.27;    
                header.style.transform = `translateY(${currentTop}px)`;    
                lastScrollTop = scrollTop;    
            } catch (error) {    
                handleError(error);    
            }    
            ticking = false;    
        });    
        ticking = true;    
    }    
});
  
    const activateButton = button => {    
        const navList = document.getElementById('nav-list');    
        const subButtonsContainer = document.getElementById('sub-buttons-container');    
    
        navList.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));    
        subButtonsContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));    

        const url = button.getAttribute('data-url');    
        const currentUrl = window.location.hash || '';    
    
        if (url && url.includes('-')) {    
            const [mainUrl, subUrl] = url.split('-');    
            if (currentUrl.includes(mainUrl)) activateMainButton(mainUrl, navList);    
            if (currentUrl.includes(subUrl)) activateSubButton(subUrl, subButtonsContainer);    
        } else {    
            button.classList.add('active');    
        }    
    };    
  
    const activateMainButton = (mainUrl, navList) => {    
        const mainButton = navList.querySelector(`button[data-url^='${mainUrl}']`);    
        if (mainButton) mainButton.classList.add('active');    
    };    

    const activateSubButton = (subUrl, subButtonsContainer) => {    
        const subButton = subButtonsContainer.querySelector(`button[data-url$='${subUrl}']`);    
        if (subButton) subButton.classList.add('active');    
    };
  
    const createElement = (type, className, content = '') => {    
        const element = document.createElement(type);    
        if (className) element.className = className;    
        if (content) element.textContent = content;    
        return element;    
    };    
  
let loadedButtonConfig = null; // เก็บข้อมูลการตั้งค่าปุ่มที่โหลดแล้ว

const loadButtonConfig = async () => {
    try {
        // ตรวจสอบหากข้อมูลการตั้งค่าปุ่มถูกโหลดแล้ว ไม่ต้องโหลดซ้ำ
        if (loadedButtonConfig) {
            renderMainButtons(loadedButtonConfig.mainButtons, localStorage.getItem('selectedLang') || 'en');
            return;
        }

        const selectedLang = localStorage.getItem('selectedLang') || 'en'; // ตรวจสอบรหัสภาษาจากที่เก็บข้อมูลถาวร
        const response = await fetch('https://jeffy2600ii.github.io/hub.fantrove/assets/json/buttons.json', { cache: 'no-cache' });
        if (!response.ok) throw new Error('ไม่สามารถโหลดไฟล์ buttons.json ได้');
        const buttonConfig = await response.json();

        // เก็บข้อมูลปุ่มที่โหลดไว้เพื่อไม่ให้โหลดซ้ำ
        loadedButtonConfig = buttonConfig;
        renderMainButtons(buttonConfig.mainButtons, selectedLang);
    } catch (error) {
        console.error(`Error loading button configuration: ${error}`);
    }
};

const renderMainButtons = (mainButtons, lang) => {
    const navList = document.getElementById('nav-list');
    navList.innerHTML = ''; // ล้างข้อมูลก่อนที่จะเรนเดอร์ใหม่

    mainButtons.forEach(({ [`${lang}_label`]: label, subButtons, jsonFile, isDefault, url }) => {
        if (!label) return; // ข้ามปุ่มที่ไม่มีการแปลเป็นภาษาที่เลือก

        const li = createElement('li');
        const mainButton = createElement('button', 'nav ul li button', label);
        mainButton.setAttribute('data-url', url || jsonFile);
        mainButton.addEventListener('click', () => {
            clearContent();
            activateButton(mainButton);
            if (!subButtons && url) {
                changeURL(url);
            }
            if (jsonFile) {
                loadContentFromJSON(jsonFile);
            } else if (subButtons) {
                renderSubButtons(subButtons, url, lang);
            }
        });
        li.appendChild(mainButton);
        navList.appendChild(li);
        if (isDefault) mainButton.click();
    });
};

const renderSubButtons = async (subButtons, mainButtonUrl, lang) => {
    const subButtonsContainer = document.getElementById('sub-buttons-container');
    subButtonsContainer.innerHTML = ''; // ล้างข้อมูลก่อนที่จะเรนเดอร์ใหม่
    subButtonsContainer.classList.add('fade-out');
    await new Promise(resolve => setTimeout(resolve, 100));

    subButtons.forEach(({ [`${lang}_label`]: label, jsonFile, isDefault, url }) => {
        if (!label) return; // ข้ามปุ่มที่ไม่มีการแปลเป็นภาษาที่เลือก

        const subButton = createElement('button', 'button-sub sub-butto', label);
        const fullUrl = url ? `${mainButtonUrl}-${url}` : `${mainButtonUrl}-${jsonFile}`;
        subButton.setAttribute('data-url', fullUrl);
        subButton.addEventListener('click', () => {
            if (fullUrl) changeURL(fullUrl);
            loadContentFromJSON(jsonFile);
            activateButton(subButton);
        });
        subButtonsContainer.appendChild(subButton);
        if (isDefault) subButton.click();
    });

    subButtonsContainer.classList.remove('fade-out');
    subButtonsContainer.classList.add('fade-in');
};
  
  // ฟังก์ชันดึงข้อมูลด้วยระบบ Prefetching
const prefetchData = async (jsonFiles) => {
    const prefetchPromises = jsonFiles.map((file) => fetchWithTimeout(file, { cache: 'no-cache' }));
    return Promise.all(prefetchPromises);
};
  
// ฟังก์ชันการตรวจสอบการเปลี่ยนแปลงข้อมูล JSON และใช้ Service Worker
const loadContentFromJSON = async (jsonFile) => {
    try {
        if (!isOnline()) throw new Error('ไม่มีการเชื่อมต่ออินเทอร์เน็ต');

        // ตรวจสอบข้อมูลในแคช
        const cachedData = getCacheData(jsonFile);
        const lastUpdate = cachedData?.timestamp || 0;

        // หากข้อมูลจากแคชยังใหม่พอจะใช้ได้
        if (await validateData(jsonFile, lastUpdate) && cachedData?.data) {
            renderContent(cachedData.data);
            return;
        }

        // ดึงข้อมูลใหม่จากเซิร์ฟเวอร์
        const data = await fetchWithTimeout(jsonFile, { cache: 'no-cache' }, 5000);
        if (!data || typeof data !== 'object') throw new Error(`ข้อมูลจาก ${jsonFile} ไม่ถูกต้อง`);

        setCacheData(jsonFile, data);
        renderContent(data);
    } catch (error) {
        handleLoadError(error, jsonFile);
    }
};

// ฟังก์ชันตรวจสอบข้อมูลใน localStorage  
const getCacheData = (jsonFile) => {
    try {
        const cachedData = localStorage.getItem(jsonFile);
        return cachedData ? JSON.parse(cachedData) : null;
    } catch {
        return null;
    }
};

const setCacheData = (jsonFile, data) => {
    const cachePayload = {
        data,
        timestamp: Date.now(),
    };
    localStorage.setItem(jsonFile, JSON.stringify(cachePayload));
};

// ปรับปรุงฟังก์ชัน validateData ให้สามารถใช้ Cache-Control
const validateData = async (jsonFile, lastUpdate) => {
    try {
        const response = await fetchWithTimeout(jsonFile, { method: 'HEAD', cache: 'no-cache' }, 3000);
        if (!response || !response.ok) return false;

        const serverTimestamp = new Date(response.headers.get('Last-Modified')).getTime();
        return serverTimestamp > lastUpdate;
    } catch (error) {
        return false;
    }
};

// แยกการจัดการข้อผิดพลาดของการโหลด JSON
const handleLoadError = (error, jsonFile) => {
    console.error(`Error loading ${jsonFile}:`, error);
    alert(`ไม่สามารถโหลดข้อมูลจาก ${jsonFile} ได้ โปรดตรวจสอบการเชื่อมต่อของคุณ`);
};
  
// ฟังก์ชันสำหรับตรวจสอบสถานะการออนไลน์
// ฟังก์ชันตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
const isOnline = () => navigator.onLine;

// ฟังก์ชันการดึงข้อมูลแบบมีเวลา timeout

// ปรับปรุงให้ทำงานแยกจากระบบอื่นชัดเจนขึ้น
const fetchWithTimeout = async (url, options = {}, timeout = 5000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
        return await response.json();
    } finally {
        clearTimeout(timeoutId);
    }
};

const fetchDataWithRetry = async (url, retries = 3, delay = 2000) => {
    try {
        const response = await fetchWithTimeout(url, { method: 'GET' });
        if (!response.ok) {
            throw new Error('Failed to fetch');
        }
        const data = await response.json();
        renderContent(data);
    } catch (error) {
        if (retries > 0) {
            console.warn(`Retrying fetch... Remaining attempts: ${retries}`);
            setTimeout(() => fetchDataWithRetry(url, retries - 1, delay), delay);
        } else {
            console.error('Max retries reached. Could not fetch data.', error);
            handleRenderError(error);
        }
    }
};
  
// Main render function to display content  
const renderContent = async (data) => {  
 const contentContainer = document.getElementById('content-container');  
  
 // ตรวจสอบว่าคอนเทนเนอร์มีอยู่ใน DOM หรือไม่  
 if (!contentContainer) {  
  console.error('ไม่พบคอนเทนเนอร์สำหรับเนื้อหา');  
  return;  
 }  
  
 // Fade out เพื่อเตรียมพร้อมสำหรับเนื้อหาใหม่  
 contentContainer.classList.add('fade-out');  
  
 try {  
  // ตรวจสอบข้อมูลว่าเป็นอาร์เรย์  
  if (!Array.isArray(data)) {  
   throw new Error('ข้อมูลที่ได้รับไม่ใช่อาร์เรย์');  
  }  
  
  // ล้างเนื้อหาเดิม  
  contentContainer.innerHTML = '';  
  
  // ใช้ DocumentFragment เพื่อเพิ่มประสิทธิภาพ  
  const fragment = document.createDocumentFragment();  
  
  // สร้างคอนเทนเนอร์สำหรับปุ่มและการ์ด  
  const buttonContainer = document.createElement('div');  
  buttonContainer.className = 'button-content-container';  
  
  const cardContainer = document.createElement('div');  
  cardContainer.className = 'card-content-container';  
  
  // ฟังก์ชันสำหรับเพิ่มเนื้อหาในกลุ่ม  
  const renderGroupItems = (items, type) => {  
   if (!Array.isArray(items)) return;  
  
   items.forEach((content) => {  
    if (type === 'button') {  
     const buttonElement = createContentButton(content.content);  
     if (buttonElement) {  
      buttonElement.classList.add('fade-in'); // เพิ่มอนิเมชั่นจางเข้ากับปุ่ม  
      buttonContainer.appendChild(buttonElement);  
     }  
    } else {  
     const cardElement = createCard(content);  
     if (cardElement) {  
      cardElement.classList.add('fade-in'); // เพิ่มอนิเมชั่นจางเข้ากับการ์ด  
      cardContainer.appendChild(cardElement);  
     }  
    }  
   });  
  };  
  
  // ประมวลผลข้อมูล  
  data.forEach((item) => {  
   if (item.group && Array.isArray(item.group.items)) {  
    renderGroupItems(item.group.items, item.group.type);  
   } else if (item.type === 'button') {  
    const buttonElement = createContentButton(item.content);  
    if (buttonElement) {  
     buttonElement.classList.add('fade-in'); // เพิ่มอนิเมชั่นจางเข้ากับปุ่ม  
     buttonContainer.appendChild(buttonElement);  
    }  
   } else {  
    const cardElement = createCard(item);  
    if (cardElement) {  
     cardElement.classList.add('fade-in'); // เพิ่มอนิเมชั่นจางเข้ากับการ์ด  
     cardContainer.appendChild(cardElement);  
    }  
   }  
  });  
  
  // ตรวจสอบว่าคอนเทนเนอร์มีลูกหรือไม่ก่อนเพิ่มเข้า Fragment  
  if (buttonContainer.hasChildNodes()) fragment.appendChild(buttonContainer);  
  if (cardContainer.hasChildNodes()) fragment.appendChild(cardContainer);  
  
  // เพิ่มเนื้อหาใหม่เข้าไปใน DOM หลังจากอนิเมชั่นจางออกเสร็จ  
  setTimeout(() => {  
   contentContainer.appendChild(fragment);  
  
   // จัดการอนิเมชั่นการจางเข้าและจางออกของเนื้อหาและปุ่มพร้อมกัน  
   contentContainer.classList.remove('fade-out');  
   contentContainer.classList.add('fade-in');  
  
   // แสดงเนื้อหาและปุ่มทั้งหมดหลังจากอนิเมชั่นเสร็จ  
   buttonContainer.classList.add('fade-in');  
   cardContainer.classList.add('fade-in');  
  }, 200); // เวลาที่ให้การจางออกทำงานเสร็จ  
 } catch (error) {  
  console.error('เกิดข้อผิดพลาดในการเรนเดอร์เนื้อหา:', error);  
  handleRenderError(error);  
 }  
};  
  
// Example usage to fetch data from a URL  
const fetchData = async (url) => {  
 if (!isOnline()) {  
  console.error('No internet connection');  
  handleRenderError(new Error('No internet connection'));  
  return;  
 }  
  
 await fetchDataWithRetry(url); // Retry fetching data if there was an issue  
};  
  
    const handleRenderError = error => {  
        let errorMessage = '';  
        if (error.message.includes('ข้อมูลไม่ใช่อาร์เรย์')) {  
            errorMessage = `ข้อผิดพลาด: ข้อมูลในไฟล์ JSON ไม่ใช่รูปแบบที่ถูกต้อง (ต้องเป็นอาร์เรย์)`;  
        } else {  
            errorMessage = `ข้อผิดพลาด: ไม่สามารถแสดงข้อมูลได้ โปรดตรวจสอบรูปแบบข้อมูลในไฟล์ JSON`;  
        }  
  
        alert(errorMessage);  
        console.error(`Error rendering content: ${error.message}`);  
    };  
  
    const createContentButton = content => {  
        const button = createElement('button', 'button-content', content);  
        button.addEventListener('click', () => copyToClipboard(content));  
        return button;  
    };  
  
const createCard = ({ title, description, image, link }) => {  
 const card = createElement('div', 'card');  
 if (image) {  
  const img = createElement('img', 'card-image');  
  img.src = image;  
  card.appendChild(img);  
 }  
 card.appendChild(createElement('div', 'card-title', title));  
 card.appendChild(createElement('div', 'card-description', description));  
 card.addEventListener('click', () => window.open(link, '_blank'));  
 return card;  
};  
  
const copyToClipboard = async content => {  
 try {  
  await navigator.clipboard.writeText(content);  
  alert('เนื้อหาถูกคัดลอกไปยังคลิปบอร์ดแล้ว!');  
 } catch (error) {  
  console.error(`Error copying text: ${error}`);  
 }  
};  
  
const clearContent = () => {  
 const contentContainer = document.getElementById('content-container');  
 const subButtonsContainer = document.getElementById('sub-buttons-container');  
  
 contentContainer.classList.add('fade-out');  
 subButtonsContainer.classList.add('fade-out');  
  
 setTimeout(() => {  
  contentContainer.innerHTML = '';  
  subButtonsContainer.innerHTML = '';  
  contentContainer.classList.remove('fade-out');  
  subButtonsContainer.classList.remove('fade-out');  
 }, 100);  
};  
  
const changeURL = url => {  
 if (url.includes('#')) {  
  history.replaceState(null, '', url);  
 } else {  
  history.replaceState(null, '', `#${url}`);  
 }  
};  
  
window.onload = loadButtonConfig;  
  
// เพิ่มระบบ Prefetching เพื่อโหลดล่วงหน้า  
function enablePrefetching() {  
 try {  
  const links = document.querySelectorAll('a[href]');  
  links.forEach(link => {  
   const prefetchLink = document.createElement('link');  
   prefetchLink.rel = 'prefetch';  
   prefetchLink.href = link.href;  
   prefetchLink.as = 'document';  
   document.head.appendChild(prefetchLink);  
  });  
 } catch (error) {  
  handleError(error);  
 }  
}  
  
// เพิ่มระบบ Lazy Loading เพื่อประหยัดแบนด์วิธและเพิ่มประสิทธิภาพ  
function enableLazyLoading() {  
 try {  
  const images = document.querySelectorAll('img');  
  images.forEach(img => {  
   if ('loading' in HTMLImageElement.prototype) {  
    img.loading = 'lazy';  
   } else {  
    const lazyImageObserver = new IntersectionObserver((entries, observer) => {  
     entries.forEach(entry => {  
      if (entry.isIntersecting) {  
       const lazyImage = entry.target;  
       lazyImage.src = lazyImage.dataset.src;  
       lazyImageObserver.unobserve(lazyImage);  
      }  
     });  
    });  
    lazyImageObserver.observe(img);  
   }  
  });  
 } catch (error) {  
  handleError(error);  
 }  
}  
  
// เรียกใช้ฟังก์ชัน Prefetching และ Lazy Loading เมื่อ DOM โหลดเสร็จ  
document.addEventListener('DOMContentLoaded', function() {  
 enablePrefetching();  
 enableLazyLoading();  
});  
  
// เพิ่มระบบจัดการข้อผิดพลาดนอกเหนือจาก DOMContentLoaded  
window.addEventListener('error', (event) => {  
 handleError(event.error);  
});  
  
window.addEventListener('unhandledrejection', (event) => {  
 handleError(event.reason);  
});  
  
document.addEventListener('DOMContentLoaded', function() {  
const header = document.querySelector('header');  
const logoHeight = header.offsetHeight;  
  
window.addEventListener('scroll', function() {  
 if (window.scrollY > logoHeight) {  
  header.classList.add('scrolled');  
 } else {  
  header.classList.remove('scrolled');  
 }  
});  
});  
});