const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const User = require('../src/models/User');
const Hospital = require('../src/models/Hospital');
const DoctorProfile = require('../src/models/DoctorProfile');
const PatientProfile = require('../src/models/PatientProfile');
const Appointment = require('../src/models/Appointment');
const Prescription = require('../src/models/Prescription');
const HealthRecord = require('../src/models/HealthRecord');
const Medicine = require('../src/models/Medicine');
const Order = require('../src/models/Order');
const { seedDemoData } = require('../src/seeds/demo.seed');

describe('isolated demo data seed', () => {
  let mongoServer;
  let demoUri;
  let protectedAccountHash;
  const originalEnvironment = {};

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    demoUri = mongoServer.getUri('medicare_demo');
    await mongoose.connect(demoUri);
    const protectedAccount = await User.create({
      name: 'Existing User',
      email: 'existing-user@example.test',
      phone: '+1-202-555-0199',
      password: 'ExistingPass123!',
      role: 'patient',
    });
    protectedAccountHash = protectedAccount.password;
    await mongoose.disconnect();

    for (const key of ['DEMO_MODE', 'DEMO_MONGODB_URI', 'MONGODB_URI', 'JWT_SECRET']) {
      originalEnvironment[key] = process.env[key];
    }
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_MONGODB_URI = demoUri;
    process.env.JWT_SECRET = 'demo-seed-test-secret';
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('creates linked fictional records once without changing existing users', async () => {
    await seedDemoData();
    await mongoose.connect(demoUri);
    const app = require('../src/app');

    const login = async (email) => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'DemoPass123!' });
      expect(response.status).toBe(200);
      return response.body.data.token;
    };

    const patientToken = await login('patient01@medicare-demo.example.test');
    const patientDashboard = await request(app)
      .get('/api/v1/patients/me/dashboard')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(patientDashboard.status).toBe(200);
    expect(patientDashboard.body.data.stats.totalAppointments).toBe(2);
    expect(patientDashboard.body.data.stats.completedAppointments).toBe(1);

    const patientOrders = await request(app)
      .get('/api/v1/orders/my')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(patientOrders.status).toBe(200);
    expect(patientOrders.body.data).toHaveLength(1);

    const dietPlan = await request(app)
      .get('/api/v1/diet/my-plan')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(dietPlan.status).toBe(200);
    expect(dietPlan.body.data.title).toContain('DEMO DATA');

    const doctorToken = await login('doctor.arun@medicare-demo.example.test');
    const doctorDashboard = await request(app)
      .get('/api/v1/doctors/me/dashboard')
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(doctorDashboard.status).toBe(200);
    expect(doctorDashboard.body.data.stats.todayCount).toBe(1);

    const hospitalToken = await login('hospital.central@medicare-demo.example.test');
    const hospitalDashboard = await request(app)
      .get('/api/v1/hospital/me/dashboard')
      .set('Authorization', `Bearer ${hospitalToken}`);
    expect(hospitalDashboard.status).toBe(200);
    expect(hospitalDashboard.body.data.stats.doctorCount).toBe(3);
    expect(hospitalDashboard.body.data.stats.todayAppointmentCount).toBe(2);

    const hospitalDirectory = await request(app).get('/api/v1/hospital?page=1&limit=100');
    expect(hospitalDirectory.status).toBe(200);
    expect(hospitalDirectory.body.data).toHaveLength(3);
    expect(hospitalDirectory.body.data.map((hospital) => hospital.hospitalName)).toContain('MediCare Demo Central Hospital');

    expect(await Hospital.countDocuments()).toBe(3);
    expect(await DoctorProfile.countDocuments()).toBe(7);
    expect(await PatientProfile.countDocuments()).toBe(10);
    expect(await Appointment.countDocuments()).toBe(20);
    expect(await Prescription.countDocuments()).toBe(12);
    expect(await HealthRecord.countDocuments({ tags: 'DEMO DATA', fileUrl: null })).toBe(20);
    expect(await Order.countDocuments({ notes: /DEMO DATA/ })).toBe(8);

    const appointments = await Appointment.find({ notes: /DEMO DATA/ }).lean();
    expect(appointments).toHaveLength(20);
    expect(appointments.every((item) => (
      item.hospital
      && /^([01]\d|2[0-3]):[0-5]\d$/.test(item.startTime)
      && /^([01]\d|2[0-3]):[0-5]\d$/.test(item.endTime)
      && item.endTime > item.startTime
    ))).toBe(true);
    const doctorProfiles = await DoctorProfile.find({}, 'hospital').lean();
    expect(doctorProfiles.every((profile) => profile.hospital)).toBe(true);
    expect(await DoctorProfile.countDocuments({
      hospital: (await Hospital.findOne({ hospitalName: 'MediCare Demo Central Hospital' }))._id,
    })).toBe(3);

    const prescriptions = await Prescription.find().lean();
    expect(prescriptions.every((item) => item.patient && item.doctor && item.hospital && item.appointment)).toBe(true);

    const medicines = await Medicine.find({}, 'name').lean();
    expect(medicines).toHaveLength(10);
    expect(medicines.map((item) => item.name).sort()).toEqual([
      'Amoxicillin', 'Antacid', 'Calcium supplements', 'Cetirizine', 'Ibuprofen',
      'Iron supplements', 'ORS', 'Paracetamol', 'Saline nasal drops', 'Vitamin D supplements',
    ].sort());

    const protectedAccount = await User.findOne({ email: 'existing-user@example.test' }).select('+password');
    expect(protectedAccount.name).toBe('Existing User');
    expect(protectedAccount.password).toBe(protectedAccountHash);

    await mongoose.disconnect();
    await seedDemoData();
    await mongoose.connect(demoUri);

    expect(await Hospital.countDocuments()).toBe(3);
    expect(await DoctorProfile.countDocuments()).toBe(7);
    expect(await PatientProfile.countDocuments()).toBe(10);
    expect(await Appointment.countDocuments({ notes: /DEMO DATA/ })).toBe(20);
    expect(await Prescription.countDocuments()).toBe(12);
    expect(await Order.countDocuments({ notes: /DEMO DATA/ })).toBe(8);
    expect(await User.countDocuments()).toBe(21);
  });

  it('never falls back to the normal MongoDB URI', async () => {
    delete process.env.DEMO_MONGODB_URI;
    process.env.MONGODB_URI = demoUri;
    await expect(seedDemoData()).rejects.toThrow('DEMO_MONGODB_URI is required');
  });
});
