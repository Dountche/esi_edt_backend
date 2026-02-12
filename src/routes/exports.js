const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const authMiddleware = require('../middlewares/authMiddleware');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Exports emploi du temps (Classe / Semaine)
router.get('/emploi-temps/:id/:type', (req, res, next) => {
    const { type } = req.params;
    if (type === 'excel') return exportController.exporterEmploiTempsExcel(req, res, next);
    if (type === 'pdf') return exportController.exporterEmploiTempsPDF(req, res, next);
    res.status(400).json({ success: false, message: 'Type invalide. Utilisez "excel" ou "pdf".' });
});

// Exports maquette
router.get('/maquette/:classe_id/:type', (req, res, next) => {
    const { type } = req.params;
    if (type === 'excel') return exportController.exporterMaquetteExcel(req, res, next);
    if (type === 'pdf') return exportController.exporterMaquettePDF(req, res, next);
    res.status(400).json({ success: false, message: 'Type invalide. Utilisez "excel" ou "pdf".' });
});

// Exports Professeurs
router.get('/professeur/:id/:type', (req, res, next) => {
    const { type } = req.params;
    if (type === 'excel') return exportController.exporterProfesseurExcel(req, res, next);
    if (type === 'pdf') return exportController.exporterProfesseurPDF(req, res, next);
    res.status(400).json({ success: false, message: 'Type invalide. Utilisez "excel" ou "pdf".' });
});

// Exports Batch Professeurs (Pour RUP)
router.get('/professeurs/all/:type', (req, res, next) => {
    const { type } = req.params;
    if (type === 'excel') return exportController.exporterProfesseursBatchExcel(req, res, next);
    if (type === 'pdf') return exportController.exporterProfesseursBatchPDF(req, res, next);
    res.status(400).json({ success: false, message: 'Type invalide. Utilisez "excel" ou "pdf".' });
});

module.exports = router;