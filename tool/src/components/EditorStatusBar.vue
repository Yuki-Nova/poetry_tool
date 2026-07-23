<template>
  <div class="editor-statusbar">
    <div class="es-left">
      <span v-if="pattern" class="es-item es-pattern">
        <span class="es-name">{{ pattern.name }}</span>
        <span class="es-type">{{ pattern.type }}</span>
      </span>
    </div>
    <div class="es-right">
      <template v-if="stats">
        <span class="es-stat">{{ stats.totalChars }} 字</span>
        <span class="es-stat es-ok">{{ stats.okCount }} 正确</span>
        <span v-if="stats.errorCount" class="es-stat es-err">{{ stats.errorCount }} 出律</span>
        <span v-if="stats.multiCount" class="es-stat es-multi">{{ stats.multiCount }} 多音</span>
      </template>
      <span v-if="analyzing" class="es-analyzing">分析中</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  pattern: { type: Object, default: null },
  stats: { type: Object, default: null },
  rhymeBook: { type: String, default: 'xinyun' },
  analyzing: { type: Boolean, default: false }
})
</script>

<style scoped>
.editor-statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 16px;
  background: var(--paper-warm);
  border-bottom: 1px solid var(--border-light);
  font-size: 12px;
  flex-wrap: wrap;
  gap: 4px 10px;
  user-select: none;
}

.es-left, .es-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.es-item { display: inline-flex; align-items: center; gap: 6px; }
.es-name { color: var(--ink); font-weight: 600; }
.es-type {
  font-size: 10px;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 1px 7px;
  border-radius: 8px;
}

.es-stat { color: var(--ink-muted); font-variant-numeric: tabular-nums; }
.es-ok { color: var(--success); }
.es-err { color: var(--danger); }
.es-multi { color: var(--multi-text); }

.es-analyzing {
  color: var(--accent);
  animation: pulse 0.8s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
