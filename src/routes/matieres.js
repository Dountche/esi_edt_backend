const express = require('express');
const router = express.Router();
const matiereController = require('../controllers/matiereController');
const authMiddleware = require('../middlewares/authMiddleware');
const { rupMiddleware, rupOuProfesseurMiddleware } = require('../middlewares/roleMiddleware');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Routes accessibles à RUP et Professeurs (consultation)
router.get('/', rupOuProfesseurMiddleware, matiereController.getAllMatieres);
router.get('/:id', rupOuProfesseurMiddleware, matiereController.getMatiereById);

// Routes protégées (RUP uniquement)
router.post('/', rupMiddleware, matiereController.createMatiere);
router.put('/:id', rupMiddleware, matiereController.updateMatiere);
router.delete('/:id', rupMiddleware, matiereController.deleteMatiere);

module.exports = router;