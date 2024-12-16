document.addEventListener('DOMContentLoaded', () => {
  const navbarToggle = document.getElementById('navbarToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const navButtons = document.querySelectorAll('.nav-button');

  // ฟังก์ชันเพื่อลบสถานะที่ไม่จำเป็น
  function clearAllStates() {
    navbarToggle.classList.remove('open');
    sidebar.classList.remove('open-sidebar');
    overlay.classList.remove('show-overlay');
    document.body.style.overflow = '';
    overlay.style.display = 'none';
    navButtons.forEach(button => {
      button.classList.remove('hover', 'active');
      button.style.pointerEvents = '';
    });
  }

  // ฟังก์ชันสำหรับการเปลี่ยนแปลงสถานะปุ่มเมนู
  function highlightNavButton() {
    const currentUrl = new URL(window.location.href);
    const currentLocation = currentUrl.pathname;
    const currentHash = currentUrl.hash;

    navButtons.forEach(button => {
      const buttonPath = button.getAttribute('onclick')?.match(/'([^']+)'/)[1];

      const isActive = (
        currentLocation === buttonPath || 
        (currentLocation === '/' && buttonPath === 'index.html') || 
        currentLocation.endsWith(buttonPath) ||
        (currentHash && currentHash.slice(1) === buttonPath)
      );

      button.classList.toggle('active', isActive);
      button.disabled = isActive;
      button.style.pointerEvents = isActive ? 'none' : '';
    });
  }

  // ฟังก์ชันจัดการการเปลี่ยนแปลง URL หรือ hash
  const updateActiveState = () => {
    highlightNavButton();
  };

  // ใช้ requestIdleCallback ถ้ามี เพื่อกระจายงานที่ไม่เร่งด่วน
  if ('requestIdleCallback' in window) {
    requestIdleCallback(updateActiveState);
  } else {
    setTimeout(updateActiveState, 50); // ใช้ setTimeout ถ้าไม่มี requestIdleCallback
  }

  // จัดการการคลิกที่ navbarToggle
  navbarToggle.addEventListener('pointerdown', () => {
    navbarTogglePressed = true;
  });

  navbarToggle.addEventListener('pointerup', () => {
    if (!navbarTogglePressed) return;
    navbarTogglePressed = false;
    toggleMenu();
  });

  navbarToggle.addEventListener('pointerleave', () => {
    navbarTogglePressed = false;
  });

  // ฟังก์ชันสำหรับการเปิด/ปิดเมนู
  function toggleMenu() {
    const isOpen = navbarToggle.classList.toggle('open');
    sidebar.classList.toggle('open-sidebar', isOpen);

    if (overlay.classList.contains('show-overlay')) {
      overlay.classList.remove('show-overlay');
      document.body.style.overflow = '';
      overlay.style.display = 'none';
    } else {
      overlay.style.display = 'block';
      setTimeout(() => {
        overlay.classList.add('show-overlay');
        document.body.style.overflow = 'hidden';
      }, 10);
    }
  }

  // ฟังก์ชันจัดการการคลิกที่ overlay เพื่อปิดเมนู
  overlay.addEventListener('pointerdown', () => {
    overlayPressed = true;
  });

  overlay.addEventListener('pointerup', () => {
    if (!overlayPressed) return;
    overlayPressed = false;
    clearAllStates();
  });

  overlay.addEventListener('pointerleave', () => {
    overlayPressed = false;
  });

  // การตรวจสอบเมื่อมีการเปลี่ยนแปลง URL หรือ hash
  window.addEventListener('hashchange', updateActiveState);

  // เมื่อหน้าโหลดเสร็จให้ทำการอัพเดตสถานะของ active
  window.addEventListener('load', updateActiveState);
});