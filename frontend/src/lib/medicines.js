const priceFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR'
});

export const mapMedicine = (medicine) => {
  const stockCount = medicine.stockQuantity ?? 0;

  return {
    ...medicine,
    id: medicine._id,
    category: medicine.category || '',
    price: medicine.unitPrice,
    formattedPrice: priceFormatter.format(medicine.unitPrice),
    brand: medicine.manufacturer || '',
    stockStatus: stockCount === 0 ? 'Out of Stock' : stockCount < 20 ? 'Low Stock' : 'In Stock',
    stockCount,
    prescriptionRequired: Boolean(medicine.requiresPrescription),
    generalDescription: medicine.description || '',
    form: medicine.unit || '',
    alternatives: []
  };
};
