document.addEventListener('DOMContentLoaded', () => {
  const categoryButtons = document.querySelectorAll('.category-button'); // ปุ่มทั้งหมด
  const validCategories = ['emoji', 'specialchar']; // หมวดหมู่ที่ถูกต้อง
  const defaultCategory = 'emoji'; // ค่าเริ่มต้น

  // ฟังก์ชันทำให้ปุ่ม active และล็อกการทำงานซ้ำ
  function setActiveButton(activeCategory) {
    categoryButtons.forEach(button => {
      const category = button.getAttribute('data-category');
      if (category === activeCategory) {
        button.classList.add('active');
        button.disabled = true; // ล็อกปุ่มที่ active ไม่ให้กดซ้ำ
      } else {
        button.classList.remove('active');
        button.disabled = false; // ปลดล็อกปุ่มที่ไม่ได้ active
      }
    });
  }

  // ฟังก์ชันตรวจสอบ hash และจัดการสถานะ
  function validateAndSetHash() {
    const currentHash = window.location.hash ? window.location.hash.slice(1) : defaultCategory;

    if (currentHash === 'specialchar') {
      window.location.href = 'specialchar.html'; // เปิดไฟล์ใหม่
    } else if (validCategories.includes(currentHash)) {
      setActiveButton(currentHash); // ตั้งค่า active ตาม hash
    } else {
      window.history.replaceState(null, null, `#${defaultCategory}`); // เปลี่ยนเป็นค่าเริ่มต้น
      setActiveButton(defaultCategory);
    }
  }

  // Event listener สำหรับปุ่ม
  categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
      const category = button.getAttribute('data-category');

      if (!button.disabled) { // ตรวจสอบปุ่มที่ active ไม่ให้ทำงานซ้ำ
        if (category === 'specialchar') {
          window.location.href = 'specialchar.html'; // เปิดไฟล์ specialchar.html
        } else if (category === 'emoji') {
          window.history.pushState(null, null, `#${category}`);
          setActiveButton(category); // ตั้งค่า active สำหรับ emoji
        }
      }
    });
  });

  // ตรวจสอบ hash เมื่อโหลดหน้า
  validateAndSetHash();

  // ตรวจสอบ hash เมื่อมีการเปลี่ยนแปลง
  window.addEventListener('hashchange', validateAndSetHash);
});