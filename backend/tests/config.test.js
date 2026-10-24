const { getServerConfig } = require('../src/config/env');

const validEnvironment = {
  PORT: '5000',
  FRONTEND_URL: 'http://localhost:5173',
  BACKEND_URL: 'http://localhost:5000',
  MONGO_URI: 'mongodb://localhost:27017/medicare_plus',
  JWT_SECRET: 'test-secret',
};

describe('server environment configuration', () => {
  it('returns configured server and URL values', () => {
    expect(getServerConfig(validEnvironment)).toEqual({
      port: 5000,
      backendUrl: 'http://localhost:5000',
      mongoUri: validEnvironment.MONGO_URI,
    });
  });

  it('rejects a backend URL whose port differs from PORT', () => {
    expect(() => getServerConfig({
      ...validEnvironment,
      BACKEND_URL: 'http://localhost:5001',
    })).toThrow('BACKEND_URL port (5001) must match PORT (5000).');
  });

  it('reports missing required configuration by variable name', () => {
    expect(() => getServerConfig({
      ...validEnvironment,
      FRONTEND_URL: '',
    })).toThrow('Missing required environment variable: FRONTEND_URL');
  });
});
