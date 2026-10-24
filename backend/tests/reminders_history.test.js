const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Notification = require('../src/models/Notification');
const HealthRecord = require('../src/models/HealthRecord');
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

describe('Reminders, Medical History & Notifications API Tests', () => {
  let patientToken, patientId;

  beforeEach(async () => {
    const patUser = await User.create({
      name: 'Maya Devi',
      email: 'maya@example.com',
      password: 'Password123!',
      role: 'patient',
    });
    patientId = patUser._id;
    patientToken = patUser.generateToken();
  });

  it('should create medicine reminder and log dose taken', async () => {
    const resCreate = await request(app)
      .post('/api/v1/reminders/medicines')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        medicineName: 'Paracetamol',
        dosage: '500mg',
        frequency: 'twice_daily',
        times: ['09:00', '21:00'],
        startDate: new Date().toISOString(),
      });

    expect(resCreate.status).toBe(201);
    expect(resCreate.body.success).toBe(true);
    expect(resCreate.body.data.medicineName).toBe('Paracetamol');

    const reminderId = resCreate.body.data._id;

    // Log dose taken
    const resLog = await request(app)
      .post(`/api/v1/reminders/medicines/${reminderId}/take`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ timeSlot: '09:00' });

    expect(resLog.status).toBe(200);
    expect(resLog.body.success).toBe(true);
  });

  it('should create vaccination reminder for patient', async () => {
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 2);

    const res = await request(app)
      .post('/api/v1/reminders/vaccinations')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        vaccineName: 'Hepatitis B Booster',
        dueDate: dueDate.toISOString(),
        doseNumber: 2,
        notes: 'Take with pediatrician',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vaccineName).toBe('Hepatitis B Booster');
  });

  it('should create and retrieve health records', async () => {
    const resCreate = await request(app)
      .post('/api/v1/health-records')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        title: 'Annual Blood Work Report',
        recordType: 'lab_report',
        hospitalName: 'Apex Diagnostics',
        description: 'All parameters normal',
      });

    expect(resCreate.status).toBe(201);
    expect(resCreate.body.success).toBe(true);

    const resList = await request(app)
      .get('/api/v1/health-records/my')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(resList.status).toBe(200);
    expect(resList.body.data.length).toBe(1);
    expect(resList.body.data[0].title).toBe('Annual Blood Work Report');
  });

  it('should retrieve aggregated medical history timeline', async () => {
    // Add health record
    await HealthRecord.create({
      patient: patientId,
      title: 'Past Discharge Summary',
      recordType: 'discharge_summary',
    });

    const resHistory = await request(app)
      .get('/api/v1/medical-history/my')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(resHistory.status).toBe(200);
    expect(resHistory.body.success).toBe(true);
    expect(resHistory.body.data.healthRecords).toBeDefined();
    expect(resHistory.body.data.appointments).toBeDefined();
    expect(resHistory.body.data.prescriptions).toBeDefined();
  });

  it('should manage notifications and unread counts', async () => {
    await Notification.create({
      recipient: patientId,
      type: 'appointment_confirmed',
      title: 'Appointment Confirmed',
      message: 'Your appointment is confirmed for tomorrow.',
    });

    const resCount = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(resCount.status).toBe(200);
    expect(resCount.body.data.count).toBe(1);

    const resReadAll = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(resReadAll.status).toBe(200);

    const resCountAfter = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(resCountAfter.body.data.count).toBe(0);
  });
});
