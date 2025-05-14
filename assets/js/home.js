// main.js - เพิ่มข้อความ error "ไม่สามารถโหลดข้อมูลได้" หลายภาษา
// นำระบบ Copy Notification ออกเป็นไฟล์แยก (copyNotification.js) และเรียกใช้ผ่าน global function

const viewAllConfigs = {
  emoji: {
    url: "https://fantrove-hub.github.io/emoji/all",
    labels: {
      th: "ดูทั้งหมด",
      en: "View All",
    }
  },
  symbol: {
    url: "https://fantrove-hub.github.io/symbol/all",
    labels: {
      th: "ดูทั้งหมด",
      en: "View All",
    }
  },
  // เพิ่มประเภทใหม่ที่นี่
};

function getLocalizedName(obj, baseKey = 'name') {
  const lang = localStorage.getItem('selectedLang') || 'en';
  if (obj && typeof obj === 'object') {
    if (obj[`${lang}_${baseKey}`]) return obj[`${lang}_${baseKey}`];
    if (obj[baseKey]) return obj[baseKey];
  }
  return '';
}

function getViewAllLabel(type) {
  const lang = localStorage.getItem('selectedLang') || 'en';
  if (
    viewAllConfigs[type] &&
    viewAllConfigs[type].labels &&
    viewAllConfigs[type].labels[lang]
  ) {
    return viewAllConfigs[type].labels[lang];
  }
  return (viewAllConfigs[type] && viewAllConfigs[type].labels && viewAllConfigs[type].labels.en) || "View All";
}

function getViewAllUrl(type) {
  return (viewAllConfigs[type] && viewAllConfigs[type].url) || "#";
}

// ฟังก์ชันสำหรับข้อความ error "ไม่สามารถโหลดข้อมูลได้" หลายภาษา
function getLoadDataErrorMessage() {
  const lang = localStorage.getItem('selectedLang') || 'en';
  const messages = {
    th: "ไม่สามารถโหลดข้อมูลได้",
    en: "Unable to load data",
    // เพิ่มภาษาอื่นได้ที่นี่
  };
  return messages[lang] || messages.en;
}

// ย้ายฟังก์ชัน showCopyNotification ไปไว้ใน copyNotification.js แล้ว
// ให้ทุกที่เรียกใช้ window.showCopyNotification({ ... });

async function copyToClipboard(content) {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (e) {
    return false;
  }
}

fetch('/assets/json/api-database.json')
  .then(res => res.json())
  .then(data => renderHomePage(data))
  .catch(() => {
    document.getElementById('app').innerHTML = `<p style="color:red">${getLoadDataErrorMessage()}</p>`;
  });

function renderHomePage(database) {
  const app = document.getElementById('app');
  app.innerHTML = '';

  Object.entries(database).forEach(([type, typeObj]) => {
    const categories = typeObj.category.slice(0, 4);
    const mainDiv = document.createElement('div');
    mainDiv.className = 'main';

    // Header + ปุ่มดูทั้งหมด
    const header = document.createElement('div');
    header.className = 'text-h';
    const h1 = document.createElement('h1');
    h1.textContent = getLocalizedName(typeObj, 'name') || typeObj.type || type;
    header.appendChild(h1);

    const viewAllBtn = document.createElement('button');
    viewAllBtn.textContent = getViewAllLabel(type);
    viewAllBtn.onclick = () => {
      const url = getViewAllUrl(type);
      window.open(url, '_blank');
    };
    header.appendChild(viewAllBtn);

    mainDiv.appendChild(header);

    categories.forEach(category => {
      const catSection = document.createElement('div');
      catSection.className = 'category-section';
      const h2 = document.createElement('h2');
      h2.textContent = getLocalizedName(category, 'name');
      catSection.appendChild(h2);

      const contentDiv = document.createElement('div');
      contentDiv.className = 'content';

      // Carousel container (ไม่มีปุ่มเลื่อนแล้ว)
      const carouselContainer = document.createElement('div');
      carouselContainer.className = 'carousel-container';

      // Track
      const track = document.createElement('div');
      track.className = 'carousel-track';

      (category.data || []).forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';

        const emoji = document.createElement('div');
        emoji.className = 'emoji';
        emoji.textContent = item.text || '';

        const name = document.createElement('div');
        name.className = 'name';
        const itemName = getLocalizedName(item, 'name') || item.api || '';
        name.textContent = itemName;

        card.appendChild(emoji);
        card.appendChild(name);

        // คลิกที่ card -> คัดลอก emoji/symbol พร้อมแสดง Notification
        card.style.cursor = 'pointer';
        card.title = 'คัดลอก';
        card.onclick = async () => {
          const copyText = item.text || '';
          if (await copyToClipboard(copyText)) {
            // เรียกใช้ showCopyNotification จาก global (copyNotification.js ต้องถูกโหลดก่อน)
            if (typeof window.showCopyNotification === 'function') {
              window.showCopyNotification({
                text: copyText,
                name: itemName,
                type: type // 'emoji' หรือ 'symbol'
              });
            }
          }
        };

        track.appendChild(card);
      });

      carouselContainer.appendChild(track);
      contentDiv.appendChild(carouselContainer);
      catSection.appendChild(contentDiv);
      mainDiv.appendChild(catSection);
    });

    app.appendChild(mainDiv);
  });
}

// ตัวอย่าง: กรณีเปลี่ยนภาษา (optional หากมีระบบเปลี่ยนภาษาในเว็บ)
// window.addEventListener('languageChange', () => {
//   fetch('assets/json/api-database.json')
//     .then(res => res.json())
//     .then(data => renderHomePage(data));
// });
