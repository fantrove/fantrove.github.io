document.addEventListener('DOMContentLoaded', () => {
 const backButton = document.getElementById('back-button');

 if (backButton) {
  backButton.addEventListener('click', () => {
   try {
    // ตรวจสอบว่า history state มีให้ย้อนกลับหรือไม่
    if (window.history.length > 1) {
     window.history.back();

     // ตรวจสอบว่าเปลี่ยนหน้าสำเร็จหรือไม่หลังจากระยะเวลาหนึ่ง
     setTimeout(() => {
      if (document.referrer === "") {
       window.location.href = 'index.html'; // หากไม่มี referrer แสดงว่าย้อนกลับไม่ได้
      }
     }, 1);
    } else {
     window.location.href = 'index.html';
    }
   } catch (error) {
    console.error('เกิดข้อผิดพลาดในการย้อนกลับ:', error);
    window.location.href = 'index.html'; // เปลี่ยนเส้นทางหากเกิดข้อผิดพลาด
   }
  });
 } else {
  console.error('ไม่พบปุ่มย้อนกลับใน DOM');
 }
});