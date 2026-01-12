const express = require('express');
const router = express.Router();
const professeurController = require('../controllers/professeurController');
const authMiddleware = require('../middlewares/authMiddleware');
const { rupMiddleware } = require('../middlewares/roleMiddleware');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Toutes les routes nécessitent le rôle RUP
router.use(rupMiddleware);

router.post('/', professeurController.createProfesseur);
router.get('/', professeurController.getAllProfesseurs);
router.get('/:id', professeurController.getProfesseurById);
router.put('/:id', professeurController.updateProfesseur);
router.delete('/:id', professeurController.deleteProfesseur);

module.exports = router;