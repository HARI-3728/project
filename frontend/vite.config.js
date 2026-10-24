import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const frontendUrl = env.FRONTEND_URL;
  const backendUrl = env.VITE_BACKEND_URL;

  if (!frontendUrl) {
    throw new Error('Missing FRONTEND_URL in the frontend environment.');
  }
  if (!backendUrl) {
    throw new Error('Missing VITE_BACKEND_URL in the frontend environment.');
  }

  const parseOrigin = (value, name) => {
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`${name} must be a valid absolute URL.`);
    }

    if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash) {
      throw new Error(`${name} must contain only an http(s) origin.`);
    }
    return url;
  };

  const frontendOrigin = parseOrigin(frontendUrl, 'FRONTEND_URL');
  const backendOrigin = parseOrigin(backendUrl, 'VITE_BACKEND_URL');
  const port = Number(frontendOrigin.port || (frontendOrigin.protocol === 'https:' ? 443 : 80));

  return {
    plugins: [react()],
    server: {
      host: frontendOrigin.hostname,
      port,
      strictPort: true,
      proxy: {
        '/api': {
          target: backendOrigin.origin,
          changeOrigin: true,
        },
      },
    },
  };
});
