import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: 'jsx',
    include: /src.*\.[jt]sx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  server: {
    port: 5173,
    host: true, // Listen on all local IPs
    cors: true, // Enable CORS
  },
  // Prevent Vite from trying to connect to MCP server during dev
  define: {
    'import.meta.env.MCDA_SERVER_URL': JSON.stringify('http://localhost:8000'),
  },
})
