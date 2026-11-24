
const express = require('express');

const {
  createSurpriseBasketOrder,
  getMySurpriseBasketOrders,
  getMerchantSurpriseBasketOrders,
  updateSurpriseBasketOrderStatus
} = require('../controllers/surpriseBasketOrderController');

const verifyToken = require('../middleware/authMiddleware');
const verifyRole = require('../middleware/roleMiddleware');

const router = express.Router();

router.post('/', verifyToken, verifyRole('student'), createSurpriseBasketOrder);

router.get('/my-orders', verifyToken, verifyRole('student'), getMySurpriseBasketOrders);

router.get('/merchant-orders', verifyToken, verifyRole('merchant'), getMerchantSurpriseBasketOrders);

router.put('/:id/status', verifyToken, verifyRole('merchant'), updateSurpriseBasketOrderStatus);

module.exports = router;
