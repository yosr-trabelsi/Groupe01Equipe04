
const express = require('express');

const {
  getSurpriseBaskets,
  getMySurpriseBaskets,
  createSurpriseBasket,
  updateSurpriseBasket,
  deleteSurpriseBasket
} = require('../controllers/surpriseBasketController');

const verifyToken = require('../middleware/authMiddleware');
const verifyRole = require('../middleware/roleMiddleware');

const router = express.Router();


router.get('/', getSurpriseBaskets);


router.get('/my-baskets', verifyToken, verifyRole('merchant'), getMySurpriseBaskets);


router.post('/', verifyToken, verifyRole('merchant'), createSurpriseBasket);


router.put('/:id', verifyToken, verifyRole('merchant'), updateSurpriseBasket);


router.delete('/:id', verifyToken, verifyRole('merchant'), deleteSurpriseBasket);

module.exports = router;