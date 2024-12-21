document.addEventListener('DOMContentLoaded', () => {
  const loadingContainer = document.getElementById('loading-container-c');
  const categoryButtons = Array.from(document.querySelectorAll('.category-button'));
  let historyStack = [];

  // ฟังก์ชันแสดงข้อความโหลด
  function showLoadingMessage() {
    requestAnimationFrame(() => {
      loadingContainer.style.visibility = 'visible'; // แสดง container
      loadingContainer.style.opacity = '1'; // เปิดการแสดงให้มีความชัดเจน
      loadingContainer.style.transition = 'none'; // ไม่ใช้ transition ที่จะทำให้มันค่อยๆ จางเข้า
    });
  }

  // ฟังก์ชันซ่อนข้อความโหลด
  function hideLoadingMessage() {
    // ใช้ timeout เพื่อให้ transition opacity เกิดขึ้นก่อน
    loadingContainer.style.transition = 'opacity 0.3s ease-out'; // เพิ่ม transition สำหรับขาออก
    loadingContainer.style.opacity = '0'; // ค่อยๆ หายไป

    // ซ่อน visibility หลังจาก opacity เป็น 0
    setTimeout(() => {
      loadingContainer.style.visibility = 'hidden'; // ซ่อนเมื่อ opacity เป็น 0
    }, 300); // ต้องรอให้ transition เสร็จสิ้นก่อน (เวลาเท่ากับเวลา transition opacity)
  }

  // ฟังก์ชันเพื่อเปลี่ยนสถานะปุ่ม category
  function activateCategoryButton(button) {
    if (!button) return;
    categoryButtons.forEach(btn => {
      btn.classList.remove('active');
      btn.style.pointerEvents = '';
    });
    button.classList.add('active');
    button.style.pointerEvents = 'none';
  }

  // ฟังก์ชันโหลดเนื้อหาแบบไร้รอยต่อ
  async function loadContent(hash, showLoader = true) {
    const page = hash === 'index' ? 'emoji.html' : `${hash}.html`;
    try {
      if (showLoader) showLoadingMessage(); // แสดงข้อความโหลดเฉพาะเวลาสลับหมวดหมู่
      const response = await fetch(page);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.text();
      document.getElementById('content').innerHTML = data;
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการโหลดเนื้อหา:', error);
    } finally {
      hideLoadingMessage(); // ซ่อนข้อความโหลดหลังจากโหลดเนื้อหาจบ
    }
  }

  // ฟังก์ชันตรวจสอบ URL และตั้งสถานะ active
  function checkURL() {
    let currentHash = window.location.hash ? window.location.hash.slice(1) : 'emoji';
    const activeButton = categoryButtons.find(btn => btn.getAttribute('data-category') === currentHash);

    if (activeButton) {
      activateCategoryButton(activeButton);
      loadContent(currentHash, false); // ไม่แสดงข้อความโหลดเมื่อโหลดครั้งแรก
    } else {
      const emojiButton = categoryButtons.find(btn => btn.getAttribute('data-category') === 'emoji');
      if (emojiButton) {
        activateCategoryButton(emojiButton);
        window.history.replaceState(null, null, '#emoji');
        loadContent('emoji', false); // ไม่แสดงข้อความโหลดเมื่อโหลดครั้งแรก
      }
    }
  }

  // ฟังก์ชันจัดการประวัติ
  function updateHistory(hash) {
    if (historyStack.length === 2) {
      historyStack.shift();
    }
    historyStack.push(hash);
  }

  // เพิ่ม event listeners ให้กับปุ่ม category ทุกปุ่ม
  categoryButtons.forEach(button => {
    let isPressed = false;

    button.addEventListener('pointerdown', () => {
      isPressed = true;
    });

    button.addEventListener('pointerup', async (event) => {
      if (!isPressed) return;
      isPressed = false;

      const hash = button.getAttribute('data-category');
      if (button.classList.contains('active')) {
        event.preventDefault();
        return;
      }

      updateHistory(hash);

      activateCategoryButton(button);
      window.history.pushState(null, null, `#${hash}`);
      await loadContent(hash); // แสดงข้อความโหลดเมื่อเปลี่ยนหมวดหมู่
    });

    button.addEventListener('pointerleave', () => {
      isPressed = false;
    });
  });

  // ฟังก์ชันตรวจสอบและตั้งค่า active ปุ่มทันทีที่โหลดหน้า
  function prepareActiveButtonOnLoad() {
    const currentHash = window.location.hash ? window.location.hash.slice(1) : 'emoji';
    const activeButton = categoryButtons.find(btn => btn.getAttribute('data-category') === currentHash);
    if (activeButton) {
      activateCategoryButton(activeButton);
    } else {
      const emojiButton = categoryButtons.find(btn => btn.getAttribute('data-category') === 'emoji');
      if (emojiButton) activateCategoryButton(emojiButton);
    }
  }

  checkURL();
  prepareActiveButtonOnLoad();

  const initialHash = window.location.hash ? window.location.hash.slice(1) : 'emoji';
  updateHistory(initialHash);

  window.addEventListener('popstate', () => {
    if (historyStack.length > 1) {
      historyStack.pop();
      const prevHash = historyStack.pop();
      if (prevHash) {
        window.history.replaceState(null, null, `#${prevHash}`);
        checkURL();
      } else {
        window.history.back();
      }
    } else {
      window.history.back();
    }
  });

  if (!window.location.hash) {
    window.location.hash = 'emoji';
  }
});