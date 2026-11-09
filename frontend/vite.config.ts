import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type { PluginContext } from 'rollup';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'api' ? [{
    name: 'reject-demo-in-api',
    generateBundle(this: PluginContext) {
      this.emitFile({ type: 'asset', fileName: 'aura-runtime.json', source: JSON.stringify({ runtime: 'api', version: 1 }) });
    },
    moduleParsed({ id }: { id: string }) {
      const normalized = id.replaceAll('\\', '/');
      if (/\/src\/(services\/mock\/|data\/mockProducts\.|services\/(adminService|adminOrderService|customerService|orderService)\.)/.test(normalized)) {
        throw new Error(`API build must not include demo module: ${normalized}`);
      }
    },
  }] : [])],
  build: { outDir: mode === 'api' ? 'dist-api' : 'dist' },
  resolve: {
    alias: {
      '@runtime/routes': path.resolve(__dirname, mode === 'api' ? './src/routes/ApiRoutes.tsx' : './src/routes/AppRoutes.tsx'),
      '@runtime/products': path.resolve(__dirname, mode === 'api' ? './src/services/api/productEntry.ts' : './src/services/mock/productEntry.ts'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    strictPort: true,
    proxy: { '/api': { target: process.env.API_TARGET ?? 'http://127.0.0.1:4000', changeOrigin: false } },
    port: 3000,
    open: false,
  },
  preview: { proxy: { '/api': { target: process.env.API_TARGET ?? 'http://127.0.0.1:4000', changeOrigin: false } } },
}));
