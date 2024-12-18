document.addEventListener('DOMContentLoaded', function() {
 const loadingContainer = document.querySelector('.loading-container');

 if (loadingContainer) {
  // เพิ่ม SVG สำหรับ Spinner หากยังไม่ได้แสดง
  const svgSpinner = `
      <svg class="spinner" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
        <circle class="path" fill="none" stroke-width="8" stroke-linecap="round" cx="33" cy="33" r="30"></circle>
      </svg>
    `;
  loadingContainer.innerHTML = svgSpinner;

  // แสดงหน้าโหลดทันทีที่เริ่มโหลด
  loadingContainer.style.visibility = 'visible'; // ทำให้หน้าโหลดแสดงทันที

  // เมื่อโหลดเสร็จ ให้หน้าโหลดค่อยๆ จางหาย
  window.onload = function() {
   loadingContainer.style.transition = "opacity 0.3s ease-out, visibility 0s 0.3s";
   loadingContainer.style.opacity = 0; // ทำให้จางหาย

   // ลบหน้าโหลดหลังจากการจางหายเสร็จ
   setTimeout(function() {
    loadingContainer.remove(); // ลบจาก DOM หลังจากจางหาย
   }, 300); // รอให้การจางหายเสร็จ
  };
 }
});
