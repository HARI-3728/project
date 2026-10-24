const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Hospital = require('../src/models/Hospital');
const Medicine = require('../src/models/Medicine');
const Order = require('../src/models/Order');
const Bill = require('../src/models/Bill');
const { seedMedicines } = require('../src/seeds/medicine.seed');
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
  await seedMedicines();
});

describe('Pharmacy Catalogue, Orders & Hospital Billing API Tests', () => {
  let patientToken, patientId;
  let hospitalToken, hospitalId;

  beforeEach(async () => {
    const patUser = await User.create({
      name: 'Sunil Kumar',
      email: 'sunil@example.com',
      password: 'Password123!',
      role: 'patient',
    });
    patientId = patUser._id;
    patientToken = patUser.generateToken();

    const hospUser = await User.create({
      name: 'City Care Hospital',
      email: 'citycare@example.com',
      password: 'Password123!',
      role: 'hospital',
    });
    hospitalToken = hospUser.generateToken();

    const hospDoc = await Hospital.create({
      user: hospUser._id,
      hospitalName: 'City Care Hospital',
      taxRate: 18,
    });
    hospitalId = hospDoc._id;
  });

  it('should retrieve exactly the approved medicine catalogue', async () => {
    const res = await request(app).get('/api/v1/medicines');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(10);

    const names = res.body.data.map((m) => m.name);
    expect(names).toContain('Paracetamol');
    expect(names).toContain('ORS');
    expect(names).toContain('Amoxicillin');
  });

  it('should allow patient to place order for approved medicines', async () => {
    const paracetamol = await Medicine.findOne({ name: 'Paracetamol' });
    const ors = await Medicine.findOne({ name: 'ORS' });

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        items: [
          { medicineId: paracetamol._id.toString(), quantity: 2 },
          { medicineId: ors._id.toString(), quantity: 3 },
        ],
        deliveryAddress: {
          street: '10 Main Road',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderNumber).toBeDefined();
    // 2 * 25 + 3 * 22 = 50 + 66 = 116
    expect(res.body.data.totalAmount).toBe(116);
    expect(res.body.data.status).toBe('pending');
  });

  it('should enforce idempotency key preventing duplicate orders', async () => {
    const med = await Medicine.findOne({ name: 'Paracetamol' });
    const idempotencyKey = 'unique-key-xyz-12345';

    const payload = {
      items: [{ medicineId: med._id.toString(), quantity: 1 }],
      idempotencyKey,
    };

    const res1 = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${patientToken}`)
      .send(payload);

    expect(res1.status).toBe(201);

    const res2 = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${patientToken}`)
      .send(payload);

    expect(res2.status).toBe(200);
    expect(res2.body.data._id).toBe(res1.body.data._id);
  });

  it('should allow hospital to create a bill and update payment status', async () => {
    const med = await Medicine.findOne({ name: 'Antacid' });

    // Hospital creates a bill
    const resBill = await request(app)
      .post('/api/v1/hospital/bills')
      .set('Authorization', `Bearer ${hospitalToken}`)
      .send({
        patientId: patientId.toString(),
        items: [{ medicineId: med._id.toString(), quantity: 2 }],
        discountAmount: 0,
      });

    expect(resBill.status).toBe(201);
    expect(resBill.body.success).toBe(true);
    expect(resBill.body.data.billNumber).toBeDefined();

    const billId = resBill.body.data._id;

    // Update payment status
    const resPay = await request(app)
      .patch(`/api/v1/hospital/bills/${billId}/payment-status`)
      .set('Authorization', `Bearer ${hospitalToken}`)
      .send({ paymentStatus: 'paid', paymentMethod: 'upi' });

    expect(resPay.status).toBe(200);
    expect(resPay.body.data.paymentStatus).toBe('paid');

    // Get print data
    const resPrint = await request(app)
      .get(`/api/v1/hospital/bills/${billId}/print-data`)
      .set('Authorization', `Bearer ${hospitalToken}`);

    expect(resPrint.status).toBe(200);
    expect(resPrint.body.data.billNumber).toBe(resBill.body.data.billNumber);
    expect(resPrint.body.data.hospital.name).toBe('City Care Hospital');
  });
});
