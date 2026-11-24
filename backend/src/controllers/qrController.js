
const { db } = require('../config/firebase');
const qrTokenService = require('../services/qrTokenService');
const notificationService = require('../services/notificationService');

const COLLECTIONS = {
  classic: 'orders',
  surprise: 'surpriseBasketOrders',
};

const httpError = (status, message) =>
  Object.assign(new Error(message), { status });

const handle = (res, next, err) =>
  err.status
    ? res.status(err.status).json({ message: err.message })
    : next(err);

exports.getOrderQr = async (req, res, next) => {
  try {
    const orderType = req.query.orderType || 'classic';
    const collection = COLLECTIONS[orderType];

    if (!collection) {
      throw httpError(400, 'Type de commande invalide');
    }

    const snap = await db
      .collection(collection)
      .doc(req.params.orderId)
      .get();

    if (!snap.exists) {
      throw httpError(404, 'Commande introuvable');
    }

    const order = snap.data();

    if (order.studentId !== req.user.uid) {
      throw httpError(403, 'Accès refusé');
    }

    if (order.paymentStatus !== 'paid') {
      throw httpError(402, 'Commande non payée');
    }

    if (order.status === 'completed' || order.status === 'cancelled') {
      throw httpError(
        409,
        'Cette commande ne peut plus être récupérée'
      );
    }

    const { token, qrImage } =
      await qrTokenService.generateOrderQr(snap.id, orderType);

    res.json({ token, qrImage, orderType });
  } catch (err) {
    handle(res, next, err);
  }
};

// POST /api/qr/validate
// Commerçant : scanner et valider la récupération
exports.validateQr = async (req, res, next) => {
  try {
    const decoded = qrTokenService.verifyToken(req.body.token);

    if (!decoded) {
      throw httpError(400, 'QR Code invalide');
    }

    const { orderId, orderType } = decoded;
    const collection = COLLECTIONS[orderType];

    if (!collection) {
      throw httpError(400, 'Type de commande invalide');
    }

    const result = await db.runTransaction(async (tx) => {
      const orderRef = db.collection(collection).doc(orderId);
      const snap = await tx.get(orderRef);

      if (!snap.exists) {
        throw httpError(404, 'Commande introuvable');
      }

      const order = snap.data();

      if (order.merchantId !== req.user.uid) {
        throw httpError(
          403,
          'Cette commande appartient à un autre commerçant'
        );
      }

      if (order.paymentStatus !== 'paid') {
        throw httpError(402, 'Commande non payée');
      }

      if (order.status === 'completed') {
        throw httpError(409, 'Commande déjà récupérée');
      }

      if (order.status !== 'ready') {
        throw httpError(
          409,
          'La commande doit être prête avant sa récupération'
        );
      }

      const studentRef = db.collection('users').doc(order.studentId);
      const studentSnap = await tx.get(studentRef);

      const pointsEarned = Number(order.quantity) * 10;

      if (studentSnap.exists) {
        const currentPoints = Number(
          studentSnap.data().ecoPoints || 0
        );

        tx.update(studentRef, {
          ecoPoints: currentPoints + pointsEarned,
        });
      }

      tx.update(orderRef, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        ecoPointsEarned: pointsEarned,
      });

      return {
        order,
        pointsEarned,
      };
    });


    notificationService
      .sendToUser({
        uid: result.order.studentId,
        title: 'Commande récupérée',
        body: "Merci d'avoir sauvé de la nourriture !",
        data: {
          orderId,
          orderType,
        },
      })
      .catch((e) =>
        console.error('Notification échouée :', e.message)
      );

    res.json({
      message: 'Récupération validée avec succès',
      orderId,
      orderType,
      status: 'completed',
      ecoPointsEarned: result.pointsEarned,
    });
  } catch (err) {
    handle(res, next, err);
  }
};
