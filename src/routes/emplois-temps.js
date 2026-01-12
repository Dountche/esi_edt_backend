const express = require('express');
const router = express.Router();
const emploiTempsController = require('../controllers/emploiTempsController');
const authMiddleware = require('../middlewares/authMiddleware');
const { rupMiddleware } = require('../middlewares/roleMiddleware');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Routes accessibles à tous 
router.get('/', emploiTempsController.getAllEmploisTemps);
router.get('/:id', emploiTempsController.getEmploiTempsById);
router.get('/classe/:classe_id', emploiTempsController.getEmploiTempsByClasse);

// Routes protégées
router.post('/', rupMiddleware, emploiTempsController.createEmploiTemps);
router.put('/:id', rupMiddleware, emploiTempsController.updateEmploiTemps);
router.delete('/:id', rupMiddleware, emploiTempsController.deleteEmploiTemps);
router.post('/:id/dupliquer', rupMiddleware, emploiTempsController.dupliquerEmploiTemps);

module.exports = router;