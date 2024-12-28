// ฟังก์ชันล้างข้อมูลใน LocalStorage และ SessionStorage ยกเว้น selectedLang
function clearStorageExceptSelectedLang() {
    const keysToRemove = Object.keys(localStorage).filter(key => key !== 'selectedLang');
    keysToRemove.forEach(key => localStorage.removeItem(key));

    const sessionKeysToRemove = Object.keys(sessionStorage).filter(key => key !== 'selectedLang');
    sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

    console.log('Storage cleared except selectedLang');
}

// ฟังก์ชันล้างคุกกี้ทั้งหมด ยกเว้น selectedLang
function clearCookiesExceptSelectedLang() {
    const cookies = document.cookie.split(';');
    cookies.forEach(cookie => {
        const cookieName = cookie.split('=')[0].trim();
        if (cookieName !== 'selectedLang') {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        }
    });

    console.log('Cookies cleared except selectedLang');
}

// เคลียร์ LocalStorage, SessionStorage, และคุกกี้เมื่อปิดหรือรีโหลดหน้าเว็บ
window.addEventListener('beforeunload', () => {
    clearStorageExceptSelectedLang();
    clearCookiesExceptSelectedLang();
});

// ฟังก์ชันยกเลิกการลงทะเบียน Service Workers ที่ลงทะเบียนไว้
async function unregisterServiceWorkers() {
    if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.unregister()));
        console.log('Service Workers unregistered!');
    }
}

// ฟังก์ชันป้องกันการเก็บแคชใน HTTP requests ด้วย Cache-Control headers
function setCacheControlHeaders() {
    const metaTags = [
        { name: 'Cache-Control', content: 'no-cache, no-store, must-revalidate' },
        { name: 'Pragma', content: 'no-cache' },
        { name: 'Expires', content: '0' }
    ];

    metaTags.forEach(({ name, content }) => {
        const meta = document.createElement('meta');
        meta.httpEquiv = name;
        meta.content = content;
        document.head.appendChild(meta);
    });
}

// ฟังก์ชันช่วยโหลดที่ปรับปรุงแล้ว
async function loadResources() {
    try {
        await Promise.all([enablePrefetching(), enableLazyLoading()]);
        enableContentCompression();
        console.log('Resources loaded successfully.');
    } catch (error) {
        console.error('Error loading resources:', error);
    }
}

// ฟังก์ชันบีบอัดเนื้อหาเพื่อประหยัดแบนด์วิธ
function enableContentCompression() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pako@2.0.4/dist/pako.min.js';
    script.onload = () => {
        const compressData = (data) => pako.deflate(data, { level: 9 });
        const decompressData = (data) => pako.inflate(data, { to: 'string' });

        const data = '...'; // ตัวอย่างข้อมูลที่ต้องการบีบอัด
        const compressedData = compressData(data);
        console.log('Data compressed:', compressedData);

        const decompressedData = decompressData(compressedData);
        console.log('Data decompressed:', decompressedData);
    };
    document.head.appendChild(script);
}

// ฟังก์ชันยืนยันการเชื่อมต่อที่เสถียร
async function stabilizeInternetConnection() {
    try {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
            // ตรวจสอบสัญญาณอินเทอร์เน็ต
            console.log('Connection type:', connection.effectiveType);
        }
        await fetch('path/to/resource', { cache: 'no-store' });
        console.log('Resources pulled successfully.');
    } catch (error) {
        console.error('Error stabilizing internet connection:', error);
    }
}

// ใช้ Web Workers สำหรับการประมวลผลที่หนักหน่วง
function useWebWorkers() {
    if (window.Worker) {
        const worker = new Worker('worker.js');
        worker.postMessage({ data: 'heavy-data' });

        worker.onmessage = function(e) {
            console.log('Data from worker:', e.data);
        };
    }
}

// เพิ่มการใช้ Web Workers สำหรับการประมวลผลที่หนักหน่วง
function enableLazyLoading() {
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
}

document.addEventListener('DOMContentLoaded', async function() {
    try {
        await unregisterServiceWorkers();
        setCacheControlHeaders();
        clearStorageExceptSelectedLang();
        clearCookiesExceptSelectedLang();
        await loadResources();
        stabilizeInternetConnection();
        useWebWorkers();
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});