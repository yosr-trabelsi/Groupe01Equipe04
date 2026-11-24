
const router = require('express').Router();

const {
  saveToken,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/notificationController');

const auth = require('../middleware/authMiddleware');
const {
  validate,
  fcmTokenRules,
} = require('../middleware/validationMiddleware');

router.post('/token', auth, validate(fcmTokenRules), saveToken);

router.get('/', auth, getNotifications);

router.patch('/read-all', auth, markAllNotificationsRead);

router.patch('/:notificationId/read', auth, markNotificationRead);

module.exports = router;