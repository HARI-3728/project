export const mockUserProfile = {
  id: "usr_101",
  name: "Alex Morgan",
  email: "alex.morgan@example.com",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  bloodGroup: "O+",
  age: 28,
  gender: "Female",
  height: "168 cm",
  weight: "62 kg",
  emergencyContact: "+1 (555) 234-5678",
  medicalID: "MC-8942-021"
};

import { sampleMedicines } from './medicinesData';

export const mockMedicines = sampleMedicines;

export const mockPrescriptions = [
  {
    id: "rx_101",
    code: "RX-2026-9921",
    doctorName: "Dr. Sarah Jenkins",
    specialty: "General Physician",
    clinicName: "MetroCare Wellness Clinic",
    date: "Sep 02, 2026",
    status: "Active",
    medicines: [
      { name: "Amoxicillin Trihydrate 500mg", duration: "7 Days", instructions: "1 cap - 2x daily" },
      { name: "Paracetamol 650mg", duration: "5 Days", instructions: "1 tab - 3x daily as needed" }
    ],
    diagnosis: "Acute Upper Respiratory Infection",
    notes: "Rest well, drink plenty of warm fluids, follow up in 1 week if fever persists."
  },
  {
    id: "rx_102",
    code: "RX-2026-8714",
    doctorName: "Dr. Robert Chen",
    specialty: "Endocrinologist",
    clinicName: "City Heart & Diabetes Center",
    date: "Aug 15, 2026",
    status: "Active",
    medicines: [
      { name: "Metformin 850mg", duration: "90 Days", instructions: "1 tab - once daily with dinner" },
      { name: "Lisinopril 10mg", duration: "90 Days", instructions: "1 tab - once daily morning" }
    ],
    diagnosis: "Routine Metabolic Review",
    notes: "Continue low GI diet and 30 min daily brisk walking. Check HbA1c in 3 months."
  },
  {
    id: "rx_103",
    code: "RX-2026-4402",
    doctorName: "Dr. Emily Taylor",
    specialty: "Orthopedic Specialist",
    clinicName: "Apex Sports & Joint Rehab",
    date: "Jul 10, 2026",
    status: "Completed",
    medicines: [
      { name: "Ibuprofen 400mg", duration: "10 Days", instructions: "1 tab - twice daily post meals" },
      { name: "Collagen & Calcium Peptide", duration: "30 Days", instructions: "1 sachet daily" }
    ],
    diagnosis: "Mild Ankle Ligament Sprain",
    notes: "Apply ice compress 3 times daily. Completed physical therapy session."
  }
];

export const mockHealthVitals = {
  bloodPressure: { value: "120/78", unit: "mmHg", status: "Optimal", trend: "stable", lastUpdated: "Today, 8:30 AM" },
  heartRate: { value: "72", unit: "bpm", status: "Normal", trend: "down", lastUpdated: "Today, 8:30 AM" },
  bloodSugar: { value: "98", unit: "mg/dL", status: "Fasting Normal", trend: "stable", lastUpdated: "Yesterday, 7:45 AM" },
  oxygenLevel: { value: "99", unit: "%", status: "Excellent", trend: "up", lastUpdated: "Today, 8:30 AM" },
  weight: { value: "62", unit: "kg", status: "Target Range", trend: "stable", lastUpdated: "3 days ago" },
  bmi: { value: "22.0", unit: "kg/m²", status: "Normal Weight", trend: "stable", lastUpdated: "3 days ago" }
};

export const mockHealthRecords = [
  {
    id: "rec_1",
    title: "Comprehensive Blood Panel & Lipid Profile",
    date: "Aug 28, 2026",
    facility: "Quest Diagnostics Lab",
    category: "Lab Report",
    doctor: "Dr. Robert Chen",
    fileSize: "2.4 MB",
    status: "Normal",
    summary: "Fasting glucose 98 mg/dL, Total cholesterol 175 mg/dL, HDL 55 mg/dL, LDL 102 mg/dL."
  },
  {
    id: "rec_2",
    title: "Chest X-Ray & Spirometry Report",
    date: "Jul 14, 2026",
    facility: "St. Jude Radiology Center",
    category: "Imaging",
    doctor: "Dr. Sarah Jenkins",
    fileSize: "14.1 MB",
    status: "Clear",
    summary: "Clear lung fields, normal heart size, no acute cardiopulmonary abnormality."
  },
  {
    id: "rec_3",
    title: "Annual Cardiovascular Health Assessment",
    date: "May 05, 2026",
    facility: "City Heart Institute",
    category: "Cardiology",
    doctor: "Dr. Marcus Vance",
    fileSize: "5.8 MB",
    status: "Good",
    summary: "EKG normal sinus rhythm 70 bpm, normal exercise tolerance test."
  }
];

export const mockReminders = [
  {
    id: "rem_1",
    medName: "Amoxicillin 500mg",
    time: "08:00 AM",
    period: "Morning",
    dosage: "1 Capsule",
    taken: true,
    active: true,
    withFood: true
  },
  {
    id: "rem_2",
    medName: "Lisinopril 10mg",
    time: "08:30 AM",
    period: "Morning",
    dosage: "1 Tablet",
    taken: true,
    active: true,
    withFood: false
  },
  {
    id: "rem_3",
    medName: "Amoxicillin 500mg",
    time: "08:00 PM",
    period: "Evening",
    dosage: "1 Capsule",
    taken: false,
    active: true,
    withFood: true
  },
  {
    id: "rem_4",
    medName: "Metformin 850mg",
    time: "08:30 PM",
    period: "Evening",
    dosage: "1 Tablet",
    taken: false,
    active: true,
    withFood: true
  }
];

export const mockVaccinations = [
  {
    id: "vac_1",
    name: "COVID-19 Omicron Booster (KP.2)",
    date: "Jan 12, 2026",
    administeredBy: "CVS Health Pharmacy",
    status: "Completed",
    dose: "Dose 4 (Booster)",
    batchNo: "CV-2026-881",
    certificateAvailable: true
  },
  {
    id: "vac_2",
    name: "Annual Influenza (Flu) Shot 2026",
    date: "Sep 20, 2026",
    administeredBy: "MetroCare Health Hub",
    status: "Scheduled",
    dose: "Annual Dose",
    batchNo: "Pending",
    certificateAvailable: false
  },
  {
    id: "vac_3",
    name: "Hepatitis B Booster",
    date: "Oct 15, 2026",
    administeredBy: "City Immunization Clinic",
    status: "Due Soon",
    dose: "Booster Dose",
    batchNo: "Pending",
    certificateAvailable: false
  },
  {
    id: "vac_4",
    name: "Tdap (Tetanus, Diphtheria, Pertussis)",
    date: "Nov 04, 2022",
    administeredBy: "University Health Center",
    status: "Completed",
    dose: "10-Year Booster",
    batchNo: "TD-99120",
    certificateAvailable: true
  }
];

export const mockNearbyHealthcare = [
  {
    id: "loc_1",
    name: "MetroCare Emergency & Specialty Hospital",
    type: "Multi-specialty Hospital",
    address: "742 Evergreen Terrace, Downtown",
    distance: "1.2 km",
    rating: 4.8,
    reviews: 324,
    phone: "+1 (555) 911-0022",
    openNow: true,
    emergency24x7: true,
    services: ["Emergency Trauma", "Cardiology", "Pediatrics", "ICU"],
    image: "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=400&auto=format&fit=crop&q=80"
  },
  {
    id: "loc_2",
    name: "Green Valley Wellness Clinic & Pharmacy",
    type: "Primary Care Clinic",
    address: "128 Oak Ridge Lane, Suite 200",
    distance: "2.4 km",
    rating: 4.6,
    reviews: 189,
    phone: "+1 (555) 345-6789",
    openNow: true,
    emergency24x7: false,
    services: ["General Consultation", "Diagnostics", "Vaccinations", "Pharmacy"],
    image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&auto=format&fit=crop&q=80"
  },
  {
    id: "loc_3",
    name: "Apex Diagnostics & Imaging Center",
    type: "Diagnostic Lab",
    address: "505 Medical Plaza Drive",
    distance: "3.1 km",
    rating: 4.9,
    reviews: 412,
    phone: "+1 (555) 888-4321",
    openNow: true,
    emergency24x7: false,
    services: ["MRI / CT Scan", "Blood Tests", "Ultrasound", "X-Ray"],
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&auto=format&fit=crop&q=80"
  },
  {
    id: "loc_4",
    name: "24/7 HealthPlus Pharmacy & Care",
    type: "24/7 Pharmacy",
    address: "89 Central Avenue",
    distance: "0.8 km",
    rating: 4.7,
    reviews: 230,
    phone: "+1 (555) 555-0199",
    openNow: true,
    emergency24x7: true,
    services: ["Prescription Refills", "OTC Meds", "Home Delivery", "First Aid"],
    image: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=400&auto=format&fit=crop&q=80"
  }
];

export const mockAIChatHistory = [
  {
    id: "msg_1",
    sender: "bot",
    text: "Hello Alex! I am **MediCare AI**, your 24/7 personal healthcare assistant. How can I assist you with your health, symptoms, or medications today?",
    time: "10:00 AM",
    suggestedChips: [
      "Check antibiotic interactions",
      "Remind me about evening pills",
      "Symptom Checker: Headache & Fatigue",
      "Nearby emergency clinics"
    ]
  }
];
