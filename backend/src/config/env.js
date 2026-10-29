const parseOrigin = (value, name) => {
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`${name} must be a valid absolute URL.`);
  }

  if (
    !['http:', 'https:'].includes(url.protocol)
    || url.pathname !== '/'
    || url.search
    || url.hash
    || url.username
    || url.password
  ) {
    throw new Error(`${name} must contain only an http(s) origin.`);
  }
  return url;
};

const getFrontendOrigins = (value = '') => {
  if (!value.trim()) return [];

  return value.split(',').map((entry) => {
    const origin = entry.trim();
    if (!origin) {
      throw new Error('FRONTEND_URL must contain one or more http(s) origins.');
    }
    return parseOrigin(origin, 'FRONTEND_URL').origin;
  });
};

const getServerConfig = (env = process.env) => {
  const requiredVariables = ['PORT', 'FRONTEND_URL', 'BACKEND_URL', 'MONGODB_URI', 'JWT_SECRET'];
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

  getFrontendOrigins(env.FRONTEND_URL);
  const backend = parseOrigin(env.BACKEND_URL, 'BACKEND_URL');

  return {
    port,
    backendUrl: backend.origin,
  };
};

module.exports = { getServerConfig, getFrontendOrigins, parseOrigin };
