import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    // Enable HTML5 history mode - fix 404 on refresh
    historyApiFallback: true,
    // Remove proxy since we're using deployed backend
    // The API calls will use VITE_API_URL environment variable
  },
  preview: {
    port: 3002,
    // Enable HTML5 history mode for preview mode too
    historyApiFallback: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  // Define environment variables for build
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || 'http://localhost:5001'),
  },
})