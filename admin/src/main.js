import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'

import Login from './views/Login.vue'
import CipaiList from './views/CipaiList.vue'
import CipaiEditor from './views/CipaiEditor.vue'

const routes = [
  { path: '/login', name: 'Login', component: Login },
  { path: '/', name: 'CipaiList', component: CipaiList, meta: { requiresAuth: true } },
  { path: '/editor/:id?', name: 'CipaiEditor', component: CipaiEditor, meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫：未登录跳转登录页
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('poetry_token')
  if (to.meta.requiresAuth && !token) {
    next({ name: 'Login' })
  } else if (to.name === 'Login' && token) {
    next({ name: 'CipaiList' })
  } else {
    next()
  }
})

const app = createApp(App)
app.use(router)
app.mount('#app')
