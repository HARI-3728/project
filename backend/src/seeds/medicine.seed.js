const Medicine = require('../models/Medicine');
const logger = require('../utils/logger');

const APPROVED_CATALOGUE = [
  {
    name: 'Paracetamol',
    description: 'Effective analgesic and antipyretic for relief of fever, mild-to-moderate pain, and headaches.',
    category: 'Analgesics / Antipyretics',
    unitPrice: 25.0,
    unit: 'strip',
    stockQuantity: 150,
    requiresPrescription: false,
    composition: 'Paracetamol IP 500mg',
    manufacturer: 'MediCare Pharma Labs',
    sideEffects: 'Rare when taken as directed; allergic skin rash may occur in sensitive individuals.',
    storageInstructions: 'Store below 30°C in a dry place protected from direct light.',
  },
  {
    name: 'Cetirizine',
    description: 'Second-generation antihistamine that provides 24-hour relief from allergies, runny nose, and hives.',
    category: 'Antihistamines',
    unitPrice: 35.0,
    unit: 'strip',
    stockQuantity: 120,
    requiresPrescription: false,
    composition: 'Cetirizine Hydrochloride IP 10mg',
    manufacturer: 'AeroCure Therapeutics',
    sideEffects: 'Mild drowsiness, dry mouth, headache.',
    storageInstructions: 'Store in a cool and dry place away from children.',
  },
  {
    name: 'ORS',
    description: 'Oral Rehydration Salts formulated according to WHO recommendations to treat dehydration.',
    category: 'Electrolytes & Rehydration',
    unitPrice: 22.0,
    unit: 'sachet',
    stockQuantity: 200,
    requiresPrescription: false,
    composition: 'Sodium Chloride 2.6g, Potassium Chloride 1.5g, Sodium Citrate 2.9g, Dextrose 13.5g per sachet',
    manufacturer: 'HydraLife Care',
    sideEffects: 'None known when reconstituted properly in 1 liter clean drinking water.',
    storageInstructions: 'Store in moisture-proof packaging at room temperature.',
  },
  {
    name: 'Antacid',
    description: 'Fast-acting chewable antacid for heartburn, acid indigestion, and sour stomach relief.',
    category: 'Gastrointestinal',
    unitPrice: 40.0,
    unit: 'strip',
    stockQuantity: 90,
    requiresPrescription: false,
    composition: 'Dried Aluminium Hydroxide Gel 250mg, Magnesium Hydroxide 250mg',
    manufacturer: 'GastroWell Healthcare',
    sideEffects: 'Occasional mild bowel irregularities.',
    storageInstructions: 'Store tightly closed in a dry place.',
  },
  {
    name: 'Calcium supplements',
    description: 'Dietary supplement to support bone density, skeletal health, and dental integrity.',
    category: 'Vitamins & Minerals',
    unitPrice: 110.0,
    unit: 'bottle',
    stockQuantity: 75,
    requiresPrescription: false,
    composition: 'Calcium Carbonate 500mg elemental calcium + Vitamin D3 250 IU',
    manufacturer: 'BoneFort Nutrition',
    sideEffects: 'Mild bloating or constipation if consumed without sufficient water.',
    storageInstructions: 'Store in a cool, dark location away from direct sunlight.',
  },
  {
    name: 'Iron supplements',
    description: 'Hemoglobin booster designed to prevent and manage iron-deficiency anemia.',
    category: 'Vitamins & Minerals',
    unitPrice: 95.0,
    unit: 'strip',
    stockQuantity: 80,
    requiresPrescription: false,
    composition: 'Ferrous Ascorbate 100mg + Folic Acid 1.5mg',
    manufacturer: 'HemaCare Life Sciences',
    sideEffects: 'Temporary dark stools, mild nausea on an empty stomach.',
    storageInstructions: 'Store below 25°C in original package.',
  },
  {
    name: 'Vitamin D supplements',
    description: 'High-potency cholecalciferol formulation supporting bone metabolism and immune function.',
    category: 'Vitamins & Minerals',
    unitPrice: 140.0,
    unit: 'strip',
    stockQuantity: 65,
    requiresPrescription: false,
    composition: 'Cholecalciferol (Vitamin D3) 60,000 IU softgel capsules',
    manufacturer: 'Solaris Health',
    sideEffects: 'Hypercalcemia only if consumed significantly beyond recommended schedule.',
    storageInstructions: 'Store below 25°C in a dry place protected from heat.',
  },
  {
    name: 'Saline nasal drops',
    description: 'Gentle, sterile isotonic nasal moisturizer to clear blocked nasal passages and soothe irritation.',
    category: 'Respiratory Care',
    unitPrice: 45.0,
    unit: 'bottle',
    stockQuantity: 110,
    requiresPrescription: false,
    composition: 'Sodium Chloride IP 0.65% w/v isotonic solution',
    manufacturer: 'BreathePure Care',
    sideEffects: 'Transient mild stinging in sensitive nasal tissues.',
    storageInstructions: 'Keep bottle upright. Discard 1 month after opening.',
  },
  {
    name: 'Ibuprofen',
    description: 'Non-steroidal anti-inflammatory drug (NSAID) for inflammation, muscular strain, arthritis, and swelling.',
    category: 'NSAIDs / Anti-inflammatory',
    unitPrice: 38.0,
    unit: 'strip',
    stockQuantity: 95,
    requiresPrescription: false,
    composition: 'Ibuprofen IP 400mg',
    manufacturer: 'ReliefCorp Pharma',
    sideEffects: 'Mild stomach discomfort; take with or after meals.',
    storageInstructions: 'Store below 25°C protected from moisture.',
  },
  {
    name: 'Amoxicillin',
    description: 'Broad-spectrum penicillin-class antibiotic for bacterial infections. Requires doctor prescription.',
    category: 'Antibiotics',
    unitPrice: 85.0,
    unit: 'strip',
    stockQuantity: 50,
    requiresPrescription: true,
    composition: 'Amoxicillin Trihydrate IP equivalent to Amoxicillin 500mg',
    manufacturer: 'Apex Antibacterials',
    sideEffects: 'Diarrhea, nausea, allergic hypersensitivity reactions.',
    storageInstructions: 'Store in airtight containers below 25°C.',
  },
];

const seedMedicines = async () => {
  try {
    for (const item of APPROVED_CATALOGUE) {
      await Medicine.findOneAndUpdate(
        { name: item.name },
        { $setOnInsert: item },
        { upsert: true, new: true }
      );
    }
    logger.info(`Verified ${APPROVED_CATALOGUE.length} approved medicines in catalogue`);
  } catch (error) {
    logger.error('Error seeding medicines:', error.message);
  }
};

module.exports = { seedMedicines, APPROVED_CATALOGUE };
