const { db } = require('../config/firebase');
const notificationService = require('../services/notificationService');

const POINTS_PER_PORTION = 10;

const notify = (uid, title, body, orderId) => {
  if (!uid) return;
  Promise.resolve(
    notificationService.sendToUser({ uid, title, body, data: { orderId } })
  ).catch((e) => console.error('Notification échouée :', e.message));
};

const createOrder = async (req, res) => {
  try {
    const { offerId, quantity } = req.body;

    if (
      !offerId ||
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) <= 0
    ) {
      return res.status(400).json({
        error: 'Offre ou quantité invalide.'
      });
    }

    const offerRef = db.collection('offers').doc(offerId);
    const orderRef = db.collection('orders').doc();
    let created = null;

    await db.runTransaction(async transaction => {
      const offerDoc = await transaction.get(offerRef);

      if (!offerDoc.exists) {
        throw new Error('Offre introuvable.');
      }

      const offer = offerDoc.data();
      const requestedQuantity = Number(quantity);

      if (!offer.isAvailable || offer.quantity < requestedQuantity) {
        throw new Error('Quantité indisponible.');
      }

      if (offer.merchantId === req.user.uid) {
        throw new Error('Vous ne pouvez pas réserver votre propre offre.');
      }

      const totalPrice = offer.price * requestedQuantity;
      const remainingQuantity = offer.quantity - requestedQuantity;

      transaction.update(offerRef, {
        quantity: remainingQuantity,
        isAvailable: remainingQuantity > 0
      });

      transaction.set(orderRef, {
        studentId: req.user.uid,
        merchantId: offer.merchantId,
        offerId,
        offerTitle: offer.title,
        quantity: requestedQuantity,
        unitPrice: offer.price,
        totalPrice,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      created = {
        merchantId: offer.merchantId,
        title: offer.title,
        quantity: requestedQuantity
      };
    });

    if (created) {
      notify(
        created.merchantId,
        'Nouvelle commande',
        `${created.title} × ${created.quantity} : à accepter ou à refuser.`,
        orderRef.id
      );
    }

    return res.status(201).json({
      message: 'Réservation créée avec succès.',
      orderId: orderRef.id
    });

  } catch (error) {
    return res.status(400).json({
      error: error.message
    });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const snapshot = await db.collection('orders')
      .where('studentId', '==', req.user.uid)
      .get();

    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.status(200).json(orders);

  } catch (error) {
    return res.status(500).json({
      error: 'Erreur lors de la récupération des réservations.'
    });
  }
};

const getMerchantOrders = async (req, res) => {
  try {
    const snapshot = await db.collection('orders')
      .where('merchantId', '==', req.user.uid)
      .get();

    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.status(200).json(orders);

  } catch (error) {
    return res.status(500).json({
      error: 'Erreur lors de la récupération des commandes.'
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ['confirmed', 'ready', 'completed', 'cancelled'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Statut invalide.'
      });
    }

    const orderRef = db.collection('orders').doc(req.params.id);
    let before = null;

    await db.runTransaction(async transaction => {
      const orderDoc = await transaction.get(orderRef);

      if (!orderDoc.exists) {
        throw new Error('Commande introuvable.');
      }

      const order = orderDoc.data();

      if (order.merchantId !== req.user.uid) {
        throw new Error('Vous ne pouvez pas modifier cette commande.');
      }

      const transitions = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['ready', 'cancelled'],
        ready: ['completed'],
        completed: [],
        cancelled: []
      };

      if (!transitions[order.status]?.includes(status)) {
        throw new Error('Changement de statut non autorisé.');
      }
      let offerDoc = null;
      let studentDoc = null;
      const offerRef = db.collection('offers').doc(order.offerId);
      const studentRef = db.collection('users').doc(order.studentId);

      if (status === 'cancelled') {
        offerDoc = await transaction.get(offerRef);
      }
      if (status === 'completed') {
        studentDoc = await transaction.get(studentRef);
      }

      if (status === 'cancelled' && offerDoc && offerDoc.exists) {
        const offer = offerDoc.data();
        transaction.update(offerRef, {
          quantity: offer.quantity + order.quantity,
          isAvailable: true
        });
      }

      const orderUpdate = {
        status,
        updatedAt: new Date().toISOString()
      };

      if (status === 'completed') {
        const points = Number(order.quantity) * POINTS_PER_PORTION;
        if (studentDoc && studentDoc.exists) {
          transaction.update(studentRef, {
            ecoPoints: (studentDoc.data().ecoPoints || 0) + points
          });
        }
        orderUpdate.ecoPointsEarned = points;
      }

      transaction.update(orderRef, orderUpdate);
      before = order;
    });

    if (before) {
      const title = before.offerTitle || 'ta commande';
      if (status === 'confirmed') {
        notify(
          before.studentId,
          'Commande acceptée',
          `Le commerçant a accepté ta commande (${title}). Tu peux maintenant la payer.`,
          orderRef.id
        );
      } else if (status === 'cancelled') {
        const refused = before.status === 'pending';
        let body = refused
          ? `Le commerçant a refusé ta commande (${title}).`
          : `Le commerçant a annulé ta commande (${title}).`;
        if (before.paymentStatus === 'paid') {
          body += ' Contacte le commerçant pour le remboursement.';
        }
        notify(
          before.studentId,
          refused ? 'Commande refusée' : 'Commande annulée',
          body,
          orderRef.id
        );
      } else if (status === 'ready') {
        notify(
          before.studentId,
          'Commande prête',
          `Ta commande (${title}) est prête. Viens la récupérer avec ton QR code.`,
          orderRef.id
        );
      }
    }

    return res.status(200).json({
      message: 'Statut de la commande modifié.'
    });

  } catch (error) {
    return res.status(400).json({
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getMerchantOrders,
  updateOrderStatus
};