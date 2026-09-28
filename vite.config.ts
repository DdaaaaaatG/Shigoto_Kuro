/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Tauri 개발 서버가 넘겨주는 호스트(모바일/원격 개발용). 데스크톱만 쓰므로 보통 비어 있다.
const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  plugins: [react()],

  // Tauri CLI가 Rust 오류를 덮어쓰지 않도록 화면 지우기 금지
  clearScreen: false,

  // 프론트에서 읽을 수 있는 환경변수 접두사
  envPrefix: ['VITE_', 'TAURI_ENV_*'],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      components: path.resolve(__dirname, 'src/components'),
      bridge: path.resolve(__dirname, 'src/bridge'),
      state: path.resolve(__dirname, 'src/state'),
    },
  },

  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: {
      // Rust 소스 변경은 Tauri가 감시한다
      ignored: ['**/src-tauri/**'],
    },
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
