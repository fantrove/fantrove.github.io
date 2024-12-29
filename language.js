// language.js

let languagesConfig = {}; // เก็บข้อมูลภาษาทั้งหมดในหน่วยความจำ
let languageOverlay, languageDropdown, languageButton;
let selectedLang = ''; // ภาษาเริ่มต้น

// ฟังก์ชันดึงข้อมูลจาก language.json
async function loadLanguagesConfig() {
    if (Object.keys(languagesConfig).length === 0) {
        try {
            const response = await fetch('language.json');
            if (!response.ok) throw new Error(`Failed to fetch languages config: ${response.statusText}`);
            languagesConfig = await response.json();

            if (Object.keys(languagesConfig).length === 0) {
                throw new Error('Language configuration is empty');
            }
        } catch (error) {
            console.error('Error loading languages config:', error);
            showAlertAndRefresh('เกิดข้อผิดพลาดในการโหลดข้อมูลภาษา กรุณาลองใหม่');
            return;
        }
    }

    handleInitialLanguage(); // กำหนดภาษาที่เลือกในตอนเริ่มต้น
    initializeCustomLanguageSelector(); // สร้าง UI ของระบบเลือกภาษา
}

// ฟังก์ชันแสดงหน้าต่างแจ้งเตือนข้อผิดพลาด
function showAlertAndRefresh(message) {
    alert(message);
    setTimeout(() => location.reload(), 500);
}

// ฟังก์ชันสร้างหน้าต่างตัวเลือกภาษา
function initializeCustomLanguageSelector() {
    const languageContainer = document.getElementById('language-selector-container');

    if (!languageOverlay) {
        languageOverlay = document.createElement('div');
        languageOverlay.id = 'language-overlay';
        document.body.appendChild(languageOverlay);
        languageOverlay.addEventListener('click', closeLanguageDropdown);
    }

    if (!languageButton) {
        languageButton = document.createElement('button');
        languageButton.id = 'language-button';
        updateButtonText(languageButton);
        languageButton.addEventListener('click', toggleLanguageDropdown);
        languageContainer.appendChild(languageButton);
    }

    if (!languageDropdown) {
        languageDropdown = document.createElement('div');
        languageDropdown.id = 'language-dropdown';
        document.body.appendChild(languageDropdown);

        Object.entries(languagesConfig).forEach(([language, config]) => {
            const option = document.createElement('div');
            option.className = 'language-option';
            option.textContent = config.label;
            option.dataset.language = language;
            option.addEventListener('click', () => selectLanguage(language));
            languageDropdown.appendChild(option);
        });
    }

    // ปรับปรุงการทำงานของปุ่มย้อนกลับเมื่อหน้าต่างตัวเลือกภาษาปิด
    window.addEventListener('popstate', handlePopState);
}

// ฟังก์ชันอัพเดตข้อความในปุ่มตามภาษาที่เลือก
function updateButtonText(button) {
    const buttonText = languagesConfig[selectedLang]?.buttonText || 'Select Language';
    if (button) button.textContent = buttonText;
}

// ฟังก์ชันเปิด/ปิด dropdown
function toggleLanguageDropdown() {
    const isDropdownVisible = languageOverlay.style.display === 'block';
    isDropdownVisible ? closeLanguageDropdown() : openLanguageDropdown();
}

// ฟังก์ชันเปิด dropdown
function openLanguageDropdown() {
    languageOverlay.style.display = 'block';
    languageDropdown.style.display = 'block';
    document.body.classList.add('no-scroll');

    setTimeout(() => {
        languageOverlay.classList.add('fade-in');
        languageDropdown.classList.add('fade-in');
    }, 10);

    // เพิ่มสถานะในประวัติ
    addLanguageHistoryState();
}

// ฟังก์ชันปิด dropdown
function closeLanguageDropdown() {
    languageOverlay.classList.remove('fade-in');
    languageDropdown.classList.remove('fade-in');

    setTimeout(() => {
        languageOverlay.style.display = 'none';
        languageDropdown.style.display = 'none';
        document.body.classList.remove('no-scroll');

        // ลบประวัติการเปิดหน้าต่าง
        clearLanguageHistory();
    }, 300);
}

// ฟังก์ชันเพิ่มสถานะประวัติเมื่อเปิดเมนู
function addLanguageHistoryState() {
    if (!window.history.state || window.history.state.languageMenuOpen !== true) {
        window.history.pushState({ languageMenuOpen: true }, '', '#language-menu');
    }
}

// ฟังก์ชันลบประวัติเมื่อปิดเมนู
function clearLanguageHistory() {
    if (window.history.state && window.history.state.languageMenuOpen === true) {
        history.back(); // ย้อนกลับไปยังประวัติก่อนหน้า
    }
}

// ฟังก์ชันเปลี่ยนภาษา
function selectLanguage(language) {
    if (!languagesConfig[language]) {
        console.warn(`Language ${language} not supported. Falling back to English.`);
        language = 'en';
    }

    const currentFile = window.location.pathname.split('/').pop();
    const baseFileName = currentFile.split('.')[0].split('_')[0]; // เอาชื่อไฟล์พื้นฐาน
    const newFileName = language === 'en' 
        ? `${baseFileName}.html` 
        : `${baseFileName}_${language}.html`;

    localStorage.setItem('selectedLang', language);
    
    // ใช้ replaceState เพื่อไม่ให้สามารถย้อนกลับไปไฟล์ก่อนหน้าได้
    history.replaceState(null, '', newFileName); // ปรับปรุง URL โดยไม่เพิ่มลงในประวัติ
    window.location.replace(newFileName); // ทำการเปลี่ยนหน้าด้วยการโหลดหน้าใหม่

    // เคลียร์ประวัติการเข้าชม
    clearHistory();
}

// ฟังก์ชันเคลียร์ประวัติการเข้าชม
function clearHistory() {
    // เคลียร์ประวัติทั้งหมดหลังจากการเปลี่ยนภาษา
    if (window.history && window.history.replaceState) {
        history.replaceState(null, document.title, window.location.href);
    }
}

// ฟังก์ชันเริ่มต้นตรวจสอบภาษาและการโหลดไฟล์
function handleInitialLanguage() {
    const currentFile = window.location.pathname.split('/').pop();
    const langFromUrl = currentFile.includes('_') 
        ? currentFile.split('_')[1]?.split('.')[0] 
        : 'en'; // ภาษาเริ่มต้นหากไม่มี _

    if (langFromUrl && languagesConfig[langFromUrl]) {
        selectedLang = langFromUrl; // ใช้ภาษาจาก URL
    } else {
        const browserLang = navigator.language || navigator.userLanguage;
        const matchingLang = Object.keys(languagesConfig).find(lang => browserLang.startsWith(lang));
        selectedLang = matchingLang || 'en'; // ใช้ภาษาเริ่มต้นจากเบราว์เซอร์
    }

    localStorage.setItem('selectedLang', selectedLang); // เก็บภาษาใน localStorage
    updateButtonText(languageButton); // อัปเดตข้อความปุ่มตาม URL
}

// ฟังก์ชันจัดการการกดปุ่มย้อนกลับ (ปิดหน้าต่างภาษา)
function handlePopState(event) {
    if (languageOverlay.style.display === 'block') {
        closeLanguageDropdown();
        event.preventDefault(); // หยุดการทำงานของปุ่มย้อนกลับ
    }
}

// เรียกใช้ฟังก์ชันโหลดภาษาเมื่อโหลดหน้า
window.onload = loadLanguagesConfig;