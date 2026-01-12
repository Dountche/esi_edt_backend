const express = require('express');
const router = express.Router();
const cycleController = require('../controllers/cycleController');
const authMiddleware = require('../middlewares/authMiddleware');
const { rupMiddleware } = require('../middlewares/roleMiddleware');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Routes publiques (tous les utilisateurs authentifiés)
router.get('/', cycleController.getAllCycles);
router.get('/:id', cycleController.getCycleById);

// Routes protégées (RUP uniquement)
router.post('/', rupMiddleware, cycleController.createCycle);
router.put('/:id', rupMiddleware, cycleController.updateCycle);
router.delete('/:id', rupMiddleware, cycleController.deleteCycle);

module.exports = router;