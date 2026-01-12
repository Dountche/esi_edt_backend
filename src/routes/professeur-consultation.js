const express = require('express');
const router = express.Router();
const professeurConsultationController = require('../controllers/professeurConsultationController');
const authMiddleware = require('../middlewares/authMiddleware');
const { professeurMiddleware, rupMiddleware } = require('../middlewares/roleMiddleware');

router.use(authMiddleware);

// Route pour le professeur connecté
router.get('/mon-emploi-temps', professeurMiddleware, professeurConsultationController.getMonEmploiTemps);

// Route pour voir l'EDT d'un professeur (rup^p)
router.get('/:id/emploi-temps', rupMiddleware, professeurConsultationController.getEmploiTempsProfesseur);

module.exports = router;