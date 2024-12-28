let languagesConfig = {}; // เก็บข้อมูลภาษาทั้งหมดในหน่วยความจำ

// ฟังก์ชันดึงข้อมูลจาก language.json
async function loadLanguagesConfig() {
    // ตรวจสอบว่ามีข้อมูลภาษาในหน่วยความจำแล้ว
    if (Object.keys(languagesConfig).length === 0) {
        try {
            const response = await fetch('language.json');
            if (!response.ok) {
                throw new Error(`Failed to fetch languages config: ${response.statusText}`);
            }
            languagesConfig = await response.json();
        } catch (error) {
            console.error('Error loading languages config:', error);
            return;
        }
    }

    initializeCustomLanguageSelector(); // สร้าง UI ของระบบเลือกภาษา
    handleInitialLanguage(); // กำหนดภาษาที่เลือกในตอนเริ่มต้น
}

// ฟังก์ชันสร้างหน้าต่างตัวเลือกภาษา
function initializeCustomLanguageSelector() {
    const languageContainer = document.getElementById('language-selector-container');

    // สร้างพื้นหลังสีดำ
    const overlay = document.createElement('div');
    overlay.id = 'language-overlay';
    overlay.style.display = 'none'; // ซ่อนเริ่มต้น
    document.body.appendChild(overlay);

    // สร้างปุ่มสำหรับการเลือกภาษา
    const button = document.createElement('button');
    button.id = 'language-button';
    button.textContent = languagesConfig[localStorage.getItem('selectedLang') || 'en']?.buttonText || 'Select Language';
    button.addEventListener('click', toggleLanguageDropdown);
    languageContainer.appendChild(button);

    // สร้างหน้าต่างตัวเลือกภาษา
    const dropdown = document.createElement('div');
    dropdown.id = 'language-dropdown';
    dropdown.style.display = 'none'; // ซ่อนเริ่มต้น
    document.body.appendChild(dropdown);

    // เพิ่มตัวเลือกภาษาในหน้าต่าง
    Object.entries(languagesConfig).forEach(([language, config]) => {
        const option = document.createElement('div');
        option.className = 'language-option';
        option.textContent = config.label;
        option.dataset.language = language;
        option.addEventListener('click', () => selectLanguage(language));
        dropdown.appendChild(option);
    });

    // เพิ่มการปิด dropdown เมื่อคลิกพื้นหลังสีดำ
    overlay.addEventListener('click', closeLanguageDropdown);
}

// ฟังก์ชันเปิด/ปิด dropdown
function toggleLanguageDropdown() {
    const overlay = document.getElementById('language-overlay');
    const dropdown = document.getElementById('language-dropdown');

    if (overlay.style.display === 'none') {
        overlay.style.display = 'block';
        dropdown.style.display = 'block';
        document.body.classList.add('no-scroll'); // ล็อกการเลื่อนหน้าเว็บ

        // จางเข้า (Fade In)
        setTimeout(() => {
            overlay.classList.add('fade-in');
            dropdown.classList.add('fade-in');
        }, 10);

        // เพิ่มประวัติใหม่ในประวัติของเบราว์เซอร์
        history.pushState({ languageSelectorOpen: true }, '', window.location.href);
    } else {
        closeLanguageDropdown();
    }
}

// ฟังก์ชันปิด dropdown
function closeLanguageDropdown() {
    const overlay = document.getElementById('language-overlay');
    const dropdown = document.getElementById('language-dropdown');

    // จางออก (Fade Out)
    overlay.classList.remove('fade-in');
    dropdown.classList.remove('fade-in');

    // รอให้การจางออกเสร็จสิ้นแล้วค่อยซ่อน
    setTimeout(() => {
        overlay.style.display = 'none';
        dropdown.style.display = 'none';
        document.body.classList.remove('no-scroll'); // ปลดล็อกการเลื่อนหน้าเว็บ
    }, 300); // 300ms ตามเวลาที่ใช้ในการจางออก

    // ลบประวัติออกจากเบราว์เซอร์เมื่อปิดหน้าต่าง
    history.replaceState(null, '', window.location.href);
}

// ฟังก์ชันเปลี่ยนภาษา
function selectLanguage(language) {
    if (!languagesConfig[language]) {
        console.warn(`Language ${language} not supported. Falling back to English.`);
        language = 'en';
    }

    const suffix = languagesConfig[language].suffix;
    const currentFile = window.location.pathname.split('/').pop();
    const baseFileName = currentFile.split('.')[0].split('_')[0];
    const newFileName = baseFileName + (suffix ? suffix : '') + '.html';

    // บันทึกภาษาลง localStorage
    localStorage.setItem('selectedLang', language);

    // เปลี่ยน URL ให้ตรงกับภาษา
    const newURL = window.location.href.replace(currentFile, newFileName);

    // ตรวจสอบว่า URL เปลี่ยนแปลงหรือไม่
    if (window.location.href !== newURL) {
        // ใช้ history.replaceState เพื่อไม่ให้เพิ่ม history ใหม่
        history.replaceState({ lang: language }, '', newURL);

        // รีเฟรชหน้าใหม่หลังจากการเปลี่ยนแปลงภาษา
        location.reload(); // รีเฟรชหน้าทันที
    }

    // ปิด dropdown หลังเลือกภาษา
    closeLanguageDropdown();
}

// ฟังก์ชันเริ่มต้นตรวจสอบภาษาและการโหลดไฟล์
function handleInitialLanguage() {
    const currentFile = window.location.pathname.split('/').pop();
    const langFromUrl = currentFile.split('_')[1]?.split('.')[0];
    let selectedLang = langFromUrl || localStorage.getItem('selectedLang') || 'en';

    if (selectedLang !== 'en' && !languagesConfig[selectedLang]) {
        selectedLang = 'en'; // หากภาษาที่เลือกไม่ถูกต้องจะใช้ภาษาอังกฤษ
    }

    // ตรวจสอบว่าไม่ต้องรีเฟรชหน้าถ้าภาษาถูกต้องแล้ว
    if (selectedLang !== localStorage.getItem('selectedLang')) {
        localStorage.setItem('selectedLang', selectedLang);
        selectLanguage(selectedLang); // เปลี่ยนภาษา
    }
}

// เรียกใช้ฟังก์ชันโหลดภาษาเมื่อโหลดหน้า
window.onload = loadLanguagesConfig;

// ฟังก์ชันจัดการประวัติการย้อนกลับ
window.onpopstate = function (event) {
    if (event.state?.languageSelectorOpen) {
        // ถ้าหน้าต่างตัวเลือกภาษาถูกเปิดไว้แล้ว ให้ปิดหน้าต่างแทนการย้อนกลับ
        closeLanguageDropdown();
    } else {
        // หากไม่เปิดหน้าต่างเลือกภาษา ให้ทำการเปลี่ยนภาษา
        const lang = event.state?.lang || localStorage.getItem('selectedLang') || 'en';
        selectLanguage(lang);
    }
};