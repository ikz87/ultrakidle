import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: true,
      hmr: { clientPort: 443 },
      allowedHosts: ["localhost", ".discordsays.com", "dev.ultrakidle.online"],
      proxy: {
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
          ws: true, // Important for realtime!
        },
        '/functions': {
          target: env.VITE_SUPABASE_URL,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
