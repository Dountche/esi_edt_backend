const express = require('express');
const router = express.Router();
const dfrController = require('../controllers/dfrController');
const authMiddleware = require('../middlewares/authMiddleware');
const { rupMiddleware } = require('../middlewares/roleMiddleware');

router.use(authMiddleware);

router.get('/', dfrController.getAllDFRs);
router.post('/', rupMiddleware, dfrController.createDFR);
router.put('/:id', rupMiddleware, dfrController.updateDFR);
router.delete('/:id', rupMiddleware, dfrController.deleteDFR);

module.exports = router;
