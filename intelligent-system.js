// ฟังก์ชันเคลียร์ Local Storage และ Session Storage อย่างยืดหยุ่น
function clearStorage(storageType) {
    const storage = storageType === 'local' ? localStorage : sessionStorage;
    for (let key in storage) {
        if (storage.hasOwnProperty(key)) {
            const value = storage.getItem(key);
            try {
                const data = JSON.parse(value);
                // ลบเฉพาะรายการที่มี expire date และหมดอายุแล้ว
                if (data.expires && data.expires < Date.now()) {
                    storage.removeItem(key);
                }
            } catch (e) {
                console.warn(`Invalid JSON or no expiration for key "${key}"`);
            }
        }
    }
    console.log(`${storageType} storage cleaned!`);
}

// ฟังก์ชันยกเลิก Service Workers อย่างยืดหยุ่น
async function unregisterServiceWorkers() {
    if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
            // ตรวจสอบว่า Service Worker ยังจำเป็นหรือไม่
            if (registration.active && registration.active.scriptURL.includes('essential')) {
                console.log('Skipping essential Service Worker:', registration.active.scriptURL);
            } else {
                await registration.unregister();
                console.log('Service Worker unregistered:', registration.active?.scriptURL || 'unknown');
            }
        }
    }
}

// ฟังก์ชันตั้งค่า Cache-Control Headers
function setCacheControlHeaders() {
    const metaTags = [
        { httpEquiv: 'Cache-Control', content: 'no-cache, no-store, must-revalidate' },
        { httpEquiv: 'Pragma', content: 'no-cache' },
        { httpEquiv: 'Expires', content: '0' }
    ];
    metaTags.forEach(tag => {
        const meta = document.createElement('meta');
        meta.httpEquiv = tag.httpEquiv;
        meta.content = tag.content;
        document.head.appendChild(meta);
    });
    console.log('Cache-Control headers set.');
}

// ฟังก์ชัน Prefetching ที่ยืดหยุ่น
function enablePrefetching() {
    const links = document.querySelectorAll('a[href]');
    links.forEach(link => {
        if (!link.href.includes(window.location.origin)) {
            console.log('Skipping external link for prefetching:', link.href);
            return;
        }
        const prefetchLink = document.createElement('link');
        prefetchLink.rel = 'prefetch';
        prefetchLink.href = link.href;
        prefetchLink.as = 'document';
        document.head.appendChild(prefetchLink);
    });
    console.log('Prefetching enabled.');
}

// ฟังก์ชัน Lazy Loading ที่ยืดหยุ่น
function enableLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    if ('loading' in HTMLImageElement.prototype) {
        images.forEach(img => {
            img.loading = 'lazy';
        });
        console.log('Native lazy loading enabled.');
    } else {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    observer.unobserve(img);
                }
            });
        });
        images.forEach(img => observer.observe(img));
        console.log('Lazy loading with IntersectionObserver enabled.');
    }
}

// ฟังก์ชันบีบอัดเนื้อหาที่ยืดหยุ่น
async function enableContentCompression() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pako@2.0.4/dist/pako.min.js';
    script.onload = () => {
        console.log('Content compression library loaded.');
        const compressData = (data) => pako.deflate(data, { level: 9 });
        const decompressData = (data) => pako.inflate(data, { to: 'string' });

        const sampleData = 'Example data to compress and decompress';
        const compressed = compressData(sampleData);
        console.log('Compressed data:', compressed);

        const decompressed = decompressData(compressed);
        console.log('Decompressed data:', decompressed);
    };
    script.onerror = () => {
        console.error('Failed to load compression library.');
    };
    document.head.appendChild(script);
}

// ฟังก์ชันตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
async function stabilizeInternetConnection() {
    try {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        console.log('Network information:', connection);

        const response = await fetch('/health-check', { cache: 'no-store' });
        if (response.ok) {
            console.log('Connection stable.');
        } else {
            console.warn('Connection check failed with status:', response.status);
        }
    } catch (error) {
        console.error('Error stabilizing internet connection:', error);
    }
}

// การโหลดทรัพยากรอย่างยืดหยุ่น
async function loadResources() {
    try {
        enablePrefetching();
        enableLazyLoading();
        await enableContentCompression();
        console.log('Resources loaded successfully.');
    } catch (error) {
        console.error('Error loading resources:', error);
    }
}

// การเริ่มต้นระบบ
document.addEventListener('DOMContentLoaded', async () => {
    try {
        setCacheControlHeaders();
        await unregisterServiceWorkers();
        clearStorage('local');
        clearStorage('session');
        await loadResources();
        console.log('Initialization complete.');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});