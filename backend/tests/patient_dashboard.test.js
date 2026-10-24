const request = require('supertest');
const app = require('../src/app');
const Prescription = require('../src/models/Prescription');
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

describe('Patient dashboard API', () => {
  it('counts unexpired doctor-issued prescriptions and excludes uploads and expired items', async () => {
    const registration = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Patient One',
        email: 'patient@example.com',
        password: 'Password123!',
        role: 'patient',
      });
    const { token, user } = registration.body.data;

    await Prescription.create([
      {
        patient: user._id,
        prescriptionType: 'doctor_issued',
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      {
        patient: user._id,
        prescriptionType: 'doctor_issued',
        validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        patient: user._id,
        prescriptionType: 'uploaded',
        fileName: 'prescription.pdf',
      },
    ]);

    const dashboard = await request(app)
      .get('/api/v1/patients/me/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.stats.activePrescriptions).toBe(1);
  });
});
