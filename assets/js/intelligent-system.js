// เลือกทุกภาพที่ต้องการทำ lazy loading
const images = document.querySelectorAll('img');

// ฟังก์ชันสำหรับตั้งค่า Preload ล่วงหน้า
const preloadImage = (image) => {
 // โหลดภาพจาก src (ต้องเป็นภาพจริง)
 const src = image.getAttribute('src');
 const img = new Image(); // สร้างออบเจ็กต์ใหม่สำหรับการโหลดภาพ
 img.src = src; // ตั้งค่าภาพที่ต้องการโหลด
};

// ตั้งค่า Intersection Observer เพื่อโหลดล่วงหน้า
const observer = new IntersectionObserver((entries, observer) => {
 entries.forEach(entry => {
  if (entry.isIntersecting) {
   const image = entry.target;
   // โหลดภาพล่วงหน้า
   preloadImage(image);
   observer.unobserve(image); // หยุดการติดตามภาพนี้หลังจากโหลด
  }
 });
}, {
 rootMargin: '200px', // โหลดล่วงหน้าก่อนภาพจะปรากฏบนหน้าจอ 200px
 threshold: 0.1 // โหลดเมื่อภาพปรากฏ 10% บนหน้าจอ
});

// เริ่มติดตามแต่ละภาพ
images.forEach(image => {
 observer.observe(image); // เริ่มติดตามการแสดงภาพ
});