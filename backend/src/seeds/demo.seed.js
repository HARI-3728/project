require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');
const DoctorProfile = require('../models/DoctorProfile');
const Hospital = require('../models/Hospital');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const HealthRecord = require('../models/HealthRecord');
const Medicine = require('../models/Medicine');
const Order = require('../models/Order');
const Bill = require('../models/Bill');
const Notification = require('../models/Notification');
const MedicineReminder = require('../models/MedicineReminder');
const VaccinationReminder = require('../models/VaccinationReminder');
const { DiagnosticService, DiagnosticBooking } = require('../models/Diagnostic');
const { DietPlan, DailyDietLog } = require('../models/DietPlan');
const { seedMedicines, APPROVED_CATALOGUE } = require('./medicine.seed');

const DEMO_PASSWORD = 'DemoPass123!';
const DEMO_NOTICE = 'DEMO DATA — fictional example for classroom demonstration only; not medical advice.';

const HOSPITALS = [
  {
    key: 'central',
    name: 'MediCare Demo Central Hospital',
    city: 'New Delhi',
    phone: '+1-202-555-0101',
    departments: ['General Medicine', 'Cardiology', 'Dermatology', 'Pediatrics', 'Orthopedics', 'Neurology'],
    facilities: ['Demo OPD', 'Diagnostic Lab', 'Demo Pharmacy'],
  },
  {
    key: 'north',
    name: 'MediCare Demo North Clinic',
    city: 'Chandigarh',
    phone: '+1-202-555-0102',
    departments: ['General Medicine', 'Pediatrics', 'Dermatology'],
    facilities: ['Demo OPD', 'Sample Collection Room'],
  },
  {
    key: 'south',
    name: 'MediCare Demo South Medical Centre',
    city: 'Bengaluru',
    phone: '+1-202-555-0103',
    departments: ['General Medicine', 'Cardiology', 'Orthopedics', 'Neurology'],
    facilities: ['Demo OPD', 'Diagnostic Lab', 'Demo Pharmacy'],
  },
];

const DOCTORS = [
  { key: 'arun', name: 'Dr. Arun Kumar', email: 'doctor.arun@medicare-demo.example.test', phone: '+1-202-555-0111', specialization: 'General Physician', department: 'General Medicine', experience: 12, fee: 500, hospital: 'central', qualifications: ['MBBS (demo)', 'MD General Medicine (demo)'], conditions: ['Fever', 'Cold', 'Cough', 'Headache', 'General Health Check-up'] },
  { key: 'priya', name: 'Dr. Priya Sharma', email: 'doctor.priya@medicare-demo.example.test', phone: '+1-202-555-0112', specialization: 'Cardiologist', department: 'Cardiology', experience: 10, fee: 800, hospital: 'central', qualifications: ['MBBS (demo)', 'MD Cardiology (demo)'], conditions: ['Heart-Related Problems', 'High Blood Pressure', 'Dizziness'] },
  { key: 'rajesh', name: 'Dr. Rajesh Nair', email: 'doctor.rajesh@medicare-demo.example.test', phone: '+1-202-555-0113', specialization: 'Dermatologist', department: 'Dermatology', experience: 9, fee: 650, hospital: 'north', qualifications: ['MBBS (demo)', 'MD Dermatology (demo)'], conditions: ['Skin Allergy', 'Acne', 'Eczema'] },
  { key: 'ananya', name: 'Dr. Ananya Sen', email: 'doctor.ananya@medicare-demo.example.test', phone: '+1-202-555-0114', specialization: 'Pediatrician', department: 'Pediatrics', experience: 11, fee: 700, hospital: 'north', qualifications: ['MBBS (demo)', 'MD Pediatrics (demo)'], conditions: ['Fever', 'Cold', 'Cough', 'General Health Check-up'] },
  { key: 'vikram', name: 'Dr. Vikram Malhotra', email: 'doctor.vikram@medicare-demo.example.test', phone: '+1-202-555-0115', specialization: 'Orthopedist', department: 'Orthopedics', experience: 14, fee: 750, hospital: 'south', qualifications: ['MBBS (demo)', 'MS Orthopedics (demo)'], conditions: ['Back Pain', 'Joint Pain', 'Arthritis', 'Sprain'] },
  { key: 'meera', name: 'Dr. Meera Iyer', email: 'doctor.meera@medicare-demo.example.test', phone: '+1-202-555-0116', specialization: 'Endocrinologist', department: 'General Medicine', experience: 11, fee: 700, hospital: 'central', qualifications: ['MBBS (demo)', 'MD Endocrinology (demo)'], conditions: ['Diabetes', 'Thyroid Disorders', 'Fatigue / Weakness'] },
  { key: 'kavya', name: 'Dr. Kavya Rao', email: 'doctor.kavya@medicare-demo.example.test', phone: '+1-202-555-0117', specialization: 'Neurologist', department: 'Neurology', experience: 8, fee: 850, hospital: 'south', qualifications: ['MBBS (demo)', 'DM Neurology (demo)'], conditions: ['Headache', 'Migraine', 'Dizziness'] },
];

const PATIENTS = [
  { key: '01', name: 'Aarav Demo', email: 'patient01@medicare-demo.example.test', phone: '+1-202-555-0121', dob: '1992-04-12', gender: 'male', bloodGroup: 'A+', allergies: ['Dust mites'], conditions: ['Seasonal allergies'], city: 'New Delhi' },
  { key: '02', name: 'Diya Sample', email: 'patient02@medicare-demo.example.test', phone: '+1-202-555-0122', dob: '1987-09-25', gender: 'female', bloodGroup: 'O+', allergies: [], conditions: [], city: 'New Delhi' },
  { key: '03', name: 'Kabir Example', email: 'patient03@medicare-demo.example.test', phone: '+1-202-555-0123', dob: '2001-02-08', gender: 'male', bloodGroup: 'B+', allergies: ['Pollen'], conditions: ['Mild asthma'], city: 'Chandigarh' },
  { key: '04', name: 'Mira Fiction', email: 'patient04@medicare-demo.example.test', phone: '+1-202-555-0124', dob: '1979-11-17', gender: 'female', bloodGroup: 'AB+', allergies: [], conditions: ['Migraine (demo history)'], city: 'Bengaluru' },
  { key: '05', name: 'Neel Demo', email: 'patient05@medicare-demo.example.test', phone: '+1-202-555-0125', dob: '1995-06-03', gender: 'male', bloodGroup: 'O-', allergies: ['Penicillin (demo record)'], conditions: [], city: 'New Delhi' },
  { key: '06', name: 'Tara Sample', email: 'patient06@medicare-demo.example.test', phone: '+1-202-555-0126', dob: '1968-01-30', gender: 'female', bloodGroup: 'B-', allergies: [], conditions: ['Hypertension (demo history)'], city: 'Chandigarh' },
  { key: '07', name: 'Rohan Example', email: 'patient07@medicare-demo.example.test', phone: '+1-202-555-0127', dob: '2004-08-21', gender: 'male', bloodGroup: 'A-', allergies: [], conditions: [], city: 'Bengaluru' },
  { key: '08', name: 'Anika Fiction', email: 'patient08@medicare-demo.example.test', phone: '+1-202-555-0128', dob: '1990-12-05', gender: 'female', bloodGroup: 'AB-', allergies: ['Latex (demo record)'], conditions: [], city: 'New Delhi' },
  { key: '09', name: 'Ishaan Demo', email: 'patient09@medicare-demo.example.test', phone: '+1-202-555-0129', dob: '1983-05-14', gender: 'male', bloodGroup: 'A+', allergies: [], conditions: ['Type 2 diabetes (demo history)'], city: 'Chandigarh' },
  { key: '10', name: 'Sara Sample', email: 'patient10@medicare-demo.example.test', phone: '+1-202-555-0130', dob: '1998-03-19', gender: 'female', bloodGroup: 'O+', allergies: [], conditions: [], city: 'Bengaluru' },
];

const CONDITIONS = [
  'Fever', 'Cold', 'Headache', 'General Health Check-up', 'Skin Allergy',
  'Diabetes', 'Back Pain', 'Cough', 'Dizziness', 'Joint Pain',
  'Migraine', 'Thyroid Disorders', 'Sore Throat', 'High Blood Pressure',
  'Acne', 'Fatigue / Weakness', 'Sprain', 'General Health Check-up',
  'Fever', 'Cough',
];

const APPOINTMENT_STATUSES = [
  'completed', 'completed', 'completed', 'completed', 'completed',
  'completed', 'completed', 'completed', 'completed', 'cancelled',
  'cancelled', 'completed', 'completed', 'completed', 'confirmed',
  'confirmed', 'pending', 'confirmed', 'pending', 'confirmed',
];

const DEMO_DIAGNOSTICS = [
  { name: 'DEMO DATA — Complete Blood Count', category: 'blood_test', price: 350, reportTime: 'Demo same-day result', description: 'Fictional demo lab service; no real test or result.', preparationInstructions: 'Example information only.' },
  { name: 'DEMO DATA — Lipid Profile', category: 'blood_test', price: 650, reportTime: 'Demo next-day result', description: 'Fictional demo lab service; no real test or result.', preparationInstructions: 'Example information only.' },
  { name: 'DEMO DATA — Chest X-Ray', category: 'xray', price: 400, reportTime: 'Demo two-hour result', description: 'Fictional demo imaging service; no real scan or result.', preparationInstructions: 'Example information only.' },
  { name: 'DEMO DATA — 12-Lead ECG', category: 'ecg', price: 300, reportTime: 'Demo same-day result', description: 'Fictional demo diagnostic service; no real test or result.', preparationInstructions: 'Example information only.' },
];

const DEMO_DIET = {
  title: 'DEMO DATA — Balanced Wellness Plan',
  condition: 'General Wellness (demo)',
  goal: 'general',
  dailyCalorieTarget: 2000,
  waterIntakeTargetLiters: 2.5,
  isActive: true,
  isTemplate: true,
  foodsToEat: ['Example whole grains', 'Example seasonal fruit', 'Example vegetables'],
  foodsToAvoid: ['Example highly processed snacks'],
  guidelines: ['Fictional education-only sample; consult a qualified clinician for personal advice.'],
  meals: [
    { mealType: 'breakfast', time: '08:00 AM', items: [{ name: 'Example oats and fruit', portion: '1 bowl', calories: 350 }] },
    { mealType: 'lunch', time: '01:00 PM', items: [{ name: 'Example grain, lentils, and vegetables', portion: '1 plate', calories: 600 }] },
    { mealType: 'dinner', time: '07:30 PM', items: [{ name: 'Example vegetable and protein plate', portion: '1 plate', calories: 550 }] },
  ],
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const setClock = (date, time) => {
  const result = new Date(date);
  const [hours, minutes] = time.split(':').map(Number);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

const getOrCreateUser = async ({ name, email, phone, role, avatar = null }) => {
  let user = await User.findOne({ email });
  if (user) {
    if (user.role !== role || user.name !== name || user.phone !== phone) {
      throw new Error(`Refusing to attach demo records to the existing non-demo account ${email}.`);
    }
    return user;
  }

  user = await User.create({ name, email, phone, role, avatar, password: DEMO_PASSWORD });
  return user;
};

const ensureHospital = async (data) => {
  const account = await getOrCreateUser({
    name: data.name,
    email: `hospital.${data.key}@medicare-demo.example.test`,
    phone: data.phone,
    role: 'hospital',
  });
  let hospital = await Hospital.findOne({ user: account._id });
  if (!hospital) {
    hospital = await Hospital.create({
      user: account._id,
      hospitalName: data.name,
      registrationNumber: `DEMO-HOSP-${data.key.toUpperCase()}`,
      type: 'private',
      address: {
        street: `DEMO DATA — ${data.key} campus, Sample Avenue`,
        city: data.city,
        state: data.city === 'New Delhi' ? 'Delhi' : data.city,
        pincode: '000000',
        country: 'India',
      },
      phone: data.phone,
      email: `contact.${data.key}@medicare-demo.example.test`,
      departments: data.departments,
      facilities: data.facilities,
      operatingHours: { open: '08:00', close: '20:00' },
      taxRate: 0,
    });
  }
  return { account, hospital };
};

const ensureDoctor = async (data, hospital) => {
  const account = await getOrCreateUser({
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: 'doctor',
  });
  let profile = await DoctorProfile.findOne({ user: account._id });
  if (!profile) {
    profile = await DoctorProfile.create({
      user: account._id,
      hospital: hospital._id,
      specialization: data.specialization,
      qualifications: data.qualifications,
      experience: data.experience,
      registrationNumber: `DEMO-REG-${data.key.toUpperCase()}`,
      consultationFee: data.fee,
      consultationCategories: data.conditions,
      availability: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
        dayOfWeek,
        startTime: '09:00',
        endTime: '17:00',
        slotDurationMinutes: 30,
        isAvailable: true,
      })),
      rating: 4.7,
      totalReviews: 0,
      bio: `${DEMO_NOTICE} Fictional ${data.specialization} profile.`,
      languages: ['English', 'Hindi'],
      isVerified: false,
      isAcceptingAppointments: true,
    });
  }
  return { account, profile };
};

const ensurePatient = async (data) => {
  const account = await getOrCreateUser({
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: 'patient',
  });
  let profile = await PatientProfile.findOne({ user: account._id });
  if (!profile) {
    const city = data.city;
    profile = await PatientProfile.create({
      user: account._id,
      dateOfBirth: new Date(`${data.dob}T12:00:00.000Z`),
      gender: data.gender,
      bloodGroup: data.bloodGroup,
      allergies: data.allergies,
      chronicConditions: data.conditions,
      height: 150 + (Number(data.key) % 35),
      weight: 48 + (Number(data.key) % 35),
      address: {
        street: `DEMO DATA — ${data.key} Sample Street`,
        city,
        state: city === 'New Delhi' ? 'Delhi' : city,
        pincode: '000000',
        country: 'India',
      },
      emergencyContact: {
        name: `Demo Contact ${data.key}`,
        phone: `+1-202-555-${String(1400 + Number(data.key)).slice(-4)}`,
        relation: 'Demo contact',
      },
      insuranceProvider: 'Demo Insurance Example',
      insurancePolicyNumber: `DEMO-POLICY-${data.key}`,
    });
  }
  return { account, profile };
};

const ensureDemoRecords = async ({ hospitals, doctors, patients, medicines }) => {
  const appointments = [];
  const now = new Date();
  const offsets = [-14, -13, -12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 0, 1, 2, 3, 4];

  for (let index = 0; index < offsets.length; index += 1) {
    const patient = patients[(index * 3) % patients.length];
    const doctor = doctors[index % doctors.length];
    const hospital = hospitals.find((item) => item.key === doctor.data.hospital);
    const time = `09:${String((index % 4) * 15).padStart(2, '0')}`;
    const appointmentDate = setClock(addDays(now, offsets[index]), time);
    const criteria = {
      patient: patient.account._id,
      doctor: doctor.account._id,
      appointmentDate,
      startTime: time,
    };
    let appointment = await Appointment.findOne(criteria);
    if (!appointment) {
      const endMinutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) + 30;
      const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
      const status = APPOINTMENT_STATUSES[index];
      appointment = await Appointment.create({
        ...criteria,
        hospital: hospital.hospital._id,
        endTime,
        condition: CONDITIONS[index],
        status,
        fee: doctor.data.fee,
        consultationFeeSnapshot: doctor.data.fee,
        symptoms: `${DEMO_NOTICE} Example reason: ${CONDITIONS[index]}.`,
        notes: DEMO_NOTICE,
        createdAt: appointmentDate < now ? addDays(appointmentDate, -7) : addDays(now, -7),
        updatedAt: appointmentDate < now ? addDays(appointmentDate, -7) : addDays(now, -7),
      });
    }
    appointments.push({ appointment, patient, doctor, hospital });
  }

  const prescriptions = [];
  const completedAppointments = appointments.filter(({ appointment }) => appointment.status === 'completed');
  for (const [index, item] of completedAppointments.slice(0, 12).entries()) {
    let prescription = await Prescription.findOne({ appointment: item.appointment._id });
    if (!prescription) {
      const medicine = APPROVED_CATALOGUE[index % APPROVED_CATALOGUE.length];
      prescription = await Prescription.create({
        patient: item.patient.account._id,
        doctor: item.doctor.account._id,
        appointment: item.appointment._id,
        hospital: item.hospital.hospital._id,
        prescriptionType: 'doctor_issued',
        prescriptionDate: item.appointment.appointmentDate,
        diagnosis: `DEMO DATA — ${item.appointment.condition} example`,
        medicines: [{
          medicineName: medicine.name,
          dosage: 'Example dosage only',
          frequency: 'Example schedule only',
          duration: 'Example duration only',
          instructions: 'Fictional sample; follow advice from your own clinician.',
        }],
        notes: `${DEMO_NOTICE} Example follow-up: review with a qualified clinician.`,
        validUntil: addDays(item.appointment.appointmentDate, 30),
      });
    }
    if (!item.appointment.prescription) {
      item.appointment.prescription = prescription._id;
      await item.appointment.save();
    }
    prescriptions.push({ prescription, ...item });
  }

  for (let index = 0; index < patients.length; index += 1) {
    const patient = patients[index];
    const profile = patient.profile;
    const relatedVisit = appointments.find((item) => (
      item.patient.account._id.equals(patient.account._id)
      && item.appointment.status === 'completed'
    ));
    const recordSpecs = [
      { type: 'lab_report', title: 'DEMO DATA — Example wellness panel', description: 'Fictional example summary only. No file was uploaded, generated, or processed.' },
      { type: 'other', title: 'DEMO DATA — Example medical history', description: `Fictional history note: ${profile.chronicConditions.join(', ') || 'no conditions listed in this demo profile'}. This is not a real patient record.` },
    ];
    for (const [recordIndex, spec] of recordSpecs.entries()) {
      const existing = await HealthRecord.findOne({
        patient: patient.account._id,
        title: spec.title,
        tags: 'DEMO DATA',
      });
      if (!existing) {
        await HealthRecord.create({
          patient: patient.account._id,
          title: spec.title,
          recordType: spec.type,
          description: spec.description,
          fileUrl: null,
          fileName: null,
          fileType: null,
          recordDate: relatedVisit?.appointment.appointmentDate || addDays(now, -(index * 4 + recordIndex + 1)),
          hospitalName: relatedVisit?.hospital.hospital.hospitalName,
          doctorName: relatedVisit?.doctor.account.name,
          tags: ['DEMO DATA', 'Fictional'],
          processingStatus: 'pending',
        });
      }
    }
  }

  const medicationReminders = [];
  const vaccinationReminders = [];
  for (const [index, patient] of patients.entries()) {
    const prescription = prescriptions.find((item) => item.patient.account._id.equals(patient.account._id));
    const reminderData = {
      patient: patient.account._id,
      medicineName: APPROVED_CATALOGUE[index % APPROVED_CATALOGUE.length].name,
      dosage: 'Example dosage only',
      frequency: 'once_daily',
      times: ['08:00'],
      startDate: addDays(now, -2),
      endDate: addDays(now, 5),
      instructions: DEMO_NOTICE,
      isActive: true,
      ...(prescription ? { prescription: prescription.prescription._id } : {}),
    };
    let medicationReminder = await MedicineReminder.findOne({
      patient: patient.account._id,
      medicineName: reminderData.medicineName,
      instructions: DEMO_NOTICE,
    });
    if (!medicationReminder) medicationReminder = await MedicineReminder.create(reminderData);
    medicationReminders.push(medicationReminder);

    const vaccineName = 'DEMO DATA — Seasonal influenza reminder';
    let vaccination = await VaccinationReminder.findOne({ patient: patient.account._id, vaccineName });
    if (!vaccination) {
      vaccination = await VaccinationReminder.create({
        patient: patient.account._id,
        vaccineName,
        dueDate: addDays(now, 7 + index),
        status: 'upcoming',
        hospitalName: hospitals[index % hospitals.length].hospital.hospitalName,
        doctorName: doctors[index % doctors.length].account.name,
        notes: DEMO_NOTICE,
        dose: 'Demo dose',
        reminderDaysBefore: 7,
      });
    }
    vaccinationReminders.push(vaccination);
  }

  const orders = [];
  for (let index = 0; index < 8; index += 1) {
    const patient = patients[index];
    const hospital = hospitals[index % hospitals.length];
    const medicine = medicines[index % medicines.length];
    let order = await Order.findOne({
      patient: patient.account._id,
      hospital: hospital.hospital._id,
      notes: DEMO_NOTICE,
    });
    if (!order) {
      const price = medicine.unitPrice;
      const status = ['completed', 'completed', 'confirmed', 'preparing', 'pending', 'completed', 'ready', 'cancelled'][index];
      order = await Order.create({
        patient: patient.account._id,
        hospital: hospital.hospital._id,
        items: [{ medicine: medicine._id, medicineName: medicine.name, quantity: 1, unitPrice: price, lineTotal: price }],
        subtotal: price,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: price,
        prescriptionVerified: medicine.requiresPrescription ? index < 2 : false,
        status,
        deliveryAddress: {
          street: `DEMO DATA — ${patient.data.key} Sample Street`,
          city: patient.data.city,
          state: patient.data.city === 'New Delhi' ? 'Delhi' : patient.data.city,
          pincode: '000000',
        },
        notes: DEMO_NOTICE,
        createdAt: addDays(now, -(index + 1)),
        updatedAt: addDays(now, -(index + 1)),
      });
    }
    orders.push({ order, patient, hospital, medicine });

    if (order.status === 'completed' && !order.bill) {
      let bill = await Bill.findOne({ order: order._id });
      if (!bill) {
        bill = await Bill.create({
          hospital: hospital.hospital._id,
          patient: patient.account._id,
          order: order._id,
          items: [{ medicine: medicine._id, medicineName: medicine.name, quantity: 1, unitPrice: medicine.unitPrice, lineTotal: medicine.unitPrice }],
          subtotal: medicine.unitPrice,
          taxRate: 0,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: medicine.unitPrice,
          paymentStatus: 'paid',
          paymentMethod: 'upi',
          paymentDate: addDays(now, -index),
          notes: DEMO_NOTICE,
          generatedBy: hospital.account._id,
        });
      }
      order.bill = bill._id;
      await order.save();
    }
  }

  const diagnosticServices = [];
  for (const serviceData of DEMO_DIAGNOSTICS) {
    let service = await DiagnosticService.findOne({ name: serviceData.name });
    if (!service) service = await DiagnosticService.create(serviceData);
    diagnosticServices.push(service);
  }
  for (let index = 0; index < 4; index += 1) {
    const patient = patients[index];
    const service = diagnosticServices[index % diagnosticServices.length];
    const hospital = hospitals[index % hospitals.length];
    const bookingDate = addDays(now, index - 1);
    const existing = await DiagnosticBooking.findOne({
      patient: patient.account._id,
      service: service._id,
      notes: DEMO_NOTICE,
    });
    if (!existing) {
      await DiagnosticBooking.create({
        patient: patient.account._id,
        hospital: hospital.hospital._id,
        service: service._id,
        serviceName: service.name,
        servicePrice: service.price,
        bookingDate,
        timeSlot: '10:00-10:30',
        status: index < 2 ? 'confirmed' : 'pending',
        notes: DEMO_NOTICE,
      });
    }
  }

  let demoTemplate = await DietPlan.findOne({ title: DEMO_DIET.title });
  if (!demoTemplate) demoTemplate = await DietPlan.create(DEMO_DIET);
  for (const [index, patient] of patients.entries()) {
    const title = `DEMO DATA — Sample plan for ${patient.account.name}`;
    let plan = await DietPlan.findOne({ patient: patient.account._id, title });
    if (!plan) {
      plan = await DietPlan.create({
        ...DEMO_DIET,
        patient: patient.account._id,
        prescribedBy: doctors[index % doctors.length].account._id,
        title,
        condition: 'General Wellness (demo)',
        isTemplate: false,
        startDate: addDays(now, -7),
        endDate: addDays(now, 23),
      });
    }
    const logDate = new Date(now);
    logDate.setHours(0, 0, 0, 0);
    let dietLog = await DailyDietLog.findOne({ patient: patient.account._id, date: logDate });
    if (!dietLog) {
      await DailyDietLog.create({
        patient: patient.account._id,
        dietPlan: plan._id || demoTemplate._id,
        date: logDate,
        mealsCompleted: ['breakfast', 'lunch'],
        waterConsumedLiters: 1.5,
        calorieIntake: 1200,
        notes: DEMO_NOTICE,
      });
    }
  }

  const notificationTypes = [
    ['appointment_confirmed', 'Appointment confirmed', 'Your fictional demo appointment is confirmed.', 'Appointment'],
    ['prescription_issued', 'Demo prescription added', 'A fictional demo prescription is available in your records.', 'Prescription'],
    ['medicine_reminder', 'Demo follow-up reminder', 'This is a fictional example reminder.', 'MedicineReminder'],
  ];
  for (const patient of patients) {
    const patientAppointments = appointments.filter((item) => item.patient.account._id.equals(patient.account._id));
    const patientPrescription = prescriptions.find((item) => item.patient.account._id.equals(patient.account._id));
    const patientReminder = medicationReminders.find((item) => item.patient.equals(patient.account._id));
    const references = {
      Appointment: patientAppointments[0]?.appointment._id,
      Prescription: patientPrescription?.prescription._id,
      MedicineReminder: patientReminder?._id,
    };
    for (const [type, title, message, refModel] of notificationTypes) {
      const demoTitle = `DEMO DATA — ${title}`;
      const existing = await Notification.findOne({ recipient: patient.account._id, type, title: demoTitle });
      if (!existing) {
        await Notification.create({
          recipient: patient.account._id,
          type,
          title: demoTitle,
          message: `${message} ${DEMO_NOTICE}`,
          isRead: type === 'appointment_confirmed',
          readAt: type === 'appointment_confirmed' ? addDays(now, -1) : null,
          refModel,
          refId: references[refModel] || null,
          priority: type === 'appointment_confirmed' ? 'high' : 'normal',
        });
      }
    }
  }

  for (const doctor of doctors) {
    const title = 'DEMO DATA — Sample OPD schedule updated';
    if (!await Notification.findOne({ recipient: doctor.account._id, title })) {
      await Notification.create({
        recipient: doctor.account._id,
        type: 'general',
        title,
        message: DEMO_NOTICE,
      });
    }
  }
};

const seedDemoData = async () => {
  if (process.env.DEMO_MODE !== 'true') {
    throw new Error('Demo seeding is disabled. Set DEMO_MODE=true to seed an isolated demo database.');
  }
  const uri = process.env.DEMO_MONGODB_URI;
  if (!uri) throw new Error('DEMO_MONGODB_URI is required; normal MONGODB_URI is never used by this seed.');
  let databaseName;
  try {
    databaseName = decodeURIComponent(new URL(uri).pathname.slice(1));
  } catch {
    throw new Error('DEMO_MONGODB_URI must be a valid MongoDB URL with the database name in its path.');
  }
  if (databaseName !== 'medicare_demo') {
    throw new Error('DEMO_MONGODB_URI must target the isolated database named medicare_demo.');
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await seedMedicines();
    const medicines = await Medicine.find({}).sort({ name: 1 });
    const expectedNames = APPROVED_CATALOGUE.map((item) => item.name).sort();
    const actualNames = medicines.map((item) => item.name).sort();
    if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
      throw new Error('The isolated demo database must contain exactly the ten approved medicine products.');
    }

    const hospitals = [];
    for (const data of HOSPITALS) hospitals.push({ ...data, ...(await ensureHospital(data)) });
    const doctors = [];
    for (const data of DOCTORS) {
      const hospital = hospitals.find((item) => item.key === data.hospital);
      doctors.push({ data, ...(await ensureDoctor(data, hospital.hospital)) });
    }
    const patients = [];
    for (const data of PATIENTS) patients.push({ data, ...(await ensurePatient(data)) });

    await ensureDemoRecords({ hospitals, doctors, patients, medicines });
    console.info(JSON.stringify({
      message: 'Isolated MediCare+ demo records are ready.',
      database: databaseName,
      hospitals: hospitals.length,
      doctors: doctors.length,
      patients: patients.length,
      medicines: medicines.length,
    }));
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  seedDemoData().catch((error) => {
    console.error(`Demo data seeding failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { seedDemoData, DEMO_PASSWORD };
