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
  const page = hash === 'index' ? 'emoji.html' : `${hash}.html`;
  // เปิดหน้าใหม่เลย
  window.location.href = page;
 }

 // ฟังก์ชันตรวจสอบ URL และตั้งสถานะ active
 function checkURL() {
  const currentHash = window.location.hash ? window.location.hash.slice(1) : '';

  // ตรวจสอบว่า URL เป็น index หรือไม่
  if (window.location.pathname === '/index.html' || currentHash === '') {
   return; // ไม่ต้องทำอะไรเมื่ออยู่ใน index.html
  }

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
   if (button.classList.contains('active')) {
    event.preventDefault();
    return;
   }

   activateCategoryButton(button);
   openNewPage(hash); // เปิดหน้าใหม่เมื่อเปลี่ยนหมวดหมู่
  });

  button.addEventListener('pointerleave', () => {
   isPressed = false;
  });
 });

 // ฟังก์ชันตรวจสอบและตั้งค่า active ปุ่มทันทีที่โหลดหน้า
 function prepareActiveButtonOnLoad() {
  const currentHash = window.location.hash ? window.location.hash.slice(1) : '';

  // ตรวจสอบว่า URL เป็น index หรือไม่
  if (window.location.pathname === '/index.html' || currentHash === '') {
   return; // ไม่ต้องทำอะไรเมื่ออยู่ใน index.html
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
});