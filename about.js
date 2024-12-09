document.addEventListener('DOMContentLoaded', () => {
  const backButton = document.querySelector('.back-button');

  // ตรวจสอบว่าปุ่มย้อนกลับถูกต้องหรือไม่
  if (backButton) {
    backButton.addEventListener('click', () => {
      try {
        window.history.back(); // การย้อนกลับ
      } catch (error) {
        console.error('เกิดข้อผิดพลาดในการทำงานของปุ่มย้อนกลับ:', error);
      }
    });
  } else {
    console.error('ไม่พบปุ่มย้อนกลับใน DOM');
  }
});