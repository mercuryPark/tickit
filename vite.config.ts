import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import webExtension from 'vite-plugin-web-extension'

// CRXJS에서 vite-plugin-web-extension으로 피벗 (2026-04-17):
//  CRXJS 2.4의 content script loader가 동적 import로 실제 스크립트를 로드하는데,
//  이 로드된 모듈이 page world에서 실행되면서 chrome.runtime 접근이 끊겼다.
//  vite-plugin-web-extension은 각 엔트리를 IIFE로 사전 번들하여 content script로 직접
//  주입하므로 isolated world가 유지된다.
//  CLAUDE.md의 승인된 fallback 플러그인.

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    webExtension({
      manifest: 'manifest.json',
      // content script + service worker는 자동으로 isolated/worker 컨텍스트에 맞게 번들.
    }),
  ],
  build: {
    // Chrome Web Store 심사에 sourcemap 불필요 + 코드 구조 노출 방지
    sourcemap: false,
  },
  server: {
    // dev 서버 포트 고정 (HMR 안정화)
    port: 5173,
    strictPort: true,
  },
})
