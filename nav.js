document.addEventListener('DOMContentLoaded', () => {
  const navbarToggle = document.getElementById('navbarToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const navButtons = document.querySelectorAll('.nav-button');

  // ฟังก์ชันเพื่อเปลี่ยนหน้า
  function navigate(page) {
    clearAllStates(); // ล้างสถานะก่อนเปลี่ยนหน้า
    window.location.href = page;
  }

  // ฟังก์ชันเพื่อเปลี่ยนสถานะของเมนู
  function toggleMenu() {
    const isOpen = navbarToggle.classList.toggle('open');
    sidebar.classList.toggle('open-sidebar', isOpen);

    if (overlay.classList.contains('show-overlay')) {
      overlay.classList.remove('show-overlay');
      document.body.style.overflow = ''; // ปลดบล็อกการเลื่อน
      overlay.style.display = 'none'; // หน่วงเวลาให้การเลื่อนออกทำงาน
    } else {
      overlay.style.display = 'block';
      setTimeout(() => {
        overlay.classList.add('show-overlay');
        document.body.style.overflow = 'hidden'; // บล็อกการเลื่อน
      }, 10);
    }
  }

  // เพิ่มฟังก์ชันในการล้างการทำงานทั้งหมด
  function clearAllStates() {
    navbarToggle.classList.remove('open');
    sidebar.classList.remove('open-sidebar');
    overlay.classList.remove('show-overlay');
    document.body.style.overflow = ''; // ปลดบล็อกการเลื่อน
    overlay.style.display = 'none'; // หน่วงเวลาให้การเลื่อนออกทำงาน
    navButtons.forEach(button => {
      button.classList.remove('hover', 'active'); // ลบคลาส active ทุกครั้ง
      button.style.pointerEvents = ''; // รีเซ็ต pointer-events
    });
  }

  // ฟังก์ชันเพื่อเปลี่ยนสีปุ่ม nav เมื่ออยู่ในหน้านั้น โดยบล็อกปุ่ม
  function highlightNavButton() {
    const currentUrl = new URL(window.location.href); // ใช้ URL แทน location
    const currentLocation = currentUrl.pathname;
    const currentHash = currentUrl.hash; // ตรวจสอบ hash ที่ต่อท้าย URL

    console.log("Current Location:", currentLocation);  // เพิ่ม debugging
    console.log("Current Hash:", currentHash);  // เพิ่ม debugging

    navButtons.forEach(button => {
      const buttonPath = button.getAttribute('onclick')?.match(/'([^']+)'/)[1];

      // ตรวจสอบให้ตรงทั้ง pathname, hash และไฟล์ index
      const isActive = (
        currentLocation === buttonPath || 
        (currentLocation === '/' && buttonPath === 'index.html') || 
        currentLocation.endsWith(buttonPath) ||
        currentLocation === buttonPath || 
        (currentHash && currentHash.slice(1) === buttonPath) // ตรวจสอบว่า hash ตรงกับปุ่มหรือไม่
      );

      console.log("Button Path:", buttonPath, "Active:", isActive);  // เพิ่ม debugging

      button.classList.toggle('active', isActive);
      button.disabled = isActive; // บล็อกปุ่มที่เชื่อมไปยังหน้านั้นๆ

      // หากปุ่มถูกเลือก (active), ป้องกันการใช้งาน :hover และ :active
      button.style.pointerEvents = isActive ? 'none' : ''; // ปิดการทำงานของ pointer-events
    });
  }

  // ฟังก์ชันเพิ่มระบบ pointerdown และ pointerup สำหรับปุ่ม nav
  navButtons.forEach(button => {
    let isPressed = false;

    button.addEventListener('pointerdown', () => {
      isPressed = true; // เริ่มกดปุ่ม
    });

    button.addEventListener('pointerup', (event) => {
      if (!isPressed) return; // หากไม่มี pointerdown จะไม่ทำงาน
      isPressed = false;

      const page = button.getAttribute('onclick')?.match(/'([^']+)'/)[1];
      if (!button.disabled && page) { // ตรวจสอบว่าปุ่มไม่ถูกบล็อก
        navigate(page); // นำทางไปยังหน้าใหม่
      } else {
        event.preventDefault(); // ป้องกันการคลิกซ้ำในปุ่มที่ active อยู่
      }
    });

    button.addEventListener('pointerleave', () => {
      isPressed = false; // รีเซ็ตสถานะเมื่อ pointer ออกจากปุ่ม
    });
  });

  // เรียกใช้ฟังก์ชัน highlightNavButton เมื่อโหลดหน้า
  setTimeout(() => {
    highlightNavButton(); // รอหน่อยเพื่อให้มั่นใจว่า URL ถูกโหลดเสร็จแล้ว
  }, 100);

  // จัดการการคลิกที่ navbarToggle
  let navbarTogglePressed = false;

  navbarToggle.addEventListener('pointerdown', () => {
    navbarTogglePressed = true; // เริ่มกดปุ่ม
  });

  navbarToggle.addEventListener('pointerup', () => {
    if (!navbarTogglePressed) return; // หากไม่มี pointerdown จะไม่ทำงาน
    navbarTogglePressed = false;
    toggleMenu(); // เรียกใช้ฟังก์ชัน toggle เมนู
  });

  navbarToggle.addEventListener('pointerleave', () => {
    navbarTogglePressed = false; // รีเซ็ตสถานะเมื่อ pointer ออกจากปุ่ม
  });

  // จัดการการคลิกที่ overlay เพื่อปิดเมนู
  let overlayPressed = false;

  overlay.addEventListener('pointerdown', () => {
    overlayPressed = true; // เริ่มกด overlay
  });

  overlay.addEventListener('pointerup', () => {
    if (!overlayPressed) return; // หากไม่มี pointerdown จะไม่ทำงาน
    overlayPressed = false;
    clearAllStates(); // เรียกใช้ฟังก์ชัน clearAllStates เพื่อปิดเมนู
  });

  overlay.addEventListener('pointerleave', () => {
    overlayPressed = false; // รีเซ็ตสถานะเมื่อ pointer ออกจาก overlay
  });

  // จัดการข้อผิดพลาด
  window.addEventListener('error', (event) => {
    console.error('เกิดข้อผิดพลาด:', event.message);
  });

  // ใช้ hashchange event สำหรับการเปลี่ยนแปลง URL
  window.addEventListener('hashchange', () => {
    highlightNavButton(); // เมื่อ URL เปลี่ยนให้ตรวจสอบใหม่
  });
});

// เมื่อหน้าโหลดเสร็จให้ทำการอัพเดตสถานะของ active อีกครั้ง
window.addEventListener('load', () => {
  highlightNavButton();
});