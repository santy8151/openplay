import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true
  }
});
