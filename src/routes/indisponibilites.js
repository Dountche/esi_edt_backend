const express = require('express');
const router = express.Router();
const indisponibiliteController = require('../controllers/indisponibiliteController');
const authMiddleware = require('../middlewares/authMiddleware');
const { professeurMiddleware, rupMiddleware, rupOuProfesseurMiddleware } = require('../middlewares/roleMiddleware');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Routes accessibles à RUP et Professeurs (consultation)
router.get('/', rupOuProfesseurMiddleware, indisponibiliteController.getAllIndisponibilites);
router.get('/:id', rupOuProfesseurMiddleware, indisponibiliteController.getIndisponibiliteById);

// Routes protégées (Professeur - création)
router.post('/', professeurMiddleware, indisponibiliteController.createIndisponibilite);
router.delete('/:id', rupOuProfesseurMiddleware, indisponibiliteController.deleteIndisponibilite);

// Routes protégées (RUP - approbation)
router.put('/:id', rupMiddleware, indisponibiliteController.updateIndisponibilite);

module.exports = router;