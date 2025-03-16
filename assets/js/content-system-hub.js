/**
 * content-system-hub.js
 * ระบบเชื่อมต่อโมดูลอัตโนมัติสำหรับ Fantrove
 * Created by: Jeffy2600III
 * Last Updated: 2025-03-09
 */

class ContentSystemHub {
    constructor() {
        // กำหนดค่าเริ่มต้น
        this.loadedModules = new Map();
        this.initializationQueue = [];
        this.basePath = './assets/js/modules/';
        this.isDebugMode = false; // เปลี่ยนเป็น true เพื่อดูล็อก
        
        // รายการโมดูลที่ต้องโหลดตามลำดับความสำคัญ
        this.moduleList = [
            { name: 'utils.js', required: true },
            { name: 'error-handler.js', required: true },
            { name: 'state-manager.js', required: true },
            { name: 'data-manager.js', required: true },
            { name: 'navigation-manager.js', required: true },
            { name: 'content-manager.js', required: true },
            { name: 'scroll-manager.js', required: true },
            { name: 'button-manager.js', required: true },
            { name: 'performance-optimizer.js', required: true }
        ];
    }

    /**
     * เริ่มต้นระบบ
     */
    async init() {
        try {
            this.log('เริ่มต้นระบบ Content System Hub...');
            this.setupErrorHandling();
            await this.loadAllModules();
            this.setupNetworkMonitoring();
            
            // รอให้ DOM โหลดเสร็จก่อนเริ่มต้นระบบ
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeSystem());
            } else {
                await this.initializeSystem();
            }
        } catch (error) {
            this.handleError('การเริ่มต้นระบบล้มเหลว', error);
        }
    }

    /**
     * ตั้งค่าระบบจัดการข้อผิดพลาด
     */
    setupErrorHandling() {
        window.onerror = (msg, url, lineNo, columnNo, error) => {
            this.handleError('ข้อผิดพลาดของระบบ', { msg, url, lineNo, columnNo, error });
            return false;
        };

        window.addEventListener('unhandledrejection', (event) => {
            this.handleError('Promise ไม่ได้รับการจัดการ', event.reason);
        });
    }

    /**
     * โหลดโมดูลทั้งหมด
     */
    async loadAllModules() {
        this.log('เริ่มโหลดโมดูล...');
        
        for (const module of this.moduleList) {
            try {
                await this.loadModule(module);
            } catch (error) {
                if (module.required) {
                    throw new Error(`ไม่สามารถโหลดโมดูลที่จำเป็น ${module.name}: ${error.message}`);
                } else {
                    this.log(`ข้อเตือน: ไม่สามารถโหลดโมดูล ${module.name}`);
                }
            }
        }
    }

    /**
     * โหลดโมดูลแต่ละตัว
     */
    async loadModule({ name }) {
        if (this.loadedModules.has(name)) {
            return;
        }

        this.log(`กำลังโหลดโมดูล: ${name}`);
        
        try {
            const response = await fetch(this.basePath + name);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const moduleText = await response.text();
            const moduleScript = document.createElement('script');
            moduleScript.type = 'module';
            moduleScript.textContent = moduleText;
            
            // สร้าง Promise เพื่อตรวจสอบการโหลด
            const loadPromise = new Promise((resolve, reject) => {
                moduleScript.onload = () => resolve();
                moduleScript.onerror = () => reject(new Error(`การโหลดโมดูล ${name} ล้มเหลว`));
            });

            document.head.appendChild(moduleScript);
            await loadPromise;
            
            this.loadedModules.set(name, true);
            this.log(`โหลดโมดูล ${name} สำเร็จ`);
            
        } catch (error) {
            this.log(`ข้อผิดพลาดในการโหลดโมดูล ${name}: ${error.message}`);
            throw error;
        }
    }

    /**
     * เริ่มต้นระบบหลังจากโหลดโมดูลทั้งหมด
     */
    async initializeSystem() {
        try {
            this.log('เริ่มต้นระบบ...');

            // ตรวจสอบว่าโมดูลที่จำเป็นทั้งหมดถูกโหลดแล้ว
            const requiredModules = this.moduleList.filter(m => m.required);
            const allLoaded = requiredModules.every(m => this.loadedModules.get(m.name));

            if (!allLoaded) {
                throw new Error('โมดูลที่จำเป็นบางตัวยังไม่ถูกโหลด');
            }

            // เริ่มต้นโมดูลตามลำดับ
            if (window.state?.init) await window.state.init();
            if (window.ScrollManager?.init) await window.ScrollManager.init();
            if (window.PerformanceOptimizer?.init) await window.PerformanceOptimizer.init();
            if (window.ButtonManager?.loadConfig) await window.ButtonManager.loadConfig();

            this.log('เริ่มต้นระบบสำเร็จ');
            this.showNotification('ระบบพร้อมใช้งาน', 'success');

        } catch (error) {
            this.handleError('การเริ่มต้นระบบล้มเหลว', error);
        }
    }

    /**
     * ตั้งค่าการตรวจสอบการเชื่อมต่อเครือข่าย
     */
    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            this.showNotification('กลับมาออนไลน์แล้ว', 'success');
        });

        window.addEventListener('offline', () => {
            this.showNotification('ขาดการเชื่อมต่ออินเทอร์เน็ต', 'warning');
        });
    }

    /**
     * แสดงการแจ้งเตือน
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        // ลบการแจ้งเตือนหลังจาก 3 วินาที
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * จัดการข้อผิดพลาด
     */
    handleError(context, error) {
        const errorMessage = error?.message || error?.toString() || 'ไม่ทราบข้อผิดพลาด';
        this.log(`${context}: ${errorMessage}`, 'error');
        this.showNotification(`${context}: ${errorMessage}`, 'error');
    }

    /**
     * บันทึกล็อก
     */
    log(message, type = 'info') {
        if (this.isDebugMode) {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
            
            switch (type) {
                case 'error':
                    console.error(logMessage);
                    break;
                case 'warning':
                    console.warn(logMessage);
                    break;
                default:
                    console.log(logMessage);
            }
        }
    }
}

// สร้างและเริ่มต้นระบบ
const systemHub = new ContentSystemHub();
systemHub.init().catch(error => {
    console.error('การเริ่มต้นระบบล้มเหลว:', error);
});

// ส่งออกตัวแปรสำหรับการใช้งานภายนอก
export default systemHub;