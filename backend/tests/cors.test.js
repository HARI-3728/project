const request = require('supertest');

const frontendOrigin = 'https://project-hari-3728.vercel.app';
process.env.FRONTEND_URL = ` ${frontendOrigin}/ `;

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

    // Untrusted origin returns 500 (CORS rejection error) - origin header is not set
    expect(response.status).toBe(500);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.headers['access-control-allow-methods']).toBeUndefined();
  });

  it('mounts login and registration at the expected versioned paths', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', frontendOrigin)
      .send({});
    const registration = await request(app)
      .post('/api/v1/auth/register')
      .set('Origin', frontendOrigin)
      .send({});

    expect(login.status).toBe(400);
    expect(login.headers['access-control-allow-origin']).toBe(frontendOrigin);
    expect(registration.status).toBe(400);
    expect(registration.headers['access-control-allow-origin']).toBe(frontendOrigin);
  });
});
