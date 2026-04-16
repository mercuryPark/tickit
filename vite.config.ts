import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { crx } from '@crxjs/vite-plugin'
import fs from 'node:fs'

// CRXJS는 manifest.json을 읽어 Chrome Extension 번들을 생성한다.
// JSON import assertion 대신 fs.readFileSync를 사용하여 TS 설정(verbatimModuleSyntax 등)과 충돌을 피한다.
const manifest = JSON.parse(fs.readFileSync('./manifest.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    crx({ manifest }),
  ],
  build: {
    // Chrome Web Store 심사에 sourcemap 불필요 + 코드 구조 노출 방지
    sourcemap: false,
  },
  server: {
    // CRXJS HMR port 고정 (dev 시 확장 리로드 안정화)
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
})
