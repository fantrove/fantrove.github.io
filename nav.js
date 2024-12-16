document.addEventListener('DOMContentLoaded', () => {
  const navbarToggle = document.getElementById('navbarToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const navButtons = document.querySelectorAll('.nav-button');

  // ฟังก์ชันเพื่อเปลี่ยนหน้า
  function navigate(page) {
    clearAllStates(); // เรียกใช้ฟังก์ชันล้างการทำงานก่อนเปลี่ยนหน้า
    window.location.href = page;
  }

  // ฟังก์ชันเพื่อเปลี่ยนสถานะของเมนู
  function toggleMenu() {
    const isOpen = navbarToggle.classList.toggle('open');
    sidebar.classList.toggle('open-sidebar', isOpen);

    if (overlay.classList.contains('show-overlay')) {
      overlay.classList.remove('show-overlay');
      document.body.style.overflow = ''; // ปลดบล็อคการเลื่อน
      setTimeout(() => {
        overlay.style.display = 'none'; // หน่วงเวลาเพื่อให้การเลือนออกทำงาน
      }, 400);
    } else {
      overlay.style.display = 'block';
      setTimeout(() => {
        overlay.classList.add('show-overlay');
        document.body.style.overflow = 'hidden'; // บล็อคการเลื่อน
      }, 10); // หน่วงเวลาเล็กน้อยเพื่อให้ transition ทำงาน
    }
  }

  // เพิ่มฟังก์ชันในการล้างการทำงานทั้งหมด
  function clearAllStates() {
    navbarToggle.classList.remove('open');
    sidebar.classList.remove('open-sidebar');
    overlay.classList.remove('show-overlay');
    document.body.style.overflow = ''; // ปลดบล็อคการเลื่อน
    setTimeout(() => {
      overlay.style.display = 'none'; // หน่วงเวลาเพื่อให้การเลือนออกทำงาน
    }, 400);
    navButtons.forEach(button => {
      button.style.pointerEvents = ''; // คืนค่า pointer events
      button.style.backgroundColor = ''; // คืนค่าการเปลี่ยนสีที่เกิดจาก hover หรือ active
    });
  }

  // ฟังก์ชันเพื่อเปลี่ยนสีปุ่ม nav เมื่ออยู่ในหน้านั้น โดยบล็อคปุ่ม
  function highlightNavButton() {
    const currentLocation = window.location.pathname.split('/').pop();
    navButtons.forEach(button => {
      const buttonPath = button.getAttribute('onclick')?.match(/'([^']+)'/)[1];
      const isActive = (currentLocation === buttonPath || (currentLocation === '' && buttonPath === 'index.html'));
      button.classList.toggle('active', isActive);
      button.disabled = isActive; // บล็อคปุ่มที่เชื่อมไปยังหน้านั้นๆ
    });
  }

  // เรียกใช้ฟังก์ชัน highlightNavButton เมื่อโหลดหน้า
  highlightNavButton();

  // จัดการการคลิกที่ navbarToggle
  navbarToggle.addEventListener('click', toggleMenu);

  // จัดการการคลิกที่ overlay เพื่อปิดเมนู
  overlay.addEventListener('click', clearAllStates);

  // เพิ่ม event listener สำหรับการ refresh หน้า
  window.addEventListener('beforeunload', clearAllStates);

  // เพิ่ม event listeners ให้กับปุ่ม nav ทุกปุ่ม
  navButtons.forEach(button => {
    button.addEventListener('pointerdown', (event) => {
      if (!button.disabled) { // หากปุ่มไม่ได้ถูกบล็อก
        button.style.pointerEvents = 'none'; // บล็อค pointer event ชั่วคราว
        button.style.backgroundColor = '#ddd'; // เปลี่ยนสีเมื่อกด
      }
    });

    button.addEventListener('pointerup', (event) => {
      if (!button.disabled) { // หากปุ่มไม่ได้ถูกบล็อก
        const page = button.getAttribute('onclick')?.match(/'([^']+)'/)[1];
        navigate(page);
        button.style.pointerEvents = ''; // คืนค่า pointer events หลังจากปล่อยปุ่ม
        button.style.backgroundColor = ''; // คืนค่าสีปุ่ม
      }
    });

    button.addEventListener('pointerleave', (event) => {
      if (!button.disabled) { // หากปุ่มไม่ได้ถูกบล็อก
        button.style.pointerEvents = ''; // คืนค่า pointer events หากเมาส์ออกจากปุ่ม
        button.style.backgroundColor = ''; // คืนค่าสีปุ่ม
      }
    });
  });

  // จัดการข้อผิดพลาด
  window.addEventListener('error', (event) => {
    console.error('เกิดข้อผิดพลาด:', event.message);
  });
});

window.addEventListener('load', highlightNavButton); // เพิ่มฟังก์ชัน highlightNavButton เมื่อโหลดหน้า