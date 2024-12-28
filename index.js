function resetHover() {
  // ลบคลาส hover หรือสไตล์ hover ทั้งหมด
  const elementsWithHover = document.querySelectorAll('.hover');
  elementsWithHover.forEach(element => {
    element.classList.remove('hover');  // ถ้ามีคลาส hover
    element.style = '';  // ถ้ามีการใช้ inline style
  });
}

function navigateTo(page) {
  resetHover();  // ล้างค่า hover ก่อนเปลี่ยนหน้า
  window.location.href = page;
}