// main.js - เพิ่มข้อความ error "ไม่สามารถโหลดข้อมูลได้" หลายภาษา

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

// ฟังก์ชันแสดง Copy Notification (compact, top-center)
function showCopyNotification({ text, name, type = 'emoji' }) {
  // ลบ notification เก่า
  const existing = document.querySelector('.copy-notification-topcenter');
  if (existing) {
    existing.style.animation = 'fadeOut 0.13s ease forwards';
    setTimeout(() => existing.remove(), 130);
  }

  const lang = localStorage.getItem('selectedLang') || 'en';

  // ข้อความแต่ละภาษา
  const messages = {
    th: {
      emoji: 'คัดลอกอีโมจิแล้ว',
      symbol: 'คัดลอกอักษรพิเศษแล้ว',
    },
    en: {
      emoji: 'Emoji copied',
      symbol: 'Symbol copied',
    }
  };

  // เลือกข้อความหลัก (emoji/symbol)
  const mainMsg = messages[lang]?.[type] || messages.en[type] || '';

  // notification container
  const notification = document.createElement('div');
  notification.className = 'copy-notification-topcenter';
  notification.setAttribute('data-timestamp', Date.now());

  // animation container
  const animContainer = document.createElement('div');
  animContainer.className = 'copy-anim-container';

  // icon
  const icon = document.createElement('div');
  icon.className = 'copy-icon';
  icon.innerHTML = '✓';

  // message (compact)
  const message = document.createElement('div');
  message.className = 'copy-message';
  message.innerHTML = `
    <span class="copy-mainmsg">${mainMsg}</span>
    <span class="copy-emoji">${text}</span>
    <span class="copy-name">${name ? '(' + name + ')' : ''}</span>
  `;

  animContainer.appendChild(icon);
  animContainer.appendChild(message);
  notification.appendChild(animContainer);

  // inject CSS (top-center position, compact)
  if (!document.querySelector('#copy-notification-topcenter-styles')) {
    const style = document.createElement('style');
    style.id = 'copy-notification-topcenter-styles';
    style.textContent = `
      .copy-notification-topcenter {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #43b36e 0%, #409e5e 100%);
        color: #fff;
        padding: 8px 22px 8px 12px;
        border-radius: 24px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.09);
        z-index: 15000;
        opacity: 0;
        animation: slideInCopy 0.22s cubic-bezier(0.57,0.2,0.22,1.1) forwards;
        max-width: 320px;
        min-width: 110px;
        font-size: 1em;
        display: flex;
        align-items: center;
        gap: 6px;
        pointer-events: none;
        user-select: none;
        backdrop-filter: blur(5px);
        font-family: inherit;
      }
      .copy-anim-container {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
      }
      .copy-icon {
        background: rgba(255,255,255,0.15);
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.07em;
        font-weight: bold;
        animation: scaleInCopy 0.18s cubic-bezier(0.57,0.2,0.22,1.1) forwards;
        flex-shrink: 0;
      }
      .copy-message {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }
      .copy-mainmsg {
        font-weight: 500;
        font-size: 1em;
        margin-right: 2px;
        white-space: nowrap;
      }
      .copy-emoji {
        font-size: 1.13em;
        margin: 0 0.2em 0 0.2em;
        vertical-align: middle;
        white-space: pre;
      }
      .copy-name {
        color: #dbffe2;
        font-size: 0.93em;
        margin-left: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 120px;
      }
      @keyframes slideInCopy {
        from { opacity: 0; transform: translateX(-50%) translateY(-16px);}
        to   { opacity: 1; transform: translateX(-50%) translateY(0);}
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to   { opacity: 0; }
      }
      @keyframes scaleInCopy {
        from { transform: scale(0); }
        to   { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // remove after 1.7s
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.style.animation = 'fadeOut 0.15s cubic-bezier(0.57,0.2,0.22,1.1) forwards';
      setTimeout(() => {
        if (document.body.contains(notification)) notification.remove();
      }, 160);
    }
  }, 1700);
}

async function copyToClipboard(content) {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (e) {
    return false;
  }
}

fetch('assets/json/api-database.json')
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
            showCopyNotification({
              text: copyText,
              name: itemName,
              type: type // 'emoji' หรือ 'symbol'
            });
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