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
  --ink: #2b3036;
  --ink-light: #5f6877;
  --ink-muted: #6b7280;
  --paper: #ffffff;
  --paper-card: #ffffff;
  --paper-warm: #f6f6f3;
  --border: rgba(17, 24, 39, 0.10);
  --border-light: rgba(17, 24, 39, 0.06);
  --accent: #b0171a;
  --accent-soft: rgba(176, 23, 26, 0.08);
  --accent-hover: #8e1113;
  --danger: #c04a3a;
  --danger-hover: #a0392d;
  --success: #5b8c7e;
  --shadow: 0 1px 3px rgba(0,0,0,0.06);
  --radius: 6px;

  /* 格律编辑色(纸墨墨阶 + 朱批;可平可仄绿为语义色保留) */
  --ping-bg: rgba(43, 48, 54, 0.06);
  --ping-text: #2b3036;
  --ping-border: rgba(43, 48, 54, 0.25);
  --ze-bg: #f5f5f5;
  --ze-text: #6b7280;
  --ze-border: #d0d0d0;
  --ke-bg: #ecf5ed;
  --ke-text: #4a7c5c;
  --ke-border: #a8d0b0;
  --yun-bg: rgba(176, 23, 26, 0.08);
  --yun-text: #b0171a;
  --yun-border: rgba(176, 23, 26, 0.40);
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --ink: #e4e1d9;
  --ink-light: #c2c6ce;
  --ink-muted: #a8acb5;
  --paper: #17191d;
  --paper-card: #1d2026;
  --paper-warm: #16181d;
  --border: rgba(228, 225, 217, 0.14);
  --border-light: rgba(228, 225, 217, 0.09);
  --accent: #e05256;
  --accent-soft: rgba(224, 82, 86, 0.14);
  --accent-hover: #ef7578;
  --danger: #ef8f80;
  --danger-hover: #f0a99d;
  --success: #6fae9d;

  --ping-bg: rgba(228, 225, 217, 0.10);
  --ping-text: #e4e1d9;
  --ping-border: rgba(228, 225, 217, 0.30);
  --ze-bg: #26292f;
  --ze-text: #a8acb5;
  --ze-border: #3a3d45;
  --ke-bg: rgba(74, 124, 92, 0.15);
  --ke-text: #8fc0a0;
  --ke-border: rgba(143, 192, 160, 0.40);
  --yun-bg: rgba(224, 82, 86, 0.16);
  --yun-text: #e05256;
  --yun-border: rgba(224, 82, 86, 0.45);
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
