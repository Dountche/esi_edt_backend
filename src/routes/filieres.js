const express = require('express');
const router = express.Router();
const filiereController = require('../controllers/filiereController');
const authMiddleware = require('../middlewares/authMiddleware');
const { rupMiddleware } = require('../middlewares/roleMiddleware');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Routes publiques (tous les utilisateurs authentifiés)
router.get('/', filiereController.getAllFilieres);
router.get('/:id', filiereController.getFiliereById);

// Routes protégées (RUP uniquement)
router.post('/', rupMiddleware, filiereController.createFiliere);
router.put('/:id', rupMiddleware, filiereController.updateFiliere);
router.delete('/:id', rupMiddleware, filiereController.deleteFiliere);

module.exports = router;