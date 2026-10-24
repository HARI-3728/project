const express = require('express');
const { getMedicines, getMedicineById } = require('../controllers/pharmacy.controller');

const router = express.Router();

router.get('/', getMedicines);
router.get('/:id', getMedicineById);

module.exports = router;
