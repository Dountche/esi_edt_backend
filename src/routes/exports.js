const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const authMiddleware = require('../middlewares/authMiddleware');

// router.use(authMiddleware);

// Exports emploi du temps (Classe / Semaine)
router.get('/emploi-temps/:id/excel', exportController.exporterEmploiTempsExcel);
router.get('/emploi-temps/:id/pdf', exportController.exporterEmploiTempsPDF);

// Exports maquette
router.get('/maquette/:classe_id/excel', exportController.exporterMaquetteExcel);
router.get('/maquette/:classe_id/pdf', exportController.exporterMaquettePDF);

// Exports Professeurs
router.get('/professeur/:id/excel', exportController.exporterProfesseurExcel);
router.get('/professeur/:id/pdf', exportController.exporterProfesseurPDF);

// Exports Batch Professeurs (Pour RUP)
router.get('/professeurs/all/excel', exportController.exporterProfesseursBatchExcel);
router.get('/professeurs/all/pdf', exportController.exporterProfesseursBatchPDF);

module.exports = router;