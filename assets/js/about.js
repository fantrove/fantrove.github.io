document.addEventListener('DOMContentLoaded', () => {
  const backButton = document.querySelector('.back-button');

  // ตรวจสอบว่าปุ่มย้อนกลับถูกต้องหรือไม่
  if (backButton) {
    let isPointerDown = false;

    backButton.addEventListener('pointerdown', () => {
      isPointerDown = true;
    });

    backButton.addEventListener('pointerup', () => {
      if (isPointerDown) {
        // ตรวจสอบว่าเป็นการย้อนกลับที่ไม่มีประวัติ
        if (window.history.length > 1) {
          try {
            window.history.back(); // การย้อนกลับ
          } catch (error) {
            console.error('เกิดข้อผิดพลาดในการทำงานของปุ่มย้อนกลับ:', error);
          }
        } else {
          // ไม่มีประวัติในการย้อนกลับ จะทำการเปิด index.html แทน
          window.location.replace('index.html'); // ไปที่ index.html และลบประวัติการเข้าชม
        }
        isPointerDown = false; // รีเซ็ตสถานะ
      }
    });

    backButton.addEventListener('pointerleave', () => {
      // รีเซ็ตสถานะหาก pointer หลุดออกจากปุ่มก่อนปล่อย
      isPointerDown = false;
    });
  } else {
    console.error('ไม่พบปุ่มย้อนกลับใน DOM');
  }
});