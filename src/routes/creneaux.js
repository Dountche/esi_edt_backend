const express = require('express');
const router = express.Router();
const creneauController = require('../controllers/creneauController');
const authMiddleware = require('../middlewares/authMiddleware');
const { rupMiddleware } = require('../middlewares/roleMiddleware');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Routes accessibles à tous les utilisateurs authentifiés (pour consultation)
router.get('/', authMiddleware, creneauController.getAllCreneaux);

// Routes protégées (RUP uniquement)
router.post('/', rupMiddleware, creneauController.createCreneau);
router.get('/verifier-disponibilite', rupMiddleware, creneauController.verifierDisponibiliteCreneau);
router.put('/:id', rupMiddleware, creneauController.updateCreneau);
router.delete('/:id', rupMiddleware, creneauController.deleteCreneau);

module.exports = router;