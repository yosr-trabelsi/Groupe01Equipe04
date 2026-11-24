
const { FieldValue } = require('firebase-admin/firestore');
const { db } = require('../config/firebase');

const getNotificationsRef = uid =>
  db.collection('users').doc(uid).collection('notifications');

exports.saveToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken || typeof fcmToken !== 'string') {
      return res.status(400).json({
        message: 'Token FCM invalide',
      });
    }

    await db.collection('users').doc(req.user.uid).set(
      {
        fcmTokens: FieldValue.arrayUnion(fcmToken),
      },
      { merge: true }
    );

    res.json({ message: 'Token enregistré' });
  } catch (err) {
    next(err);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const snapshot = await getNotificationsRef(req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const notifications = snapshot.docs.map(doc => {
      const data = doc.data();

      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt
          ? data.createdAt.toDate().toISOString()
          : null,
      };
    });

    const unreadCount = notifications.filter(
      notification => !notification.read
    ).length;

    res.json({
      notifications,
      unreadCount,
    });
  } catch (err) {
    next(err);
  }
};

exports.markNotificationRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;

    if (!notificationId) {
      return res.status(400).json({
        message: 'Identifiant de notification manquant',
      });
    }

    const notificationRef = getNotificationsRef(req.user.uid)
      .doc(notificationId);

    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists) {
      return res.status(404).json({
        message: 'Notification introuvable',
      });
    }

    await notificationRef.update({
      read: true,
      readAt: FieldValue.serverTimestamp(),
    });

    res.json({
      message: 'Notification marquée comme lue',
    });
  } catch (err) {
    next(err);
  }
};

exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    const snapshot = await getNotificationsRef(req.user.uid)
      .where('read', '==', false)
      .get();

    if (snapshot.empty) {
      return res.json({
        message: 'Aucune notification non lue',
        updatedCount: 0,
      });
    }

    const batch = db.batch();

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        readAt: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    res.json({
      message: 'Toutes les notifications sont marquées comme lues',
      updatedCount: snapshot.size,
    });
  } catch (err) {
    next(err);
  }
};