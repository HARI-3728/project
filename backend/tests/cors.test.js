const request = require('supertest');

const frontendOrigin = 'https://project-hari-3728.vercel.app';
process.env.FRONTEND_URL = frontendOrigin;

const app = require('../src/app');

describe('CORS policy', () => {
  it('allows the configured frontend origin and handles auth preflight requests', async () => {
    const response = await request(app)
      .options('/api/v1/auth/login')
      .set('Origin', frontendOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(frontendOrigin);
    expect(response.headers['access-control-allow-methods']).toContain('POST');
    expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
    expect(response.headers['access-control-allow-headers']).toContain('Authorization');
  });

  it('does not allow an unconfigured frontend origin', async () => {
    const response = await request(app)
      .options('/api/v1/auth/login')
      .set('Origin', 'https://untrusted.example')
      .set('Access-Control-Request-Method', 'POST');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
