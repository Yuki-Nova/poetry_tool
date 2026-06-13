<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
</script>

<style>
/* 全局重置与古典风格 */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg: #fdf6ec;
  --bg-card: #fffef9;
  --text: #3e2c1c;
  --text-muted: #8b7355;
  --accent: #8b4513;
  --accent-light: #d4a574;
  --danger: #c0392b;
  --success: #27ae60;
  --border: #d4c5a9;
  --shadow: 0 2px 8px rgba(62, 44, 28, 0.08);
  --radius: 8px;
  --font: 'Noto Serif SC', 'Source Han Serif SC', 'SimSun', 'STSong', serif;
}

html, body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  line-height: 1.6;
}

a {
  color: var(--accent);
  text-decoration: none;
}

button {
  font-family: var(--font);
  cursor: pointer;
  border: none;
  border-radius: var(--radius);
  padding: 8px 20px;
  font-size: 15px;
  transition: all 0.2s;
}

input, textarea, select {
  font-family: var(--font);
  font-size: 15px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text);
  outline: none;
  transition: border-color 0.2s;
}

input:focus, textarea:focus, select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(139, 69, 19, 0.1);
}
</style>
