
const { db, auth } = require('../config/firebase');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');

const BASKETS_COLLECTION = 'surpriseBaskets';
const ORDERS_COLLECTION = 'surpriseBasketOrders';

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

const createSurpriseBasketOrder = async (req, res) => {
  try {
    const { basketId, quantity } = req.body;
    const requestedQuantity = Number(quantity);

    if (
      !basketId ||
      !Number.isInteger(requestedQuantity) ||
      requestedQuantity <= 0
    ) {
      return res.status(400).json({
        error: 'Panier ou quantité invalide.'
      });
    }

    const basketRef = db.collection(BASKETS_COLLECTION).doc(basketId);
    const orderRef = db.collection(ORDERS_COLLECTION).doc();
    const studentRef = db.collection('users').doc(req.user.uid);

    let merchantId;
    let businessName;
    let basketTitle;

    await db.runTransaction(async transaction => {
      const basketDoc = await transaction.get(basketRef);
      const studentDoc = await transaction.get(studentRef);

      if (!basketDoc.exists) {
        throw new Error('Panier surprise introuvable.');
      }

      if (!studentDoc.exists) {
        throw new Error('Profil étudiant introuvable.');
      }

      const basket = basketDoc.data();
      const student = studentDoc.data();

      if (!basket.merchantId) {
        throw new Error('Commerçant associé à ce panier introuvable.');
      }

      if (basket.merchantId === req.user.uid) {
        throw new Error('Vous ne pouvez pas réserver votre propre panier.');
      }

      if (
        basket.status !== 'active' ||
        Number(basket.remainingQuantity) < requestedQuantity
      ) {
        throw new Error('Quantité indisponible.');
      }

      const merchantRef = db.collection('merchants').doc(basket.merchantId);
      const merchantDoc = await transaction.get(merchantRef);

      if (!merchantDoc.exists) {
        throw new Error('Profil commerçant introuvable.');
      }

      const merchant = merchantDoc.data();

      if (
        !Number.isFinite(Number(basket.discountedPrice)) ||
        Number(basket.discountedPrice) < 0
      ) {
        throw new Error('Prix du panier invalide.');
      }

      merchantId = basket.merchantId;
      businessName =
        merchant.businessName || merchant.name || 'Commerce';
      basketTitle = basket.title || 'Panier surprise';

      const totalPrice =
        Number(basket.discountedPrice) * requestedQuantity;

      transaction.update(basketRef, {
        remainingQuantity:
          Number(basket.remainingQuantity) - requestedQuantity
      });

      transaction.set(orderRef, {
        studentId: req.user.uid,
        studentName:
          student.name ||
          student.displayName ||
          student.fullName ||
          'Étudiant',

        merchantId,
        businessName,

        basketId,
        basketTitle,
        quantity: requestedQuantity,
        unitPrice: Number(basket.discountedPrice),
        totalPrice,

        pickupStart: basket.pickupStart || null,
        pickupEnd: basket.pickupEnd || null,

        status: 'pending',
        paymentStatus: 'unpaid',
        createdAt: new Date().toISOString()
      });
    });

    notificationService.sendToUser({
      uid: merchantId,
      title: 'Nouvelle réservation',
      body: `Un étudiant a réservé ${basketTitle}.`,
      data: {
        orderId: orderRef.id,
        orderType: 'surprise',
        status: 'pending'
      }
    }).catch(error => {
      console.error('Erreur notification commerçant :', error.message);
    });

    return res.status(201).json({
      message: 'Réservation du panier surprise créée avec succès. En attente de validation du commerçant.',
      orderId: orderRef.id,
      status: 'pending'
    });

  } catch (error) {
    console.error('Erreur createSurpriseBasketOrder :', error);

    return res.status(400).json({
      error: error.message
    });
  }
};

const getMySurpriseBasketOrders = async (req, res) => {
  try {
    const snapshot = await db.collection(ORDERS_COLLECTION)
      .where('studentId', '==', req.user.uid)
      .get();

    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.status(200).json(orders);

  } catch (error) {
    console.error('Erreur getMySurpriseBasketOrders :', error);

    return res.status(500).json({
      error: 'Erreur lors de la récupération de vos réservations.'
    });
  }
};

const getMerchantSurpriseBasketOrders = async (req, res) => {
  try {
    const snapshot = await db.collection(ORDERS_COLLECTION)
      .where('merchantId', '==', req.user.uid)
      .get();

    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.status(200).json(orders);

  } catch (error) {
    console.error('Erreur getMerchantSurpriseBasketOrders :', error);

    return res.status(500).json({
      error: 'Erreur lors de la récupération des réservations.'
    });
  }
};

const updateSurpriseBasketOrderStatus = async (req, res) => {
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

    const orderRef = db.collection(ORDERS_COLLECTION).doc(req.params.id);

    let orderData;

    await db.runTransaction(async transaction => {
      const orderDoc = await transaction.get(orderRef);

      if (!orderDoc.exists) {
        throw new Error('Réservation introuvable.');
      }

      const order = orderDoc.data();

      if (order.merchantId !== req.user.uid) {
        throw new Error('Vous ne pouvez pas modifier cette réservation.');
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
          'Impossible de préparer ce panier : le paiement n’est pas encore confirmé.'
        );
      }

      let basketDoc = null;
      let basketRef = null;

      if (status === 'rejected') {
        basketRef = db.collection(BASKETS_COLLECTION).doc(order.basketId);
        basketDoc = await transaction.get(basketRef);

        if (!basketDoc.exists) {
          throw new Error('Panier introuvable pour restituer la quantité.');
        }
      }

      if (status === 'rejected' && basketDoc.exists) {
        const basket = basketDoc.data();

        transaction.update(basketRef, {
          remainingQuantity:
            Number(basket.remainingQuantity || 0) +
            Number(order.quantity)
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
          orderType: 'surprise',
          status
        }
      }).catch(error => {
        console.error('Erreur notification étudiant :', error.message);
      });

      await sendStudentEmail(orderData.studentId, {
        studentName: orderData.studentName,
        businessName: orderData.businessName,
        orderTitle: orderData.basketTitle,
        accepted
      });
    }

    if (status === 'ready') {
      notificationService.sendToUser({
        uid: orderData.studentId,
        title: 'Panier prêt',
        body: `${orderData.businessName} a préparé votre panier surprise.`,
        data: {
          orderId: orderData.id,
          orderType: 'surprise',
          status: 'ready'
        }
      }).catch(error => {
        console.error('Erreur notification panier prêt :', error.message);
      });
    }

    return res.status(200).json({
      message: status === 'accepted'
        ? 'Réservation acceptée.'
        : status === 'rejected'
          ? 'Réservation refusée.'
          : 'Panier marqué comme prêt.',
      status
    });

  } catch (error) {
    console.error('Erreur updateSurpriseBasketOrderStatus :', error);

    return res.status(400).json({
      error: error.message
    });
  }
};

module.exports = {
  createSurpriseBasketOrder,
  getMySurpriseBasketOrders,
  getMerchantSurpriseBasketOrders,
  updateSurpriseBasketOrderStatus
};
