let languagesConfig = {}; // เก็บข้อมูลภาษาทั้งหมดในหน่วยความจำ
let languageOverlay, languageDropdown, languageButton;
let selectedLang = localStorage.getItem('selectedLang') || ''; // ภาษาเริ่มต้นจาก localStorage

// ฟังก์ชันดึงข้อมูลจาก language.json
async function loadLanguagesConfig() {
 if (Object.keys(languagesConfig).length === 0) { // ตรวจสอบว่ามีข้อมูลภาษาหรือยัง
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

 initializeCustomLanguageSelector(); // สร้าง UI ของระบบเลือกภาษา
 handleInitialLanguage(); // กำหนดภาษาที่เลือกในตอนเริ่มต้น
}

// ฟังก์ชันแสดงหน้าต่างแจ้งเตือนข้อผิดพลาด
function showAlertAndRefresh(message) {
 alert(message); // แสดงการแจ้งเตือน
 setTimeout(() => {
  location.reload(); // รีเฟรชหน้าเว็บ
 }, 500); // รอให้แจ้งเตือนปิดก่อนการรีเฟรช
}

// ฟังก์ชันสร้างหน้าต่างตัวเลือกภาษา
function initializeCustomLanguageSelector() {
 const languageContainer = document.getElementById('language-selector-container');

 // สร้างพื้นหลังสีดำ
 if (!languageOverlay) {
  languageOverlay = document.createElement('div');
  languageOverlay.id = 'language-overlay';
  languageOverlay.style.display = 'none'; // ซ่อนเริ่มต้น
  document.body.appendChild(languageOverlay);
  languageOverlay.addEventListener('click', closeLanguageDropdown); // เพิ่มการปิด dropdown เมื่อคลิกพื้นหลังสีดำ
 }

 // สร้างปุ่มสำหรับการเลือกภาษา
 if (!languageButton) {
  languageButton = document.createElement('button');
  languageButton.id = 'language-button';
  updateButtonText(languageButton); // อัพเดตข้อความปุ่มตามภาษาที่เลือก
  languageButton.addEventListener('click', toggleLanguageDropdown);
  languageContainer.appendChild(languageButton);
 }

 // สร้างหน้าต่างตัวเลือกภาษา
 if (!languageDropdown) {
  languageDropdown = document.createElement('div');
  languageDropdown.id = 'language-dropdown';
  languageDropdown.style.display = 'none'; // ซ่อนเริ่มต้น
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
}

// ฟังก์ชันอัพเดตข้อความในปุ่มตามภาษาที่เลือก
function updateButtonText(button) {
 const buttonText = languagesConfig[selectedLang]?.buttonText || 'Select Language';
 button.textContent = buttonText;
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
 document.body.classList.add('no-scroll'); // ล็อกการเลื่อนหน้าเว็บ

 // จางเข้า (Fade In)
 languageOverlay.classList.add('fade-in');
 languageDropdown.classList.add('fade-in');
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
 const newURL = window.location.origin + window.location.pathname.replace(currentFile, newFileName);

 // ป้องกันการซ้ำซ้อนของ URL
 if (currentURL !== newURL) {
  history.replaceState({ lang: language }, '', newURL);
  location.reload(); // รีเฟรชหน้าทันที
 }

 // ปิด dropdown หลังเลือกภาษา
 closeLanguageDropdown();

 // อัพเดตข้อความของปุ่มหลังเลือกภาษา
 updateButtonText(languageButton);
}

// ฟังก์ชันเริ่มต้นตรวจสอบภาษาและการโหลดไฟล์
function handleInitialLanguage() {
 const currentFile = window.location.pathname.split('/').pop();
 const langFromUrl = currentFile.split('_')[1]?.split('.')[0];

 // เลือกภาษาจาก URL หรือ localStorage
 if (langFromUrl && languagesConfig[langFromUrl]) {
  selectedLang = langFromUrl;
 } else if (!localStorage.getItem('selectedLang')) {
  // ตรวจสอบภาษาในเบราว์เซอร์ หากไม่มีใน localStorage
  const browserLang = navigator.language || navigator.userLanguage;
  const matchingLang = Object.keys(languagesConfig).find(lang => browserLang.startsWith(lang));

  if (matchingLang) {
   selectedLang = matchingLang;
  } else {
   selectedLang = 'en'; // หากไม่พบภาษาที่ตรงกับเบราว์เซอร์
  }
 } else {
  selectedLang = localStorage.getItem('selectedLang');
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
window.onpopstate = function(event) {
 const lang = event.state?.lang || selectedLang || 'en';
 selectLanguage(lang);
};