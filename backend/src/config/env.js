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

const getServerConfig = (env = process.env) => {
  const requiredVariables = ['PORT', 'FRONTEND_URL', 'BACKEND_URL', 'MONGO_URI', 'JWT_SECRET'];
  for (const name of requiredVariables) {
    if (!env[name]?.trim()) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
  }

  if (!/^\d+$/.test(env.PORT)) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  const port = Number(env.PORT);
  if (port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const frontendOrigins = env.FRONTEND_URL.split(',').map((value) => {
    const origin = value.trim();
    if (!origin) {
      throw new Error('FRONTEND_URL must contain one or more http(s) origins.');
    }
    return parseOrigin(origin, 'FRONTEND_URL').origin;
  });

  const backend = parseOrigin(env.BACKEND_URL, 'BACKEND_URL');
  const backendPort = Number(backend.port || (backend.protocol === 'https:' ? 443 : 80));
  if (backendPort !== port) {
    throw new Error(`BACKEND_URL port (${backendPort}) must match PORT (${port}).`);
  }

  return {
    port,
    backendUrl: backend.origin,
    mongoUri: env.MONGO_URI,
  };
};

module.exports = { getServerConfig };
