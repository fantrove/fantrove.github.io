let activeWaves = []; // เก็บคลื่นทั้งหมด
const waveStyleCache = new Map(); // ใช้ Map สำหรับแคชสีของคลาส wave เพื่อประสิทธิภาพที่ดีกว่า

// ฟังก์ชั่นสร้างคลื่น
function createWave(event) {
  const btn = event.currentTarget;

  // ตรวจสอบว่า btn มี attribute 'wake' หรือไม่
  const waveColor = btn.getAttribute('wake');
  if (waveColor === null) return; // ถ้าไม่มี attribute 'wake' ให้หยุดทำงาน

  const rect = btn.getBoundingClientRect();
  const waveSize = Math.max(rect.width, rect.height) * 2;
  const wave = document.createElement('span');

  // คำนวณตำแหน่งคลื่น
  const x = event.type.startsWith('touch') ? event.touches[0].clientX : event.clientX;
  const y = event.type.startsWith('touch') ? event.touches[0].clientY : event.clientY;

  // ดึงสีจาก wake หรือจากแคช
  let finalWaveColor = waveColor;
  if (!finalWaveColor) {
    if (!waveStyleCache.has(btn.className)) {
      const tempElement = document.createElement('div');
      tempElement.className = 'wave';
      document.body.appendChild(tempElement);
      const computedColor = getComputedStyle(tempElement).backgroundColor;
      waveStyleCache.set(btn.className, computedColor);
      tempElement.remove();
    }
    finalWaveColor = waveStyleCache.get(btn.className);
  }

  // ตั้งค่าขนาดและตำแหน่งของคลื่น
  wave.style.width = `${waveSize}px`;
  wave.style.height = `${waveSize}px`;
  wave.style.left = `${x - rect.left - waveSize / 2}px`;
  wave.style.top = `${y - rect.top - waveSize / 2}px`;
  wave.className = 'wave';

  // ตั้งค่าสีของคลื่น
  wave.style.backgroundColor = finalWaveColor;

  // จำกัดจำนวนคลื่นสูงสุดในปุ่มเดียว
  if (btn.children.length >= 3) {
    btn.removeChild(btn.firstElementChild); // ลบคลื่นแรกที่ถูกสร้างขึ้น
  }

  // เพิ่มคลื่นไปยังปุ่ม
  btn.appendChild(wave);

  // ลบคลื่นเมื่ออนิเมชั่นสิ้นสุด
  wave.addEventListener('animationend', () => wave.remove());
}

// เพิ่มคลาส 'wave-effect' ให้กับปุ่มที่มี attribute 'wake'
document.querySelectorAll('button').forEach(button => {
  if (button.hasAttribute('wake')) {
    button.classList.add('wave-effect');

    // เพิ่ม event listeners สำหรับการสร้างคลื่น
    ['pointerdown', 'touchstart'].forEach(eventType =>
      button.addEventListener(eventType, createWave, { passive: true })
    );
  }
});
