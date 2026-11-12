import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// På GitHub Pages bygges med --base=/postmortem/ (se .github/workflows/pages.yml). Under udvikling går kaldene til
// funktionen gennem proxyen, så funktionens CORS ikke skal ændres (src/api.ts bruger /api/analyse i dev).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'https://kontraktbridge-postmortem.azurewebsites.net', changeOrigin: true },
    },
  },
});
