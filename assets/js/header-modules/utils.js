// utils.js
// notification, ErrorManager, utilities (debounce/throttle/isOnline)
export function showNotification(message, type = 'info', options = {}) {
 const lang = localStorage.getItem('selectedLang') || 'en';
 const messages = {
  th: { success: '✨ สำเร็จ!', error: '❌ ข้อผิดพลาด', warning: '⚠️ คำเตือน', info: 'ℹ️ ข้อมูล', loading: '⌛ กำลังโหลด' },
  en: { success: '✨ Success!', error: '❌ Error', warning: '⚠️ Warning', info: 'ℹ️ Information', loading: '⌛ Loading' }
 };
 try {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.setAttribute('data-timestamp', Date.now());
  
  const icon = document.createElement('div');
  icon.className = 'notification-icon';
  icon.innerHTML = type === 'success' ? '✓' :
   type === 'error' ? '✕' :
   type === 'warning' ? '⚠' :
   type === 'loading' ? '⌛' : 'ℹ';
  
  const messageContainer = document.createElement('div');
  messageContainer.className = 'notification-message-container';
  messageContainer.innerHTML = `
            <div class="notification-title">${messages[lang][type]}</div>
            <div class="notification-content">${message}</div>
        `;
  
  if (options.dismissible !== false) {
   const closeButton = document.createElement('button');
   closeButton.className = 'notification-close';
   closeButton.innerHTML = '×';
   closeButton.onclick = () => {
    notification.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => notification.remove(), 300);
   };
   notification.appendChild(closeButton);
  }
  
  notification.appendChild(icon);
  notification.appendChild(messageContainer);
  
  if (!document.querySelector('#notification-styles')) {
   const style = document.createElement('style');
   style.id = 'notification-styles';
   style.textContent = `
                .notification { position: fixed; top: 20px; right: 20px; padding: 16px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); z-index: 10000; opacity: 0; transform: translateY(-20px); animation: slideIn 0.3s ease forwards; max-width: 400px; color: white; display:flex; align-items:center; gap:8px; }
                .notification-success { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); }
                .notification-error { background: linear-gradient(135deg, #f44336 0%, #e53935 100%); }
                .notification-warning { background: linear-gradient(135deg, #ff9800 0%, #fb8c00 100%); }
                .notification-info { background: linear-gradient(135deg, #2196f3 0%, #1e88e5 100%); }
                .notification-loading { background: linear-gradient(135deg, #9e9e9e 0%, #757575 100%); }
                .notification-icon { background: rgba(255,255,255,0.12); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; }
                .notification-message-container { flex: 1; display: inline-block; margin-left: 8px; vertical-align: middle; }
                .notification-title { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
                .notification-content { font-size: 14px; opacity: 0.94; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .notification-close { background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; opacity:0.9;}
                .notification-close:hover { opacity: 1; }
                @keyframes slideIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-20px); } }
                .notification-loading .notification-icon { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `;
   document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  if (type !== 'loading' && options.duration !== Infinity) {
   setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => { notification.remove(); }, 300);
   }, options.duration || 3000);
  }
  return notification;
 } catch (error) {
  console.error('Error showing notification:', error);
 }
}

export class ErrorManager {
 constructor() {
  this.errorStates = new Map();
  this.timeouts = new Map();
 }
 isValidError(error) {
  return error && (error instanceof Error || error.message || typeof error === 'string');
 }
 isDuplicateError(errorKey, message) {
  const existingError = this.errorStates.get(errorKey);
  return existingError && existingError.message === message;
 }
 showError(errorKey, error, options = {}) {
  if (!this.isValidError(error)) return;
  const message = error.message || error.toString();
  if (this.isDuplicateError(errorKey, message)) return;
  if (this.timeouts.has(errorKey)) clearTimeout(this.timeouts.get(errorKey));
  this.errorStates.set(errorKey, { message, timestamp: Date.now(), type: options.type || 'error' });
  showNotification(message, options.type || 'error', {
   duration: options.duration || 3000,
   position: options.position || 'top',
   dismissible: options.dismissible !== false
  });
  const timeout = setTimeout(() => {
   this.errorStates.delete(errorKey);
   this.timeouts.delete(errorKey);
  }, options.duration || 3000);
  this.timeouts.set(errorKey, timeout);
 }
 clearErrors() {
  this.errorStates.clear();
  this.timeouts.forEach(clearTimeout);
  this.timeouts.clear();
 }
}

export const _headerV2_utils = {
 debounce(func, wait = 250) {
  let timeout;
  return (...args) => {
   clearTimeout(timeout);
   timeout = setTimeout(() => func.apply(this, args), wait);
  };
 },
 throttle(func, limit = 100) {
  let inThrottle;
  return (...args) => {
   if (!inThrottle) {
    func.apply(this, args);
    inThrottle = true;
    setTimeout(() => inThrottle = false, limit);
   }
  };
 },
 isOnline() { return navigator.onLine; },
 showNotification,
 errorManager: new ErrorManager()
};