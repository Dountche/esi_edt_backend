const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');
const { rupMiddleware, rupOuProfesseurMiddleware, etudiantMiddleware } = require('../middlewares/roleMiddleware');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Routes spécifiques par rôle
router.get('/rup', rupMiddleware, dashboardController.getDashboardRUP);
router.get('/professeur', rupOuProfesseurMiddleware, dashboardController.getDashboardProfesseur);
router.get('/etudiant', etudiantMiddleware, dashboardController.getDashboardEtudiant);

module.exports = router;