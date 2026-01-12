const express = require('express');
const router = express.Router();
const etudiantConsultationController = require('../controllers/etudiantConsultationController');
const authMiddleware = require('../middlewares/authMiddleware');
const { etudiantMiddleware } = require('../middlewares/roleMiddleware');

router.use(authMiddleware);
router.use(etudiantMiddleware);

router.get('/mon-emploi-temps', etudiantConsultationController.getMonEmploiTemps);
router.get('/ma-maquette', etudiantConsultationController.getMaMaquette);

module.exports = router;