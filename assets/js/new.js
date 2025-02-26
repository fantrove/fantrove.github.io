fetch('https://jeffy2600ii.github.io/hub.fantrove/assets/json/version.json')
 .then(response => response.json())
 .then(data => {
  document.getElementById('title').innerText = `${data.version}`;
 })
 .catch(error => console.error('Error loading version:', error));
