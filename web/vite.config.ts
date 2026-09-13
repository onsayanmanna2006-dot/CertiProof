import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  root: import.meta.dirname,
  // GitHub Pages serves this as a project page at /CertiProof/, not the domain root.
  base: '/CertiProof/',
  plugins: [wasm()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['@midnight-ntwrk/ledger-v8', '@midnight-ntwrk/onchain-runtime-v3'],
  },
});
