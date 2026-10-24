const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, closeTestDB, clearTestDB } = require('./helpers/db');

beforeAll(async () => {
  process.env.JWT_SECRET = 'test_jwt_secret_key_1234567890';
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

describe('Authentication & Role Authorization API Tests', () => {
  const patientData = {
    name: 'Aarav Patel',
    email: 'aarav@example.com',
    password: 'Password123!',
    role: 'patient',
    phone: '+91 9876543210',
  };

  it('should successfully register a new patient', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(patientData);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(patientData.email);
    expect(res.body.data.user.role).toBe('patient');
  });

  it('should reject registration with duplicate email', async () => {
    await request(app).post('/api/v1/auth/register').send(patientData);
    const res = await request(app).post('/api/v1/auth/register').send(patientData);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should reject registration with password shorter than 8 chars', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...patientData, email: 'short@example.com', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should successfully login and return JWT token', async () => {
    await request(app).post('/api/v1/auth/register').send(patientData);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: patientData.email, password: patientData.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(patientData.email);
  });

  it('should reject login with wrong password', async () => {
    await request(app).post('/api/v1/auth/register').send(patientData);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: patientData.email, password: 'WrongPassword99!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should access protected /api/v1/auth/me with valid token', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(patientData);
    const token = regRes.body.data.token;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(patientData.email);
    expect(res.body.data.profile).toBeDefined();
  });

  it('should block unauthorized requests without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
