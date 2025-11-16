// header-index-worker.js
// Worker ยังคงทำหน้าที่ parse JSON ขนาดใหญ่ถ้ามี แต่ออกแบบให้ยืดหยุ่นต่อโครงสร้าง[...]
self.onmessage = function(e) {
 const { type, payload } = e.data || {};
 if (type === 'parseAndIndex') {
  const text = payload && payload.text;
  try {
   const db = JSON.parse(text);
   const apiEntries = [];
   const idEntries = [];
   const textEntries = [];
   const catToTypeEntries = [];
   
   function walk(obj, depth = 0, currentType = null) {
    if (depth > 80) return;
    if (Array.isArray(obj)) {
     for (let item of obj) walk(item, depth + 1, currentType);
    } else if (obj && typeof obj === 'object') {
     if (obj.api) apiEntries.push([obj.api, obj]);
     if (obj.id) idEntries.push([obj.id, obj]);
     if (obj.text) textEntries.push([obj.text, obj]);
     // If current object is a type (has id and category array), map its categories
     if (obj.id && Array.isArray(obj.category)) {
      for (const cat of obj.category) {
       if (cat && cat.id) catToTypeEntries.push([cat.id, { id: obj.id, name: obj.name }]);
      }
     }
     for (const k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
       let nextType = currentType;
       // when encounter object with id and category we treat it as type context
       if (obj.id && Array.isArray(obj.category)) nextType = obj.id;
       walk(obj[k], depth + 1, nextType);
      }
     }
    }
   }
   
   walk(db?.type || db);
   self.postMessage({ type: 'indexReady', payload: { apiEntries, idEntries, textEntries, catToTypeEntries } });
  } catch (err) {
   self.postMessage({ type: 'indexError', payload: String(err && err.message || err) });
  }
 }
};