const express = require('express');
const router = express.Router();
const domaineController = require('../controllers/domaineController');
const authMiddleware = require('../middlewares/authMiddleware');
const { rupMiddleware } = require('../middlewares/roleMiddleware');

router.use(authMiddleware);

router.get('/', domaineController.getAllDomaines);
router.post('/', rupMiddleware, domaineController.createDomaine);
router.put('/:id', rupMiddleware, domaineController.updateDomaine);
router.delete('/:id', rupMiddleware, domaineController.deleteDomaine);

module.exports = router;
