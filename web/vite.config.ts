import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Two targets from one source:
//   default  -> the standalone web app (dev server with /api proxied to FastAPI; `vite build` -> dist/)
//   QOLLAB=1 -> library-mode bundle for Qollab: ../qollab/main.js + main.css, entry src/qollab-entry.ts,
//               with the Python module `qsg.circuit` left as an external import that Qollab resolves.
const qollab = process.env.QOLLAB === '1';

export default defineConfig({
  plugins: [react()],
  define: qollab ? { 'process.env.NODE_ENV': JSON.stringify('production') } : {},
  server: { proxy: { '/api': 'http://localhost:8765' } },
  build: qollab
    ? {
        outDir: process.env.QOLLAB_OUT ?? '../qollab',
        assetsInlineLimit: 1_500_000, // the four recordings ride inside main.js as data URLs: one self-contained bundle
        emptyOutDir: false,
        copyPublicDir: false,
        cssCodeSplit: false,
        sourcemap: false,
        target: 'es2022',
        lib: { entry: 'src/qollab-entry.ts', formats: ['es'], fileName: () => 'main.js', cssFileName: 'main' },
        rollupOptions: { external: ['qsg.circuit'], output: { inlineDynamicImports: true } },
      }
    : { outDir: 'dist', sourcemap: false, target: 'es2022', assetsInlineLimit: 1_500_000 },
});
