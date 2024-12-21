// ฟังก์ชัน highlightNavButton ถูกย้ายมานอกบริบท document.addEventListener
function highlightNavButton() {
 const navButtons = document.querySelectorAll('.nav-button');
 const currentLocation = window.location.pathname.split('/').pop();

 navButtons.forEach(button => {
  const buttonPath = button.getAttribute('onclick')?.match(/'([^']+)'/);
  if (buttonPath) {
   const isActive = (currentLocation === buttonPath[1] || (currentLocation === '' && buttonPath[1] === 'index.html'));
   button.classList.toggle('active', isActive);
   button.disabled = isActive;

   // บล็อก :hover และ :active เมื่อปุ่มเป็น active
   button.style.pointerEvents = isActive ? 'none' : '';
  }
 });
}

document.addEventListener('DOMContentLoaded', () => {
 const navbarToggle = document.getElementById('navbarToggle');
 const sidebar = document.getElementById('sidebar');
 const overlay = document.getElementById('overlay');
 const navButtons = document.querySelectorAll('.nav-button');

 // ฟังก์ชันเพื่อเปลี่ยนหน้า
 function navigate(page) {
  clearAllStates(); // เรียกใช้ฟังก์ชันล้างการทำงานก่อนเปลี่ยนหน้า
  window.location.href = page;
 }

 // ฟังก์ชันเพื่อเปลี่ยนสถานะของเมนู
 function toggleMenu() {
  const isOpen = navbarToggle.classList.toggle('open');
  sidebar.classList.toggle('open-sidebar', isOpen);

  if (overlay.classList.contains('show-overlay')) {
   overlay.classList.remove('show-overlay');
   document.body.style.overflow = ''; // ปลดบล็อกการเลื่อน
   setTimeout(() => overlay.style.display = 'none', 400);
  } else {
   overlay.style.display = 'block';
   setTimeout(() => {
    overlay.classList.add('show-overlay');
    document.body.style.overflow = 'hidden'; // บล็อกการเลื่อน
   }, 10); // หน่วงเวลาเล็กน้อยเพื่อให้ transition ทำงาน
  }
 }

 // เพิ่มฟังก์ชันในการล้างการทำงานทั้งหมด
 function clearAllStates() {
  navbarToggle.classList.remove('open');
  sidebar.classList.remove('open-sidebar');
  overlay.classList.remove('show-overlay');
  document.body.style.overflow = ''; // ปลดบล็อกการเลื่อน
  setTimeout(() => overlay.style.display = 'none', 400);
  navButtons.forEach(button => button.classList.remove('hover'));
 }

 // เรียกใช้ฟังก์ชัน highlightNavButton เมื่อโหลดหน้า
 highlightNavButton();

 // จัดการการคลิกที่ navbarToggle
 navbarToggle.addEventListener('click', toggleMenu);

 // จัดการการคลิกที่ overlay เพื่อปิดเมนู
 overlay.addEventListener('click', clearAllStates);

 // เพิ่ม event listener สำหรับการ refresh หน้า
 window.addEventListener('beforeunload', clearAllStates);

 // เพิ่ม event listeners ให้กับปุ่ม nav ทุกปุ่มเพื่อเรียกใช้ฟังก์ชัน navigate
 navButtons.forEach(button => {
  button.addEventListener('pointerdown', () => {
   if (!button.classList.contains('active')) {
    button.classList.add('hover'); // เพิ่ม hover เมื่อ pointerdown
   }
  });

  button.addEventListener('pointerup', () => {
   if (!button.disabled) {
    const buttonPath = button.getAttribute('onclick')?.match(/'([^']+)'/);
    if (buttonPath) {
     navigate(buttonPath[1]); // ตรวจสอบและไปยังหน้าใหม่
    }
   }
   button.classList.remove('hover'); // ลบ hover หลัง pointerup
  });

  button.addEventListener('pointerleave', () => {
   button.classList.remove('hover'); // ลบ hover เมื่อ pointerleave
  });
 });
});

// เพิ่มการเรียกใช้งาน highlightNavButton เมื่อหน้าโหลดเสร็จ
window.addEventListener('load', highlightNavButton);

// จัดการข้อผิดพลาด
window.addEventListener('error', (event) => {
 console.error('เกิดข้อผิดพลาด:', event.message);
});