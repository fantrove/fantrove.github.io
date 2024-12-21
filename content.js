document.addEventListener("DOMContentLoaded", () => {
 // ฟังก์ชันโหลดเนื้อหาจากไฟล์ที่กำหนด
 const loadContent = (attribute, file) => {
  document.querySelectorAll(`[${attribute}]`).forEach(async (element) => {
   const response = await fetch(file);
   const data = await response.text();
   const content = element.getAttribute(attribute).split('@c'); // แบ่งเนื้อหา @c

   let html = "";
   content.forEach((item) => {
    if (item.trim()) {
     html += `<button class="content-button" data-clipboard="${item.trim()}">${item.trim()}</button>`;
    }
   });
   element.innerHTML = html;

   // คัดลอกไปยังคลิปบอร์ดเมื่อคลิกปุ่ม
   element.querySelectorAll('.content-button').forEach((button) => {
    button.addEventListener("click", () => {
     navigator.clipboard.writeText(button.dataset.clipboard);
     // แสดง custom alert
     showCustomAlert(`คัดลอกแล้ว: ${button.dataset.clipboard}`);
    });
   });
  });
 };

 // โหลดเนื้อหาแยกไฟล์ emoji.html และ specialchar.html
 loadContent("emoji", "emoji.html");
 loadContent("specialchar", "specialchar.html");

 // ฟังก์ชันแสดง custom alert
 function showCustomAlert(message) {
  const alertBox = document.getElementById("custom-alert");
  const alertText = document.getElementById("alert-text");
  alertText.textContent = message;

  // แสดง alert
  alertBox.style.display = "block";

  // ซ่อน alert หลังจาก 2 วินาที
  setTimeout(() => {
   alertBox.style.display = "none";
  }, 2000);
 }
});