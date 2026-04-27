import { defineConfig } from 'astro/config';
import solid from '@astrojs/solid-js';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [
    solid(),
    tailwind({
      // We import global.css ourselves so we can layer custom tokens.
      applyBaseStyles: false,
    }),
  ],
  server: {
    port: 4321,
    host: '127.0.0.1',
  },
  vite: {
    server: {
      // Allow LAN if cheyu wants to peek from another device.
      hmr: { overlay: true },
    },
  },
});
