import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'example',
  resolve: {
    alias: {
      'react-world-map': resolve(__dirname, 'src/index.ts'),
    },
  },
  server: {
    port: 3000,
  },
})
