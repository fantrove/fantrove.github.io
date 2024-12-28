let languagesConfig = {}; // เก็บข้อมูลภาษาทั้งหมดในหน่วยความจำ
let languageOverlay, languageDropdown, languageButton;

// ฟังก์ชันตรวจสอบและเปลี่ยนเส้นทางไปที่ index.html ถ้าเข้า URL หน้าแรก
function redirectToIndexPageIfNeeded() {
 const currentUrl = window.location.href;
 if (currentUrl === "https://jeffy2600ii.github.io/Fan-Trove/") {
  window.location.href = "https://jeffy2600ii.github.io/Fan-Trove/index.html";
 }
}

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
 languageOverlay = document.createElement('div');
 languageOverlay.id = 'language-overlay';
 languageOverlay.style.display = 'none'; // ซ่อนเริ่มต้น
 document.body.appendChild(languageOverlay);

 // สร้างปุ่มสำหรับการเลือกภาษา
 languageButton = document.createElement('button');
 languageButton.id = 'language-button';
 languageButton.addEventListener('click', toggleLanguageDropdown);
 languageContainer.appendChild(languageButton);

 // สร้างหน้าต่างตัวเลือกภาษา
 languageDropdown = document.createElement('div');
 languageDropdown.id = 'language-dropdown';
 languageDropdown.style.display = 'none'; // ซ่อนเริ่มต้น
 document.body.appendChild(languageDropdown);

 // เพิ่มตัวเลือกภาษาในหน้าต่าง
 Object.entries(languagesConfig).forEach(([language, config]) => {
  const option = document.createElement('div');
  option.className = 'language-option';
  option.textContent = config.label;
  option.dataset.language = language;
  option.addEventListener('click', () => selectLanguage(language));
  languageDropdown.appendChild(option);
 });

 // เพิ่มการปิด dropdown เมื่อคลิกพื้นหลังสีดำ
 languageOverlay.addEventListener('click', closeLanguageDropdown);

 // อัปเดตปุ่มข้อความเมื่อเริ่มต้น
 updateButtonText();
}

// ฟังก์ชันเปิด/ปิด dropdown
function toggleLanguageDropdown() {
 const isDropdownVisible = languageOverlay.style.display === 'block';
 if (isDropdownVisible) {
  closeLanguageDropdown();
 } else {
  openLanguageDropdown();
 }
}

// ฟังก์ชันเปิด dropdown
function openLanguageDropdown() {
 languageOverlay.style.display = 'block';
 languageDropdown.style.display = 'block';
 document.body.classList.add('no-scroll'); // ล็อกการเลื่อนหน้าเว็บ

 // จางเข้า (Fade In)
 setTimeout(() => {
  languageOverlay.classList.add('fade-in');
  languageDropdown.classList.add('fade-in');
 }, 10);
}

// ฟังก์ชันปิด dropdown
function closeLanguageDropdown() {
 languageOverlay.classList.remove('fade-in');
 languageDropdown.classList.remove('fade-in');

 // รอให้การจางออกเสร็จสิ้นแล้วค่อยซ่อน
 setTimeout(() => {
  languageOverlay.style.display = 'none';
  languageDropdown.style.display = 'none';
  document.body.classList.remove('no-scroll'); // ปลดล็อกการเลื่อนหน้าเว็บ
 }, 300); // 300ms ตามเวลาที่ใช้ในการจางออก
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

 // ตรวจสอบว่า URL ปัจจุบันไม่มีการเพิ่มซ้ำของ URL เต็ม
 const currentURL = window.location.href;

 // ตรวจสอบว่า URL ที่ใช้เพื่อเปลี่ยนภาษาถูกต้องหรือไม่
 const newURL = window.location.origin + window.location.pathname.replace(currentFile, newFileName);

 // ป้องกันการซ้ำซ้อนของ URL
 if (currentURL !== newURL) {
  // ใช้ history.replaceState เพื่อไม่ให้เพิ่ม history ใหม่
  history.replaceState({ lang: language }, '', newURL);

  // รีเฟรชหน้าใหม่หลังจากการเปลี่ยนแปลงภาษา
  location.reload(); // รีเฟรชหน้าทันที
 }

 // ปิด dropdown หลังเลือกภาษา
 closeLanguageDropdown();
}

// ฟังก์ชันอัปเดตข้อความในปุ่มเลือกภาษา
function updateButtonText() {
 const selectedLang = localStorage.getItem('selectedLang') || 'en';
 const buttonText = languagesConfig[selectedLang]?.buttonText || 'Select Language';
 languageButton.textContent = buttonText;
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

 // อัปเดตข้อความในปุ่มเลือกภาษา
 updateButtonText();
}

// เรียกใช้ฟังก์ชันโหลดภาษาเมื่อโหลดหน้า
window.onload = function() {
 redirectToIndexPageIfNeeded(); // ตรวจสอบและเปลี่ยนเส้นทางไปที่ index.html ถ้าจำเป็น
 loadLanguagesConfig(); // โหลดการตั้งค่าภาษา
};

// ฟังก์ชันจัดการประวัติการย้อนกลับ
window.onpopstate = function(event) {
 const lang = event.state?.lang || localStorage.getItem('selectedLang') || 'en';
 selectLanguage(lang);
 updateButtonText(); // อัปเดตปุ่มข้อความหลังเลือกภาษา
};