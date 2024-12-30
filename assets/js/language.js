let languagesConfig = {}; // เก็บข้อมูลภาษาทั้งหมด
let languageOverlay, languageDropdown, languageButton;
let selectedLang = ''; // ภาษาเริ่มต้น

async function loadLanguagesConfig() {
    if (Object.keys(languagesConfig).length > 0) return;

    try {
        const response = await fetch('https://jeffy2600ii.github.io/Fan-Trove/assets/js/language.json');
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

    handleInitialLanguage(); // ตั้งค่าภาษาเริ่มต้น
    redirectIfInvalidLanguage(); // เปลี่ยนเส้นทาง URL หากภาษาปัจจุบันไม่ถูกต้อง
    initializeCustomLanguageSelector(); // สร้าง UI ตัวเลือกภาษา
}

function showAlertAndRefresh(message) {
    alert(message);
    setTimeout(() => location.reload(), 500);
}

function initializeCustomLanguageSelector() {
    const languageContainer = document.getElementById('language-selector-container');
    if (!languageContainer) return;

    createOverlay();
    createLanguageButton(languageContainer);
    createLanguageDropdown();
    
    window.addEventListener('popstate', handlePopState); // จัดการการกดปุ่มย้อนกลับ
}

function createOverlay() {
    if (!languageOverlay) {
        languageOverlay = createElement('div', { id: 'language-overlay' });
        document.body.appendChild(languageOverlay);
        languageOverlay.addEventListener('click', closeLanguageDropdown);
    }
}

function createLanguageButton(container) {
    if (!languageButton) {
        languageButton = createElement('button', { id: 'language-button' });
        updateButtonText(languageButton);
        languageButton.addEventListener('click', toggleLanguageDropdown);
        container.appendChild(languageButton);
    }
}

function createLanguageDropdown() {
    if (!languageDropdown) {
        languageDropdown = createElement('div', { id: 'language-dropdown' });
        document.body.appendChild(languageDropdown);

        Object.entries(languagesConfig).forEach(([language, config]) => {
            const option = createElement('div', {
                className: 'language-option',
                textContent: config.label,
                'data-language': language,
            });
            option.addEventListener('click', () => selectLanguage(language));
            languageDropdown.appendChild(option);
        });
    }
}

function createElement(tag, attributes) {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) {
        if (key.startsWith('data-')) {
            element.setAttribute(key, value);
        } else {
            element[key] = value;
        }
    }
    return element;
}

function updateButtonText(button) {
    const buttonText = languagesConfig[selectedLang]?.buttonText || 'Select Language';
    if (button) button.textContent = buttonText;
}

function toggleLanguageDropdown() {
    const isDropdownVisible = languageOverlay.classList.contains('fade-in');
    isDropdownVisible ? closeLanguageDropdown() : openLanguageDropdown();
}

function openLanguageDropdown() {
    languageOverlay.style.display = 'block';
    languageDropdown.style.display = 'block';
    document.body.classList.add('no-scroll');

    setTimeout(() => {
        languageOverlay.classList.add('fade-in');
        languageDropdown.classList.add('fade-in');
    }, 10);

    history.pushState({ dropdownOpen: true }, '', window.location.href);
}

function closeLanguageDropdown() {
    languageOverlay.classList.remove('fade-in');
    languageDropdown.classList.remove('fade-in');

    setTimeout(() => {
        languageOverlay.style.display = 'none';
        languageDropdown.style.display = 'none';
        document.body.classList.remove('no-scroll');
    }, 300);

    if (history.state?.dropdownOpen) {
        history.back();
    }
}

function selectLanguage(language) {
    if (!languagesConfig[language]) {
        console.warn(`Language ${language} not supported. Falling back to English.`);
        language = 'en';
    }

    localStorage.setItem('selectedLang', language);
    updatePageLanguage(language);
}

function updatePageLanguage(language) {
    const urlParts = window.location.pathname.split('/').filter(Boolean);
    urlParts[1] = language; // อัปเดตรหัสภาษาในเส้นทาง
    const newPath = '/' + urlParts.join('/');
    history.replaceState(null, '', newPath);
    window.location.replace(newPath);
}

function handleInitialLanguage() {
    const urlParts = window.location.pathname.split('/').filter(Boolean);
    const currentLang = urlParts[1];
    const browserLang = navigator.language || navigator.userLanguage;
    const matchingLang = Object.keys(languagesConfig).find(lang => browserLang.startsWith(lang));

    selectedLang = languagesConfig[currentLang] ? currentLang : matchingLang || 'en';
    localStorage.setItem('selectedLang', selectedLang);
    updateButtonText(languageButton);
}

function redirectIfInvalidLanguage() {
    const urlParts = window.location.pathname.split('/').filter(Boolean);
    const currentLang = urlParts[1];
    
    if (!languagesConfig[currentLang]) {
        const browserLang = navigator.language || navigator.userLanguage;
        const matchingLang = Object.keys(languagesConfig).find(lang => browserLang.startsWith(lang));
        const redirectLang = matchingLang || 'en';

        urlParts[1] = redirectLang; // ตั้งค่าภาษาที่เหมาะสม
        const newPath = '/' + urlParts.join('/');
        window.location.replace(newPath);
    }
}

function handlePopState(event) {
    if (event.state?.dropdownOpen) {
        closeLanguageDropdown();
    } else if (languageOverlay.classList.contains('fade-in')) {
        closeLanguageDropdown();
    }
}

window.addEventListener('DOMContentLoaded', loadLanguagesConfig);