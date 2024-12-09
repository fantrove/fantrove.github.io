document.addEventListener('DOMContentLoaded', () => {
  const contentDiv = document.getElementById('content');
  const categoryButtons = Array.from(document.querySelectorAll('.category-button'));
  let historyStack = []; // เก็บประวัติแค่ 2 ประวัติล่าสุด

  // ฟังก์ชันเพื่อเปลี่ยนสถานะปุ่ม category
  function activateCategoryButton(button) {
    categoryButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
  }

  // ฟังก์ชันโหลดเนื้อหาแบบไร้รอยต่อ
  async function loadContent(hash) {
    const page = hash === 'index' ? 'emoji.html' : `${hash}.html`; // กำหนดหน้า index ให้แสดง emoji
    try {
      const response = await fetch(page); // ไม่ยุ่งกับแคช
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.text();
      contentDiv.innerHTML = data;
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการโหลดเนื้อหา:', error);
    }
  }

  // ฟังก์ชันตรวจสอบ URL เมื่อโหลดหน้าและเปลี่ยนแปลง
  function checkURL() {
    const initialHash = window.location.hash ? window.location.hash.slice(1) : 'emoji'; // เปลี่ยนเป็น emoji เป็นหมวดหมู่เริ่มต้น
    const activeButton = categoryButtons.find(btn => btn.getAttribute('onclick').includes(`loadContent('${initialHash}')`)) ||
                         categoryButtons.find(btn => btn.getAttribute('onclick').includes("loadContent('emoji')"));

    if (activeButton) {
      activateCategoryButton(activeButton);
      loadContent(initialHash);
    }
  }

  // เพิ่ม event listeners ให้กับปุ่ม category ทุกปุ่ม
  categoryButtons.forEach(button => {
    button.addEventListener('click', async (event) => {
      if (button.classList.contains('active')) {
        event.preventDefault();
        return; // ถ้าปุ่มถูก active อยู่ ไม่ทำอะไร
      }
      const hash = button.getAttribute('onclick').match(/loadContent\('([^']+)'\)/)[1];

      // เก็บประวัติเฉพาะ 2 ปุ่มล่าสุด
      if (historyStack.length === 2) {
        historyStack.shift(); // ลบประวัติแรกถ้ามีเกิน 2 ประวัติ
      }
      historyStack.push(hash);

      activateCategoryButton(button);
      window.history.pushState(null, null, `#${hash}`); // เปลี่ยนเป็น pushState เพื่อให้ทำงานกับปุ่มย้อนกลับได้อย่างถูกต้อง

      await loadContent(hash); // เรียกใช้ฟังก์ชัน loadContent
    });
  });

  // ฟังก์ชันเก็บประวัติของปุ่ม emoji เมื่อเข้ามาครั้งแรก
  function storeInitialButton() {
    historyStack.push('emoji');
  }

  // ตรวจสอบ URL เมื่อโหลดหน้า
  checkURL();

  // เก็บประวัติของปุ่ม emoji เมื่อเข้ามาครั้งแรก
  storeInitialButton();

  // ตรวจสอบ URL เมื่อเปลี่ยนแปลง
  window.addEventListener('popstate', () => {
    if (historyStack.length > 1) {
      historyStack.pop(); // ลบประวัติล่าสุด
      const prevHash = historyStack.pop(); // ดึงประวัติแรกที่เหลืออยู่
      if (prevHash) {
        window.history.replaceState(null, null, `#${prevHash}`); // ย้อนกลับไปหมวดหมู่ก่อนหน้า
        checkURL(); // ตรวจสอบและโหลดเนื้อหาใหม่
        return;
      }
    }
    window.history.back(); // ออกจากหน้าเว็บถ้าไม่มีประวัติให้ย้อนกลับ
  });

  // ดึงสถานะ active ทันทีเมื่อหน้าเว็บกำลังโหลด
  checkURL();

  // เพิ่มส่วนการเปลี่ยนเส้นทาง URL ไปยัง #emoji เมื่อเข้ามาครั้งแรก
  if (!window.location.hash) {
    window.location.hash = 'emoji';
  }
});