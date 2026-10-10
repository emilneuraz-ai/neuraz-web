// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://neuraz.ar',
  vite: {
    plugins: [tailwindcss()],
    server: {
      // Files on the external workspace volume can miss native watch events.
      watch: { usePolling: true, interval: 300 }
    }
  }
});
