const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/authMiddleware');

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// Routes accessibles à tous les utilisateurs authentifiés
router.get('/', notificationController.getMesNotifications);
router.put('/marquer-toutes-lues', notificationController.marquerToutesLues);
router.put('/:id/marquer-lu', notificationController.marquerCommeLu);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;