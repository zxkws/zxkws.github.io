<script setup>
const urlInput = ref('')
const fetchData = () => {
      const proxyUrl = 'http://localhost:3000/' + encodeURIComponent(urlInput);

      fetch(proxyUrl)
        .then(response => response.text())
        .then(data => {
          document.getElementById('result').textContent = data;
        })
        .catch(error => console.error('Error:', error));
    }
</script>
<template>
    <h1>SiteProxy Example</h1>
  <input type="text" v-model="urlInput" placeholder="Enter URL">
  <button @click="fetchData">Fetch Data</button>
  <pre id="result"></pre>
</template>