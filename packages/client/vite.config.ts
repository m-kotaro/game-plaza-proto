import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  // WebSocket URL is injected via VITE_WEBSOCKET_URL env var at build time.
  // For local development: defaults to ws://localhost:3001
  // For production: set VITE_WEBSOCKET_URL before running `vite build`
  // e.g. VITE_WEBSOCKET_URL=wss://xxx.execute-api.region.amazonaws.com/prod npm run build
  define: {
    '__WEBSOCKET_URL__': JSON.stringify(
      process.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001'
    ),
  },
});
