// Web Worker: parse + index API DB off-main-thread
// Messages:
// { type: 'parseAndIndex', payload: { text: '...json text...' } }
// Response:
// { type: 'indexReady', payload: { apiEntries: [...], idEntries: [...], textEntries: [...], catToTypeEntries: [...] } }
// Error:
// { type: 'indexError', payload: 'error message' }

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
   
   function walk(obj) {
    if (Array.isArray(obj)) {
     for (let item of obj) walk(item);
    } else if (obj && typeof obj === 'object') {
     if (obj.api) apiEntries.push([obj.api, obj]);
     if (obj.id) idEntries.push([obj.id, obj]);
     if (obj.text) textEntries.push([obj.text, obj]);
     if (obj.category && Array.isArray(obj.category) && obj.id) {
      for (const cat of obj.category) {
       catToTypeEntries.push([cat.id, obj]);
      }
     }
     for (const k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
       walk(obj[k]);
      }
     }
    }
   }
   
   walk(db?.type || db);
   
   // Post minimal arrays (structured clone will handle them)
   self.postMessage({
    type: 'indexReady',
    payload: {
     apiEntries,
     idEntries,
     textEntries,
     catToTypeEntries
    }
   });
  } catch (err) {
   self.postMessage({ type: 'indexError', payload: String(err && err.message || err) });
  }
 }
};