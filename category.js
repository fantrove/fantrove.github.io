document.addEventListener('DOMContentLoaded', () => {
  const contentDiv = document.getElementById('content');
  const categoryButtons = Array.from(document.querySelectorAll('.category-button'));
  let historyStack = []; // เก็บประวัติในหน่วยความจำชั่วคราว

  // ฟังก์ชันเพื่อเปลี่ยนสถานะปุ่ม category
  function activateCategoryButton(button) {
    if (!button) return; // หากไม่มีปุ่มที่ต้อง active ให้หยุดทำงาน
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

  // ฟังก์ชันตรวจสอบ URL และตั้งสถานะ active
  function checkURL() {
    let currentHash = window.location.hash ? window.location.hash.slice(1) : 'emoji'; // ค่าเริ่มต้นเป็น emoji
    const activeButton = categoryButtons.find(btn => btn.getAttribute('data-category') === currentHash);

    if (activeButton) {
      activateCategoryButton(activeButton);
      loadContent(currentHash);
    } else {
      // หากไม่มี hash หรือไม่พบหมวดหมู่ที่ตรงกับ hash ให้เลือก emoji
      const emojiButton = categoryButtons.find(btn => btn.getAttribute('data-category') === 'emoji');
      if (emojiButton) {
        activateCategoryButton(emojiButton);
        window.history.replaceState(null, null, '#emoji'); // ตั้งค่า URL ใหม่เป็น #emoji
        loadContent('emoji');
      }
    }
  }

  // ฟังก์ชันจัดการประวัติ
  function updateHistory(hash) {
    if (historyStack.length === 2) {
      historyStack.shift(); // ลบประวัติแรกถ้ามีเกิน 2 ประวัติ
    }
    historyStack.push(hash);
  }

  // เพิ่ม event listeners ให้กับปุ่ม category ทุกปุ่ม
  categoryButtons.forEach(button => {
    let isPressed = false;

    button.addEventListener('pointerdown', () => {
      isPressed = true; // เริ่มกดปุ่ม
    });

    button.addEventListener('pointerup', async (event) => {
      if (!isPressed) return; // หากไม่มี pointerdown จะไม่ทำงาน
      isPressed = false;

      const hash = button.getAttribute('data-category'); // ใช้ data-category แทน
      if (button.classList.contains('active')) {
        event.preventDefault();
        return; // หากปุ่ม active แล้วไม่ทำงานซ้ำ
      }

      // อัปเดตประวัติในหน่วยความจำ
      updateHistory(hash);

      activateCategoryButton(button);
      window.history.pushState(null, null, `#${hash}`); // เปลี่ยน URL
      await loadContent(hash); // โหลดเนื้อหาใหม่
    });

    button.addEventListener('pointerleave', () => {
      isPressed = false; // รีเซ็ตสถานะเมื่อ pointer ออกจากปุ่ม
    });
  });

  // ฟังก์ชันตรวจสอบและตั้งค่า active ปุ่มทันทีที่โหลดหน้า
  function prepareActiveButtonOnLoad() {
    const currentHash = window.location.hash ? window.location.hash.slice(1) : 'emoji'; // ใช้ emoji เป็นค่าเริ่มต้น
    const activeButton = categoryButtons.find(btn => btn.getAttribute('data-category') === currentHash);
    if (activeButton) {
      activateCategoryButton(activeButton); // ตั้ง active ให้ปุ่มที่ตรงกับ hash
    } else {
      const emojiButton = categoryButtons.find(btn => btn.getAttribute('data-category') === 'emoji');
      if (emojiButton) activateCategoryButton(emojiButton); // ตั้ง active ให้ emoji เป็นค่าเริ่มต้น
    }
  }

  // ตรวจสอบ URL เมื่อโหลดหน้า
  checkURL();

  // ตั้งค่า active ปุ่มทันทีที่โหลดหน้า
  prepareActiveButtonOnLoad();

  // บันทึกประวัติของ URL เมื่อผู้ใช้เข้ามาครั้งแรก
  const initialHash = window.location.hash ? window.location.hash.slice(1) : 'emoji';
  updateHistory(initialHash);

  // ตรวจสอบ URL เมื่อเปลี่ยนแปลง
  window.addEventListener('popstate', () => {
    if (historyStack.length > 1) {
      historyStack.pop(); // ลบประวัติล่าสุด
      const prevHash = historyStack.pop(); // ดึงประวัติแรกที่เหลืออยู่
      if (prevHash) {
        window.history.replaceState(null, null, `#${prevHash}`); // ย้อนกลับไปหมวดหมู่ก่อนหน้า
        checkURL(); // ตรวจสอบและโหลดเนื้อหาใหม่
      } else {
        window.history.back(); // ออกจากเว็บไซต์ถ้าไม่มีประวัติหลงเหลือ
      }
    } else {
      window.history.back(); // ออกจากเว็บไซต์ถ้าอยู่ในประวัติแรกสุด
    }
  });

  // เพิ่มส่วนการเปลี่ยนเส้นทาง URL ไปยัง #emoji เมื่อเข้ามาครั้งแรก
  if (!window.location.hash) {
    window.location.hash = 'emoji';
  }
});