// ฟังก์ชัน highlightNavButton เพื่อทำให้ปุ่ม active
function highlightNavButton() {
 const navButtons = document.querySelectorAll('.category-button');
 const currentLocation = window.location.pathname.split('/emoji.html').pop();

 navButtons.forEach(button => {
  const buttonPath = button.getAttribute('onclick')?.match(/'([^']+)'/);
  if (buttonPath) {
   const isActive = (currentLocation === buttonPath[1] || (currentLocation === '' && buttonPath[1] === 'emoji.html'));
   button.classList.toggle('active', isActive);
   button.disabled = isActive;

   // บล็อก :hover และ :active เมื่อปุ่มเป็น active
   button.style.pointerEvents = isActive ? 'none' : '';
  }
 });
}

// ฟังก์ชัน navigate เพื่อเปลี่ยนหน้าเมื่อคลิกปุ่ม
function navigate(page) {
 window.location.href = page;
}

// เพิ่ม event listeners ให้กับปุ่ม nav ทุกปุ่ม
function setupNavButtonEvents() {
 const navButtons = document.querySelectorAll('.category-button');

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
}

// เรียกใช้ฟังก์ชัน highlightNavButton และ setupNavButtonEvents เมื่อหน้าโหลดเสร็จ
document.addEventListener('DOMContentLoaded', () => {
 highlightNavButton();
 setupNavButtonEvents();
});