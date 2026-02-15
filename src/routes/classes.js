const express = require('express');
const router = express.Router();
const classeController = require('../controllers/classeController');
const authMiddleware = require('../middlewares/authMiddleware');
const { rupMiddleware } = require('../middlewares/roleMiddleware');

// exception pour cette route
router.get('/public', classeController.getAllClassesPublic);

// Toutes autres les routes nécessitent l'authentification
router.use(authMiddleware);

// Routes accessibles à tous les utilisateurs authentifiés
router.get('/', classeController.getAllClasses);
router.get('/:id', classeController.getClasseById);

// Routes protégées (RUP uniquement)
router.post('/', rupMiddleware, classeController.createClasse);
router.put('/:id', rupMiddleware, classeController.updateClasse);
router.delete('/:id', rupMiddleware, classeController.deleteClasse);

module.exports = router;
