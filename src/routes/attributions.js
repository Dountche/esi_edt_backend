const express = require('express');
const router = express.Router();
const attributionController = require('../controllers/attributionController');
const authMiddleware = require('../middlewares/authMiddleware');
const { rupMiddleware, rupOuProfesseurMiddleware } = require('../middlewares/roleMiddleware');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Routes accessibles à RUP et Professeurs (consultation)
router.get('/', rupOuProfesseurMiddleware, attributionController.getAllAttributions);
router.get('/:id', rupOuProfesseurMiddleware, attributionController.getAttributionById);

// Routes protégées (RUP uniquement)
router.post('/', rupMiddleware, attributionController.createAttribution);
router.put('/:id', rupMiddleware, attributionController.updateAttribution);
router.delete('/:id', rupMiddleware, attributionController.deleteAttribution);

module.exports = router;