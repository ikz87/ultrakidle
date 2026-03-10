import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  const proxyConfig = {
    '/rest': {
      target: env.VITE_SUPABASE_URL,
      changeOrigin: true,
      secure: true,
    },
    '/auth': {
      target: env.VITE_SUPABASE_URL,
      changeOrigin: true,
      secure: true,
    },
    '/realtime': {
      target: env.VITE_SUPABASE_URL,
      changeOrigin: true,
      secure: true,
      ws: true,
    },
    '/functions': {
      target: env.VITE_SUPABASE_URL,
      changeOrigin: true,
      secure: true,
    },
    '/external/kofi': {
      target: 'https://cdn.prod.website-files.com',
      changeOrigin: true,
      secure: true,
      rewrite: (path: string) => path.replace(/^\/external\/kofi/, ''),
    },
    '/external/wiki': {
      target: 'https://ultrakill.wiki.gg',
      changeOrigin: true,
      secure: true,
      rewrite: (path: string) => path.replace(/^\/external\/wiki/, ''),
    },
  };

  return {
    base: './',
    plugins: [react(), tailwindcss()],
    build: {
      modulePreload: false,
    },
    server: {
      host: true,
      hmr: env.VITE_HMR_CLIENT_PORT
        ? { clientPort: parseInt(env.VITE_HMR_CLIENT_PORT) }
        : true,
      allowedHosts: [
        'localhost',
        '.discordsays.com',
        'dev.ultrakidle.online',
      ],
      proxy: proxyConfig,
    },
    preview: {
      host: true,
      port: 5173,
      allowedHosts: [
        'localhost',
        '.discordsays.com',
        'dev.ultrakidle.online',
      ],
      proxy: proxyConfig,
    },
  };
});
