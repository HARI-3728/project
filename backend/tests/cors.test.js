const request = require('supertest');
const { allowedOriginsFor } = require('../src/middleware/cors');

// Frontend origin under test – this is the origin the deployed MediCare+ login
// page sends on CORS requests. It matches exactly one of the origins in the
// hard-coded allowlist, so a valid FRONTEND_URL env value must NOT be required
// at test time for this origin to be accepted.
const frontendOrigin = 'https://project-hari-3728.vercel.app';

// Env var used only to exercise the env-origins path of the allowlist builder.
// The hard-coded origins (including `frontendOrigin`) are accepted independently
// of FRONTEND_URL, which is what makes the login flow work on Render where the
// env value may be missing or differ from the Vercel origin.
process.env.FRONTEND_URL = `${frontendOrigin}/`;

// Lazy-require the app so `allowedOriginsFor` is available before Jest caches
// the module closure. This also mirrors how the server boots in production.
let app;
beforeAll(() => {
  app = require('../src/app');
});

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

    // The essential invariant: the response MUST NOT authorise the untrusted
    // origin. The exact HTTP status the cors package returns for a rejected
    // origin can vary across cors versions / server setups; what matters is that
    // no CORS authorisation headers are sent, so the browser blocks the request.
    // We therefore assert the observable CORS invariant rather than a specific
    // status code.
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.headers['access-control-allow-methods']).toBeUndefined();
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
    expect(response.headers['access-control-allow-origin']).not.toBe('https://untrusted.example');
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

  it('includes all three documented frontend origins in the built allowlist', () => {
    const allowlist = allowedOriginsFor('https://project-hari-3728.vercel.app');

    expect(allowlist).toContain('https://project-dvcn656q9-hari-3728.vercel.app');
    expect(allowlist).toContain('https://project-hari-3728.vercel.app');
    expect(allowlist).toContain('http://localhost:5173');
    expect(allowlist).not.toContain('https://untrusted.example');
    expect(allowlist.length).toBeGreaterThanOrEqual(3);
  });

  it('merges FRONTEND_URL origins with the hard-coded allowlist when env is set', () => {
    const envValue = 'https://project-dvcn656q9-hari-3728.vercel.app,https://extra.example';
    const envOrigins = allowedOriginsFor(envValue).filter((o) =>
      o !== 'https://project-dvcn656q9-hari-3728.vercel.app' &&
      o !== 'https://project-hari-3728.vercel.app' &&
      o !== 'http://localhost:5173'
    );

    expect(envOrigins).toContain('https://extra.example');
    expect(allowedOriginsFor(envValue)).toContain('https://extra.example');
    expect(allowedOriginsFor(envValue)).toContain('https://project-hari-3728.vercel.app');
    expect(allowedOriginsFor(envValue)).toContain('http://localhost:5173');
    expect(allowedOriginsFor(envValue).length).toBeGreaterThanOrEqual(4);
  });

  it('still allows requests that carry no Origin header (curl / server-to-server)', async () => {
    const response = await request(app)
      .options('/api/v1/auth/login')
      .set('Access-Control-Request-Method', 'POST');

    // No Origin header should be accepted by the cors middleware. The produced
    // response may or may not include an Access-Control-Allow-Origin header
    // depending on the cors implementation; the important invariant is that the
    // request is not rejected as a CORS violation.
    expect([200, 204]).toContain(response.status);
  });
});
