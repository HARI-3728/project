import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  let server;

  if (command === 'build') {
    const apiUrl = env.VITE_API_URL || env.VITE_BACKEND_URL || 'https://project-tvkl.onrender.com';

    let apiOrigin;
    try {
      apiOrigin = new URL(apiUrl);
    } catch {
      throw new Error('VITE_API_URL must be a valid absolute URL.');
    }

    if (!['http:', 'https:'].includes(apiOrigin.protocol)) {
      throw new Error('VITE_API_URL must contain only an http(s) origin.');
    }

    if (
      apiOrigin.hostname === 'localhost'
      || apiOrigin.hostname.endsWith('.localhost')
      || apiOrigin.hostname.startsWith('127.')
      || apiOrigin.hostname === '[::1]'
    ) {
      throw new Error('VITE_API_URL must not point to localhost in a production build.');
    }
  }

  if (mode === 'development') {
    const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
    let frontendOrigin;
    try {
      frontendOrigin = new URL(frontendUrl);
    } catch {
      throw new Error('FRONTEND_URL must be a valid absolute URL.');
    }

    if (
      !['http:', 'https:'].includes(frontendOrigin.protocol)
      || frontendOrigin.pathname !== '/'
      || frontendOrigin.search
      || frontendOrigin.hash
    ) {
      throw new Error('FRONTEND_URL must contain only an http(s) origin.');
    }

    const port = Number(frontendOrigin.port || (frontendOrigin.protocol === 'https:' ? 443 : 80));
    server = {
      host: frontendOrigin.hostname,
      port,
      strictPort: true,
    };
  }

  return {
    plugins: [react()],
    ...(server ? { server } : {}),
  };
});
