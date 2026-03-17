import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const webPort = Number(process.env.RESILIENCE_WEB_PORT ?? '5174');
const apiOrigin = process.env.RESILIENCE_API_ORIGIN ?? 'http://127.0.0.1:8788';
const proxy = {
  '/api': apiOrigin,
  '/health': apiOrigin,
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: webPort,
    proxy,
  },
  preview: {
    port: webPort,
    proxy,
  },
});
