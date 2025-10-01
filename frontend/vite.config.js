import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Remove proxy since we're using deployed backend
    // The API calls will use VITE_API_URL environment variable
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  // Define environment variables for build
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || 'https://workflow-energy.onrender.com'),
  },
})