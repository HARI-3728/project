const { getFrontendOrigins, getServerConfig } = require('../src/config/env');

const validEnvironment = {
  PORT: '5000',
  FRONTEND_URL: 'http://localhost:5173',
  BACKEND_URL: 'http://localhost:5000',
  MONGODB_URI: 'mongodb+srv://test_user:testpass@cluster0.test.mongodb.net/MediCarePlus?retryWrites=true&w=majority',
  JWT_SECRET: 'test-secret',
};

describe('server environment configuration', () => {
  it('returns configured server and URL values', () => {
    expect(getServerConfig(validEnvironment)).toEqual({
      port: 5000,
      backendUrl: 'http://localhost:5000',
    });
  });

  it('accepts a public backend origin whose port differs from the internal listen port', () => {
    expect(getServerConfig({
      ...validEnvironment,
      PORT: '10000',
      BACKEND_URL: 'https://project-tvkl.onrender.com',
    })).toEqual({
      port: 10000,
      backendUrl: 'https://project-tvkl.onrender.com',
    });
  });

  it('reports missing required configuration by variable name', () => {
    expect(() => getServerConfig({
      ...validEnvironment,
      FRONTEND_URL: '',
    })).toThrow('Missing required environment variable: FRONTEND_URL');
  });

  it('normalizes and validates a comma-separated frontend origin allow-list', () => {
    expect(getFrontendOrigins(
      ' https://project-hari-3728.vercel.app/ , https://preview.example ',
    )).toEqual([
      'https://project-hari-3728.vercel.app',
      'https://preview.example',
    ]);
  });

  it('rejects invalid entries in the frontend origin allow-list', () => {
    expect(() => getFrontendOrigins(
      'https://project-hari-3728.vercel.app,,https://preview.example',
    )).toThrow('FRONTEND_URL must contain one or more http(s) origins.');
  });
});
