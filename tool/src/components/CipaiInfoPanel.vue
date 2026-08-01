<template>
  <aside v-if="pattern" class="cipai-info">
    <div class="ci-header">
      <span class="ci-title">词牌信息</span>
      <button
        v-if="hasContent"
        class="ci-toggle"
        type="button"
        :class="{ open: expanded }"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >{{ expanded ? '收起' : '展开' }}</button>
    </div>

    <template v-if="expanded">
      <!-- 词牌名 + 别名 + 字数 -->
      <div class="ci-summary">
        <span class="ci-name">{{ pattern.name }}</span>
        <span v-if="pattern.alias?.length" class="ci-alias">{{ pattern.alias.join('，') }}</span>
      </div>
      <div v-if="pattern.charCount" class="ci-stats">
        {{ pattern.charCount }} 字 · {{ pattern.sentences?.length || 0 }} 句
        <span v-if="pattern.sourceFormat" class="ci-fmt">{{ pattern.sourceFormat }}</span>
      </div>

      <!-- 备注信息 -->
      <div v-if="pattern.notes" class="ci-section">
        <h4 class="ci-section-title">备注</h4>
        <p class="ci-notes">{{ pattern.notes }}</p>
      </div>

      <!-- 例词 -->
      <div v-if="examples.length" class="ci-section">
        <h4 class="ci-section-title">例词 <span class="ci-count">{{ examples.length }}</span></h4>
        <div v-for="(ex, i) in examples" :key="i" class="ci-example">
          <div class="ci-ex-author">{{ ex.author || '佚名' }}</div>
          <p class="ci-ex-text">{{ ex.text }}</p>
          <p v-if="ex.note" class="ci-ex-note">{{ ex.note }}</p>
        </div>
      </div>

      <!-- 无内容提示 -->
      <p v-if="!hasContent" class="ci-empty">该词牌暂无备注与例词</p>
    </template>

    <!-- 折叠时仅显示名字 -->
    <template v-else>
      <div class="ci-summary">
        <span class="ci-name">{{ pattern.name }}</span>
        <span v-if="pattern.alias?.length" class="ci-alias">{{ pattern.alias.join('，') }}</span>
      </div>
    </template>
  </aside>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  pattern: { type: Object, default: null }
})

const expanded = ref(true)

// 切换词牌时自动展开
watch(() => props.pattern?.id, () => { expanded.value = true })

const examples = computed(() => props.pattern?.examples || [])
const hasContent = computed(() =>
  !!(props.pattern?.notes) || examples.value.length > 0
)
</script>

<style scoped>
.cipai-info {
  background: var(--paper-card, #fff);
  border: 1px solid var(--border, #e4e3de);
  border-radius: 10px;
  padding: 14px 16px;
  font-size: 13px;
  line-height: 1.7;
}

.ci-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.ci-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent, #3d5a80);
  letter-spacing: 0.05em;
}

.ci-toggle {
  font-size: 11px;
  padding: 2px 10px;
  border: 1px solid var(--border, #e4e3de);
  border-radius: 12px;
  background: transparent;
  color: var(--ink-muted, #94989b);
  cursor: pointer;
  transition: all 0.15s;
}
.ci-toggle:hover { border-color: var(--accent, #3d5a80); color: var(--accent, #3d5a80); }

.ci-summary {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
}
.ci-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--ink, #1a1c1d);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'SimSun', serif;
}
.ci-alias { font-size: 12px; color: var(--ink-muted, #94989b); }

.ci-stats { font-size: 12px; color: var(--ink-muted, #94989b); margin-top: 2px; }
.ci-fmt { margin-left: 6px; color: var(--accent, #3d5a80); }

.ci-section { margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--border, #e4e3de); }
.ci-section-title {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-light, #5c6063);
}
.ci-count { color: var(--ink-muted, #94989b); font-weight: 400; }

.ci-notes { margin: 0; color: var(--ink-light, #5c6063); font-size: 12.5px; }

.ci-example { margin-bottom: 10px; }
.ci-ex-author { font-size: 12px; font-weight: 600; color: var(--accent, #3d5a80); }
.ci-ex-text {
  margin: 2px 0 0;
  color: var(--ink, #1a1c1d);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'SimSun', serif;
  letter-spacing: 0.02em;
}
.ci-ex-note { margin: 2px 0 0; font-size: 11.5px; color: var(--ink-muted, #94989b); }

.ci-empty { margin: 4px 0 0; color: var(--ink-muted, #94989b); font-size: 12px; }

@media (max-width: 640px) {
  .cipai-info { padding: 12px 14px; }
}
</style>
