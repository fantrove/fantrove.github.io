// เพิ่มข้อมูลช่องทางการชำระเงินในรูปแบบ array ของ objects
const paymentMethods = [
 {
  id: 'bank',
  icon: '🏦',
  name: 'โอนผ่านธนาคาร',
  supportType: 'ครั้งเดียว',
  url: 'https://example.com/bank-transfer'
 },
 {
  id: 'paypal',
  icon: '💳',
  name: 'PayPal',
  supportType: 'รายเดือน/ครั้งเดียว',
  url: 'https://paypal.com'
 },
 {
  id: 'truemoney',
  icon: '📱',
  name: 'TrueMoney',
  supportType: 'ครั้งเดียว',
  url: 'https://wallet.truemoney.com'
 },
 // สามารถเพิ่มช่องทางใหม่ได้ง่ายๆ ตรงนี้
 // {
 //     id: 'new-method',
 //     icon: '💰',
 //     name: 'ช่องทางใหม่',
 //     supportType: 'รายเดือน',
 //     url: 'https://example.com'
 // }
];

const pages = {
 'main': 'main-page',
 'confirm': 'confirmation-page',
 'payment': 'payment-methods-page',
 'thanks': 'thanks-page'
};

let selectedPaymentMethod = '';
let isAnimating = false;

// เพิ่มฟังก์ชันสำหรับสร้าง HTML ของช่องทางการชำระเงิน
function createPaymentOptions() {
 const container = document.querySelector('.payment-options');
 container.innerHTML = paymentMethods.map(method => `
        <div class="payment-option" onclick="selectPaymentMethod('${method.id}')">
            <span class="support-type">${method.supportType}</span>
            <span class="payment-icon">${method.icon}</span>
            <span>${method.name}</span>
        </div>
    `).join('');
}

function savePaymentMethod(method) {
 localStorage.setItem('selectedPaymentMethod', method);
}

function loadPaymentMethod() {
 return localStorage.getItem('selectedPaymentMethod') || '';
}

function updateURL(page) {
 const url = new URL(window.location);
 url.searchParams.set('page', page);
 window.history.pushState({ page }, '', url);
}

function showPageFromURL() {
 const urlParams = new URLSearchParams(window.location.search);
 const page = urlParams.get('page') || 'main';
 showPage(pages[page]);
 
 if (page === 'payment') {
  const savedMethod = loadPaymentMethod();
  if (savedMethod) {
   selectPaymentMethod(savedMethod, true);
  }
 }
}

function showPage(pageId) {
 document.querySelectorAll('.page').forEach(page => {
  page.classList.remove('active');
 });
 document.getElementById(pageId).classList.add('active');
}

function goBack() {
 window.history.back();
}

function showConfirmation() {
 updateURL('confirm');
 showPage('confirmation-page');
}

function showPaymentMethods() {
 updateURL('payment');
 showPage('payment-methods-page');
 
 const savedMethod = loadPaymentMethod();
 if (savedMethod) {
  selectPaymentMethod(savedMethod, true);
 }
}

function showThanks() {
 if (!selectedPaymentMethod) {
  alert('กรุณาเลือกช่องทางการสนับสนุน');
  return;
 }
 updateURL('thanks');
 showPage('thanks-page');
}

function selectPaymentMethod(method, isLoading = false) {
 selectedPaymentMethod = method;
 
 if (!isLoading) {
  savePaymentMethod(method);
 }
 
 document.querySelectorAll('.payment-option').forEach(option => {
  option.classList.remove('selected');
  if (option.querySelector('span:last-child').textContent ===
   paymentMethods.find(m => m.id === method)?.name) {
   option.classList.add('selected');
  }
 });
}

async function startRocketAnimation() {
 if (isAnimating) return;
 isAnimating = true;
 
 const overlay = document.getElementById('animation-overlay');
 const rocket = document.getElementById('rocket');
 
 overlay.classList.add('active');
 
 await new Promise(resolve => setTimeout(resolve, 500));
 
 rocket.style.visibility = 'visible';
 rocket.style.animation = 'rocketPath 2s cubic-bezier(0.4, 0, 0.2, 1) forwards';
 
 await new Promise(resolve => setTimeout(resolve, 2000));
 
 const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethod);
 if (selectedMethod) {
  window.location.href = selectedMethod.url;
 }
}

window.addEventListener('popstate', (event) => {
 if (event.state && event.state.page) {
  showPage(pages[event.state.page]);
 } else {
  showPage(pages['main']);
 }
});

window.onload = () => {
 createPaymentOptions(); // เพิ่มการสร้างช่องทางการชำระเงินเมื่อโหลดหน้า
 showPageFromURL();
 if (!window.history.state) {
  window.history.replaceState({ page: 'main' }, '', window.location);
 }
};