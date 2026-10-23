import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev the React app runs on :5173 and forwards API + image requests to Express on :5000.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:5000', '/images': 'http://localhost:5000' } },
});
