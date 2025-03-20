/**
 * ระบบจัดการปุ่มย้อนกลับ
 * เวอร์ชั่น: 2.0.0
 */
document.addEventListener('DOMContentLoaded', () => {
    // ค้นหาปุ่มย้อนกลับ
    const backButton = document.getElementById('back-button');
    
    // ถ้าไม่พบปุ่มย้อนกลับ ให้จบการทำงาน
    if (!backButton) {
        console.warn('ไม่พบปุ่มย้อนกลับในหน้าเว็บ');
        return;
    }

    // ฟังก์ชันสำหรับการนำทางย้อนกลับ
    const navigateBack = () => {
        // ถ้ามีประวัติการเข้าชมหน้าก่อนหน้า
        if (window.history.length > 1) {
            window.history.back();
            
            // ตรวจสอบการย้อนกลับ
            checkNavigation();
        } else {
            // ถ้าไม่มีประวัติ ให้กลับไปหน้าหลัก
            redirectToHome();
        }
    };

    // ฟังก์ชันตรวจสอบการนำทาง
    const checkNavigation = () => {
        const CHECK_DELAY = 100; // เวลารอตรวจสอบ (มิลลิวินาที)
        
        setTimeout(() => {
            if (!document.referrer) {
                redirectToHome();
            }
        }, CHECK_DELAY);
    };

    // ฟังก์ชันนำทางกลับหน้าหลัก
    const redirectToHome = () => {
        window.location.href = '/';
    };

    // เพิ่ม event listener สำหรับปุ่มย้อนกลับ
    backButton.addEventListener('click', () => {
        try {
            navigateBack();
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการนำทางย้อนกลับ:', error);
            redirectToHome();
        }
    });
});