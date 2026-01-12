const express = require('express');
const router = express.Router();
const ueController = require('../controllers/ueController');
const authMiddleware = require('../middlewares/authMiddleware');
const { rupMiddleware, rupOuProfesseurMiddleware } = require('../middlewares/roleMiddleware');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Routes accessibles à RUP et Professeurs (consultation)
router.get('/', rupOuProfesseurMiddleware, ueController.getAllUEs);
router.get('/:id', rupOuProfesseurMiddleware, ueController.getUEById);

// Routes protégées (RUP uniquement)
router.post('/', rupMiddleware, ueController.createUE);
router.put('/:id', rupMiddleware, ueController.updateUE);
router.delete('/:id', rupMiddleware, ueController.deleteUE);

module.exports = router;