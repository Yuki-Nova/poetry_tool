import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
app.mount('#poetry-tool')

// 同时暴露到全局，供博客页面动态挂载
if (typeof window !== 'undefined') {
  window.PoetryTool = {
    mount: (selector) => {
      const el = typeof selector === 'string' ? document.querySelector(selector) : selector
      if (el) app.mount(el)
      return app
    }
  }
}
