const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const authMiddleware = require('../middlewares/authMiddleware');

// router.use(authMiddleware);

// Exports emploi du temps
router.get('/emploi-temps/:id/excel', exportController.exporterEmploiTempsExcel);
router.get('/emploi-temps/:id/pdf', exportController.exporterEmploiTempsPDF);

// Exports maquette
router.get('/maquette/:classe_id/excel', exportController.exporterMaquetteExcel);
router.get('/maquette/:classe_id/pdf', exportController.exporterMaquettePDF);

module.exports = router;