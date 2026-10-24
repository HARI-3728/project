require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const logger = require('../utils/logger');
const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');
const DoctorProfile = require('../models/DoctorProfile');
const Hospital = require('../models/Hospital');
const { DiagnosticService } = require('../models/Diagnostic');
const { DietPlan } = require('../models/DietPlan');
const Appointment = require('../models/Appointment');
const Bill = require('../models/Bill');
const Medicine = require('../models/Medicine');
const { seedMedicines } = require('./medicine.seed');

const DIAGNOSTIC_SERVICES = [
  {
    name: 'Complete Blood Count (CBC)',
    category: 'blood_test',
    description: 'Measures red blood cells, white blood cells, platelets, and hemoglobin.',
    price: 350,
    preparationInstructions: 'No fasting required. Routine blood draw.',
    reportTime: 'Same day (6 hours)',
  },
  {
    name: 'Lipid Profile',
    category: 'blood_test',
    description: 'Comprehensive cholesterol check including HDL, LDL, VLDL, and Triglycerides.',
    price: 650,
    preparationInstructions: 'Fasting required for 10-12 hours prior to test. Water permitted.',
    reportTime: '24 hours',
  },
  {
    name: 'Thyroid Function Test (T3, T4, TSH)',
    category: 'blood_test',
    description: 'Assesses functioning of the thyroid gland.',
    price: 500,
    preparationInstructions: 'Morning sample preferred. Medication schedule should be reported.',
    reportTime: '24 hours',
  },
  {
    name: 'Fasting Blood Sugar (FBS) & HbA1c',
    category: 'blood_test',
    description: 'Standard diagnostic test for diabetes screening and glycemic management.',
    price: 450,
    preparationInstructions: '8-10 hours overnight fasting required.',
    reportTime: 'Same day',
  },
  {
    name: 'Chest X-Ray (PA View)',
    category: 'xray',
    description: 'Imaging study of chest cavity, lungs, and heart silhouette.',
    price: 400,
    preparationInstructions: 'Remove metallic items, necklaces, and piercings before procedure.',
    reportTime: '2 hours',
  },
  {
    name: '12-Lead Electrocardiogram (ECG)',
    category: 'ecg',
    description: 'Records electrical activity of the heart to detect rhythm abnormalities.',
    price: 300,
    preparationInstructions: 'Wear loose-fitting clothing. Avoid caffeine 2 hours before test.',
    reportTime: 'Immediate / 1 hour',
  },
  {
    name: 'Urine Routine & Microscopic Examination',
    category: 'urine_test',
    description: 'Screens for renal disorders, metabolic issues, and urinary tract infections.',
    price: 200,
    preparationInstructions: 'Clean-catch midstream urine sample collected in sterile container.',
    reportTime: '4 hours',
  },
  {
    name: '2D Echocardiogram with Doppler',
    category: 'echo',
    description: 'Ultrasound visualization of heart valves, chambers, and cardiac output.',
    price: 1800,
    preparationInstructions: 'No special preparation needed. Comfortable clothing advised.',
    reportTime: 'Same day',
  },
];

const STANDARD_DIET_PLANS = [
  {
    title: 'General Wellness & Balanced Nutrition',
    condition: 'General Health',
    goal: 'general',
    dailyCalorieTarget: 2100,
    waterIntakeTargetLiters: 3.0,
    isTemplate: true,
    isActive: true,
    foodsToEat: ['Whole grains (oats, brown rice)', 'Fresh seasonal fruits', 'Lentils & pulses', 'Lean proteins', 'Nuts & seeds'],
    foodsToAvoid: ['Ultra-processed snacks', 'Sugary sodas', 'Excess refined flour (Maida)', 'Deep fried items'],
    guidelines: [
      'Maintain regular meal timings.',
      'Drink a glass of warm water upon waking.',
      'Include a colorful raw salad with lunch and dinner.',
    ],
    meals: [
      {
        mealType: 'breakfast',
        time: '08:00 AM',
        items: [{ name: 'Oatmeal with berries and chia seeds', portion: '1 bowl', calories: 350 }],
        instructions: 'Cook with milk or almond milk, top with a handful of almonds.',
      },
      {
        mealType: 'lunch',
        time: '01:00 PM',
        items: [
          { name: 'Brown rice with dal and mixed vegetable curry', portion: '1 plate', calories: 600 },
          { name: 'Green cucumber salad', portion: '1 bowl', calories: 50 },
        ],
        instructions: 'Use minimal oil for tadka.',
      },
      {
        mealType: 'evening_snack',
        time: '05:00 PM',
        items: [{ name: 'Roasted makhana & green tea', portion: '1 cup', calories: 150 }],
      },
      {
        mealType: 'dinner',
        time: '08:00 PM',
        items: [{ name: 'Multigrain roti with paneer/tofu sabzi', portion: '2 rotis + sabzi', calories: 500 }],
        instructions: 'Eat dinner at least 2 hours before sleeping.',
      },
    ],
  },
  {
    title: 'Diabetic Glycemic Control Diet',
    condition: 'Diabetes',
    goal: 'diabetic_care',
    dailyCalorieTarget: 1800,
    waterIntakeTargetLiters: 2.8,
    isTemplate: true,
    isActive: true,
    foodsToEat: ['Methi / fenugreek seeds', 'Bitter gourd (Karela)', 'Barley, oats, quinoa', 'High-fiber vegetables', 'Sprouts'],
    foodsToAvoid: ['White bread & polished rice', 'Sugar, sweets, jaggery', 'Fruit juices without pulp', 'Potatoes & colacasia in excess'],
    guidelines: [
      'Eat small, frequent meals rather than large feasts.',
      'Check fasting blood sugar before breakfast.',
      'Avoid late night snacking.',
    ],
    meals: [
      {
        mealType: 'breakfast',
        time: '08:30 AM',
        items: [{ name: 'Besan cheela with mint chutney', portion: '2 small cheelas', calories: 300 }],
      },
      {
        mealType: 'lunch',
        time: '01:30 PM',
        items: [{ name: 'Barley roti with moong dal and bhindi sabzi', portion: '2 rotis + dal', calories: 550 }],
      },
      {
        mealType: 'evening_snack',
        time: '05:30 PM',
        items: [{ name: 'Boiled chana / sprout chaat', portion: '1 small bowl', calories: 160 }],
      },
      {
        mealType: 'dinner',
        time: '08:30 PM',
        items: [{ name: 'Clear vegetable soup + grilled tofu with sauteed greens', portion: '1 bowl + plate', calories: 420 }],
      },
    ],
  },
  {
    title: 'Cardiac & Hypertension Care (DASH Low Sodium)',
    condition: 'High Blood Pressure',
    goal: 'hypertension',
    dailyCalorieTarget: 1900,
    waterIntakeTargetLiters: 2.5,
    isTemplate: true,
    isActive: true,
    foodsToEat: ['Garlic & ginger', 'Potassium-rich foods (bananas, spinach)', 'Flaxseeds', 'Walnuts', 'Steamed vegetables'],
    foodsToAvoid: ['Pickles, papads, canned soups (high salt)', 'Processed cheese', 'Bakery items with baking soda', 'Red meat'],
    guidelines: [
      'Limit salt intake to less than 1 teaspoon (5g) per day.',
      'Do not add raw table salt to cooked food.',
      'Take prescribed blood pressure medications consistently.',
    ],
    meals: [
      {
        mealType: 'breakfast',
        time: '08:00 AM',
        items: [{ name: 'Vegetable upma with lemon juice', portion: '1 plate', calories: 320 }],
      },
      {
        mealType: 'lunch',
        time: '01:00 PM',
        items: [{ name: 'Whole wheat roti + palak dal + cucumber raita (low salt)', portion: '2 rotis', calories: 540 }],
      },
      {
        mealType: 'evening_snack',
        time: '05:00 PM',
        items: [{ name: 'Handful of unsalted walnuts and chamomile tea', portion: '30g', calories: 180 }],
      },
      {
        mealType: 'dinner',
        time: '08:00 PM',
        items: [{ name: 'Lauki (bottle gourd) sabzi with 2 phulkas', portion: '1 bowl + 2 rotis', calories: 400 }],
      },
    ],
  },
];

const seedAll = async () => {
  try {
    await connectDB();
    logger.info('Starting database seeding...');

    // 1. Seed Medicines
    await seedMedicines();

    // 2. Seed Diagnostic Services
    for (const service of DIAGNOSTIC_SERVICES) {
      await DiagnosticService.findOneAndUpdate(
        { name: service.name },
        { $set: service },
        { upsert: true, new: true }
      );
    }
    logger.info(`Seeded ${DIAGNOSTIC_SERVICES.length} diagnostic services`);

    // 3. Seed Standard Diet Plans
    for (const plan of STANDARD_DIET_PLANS) {
      await DietPlan.findOneAndUpdate(
        { title: plan.title },
        { $set: plan },
        { upsert: true, new: true }
      );
    }
    logger.info(`Seeded ${STANDARD_DIET_PLANS.length} standard diet plans`);

    // 4. Seed Default Hospital User & Profile
    let hospitalUser = await User.findOne({ email: 'hospital@medicare.com' });
    if (!hospitalUser) {
      hospitalUser = await User.create({
        name: 'MediCare+ Apex Hospital',
        email: 'hospital@medicare.com',
        password: 'Password123!',
        role: 'hospital',
        phone: '+91 9876543210',
      });
    }

    let hospital = await Hospital.findOne({ user: hospitalUser._id });
    if (!hospital) {
      hospital = await Hospital.create({
        user: hospitalUser._id,
        hospitalName: 'MediCare+ Apex Multispecialty Hospital',
        registrationNumber: 'HOSP-2024-ND-0881',
        type: 'private',
        address: {
          street: '42 Health Boulevard, Sector 18',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
          country: 'India',
        },
        phone: '+91 11 2345 6789',
        email: 'contact@apexmedicare.com',
        website: 'https://medicareplus.com',
        departments: [
          'General Medicine',
          'Cardiology',
          'Dermatology',
          'Pediatrics',
          'Orthopedics',
          'Gynecology & Obstetrics',
          'Pathology & Diagnostics',
          '24/7 Pharmacy',
        ],
        facilities: ['24/7 Emergency', 'ICU', 'Modular OT', 'Automated Pathology Lab', 'In-house Pharmacy'],
        operatingHours: { open: '00:00', close: '23:59' },
        taxRate: 18,
      });
    }
    logger.info('Hospital profile verified');

    // 5. Seed Doctors for different specializations matching the 60 conditions
    const DOCTOR_DATA = [
      {
        name: 'Dr. Priya Sharma',
        email: 'doctor.priya@medicare.com',
        phone: '+91 9811122233',
        specialization: 'General Physician',
        experience: 12,
        consultationFee: 500,
        consultationCategories: [
          'Fever', 'Cold', 'Cough', 'Headache', 'Sore Throat', 'Body Pain',
          'Fatigue / Weakness', 'Dizziness', 'Vomiting', 'Nausea', 'Diarrhea',
          'Constipation', 'Stomach Pain', 'Acidity', 'Allergy', 'Viral Fever',
          'Dengue', 'Malaria', 'Typhoid', 'General Health Check-up'
        ],
        bio: 'Senior General Physician with 12+ years of clinical experience in preventive medicine, infectious diseases, and comprehensive family care.',
        languages: ['English', 'Hindi', 'Punjabi'],
      },
      {
        name: 'Dr. Rajesh Nair',
        email: 'doctor.rajesh@medicare.com',
        phone: '+91 9822233344',
        specialization: 'Cardiologist',
        experience: 16,
        consultationFee: 900,
        consultationCategories: [
          'Heart-Related Problems', 'High Blood Pressure', 'Low Blood Pressure', 'Chest Pain', 'Dizziness'
        ],
        bio: 'Fellow of the American College of Cardiology specializing in non-invasive cardiology, preventive lipidology, and hypertension management.',
        languages: ['English', 'Hindi', 'Malayalam'],
      },
      {
        name: 'Dr. Ananya Sen',
        email: 'doctor.ananya@medicare.com',
        phone: '+91 9833344455',
        specialization: 'Dermatologist',
        experience: 9,
        consultationFee: 650,
        consultationCategories: [
          'Skin Allergy', 'Acne', 'Hair Fall', 'Eczema', 'Fungal Infection'
        ],
        bio: 'Board-certified dermatologist expert in chronic dermatoses, allergic eczema, clinical trichology, and skin health.',
        languages: ['English', 'Hindi', 'Bengali'],
      },
      {
        name: 'Dr. Vikram Malhotra',
        email: 'doctor.vikram@medicare.com',
        phone: '+91 9844455566',
        specialization: 'Orthopedist',
        experience: 14,
        consultationFee: 750,
        consultationCategories: [
          'Back Pain', 'Joint Pain', 'Arthritis', 'Muscle Strain', 'Sprain'
        ],
        bio: 'Orthopedic specialist in joint preservation, spine health, sports rehabilitation, and arthritis therapies.',
        languages: ['English', 'Hindi'],
      },
      {
        name: 'Dr. Meera Iyer',
        email: 'doctor@medicare.com', // Primary test doctor
        phone: '+91 9855566677',
        specialization: 'Endocrinologist',
        experience: 11,
        consultationFee: 700,
        consultationCategories: [
          'Diabetes', 'Thyroid Disorders', 'Nutritional Deficiency', 'Weight-Related Consultation', 'Fatigue / Weakness'
        ],
        bio: 'Senior specialist focusing on diabetes care, thyroid imbalances, metabolic disorders, and evidence-based nutrition.',
        languages: ['English', 'Hindi', 'Tamil'],
      },
    ];

    const seededDoctorUsers = [];
    for (const d of DOCTOR_DATA) {
      let docUser = await User.findOne({ email: d.email });
      if (!docUser) {
        docUser = await User.create({
          name: d.name,
          email: d.email,
          password: 'Password123!',
          role: 'doctor',
          phone: d.phone,
        });
      }
      seededDoctorUsers.push(docUser);

      // Default availability: Mon-Fri 09:00 - 17:00
      const availability = [1, 2, 3, 4, 5].map((day) => ({
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        slotDurationMinutes: 30,
        isAvailable: true,
      }));

      await DoctorProfile.findOneAndUpdate(
        { user: docUser._id },
        {
          $set: {
            user: docUser._id,
            hospital: hospital._id,
            specialization: d.specialization,
            experience: d.experience,
            consultationFee: d.consultationFee,
            consultationCategories: d.consultationCategories,
            bio: d.bio,
            languages: d.languages,
            availability,
            rating: 4.8,
            totalReviews: 24,
            isVerified: true,
            isAcceptingAppointments: true,
          },
        },
        { upsert: true, new: true }
      );
    }
    logger.info(`Seeded ${DOCTOR_DATA.length} doctors across key specializations`);

    // 6. Seed Default Patient User & Profile
    let patientUser = await User.findOne({ email: 'patient@medicare.com' });
    if (!patientUser) {
      patientUser = await User.create({
        name: 'Rahul Sharma',
        email: 'patient@medicare.com',
        password: 'Password123!',
        role: 'patient',
        phone: '+91 9988776655',
      });
    }

    await PatientProfile.findOneAndUpdate(
      { user: patientUser._id },
      {
        $set: {
          user: patientUser._id,
          dateOfBirth: new Date('1994-06-15'),
          gender: 'male',
          bloodGroup: 'B+',
          allergies: ['Penicillin', 'Dust mites'],
          chronicConditions: ['Mild Asthma'],
          height: 176,
          weight: 72,
          address: {
            street: '14 Lotus Enclave',
            city: 'New Delhi',
            state: 'Delhi',
            pincode: '110025',
          },
          emergencyContact: {
            name: 'Pooja Sharma',
            phone: '+91 9988776656',
            relation: 'Spouse',
          },
        },
      },
      { upsert: true, new: true }
    );
    logger.info('Patient profile verified');

    // 7. Seed Sample Appointment
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 30, 0, 0);

    const existingAppointment = await Appointment.findOne({ patient: patientUser._id });
    if (!existingAppointment && seededDoctorUsers.length > 0) {
      await Appointment.create({
        patient: patientUser._id,
        doctor: seededDoctorUsers[4]._id, // Dr. Meera Iyer
        condition: 'Diabetes',
        appointmentDate: tomorrow,
        appointmentTime: '10:30',
        fee: 700,
        status: 'confirmed',
        symptoms: 'Routine checkup for blood sugar levels',
      });
      logger.info('Sample confirmed appointment seeded');
    }

    logger.info('Database seeding completed successfully!');
    if (require.main === module) {
      process.exit(0);
    }
  } catch (error) {
    logger.error('Seeding error:', error);
    if (require.main === module) {
      process.exit(1);
    }
    throw error;
  }
};

if (require.main === module) {
  seedAll();
}

module.exports = seedAll;
