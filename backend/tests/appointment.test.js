const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const DoctorProfile = require('../src/models/DoctorProfile');
const Appointment = require('../src/models/Appointment');
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

describe('Conditions & Appointments End-to-End API Tests', () => {
  let patientToken, patientId;
  let doctorToken, doctorId;

  beforeEach(async () => {
    // Setup patient
    const patUser = await User.create({
      name: 'Rohan Sharma',
      email: 'rohan@example.com',
      password: 'Password123!',
      role: 'patient',
    });
    patientId = patUser._id;
    patientToken = patUser.generateToken();

    // Setup doctor
    const docUser = await User.create({
      name: 'Dr. Neha Verma',
      email: 'dr.neha@example.com',
      password: 'Password123!',
      role: 'doctor',
    });
    doctorId = docUser._id;
    doctorToken = docUser.generateToken();

    await DoctorProfile.create({
      user: docUser._id,
      specialization: 'General Physician',
      consultationFee: 500,
      consultationCategories: ['Fever', 'Cold', 'Cough', 'Headache'],
      availability: [
        {
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '17:00',
          slotDurationMinutes: 30,
          isAvailable: true,
        },
      ],
      isAcceptingAppointments: true,
    });
  });

  it('should return all 60 conditions categorized into sections', async () => {
    const res = await request(app).get('/api/v1/conditions');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(60);
    expect(res.body.data.conditions).toContain('Fever');
    expect(res.body.data.conditions).toContain('Diabetes');
    expect(res.body.data.categories).toBeDefined();
  });

  it('should successfully book an appointment for a patient', async () => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 5);
    const dateStr = nextDate.toISOString().split('T')[0];

    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId: doctorId.toString(),
        condition: 'Fever',
        appointmentDate: dateStr,
        appointmentTime: '10:00',
        symptoms: 'High fever for 2 days',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('confirmed');
    expect(res.body.data.fee).toBe(500);
  });

  it('should reject double booking the same doctor and timeslot', async () => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 5);
    const dateStr = nextDate.toISOString().split('T')[0];

    const bookingPayload = {
      doctorId: doctorId.toString(),
      condition: 'Fever',
      appointmentDate: dateStr,
      appointmentTime: '11:00',
    };

    // First booking
    const res1 = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send(bookingPayload);
    expect(res1.status).toBe(201);

    // Second booking on same slot
    const res2 = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send(bookingPayload);

    expect(res2.status).toBe(409);
    expect(res2.body.success).toBe(false);
  });

  it('should allow doctor to view appointments and update status', async () => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 2);

    const appt = await Appointment.create({
      patient: patientId,
      doctor: doctorId,
      condition: 'Cold',
      appointmentDate: nextDate,
      startTime: '14:00',
      endTime: '14:30',
      fee: 500,
      status: 'confirmed',
    });

    const resList = await request(app)
      .get('/api/v1/appointments/doctor')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(resList.status).toBe(200);
    expect(resList.body.data.length).toBeGreaterThan(0);

    const resUpdate = await request(app)
      .patch(`/api/v1/appointments/${appt._id}/status`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ status: 'completed' });

    expect(resUpdate.status).toBe(200);
    expect(resUpdate.body.data.status).toBe('completed');
  });

  it('should allow patient to cancel appointment with valid reason', async () => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 3);

    const appt = await Appointment.create({
      patient: patientId,
      doctor: doctorId,
      condition: 'Headache',
      appointmentDate: nextDate,
      startTime: '15:30',
      endTime: '16:00',
      fee: 500,
      status: 'confirmed',
    });

    const resCancel = await request(app)
      .patch(`/api/v1/appointments/${appt._id}/cancel`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ reason: 'Feeling better already' });

    expect(resCancel.status).toBe(200);
    expect(resCancel.body.data.status).toBe('cancelled');
    expect(resCancel.body.data.cancelledBy).toBe('patient');
  });
});
