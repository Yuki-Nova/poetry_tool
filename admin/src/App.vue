<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
</script>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --ink: #1a1c1d;
  --ink-light: #5c6063;
  --ink-muted: #94989b;
  --paper: #f5f4f0;
  --paper-card: #ffffff;
  --paper-warm: #eef0ec;
  --border: #e4e3de;
  --border-light: #eeede8;
  --accent: #3d5a80;
  --accent-soft: rgba(61, 90, 128, 0.08);
  --accent-hover: #2d4a6a;
  --danger: #c04a3a;
  --danger-hover: #a0392d;
  --success: #5b8c7e;
  --shadow: 0 1px 3px rgba(0,0,0,0.06);
  --radius: 6px;

  /* 格律编辑色 */
  --ping-bg: #edf1f5;
  --ping-text: #3d5a80;
  --ping-border: #b0c4d8;
  --ze-bg: #f5f5f5;
  --ze-text: #5c5c5c;
  --ze-border: #d0d0d0;
  --ke-bg: #ecf5ed;
  --ke-text: #4a7c5c;
  --ke-border: #a8d0b0;
  --yun-bg: #faf5e8;
  --yun-text: #8b6d30;
  --yun-border: #d4b860;
}

html, body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: var(--paper);
  color: var(--ink);
  min-height: 100vh;
  line-height: 1.6;
}

a {
  color: var(--accent);
  text-decoration: none;
}

button {
  font-family: inherit;
  cursor: pointer;
  border: none;
  border-radius: var(--radius);
  padding: 8px 20px;
  font-size: 14px;
  transition: all 0.15s;
}

input, textarea, select {
  font-family: inherit;
  font-size: 14px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--paper-card);
  color: var(--ink);
  outline: none;
  transition: border-color 0.15s;
}

input:focus, textarea:focus, select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}
</style>
