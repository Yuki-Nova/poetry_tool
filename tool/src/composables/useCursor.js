/**
 * useCursor.js — 光标位置追踪
 *
 * 从 textarea 的 selectionStart 反算行列号，
 * 供 IDE 编辑器的高亮层、行号区使用。
 */

import { ref, computed } from 'vue'

/**
 * @param {import('vue').Ref<string>} text - 当前文本
 */
export function useCursor(text) {
  const cursorPos = ref(0)        // 绝对光标位置 (selectionStart)
  const activeLine = ref(0)       // 当前行 (0-based)
  const activeCol = ref(0)        // 当前列 (0-based)

  /** 根据 selectionStart 更新行列号 */
  function updateCursor(selectionStart) {
    cursorPos.value = selectionStart
    const raw = typeof text.value === 'string' ? text.value : ''
    const before = raw.substring(0, selectionStart)
    const lines = before.split('\n')
    activeLine.value = Math.max(0, lines.length - 1)
    activeCol.value = lines[lines.length - 1].length
  }

  /** 从 textarea 事件中同步光标 */
  function syncFromTextarea(e) {
    const ta = e.target
    if (ta && typeof ta.selectionStart === 'number') {
      updateCursor(ta.selectionStart)
    }
  }

  /** 根据行列号反算 selectionStart */
  function posFromLineCol(line, col) {
    const raw = typeof text.value === 'string' ? text.value : ''
    const lines = raw.split('\n')
    let offset = 0
    for (let i = 0; i < Math.min(line, lines.length); i++) {
      offset += lines[i].length + 1 // +1 for \n
    }
    return Math.min(offset + col, raw.length)
  }

  /** 跳转到指定行列 */
  function jumpTo(line, col, textareaEl) {
    const pos = posFromLineCol(line, col)
    if (textareaEl) {
      textareaEl.focus()
      textareaEl.setSelectionRange(pos, pos)
    }
    updateCursor(pos)
  }

  return {
    cursorPos,
    activeLine,
    activeCol,
    updateCursor,
    syncFromTextarea,
    jumpTo
  }
}
