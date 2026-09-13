import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.BATTLE_PORT ?? 8787}`,
        changeOrigin: false,
      },
      '/ws': { target: `ws://127.0.0.1:${process.env.BATTLE_PORT ?? 8787}`, ws: true },
    },
  },
  test: { include: ['src/**/*.test.ts'] },
});
