
const { db, auth } = require('../config/firebase');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');

const INITIAL_ORDER_NUMBER = 8;

const sendStudentEmail = async (uid, emailData) => {
  try {
    if (!auth) return;

    const user = await auth.getUser(uid);

    if (!user.email) {
      console.warn('Aucun e-mail associé à cet étudiant.');
      return;
    }

    await emailService.sendOrderDecisionEmail({
      to: user.email,
      ...emailData
    });
  } catch (error) {
    console.error('Erreur envoi e-mail étudiant :', error.message);
  }
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

    const requestedQuantity = Number(quantity);

    const offerRef = db.collection('offers').doc(offerId);
    const orderRef = db.collection('orders').doc();
    const studentRef = db.collection('users').doc(req.user.uid);
    const counterRef = db.collection('counters').doc('orders');

    let generatedOrderNumber;
    let merchantId;
    let businessName;
    let offerTitle;

    await db.runTransaction(async transaction => {
      const offerDoc = await transaction.get(offerRef);
      const studentDoc = await transaction.get(studentRef);
      const counterDoc = await transaction.get(counterRef);

      if (!offerDoc.exists) {
        throw new Error('Offre introuvable.');
      }

      if (!studentDoc.exists) {
        throw new Error('Profil étudiant introuvable.');
      }

      const offer = offerDoc.data();
      const student = studentDoc.data();

      if (!offer.merchantId) {
        throw new Error('Commerçant associé à cette offre introuvable.');
      }

      const merchantRef = db.collection('merchants').doc(offer.merchantId);
      const merchantDoc = await transaction.get(merchantRef);

      if (!merchantDoc.exists) {
        throw new Error('Profil commerçant introuvable.');
      }

      const merchant = merchantDoc.data();

      if (
        !offer.isAvailable ||
        Number(offer.quantity) < requestedQuantity
      ) {
        throw new Error('Quantité indisponible.');
      }

      if (offer.merchantId === req.user.uid) {
        throw new Error('Vous ne pouvez pas réserver votre propre offre.');
      }

      if (
        !Number.isFinite(Number(offer.price)) ||
        Number(offer.price) < 0
      ) {
        throw new Error('Prix de l’offre invalide.');
      }

      const lastNumber = counterDoc.exists
        ? Number(counterDoc.data().lastNumber || 0)
        : INITIAL_ORDER_NUMBER;

      const nextNumber = lastNumber + 1;

      generatedOrderNumber =
        `CMD-${String(nextNumber).padStart(4, '0')}`;

      const totalPrice = Number(offer.price) * requestedQuantity;
      const remainingQuantity =
        Number(offer.quantity) - requestedQuantity;

      merchantId = offer.merchantId;
      businessName =
        merchant.businessName || merchant.name || 'Commerce';
      offerTitle = offer.title || 'Offre CampusSave';

      transaction.set(
        counterRef,
        { lastNumber: nextNumber },
        { merge: true }
      );

      transaction.update(offerRef, {
        quantity: remainingQuantity,
        isAvailable: remainingQuantity > 0
      });

      transaction.set(orderRef, {
        orderNumber: generatedOrderNumber,
        studentId: req.user.uid,
        studentName:
          student.name ||
          student.displayName ||
          student.fullName ||
          'Étudiant',
        merchantId,
        businessName,
        offerId,
        offerTitle,
        quantity: requestedQuantity,
        unitPrice: Number(offer.price),
        totalPrice,
        status: 'pending',
        paymentStatus: 'unpaid',
        createdAt: new Date().toISOString()
      });
    });

    notificationService.sendToUser({
      uid: merchantId,
      title: 'Nouvelle réservation',
      body: `Une nouvelle réservation a été effectuée pour ${offerTitle}.`,
      data: {
        orderId: orderRef.id,
        orderType: 'classic',
        status: 'pending'
      }
    }).catch(error => {
      console.error('Erreur notification commerçant :', error.message);
    });

    return res.status(201).json({
      message: 'Réservation créée avec succès. En attente de validation du commerçant.',
      orderId: orderRef.id,
      orderNumber: generatedOrderNumber,
      status: 'pending'
    });

  } catch (error) {
    console.error('Erreur createOrder :', error);

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
    console.error('Erreur getMyOrders :', error);

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
    console.error('Erreur getMerchantOrders :', error);

    return res.status(500).json({
      error: 'Erreur lors de la récupération des commandes.'
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      'accepted',
      'rejected',
      'ready'
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Statut invalide.'
      });
    }

    const orderRef = db.collection('orders').doc(req.params.id);

    let orderData;

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
        pending: ['accepted', 'rejected'],
        accepted: ['ready'],
        rejected: [],
        ready: [],
        completed: [],
        cancelled: []
      };

      if (!transitions[order.status]?.includes(status)) {
        throw new Error('Changement de statut non autorisé.');
      }

      if (status === 'ready' && order.paymentStatus !== 'paid') {
        throw new Error(
          'Impossible de préparer cette commande : le paiement n’est pas encore confirmé.'
        );
      }

      let offerDoc = null;
      let offerRef = null;

      if (status === 'rejected') {
        offerRef = db.collection('offers').doc(order.offerId);
        offerDoc = await transaction.get(offerRef);

        if (!offerDoc.exists) {
          throw new Error('Offre introuvable pour restituer la quantité.');
        }
      }

      if (status === 'rejected' && offerDoc.exists) {
        const offer = offerDoc.data();

        const restoredQuantity =
          Number(offer.quantity || 0) + Number(order.quantity);

        transaction.update(offerRef, {
          quantity: restoredQuantity,
          isAvailable: restoredQuantity > 0
        });
      }

      transaction.update(orderRef, {
        status,
        updatedAt: new Date().toISOString()
      });

      orderData = {
        ...order,
        id: orderDoc.id
      };
    });

    if (status === 'accepted' || status === 'rejected') {
      const accepted = status === 'accepted';

      notificationService.sendToUser({
        uid: orderData.studentId,
        title: accepted
          ? 'Réservation acceptée'
          : 'Réservation refusée',
        body: accepted
          ? `${orderData.businessName} a accepté votre réservation. Vous pouvez maintenant payer.`
          : `${orderData.businessName} a refusé votre réservation.`,
        data: {
          orderId: orderData.id,
          orderType: 'classic',
          status
        }
      }).catch(error => {
        console.error('Erreur notification étudiant :', error.message);
      });

      await sendStudentEmail(orderData.studentId, {
        studentName: orderData.studentName,
        businessName: orderData.businessName,
        orderTitle: orderData.offerTitle,
        accepted
      });
    }

    if (status === 'ready') {
      notificationService.sendToUser({
        uid: orderData.studentId,
        title: 'Commande prête',
        body: `${orderData.businessName} a préparé votre commande. Vous pouvez venir la récupérer.`,
        data: {
          orderId: orderData.id,
          orderType: 'classic',
          status: 'ready'
        }
      }).catch(error => {
        console.error('Erreur notification commande prête :', error.message);
      });
    }

    return res.status(200).json({
      message: status === 'accepted'
        ? 'Réservation acceptée.'
        : status === 'rejected'
          ? 'Réservation refusée.'
          : 'Commande marquée comme prête.',
      status
    });

  } catch (error) {
    console.error('Erreur updateOrderStatus :', error);

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
