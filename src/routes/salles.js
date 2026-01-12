const express = require('express');
const router = express.Router();
const salleController = require('../controllers/salleController');
const authMiddleware = require('../middlewares/authMiddleware');
const { rupMiddleware } = require('../middlewares/roleMiddleware');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Routes accessibles à tous les utilisateurs authentifiés
router.get('/', salleController.getAllSalles);
router.get('/:id', salleController.getSalleById);

// Routes protégées (RUP uniquement)
router.post('/', rupMiddleware, salleController.createSalle);
router.put('/:id', rupMiddleware, salleController.updateSalle);
router.delete('/:id', rupMiddleware, salleController.deleteSalle);

module.exports = router;