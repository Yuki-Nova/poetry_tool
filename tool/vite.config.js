import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [vue()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': JSON.stringify({}),
    'import.meta.env.MODE': JSON.stringify('production'),
    'import.meta.env.PROD': 'true',
    'import.meta.env.DEV': 'false'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    lib: {
      entry: path.resolve(__dirname, 'src/main.js'),
      name: 'PoetryTool',
      formats: ['umd'],
      fileName: () => 'poetry-tool.js'
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    }
  }
})
