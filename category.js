document.addEventListener('DOMContentLoaded', () => {
 const categoryButtons = Array.from(document.querySelectorAll('.category-button'));
 const historyKey = 'categoryHistory'; // กำหนดคีย์เพื่อใช้เก็บประวัติ

 // ฟังก์ชันสำหรับการเพิ่มประวัติ
 function addHistory(category) {
  let history = JSON.parse(sessionStorage.getItem(historyKey)) || [];

  // เพิ่ม category ใหม่ที่เก็บไว้
  history.unshift(category);

  // เก็บไว้ไม่ให้เกิน 2 ประวัติ
  if (history.length > 2) {
   history = history.slice(0, 2); // เก็บแค่ 2 ประวัติ
  }

  // อัพเดตประวัติใน sessionStorage
  sessionStorage.setItem(historyKey, JSON.stringify(history));
 }

 // ฟังก์ชันเปลี่ยนสถานะปุ่ม category และเก็บประวัติทันที
 function activateCategoryButton(button) {
  if (!button) return;
  categoryButtons.forEach(btn => {
   btn.classList.remove('active');
   btn.style.pointerEvents = '';
  });
  button.classList.add('active');
  button.style.pointerEvents = 'none';

  // เก็บประวัติทันทีเมื่อปุ่มถูก active
  const category = button.getAttribute('data-category');
  addHistory(category);
 }

 // ฟังก์ชันเปิดหน้าใหม่แทนการโหลดเนื้อหา
 function openNewPage(category) {
  // ไม่รองรับ URL ที่มี '#'
  const page = `${category}.html`;
  window.location.href = page;
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

   const category = button.getAttribute('data-category');

   // ป้องกันการใช้งาน '#' ใน URL
   if (category.includes('#')) {
    console.warn('Category with "#" is not supported.');
    event.preventDefault();
    return;
   }

   if (button.classList.contains('active')) {
    event.preventDefault();
    return;
   }

   activateCategoryButton(button);
   openNewPage(category);
  });

  button.addEventListener('pointerleave', () => {
   isPressed = false;
  });
 });

 // ฟังก์ชันตรวจสอบ URL และตั้งสถานะ active
 function checkURL() {
  // ป้องกันการใช้งาน URL ที่มี '#'
  if (window.location.hash) {
   console.warn('URLs with "#" are not supported.');
   window.location.hash = ''; // รีเซ็ต hash เพื่อไม่ให้ URL มี '#'
   return;
  }

  let currentPath = window.location.pathname.split('/').pop().split('.')[0];

  // หากเป็นหน้า index หรือไม่พบ category ให้ไม่ทำอะไร
  if (currentPath === 'index' || !currentPath) {
   return;
  }

  // หา button ที่ตรงกับ category ใน URL
  const activeButton = categoryButtons.find(btn => btn.getAttribute('data-category') === currentPath);

  if (activeButton) {
   activateCategoryButton(activeButton);
  } else {
   const emojiButton = categoryButtons.find(btn => btn.getAttribute('data-category') === 'emoji');
   if (emojiButton) {
    activateCategoryButton(emojiButton);
   }
  }
 }

 // ฟังก์ชันตรวจสอบและตั้งค่า active ปุ่มทันทีที่โหลดหน้า
 function prepareActiveButtonOnLoad() {
  // ป้องกันการใช้งาน URL ที่มี '#'
  if (window.location.hash) {
   console.warn('URLs with "#" are not supported.');
   window.location.hash = ''; // รีเซ็ต hash เพื่อไม่ให้ URL มี '#'
   return;
  }

  let currentPath = window.location.pathname.split('/').pop().split('.')[0];

  // หากเป็นหน้า index หรือไม่มี category ให้ไม่ทำอะไร
  if (currentPath === 'index' || !currentPath) {
   return;
  }

  const activeButton = categoryButtons.find(btn => btn.getAttribute('data-category') === currentPath);
  if (activeButton) {
   activateCategoryButton(activeButton);
  } else {
   const emojiButton = categoryButtons.find(btn => btn.getAttribute('data-category') === 'emoji');
   if (emojiButton) activateCategoryButton(emojiButton);
  }
 }

 // เรียกใช้ฟังก์ชันต่าง ๆ
 checkURL();
 prepareActiveButtonOnLoad();

 // ป้องกันการเปลี่ยนแปลง URL ที่เกี่ยวข้องกับ #
 window.addEventListener('hashchange', (event) => {
  event.preventDefault(); // ป้องกันไม่ให้ hash change
  console.warn('Changes to URL hash are not supported.');
 });

 // ป้องกันการเปลี่ยนแปลง hash ทุกกรณี
 window.addEventListener('popstate', (event) => {
  if (window.location.hash) {
   window.history.pushState('', document.title, window.location.pathname); // รีเซ็ต hash กลับ
   console.warn('URLs with "#" are not supported.');
  }
 });
});