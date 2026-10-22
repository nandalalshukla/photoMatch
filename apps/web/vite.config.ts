/**
 * Vite config for the web app.
 *
 * In development the browser only talks to Vite (http://localhost:5173).
 * Every request to /api/* is forwarded ("proxied") to the Node API on :3000.
 * Because the browser sees a single origin, auth cookies work without any
 * CORS configuration — exactly like in production, where the API serves the
 * built web app itself.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Allow HTTPS tunnels (cloudflared / ngrok) used to test Telegram & WhatsApp locally.
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: false },
    },
  },
});
