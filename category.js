document.addEventListener('DOMContentLoaded', () => {
 const categoryButtons = Array.from(document.querySelectorAll('.category-button'));

 // ฟังก์ชันเพื่อเปลี่ยนสถานะปุ่ม category
 function activateCategoryButton(button) {
  if (!button) return;
  categoryButtons.forEach(btn => {
   btn.classList.remove('active');
   btn.style.pointerEvents = '';
  });
  button.classList.add('active');
  button.style.pointerEvents = 'none';
 }

 // ฟังก์ชันเปิดหน้าใหม่แทนการโหลดเนื้อหา
 function openNewPage(hash) {
  if (hash.includes('#')) {
   console.warn('URLs with "#" are not supported.');
   return;
  }
  const page = `${hash}.html`;
  window.location.href = page;
 }

 // ฟังก์ชันตรวจสอบ URL และตั้งสถานะ active
 function checkURL() {
  let currentHash = window.location.hash ? window.location.hash.slice(1) : '';

  // ป้องกันการใช้งาน URL ที่มี #
  if (currentHash.includes('#')) {
   console.warn('URLs with "#" are not supported.');
   return;
  }

  // ตรวจสอบว่า URL มี hash หรือไม่ ถ้าไม่มีให้ใช้ path ชื่อไฟล์หลัก
  if (!currentHash && window.location.pathname !== '/') {
   currentHash = window.location.pathname.split('/').pop().split('.')[0];
  }

  // ถ้าหากอยู่ในหน้า index หรือไม่มี hash ก็ไม่ต้องทำอะไร
  if (window.location.pathname === '/index.html' || currentHash === '') {
   return; 
  }

  // หา button ที่ตรงกับ hash หรือชื่อไฟล์ใน URL
  const activeButton = categoryButtons.find(btn => btn.getAttribute('data-category') === currentHash);
  
  if (activeButton) {
   activateCategoryButton(activeButton);
  } else {
   const emojiButton = categoryButtons.find(btn => btn.getAttribute('data-category') === 'emoji');
   if (emojiButton) {
    activateCategoryButton(emojiButton);
   }
  }
 }

 // เพิ่ม event listeners ให้กับปุ่ม category ทุกปุ่ม
 categoryButtons.forEach(button => {
  let isPressed = false;

  button.addEventListener('pointerdown', () => {
   isPressed = true;
  });

  button.addEventListener('pointerup', (event) => {
   if (!isPressed) return;
   isPressed = false;

   const hash = button.getAttribute('data-category');
   if (hash.includes('#')) {
    console.warn('Buttons with "#" in data-category are not supported.');
    event.preventDefault();
    return;
   }

   if (button.classList.contains('active')) {
    event.preventDefault();
    return;
   }

   activateCategoryButton(button);
   openNewPage(hash);
  });

  button.addEventListener('pointerleave', () => {
   isPressed = false;
  });
 });

 // ฟังก์ชันตรวจสอบและตั้งค่า active ปุ่มทันทีที่โหลดหน้า
 function prepareActiveButtonOnLoad() {
  let currentHash = window.location.hash ? window.location.hash.slice(1) : '';

  // ป้องกันการใช้งาน URL ที่มี #
  if (currentHash.includes('#')) {
   console.warn('URLs with "#" are not supported.');
   return;
  }

  if (!currentHash && window.location.pathname !== '/') {
   currentHash = window.location.pathname.split('/').pop().split('.')[0];
  }

  if (window.location.pathname === '/index.html' || currentHash === '') {
   return;
  }

  const activeButton = categoryButtons.find(btn => btn.getAttribute('data-category') === currentHash);
  if (activeButton) {
   activateCategoryButton(activeButton);
  } else {
   const emojiButton = categoryButtons.find(btn => btn.getAttribute('data-category') === 'emoji');
   if (emojiButton) activateCategoryButton(emojiButton);
  }
 }

 checkURL();
 prepareActiveButtonOnLoad();

 window.addEventListener('hashchange', checkURL);
});