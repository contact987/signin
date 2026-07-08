import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Standard Vite + React setup. Dev server runs on port 5173 by default,
// which matches CLIENT_ORIGIN in the backend's .env.example.
export default defineConfig({
  plugins: [react()],
});
