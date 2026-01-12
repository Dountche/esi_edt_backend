const express = require('express');
const router = express.Router();
const semestreController = require('../controllers/semestreController');
const authMiddleware = require('../middlewares/authMiddleware');
const { rupMiddleware } = require('../middlewares/roleMiddleware');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Routes accessibles à tous les utilisateurs authentifiés
router.get('/', semestreController.getAllSemestres);
router.get('/actif', semestreController.getSemestreActif);
router.get('/:id', semestreController.getSemestreById);

// Routes protégées (RUP uniquement)
router.post('/', rupMiddleware, semestreController.createSemestre);
router.put('/:id', rupMiddleware, semestreController.updateSemestre);
router.put('/:id/activer', rupMiddleware, semestreController.activerSemestre);
router.delete('/:id', rupMiddleware, semestreController.deleteSemestre);

module.exports = router;