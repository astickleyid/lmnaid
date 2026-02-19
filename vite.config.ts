import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isProd = mode === 'production';

  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
      middlewareMode: false,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate large streaming libraries into their own chunks
            'mediapipe': ['@mediapipe/tasks-vision'],
            'webllm': ['@mlc-ai/web-llm'],
            'webrtc': ['socket.io-client'],
            // Keep vendor libs separate
            'vendor': ['react', 'react-dom', 'zustand', 'framer-motion', 'lucide-react'],
          },
        },
      },
      chunkSizeWarningLimit: 1500, // Increase warning threshold for large libs
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: isProd,
        },
      },
      sourcemap: !isProd, // Only generate source maps in dev
    },
    plugins: [
      react(),
      basicSsl(), // Enable HTTPS with self-signed certificate
      visualizer({
        open: false,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }) as any,
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Performance optimizations
    ssr: false,
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'zustand',
        'framer-motion',
        'lucide-react',
        'socket.io-client',
      ],
      // These are lazy-loaded, so exclude from pre-bundling
      exclude: ['@mediapipe/tasks-vision', '@mlc-ai/web-llm'],
    },
  };
});
