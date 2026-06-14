<template>
  <span
    class="char-token"
    :class="statusClass"
    :title="tooltip"
    @click="$emit('click', char)"
  >
    {{ char }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  char: { type: String, required: true },
  expected: { type: String, default: '?' },
  actual: { type: String, default: '?' },
  isRhyme: { type: Boolean, default: false },
  rhymeGroup: { type: String, default: null },
  status: { type: String, default: 'ok' }
})

defineEmits(['click'])

const statusClass = computed(() => {
  const classes = []

  switch (props.status) {
    case 'ok':
      classes.push(props.actual === '平' ? 'tone-ping' : 'tone-ze')
      break
    case 'ok-rhyme':
      classes.push('tone-rhyme-ok')
      break
    case 'rhyme-warn':
      classes.push('tone-rhyme-warn')
      break
    case 'tone-error':
      classes.push('tone-error')
      break
    case 'multi-tone':
      classes.push('tone-multi')
      break
    case 'unknown':
      classes.push('tone-unknown')
      break
    case 'skip':
      classes.push('tone-skip')
      break
    default:
      break
  }

  if (props.isRhyme && props.status !== 'skip') {
    classes.push('is-rhyme')
  }

  return classes
})

const tooltip = computed(() => {
  const parts = []
  if (props.expected !== '?') parts.push(`要求: ${props.expected}`)
  if (props.actual !== '?') parts.push(`实际: ${props.actual}`)
  if (props.isRhyme && props.rhymeGroup) parts.push(`韵部: ${props.rhymeGroup}`)
  if (props.status === 'multi-tone') parts.push('多音字，点击查看候选')
  if (props.status === 'tone-error') parts.push('⚠ 出律')
  return parts.join(' | ')
})
</script>

<style scoped>
.char-token {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 4px;
  margin: 2px;
  cursor: default;
  transition: all 0.12s;
  position: relative;
  user-select: none;
  border: 1.5px solid transparent;
}

/* 正确平声 — 淡蓝底 */
.tone-ping {
  background: #dceefb;
  border-color: #90caf9;
  color: #1565c0;
}

/* 正确仄声 — 无底色 */
.tone-ze {
  background: #fafafa;
  border-color: #ddd;
  color: #555;
}

/* 韵脚正确 — 金色角标 */
.tone-rhyme-ok {
  background: #dceefb;
  border-color: #ffb74d;
  color: #1565c0;
  box-shadow: 0 0 0 2px rgba(255, 183, 77, 0.4);
}

.tone-rhyme-warn {
  background: #fff3e0;
  border-color: #ff9800;
  color: #e65100;
}

/* 出律 — 红色波浪下划线 */
.tone-error {
  background: #fff5f5;
  border-color: #ef9a9a;
  color: #c62828;
  text-decoration: underline wavy #e53935;
  text-underline-offset: 4px;
}

/* 多音字 — 紫色虚线 */
.tone-multi {
  background: #f3e5f5;
  border-color: #ce93d8;
  color: #6a1b9a;
  cursor: pointer;
  border-style: dashed;
}

.tone-multi:hover {
  background: #e1bee7;
  transform: scale(1.1);
}

/* 未收录 */
.tone-unknown {
  background: #fafafa;
  border-color: #ccc;
  color: #aaa;
  font-style: italic;
}

/* 空白/标点 */
.tone-skip {
  color: #999;
  background: transparent;
  border-color: transparent;
  width: auto;
  min-width: 16px;
}

/* 韵脚角标 */
.is-rhyme::after {
  content: '韵';
  position: absolute;
  top: -6px;
  right: -8px;
  font-size: 9px;
  background: #ff9800;
  color: #fff;
  padding: 1px 3px;
  border-radius: 6px;
  line-height: 1;
}
</style>
