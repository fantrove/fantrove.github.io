function navigateTo(page) {
    // ล้าง :hover ทุกองค์ประกอบ
    document.querySelectorAll('*').forEach(element => {
        element.classList.remove('hover');
    });

    // เปลี่ยนหน้า
    window.location.href = page;
}

window.onbeforeunload = function() {
    // ล้าง :hover ทุกองค์ประกอบเมื่อออกจากหน้า
    document.querySelectorAll('*').forEach(element => {
        element.classList.remove('hover');
    });
};