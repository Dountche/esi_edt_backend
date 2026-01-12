const express = require('express');
const router = express.Router();
const specialiteController = require('../controllers/specialiteController');
const authMiddleware = require('../middlewares/authMiddleware');
const { rupMiddleware } = require('../middlewares/roleMiddleware');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Routes publiques (tous les utilisateurs authentifiés)
router.get('/', specialiteController.getAllSpecialites);
router.get('/:id', specialiteController.getSpecialiteById);

// Routes protégées (RUP uniquement)
router.post('/', rupMiddleware, specialiteController.createSpecialite);
router.put('/:id', rupMiddleware, specialiteController.updateSpecialite);
router.delete('/:id', rupMiddleware, specialiteController.deleteSpecialite);

module.exports = router;