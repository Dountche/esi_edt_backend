const express = require('express');
const router = express.Router();
const etudiantController = require('../controllers/etudiantController');
const authMiddleware = require('../middlewares/authMiddleware');
const { rupMiddleware } = require('../middlewares/roleMiddleware');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Toutes les routes n
router.post('/', rupMiddleware, etudiantController.createEtudiant);
router.get('/', rupMiddleware, etudiantController.getAllEtudiants);
router.get('/:id', etudiantController.getEtudiantById);
router.put('/:id', rupMiddleware, etudiantController.updateEtudiant);
router.delete('/:id', rupMiddleware, etudiantController.deleteEtudiant);

module.exports = router;