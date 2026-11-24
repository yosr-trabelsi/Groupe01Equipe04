
const { db, auth } = require('../config/firebase');
const paymentService = require('../services/paymentService');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');

const COLLECTIONS = {
  classic: 'orders',
  surprise: 'surpriseBasketOrders'
};

const httpError = (status, message) =>
  Object.assign(new Error(message), { status });

const handle = (res, next, err) =>
  err.status
    ? res.status(err.status).json({ message: err.message })
    : next(err);

function getCollection(orderType) {
  const collection = COLLECTIONS[orderType || 'classic'];

  if (!collection) {
    throw httpError(400, 'Type de commande invalide');
  }

  return collection;
}

function toMillimes(order) {
  const total = Number(order.totalPrice ?? order.total ?? order.amount);

  if (!Number.isFinite(total) || total <= 0) {
    throw httpError(422, 'Montant de la commande invalide');
  }

  return Math.round(total * 1000);
}

function getOrderTitle(order) {
  return order.offerTitle || order.basketTitle || 'Commande CampusSave';
}

async function sendPaymentEmail(order) {
  try {
    if (!auth || !order.studentId) return;

    const user = await auth.getUser(order.studentId);

    if (!user.email) {
      console.warn('Aucun e-mail associé à cet étudiant.');
      return;
    }

    await emailService.sendPaymentConfirmationEmail({
      to: user.email,
      studentName: order.studentName,
      businessName: order.businessName,
      orderTitle: getOrderTitle(order),
      amount: order.totalPrice
    });
  } catch (error) {
    console.error('Erreur e-mail de paiement :', error.message);
  }
}

function notifyPayment(order, orderId) {
  notificationService
    .sendToUser({
      uid: order.studentId,
      title: 'Paiement confirmé',
      body: 'Ta commande est payée. Ton QR Code est disponible dans ton espace CampusSave.',
      data: {
        orderId,
        status: 'accepted'
      }
    })
    .catch(error => {
      console.error('Notification échouée :', error.message);
    });

  sendPaymentEmail(order);
}

async function markOrderAsPaid(orderRef, expectedPaymentRef = null) {
  return db.runTransaction(async tx => {
    const snap = await tx.get(orderRef);

    if (!snap.exists) {
      throw httpError(404, 'Commande introuvable');
    }

    const order = snap.data();

    if (expectedPaymentRef && order.paymentRef !== expectedPaymentRef) {
      throw httpError(409, 'Référence de paiement invalide');
    }

    if (order.status !== 'accepted') {
      throw httpError(
        409,
        'Le commerçant doit accepter la réservation avant le paiement.'
      );
    }

    if (order.paymentStatus === 'paid') {
      return {
        already: true,
        order
      };
    }

    tx.update(orderRef, {
      paymentStatus: 'paid',
      paidAt: new Date().toISOString()
    });

    return {
      already: false,
      order
    };
  });
}

exports.initPayment = async (req, res, next) => {
  try {
    const { orderId, orderType = 'classic' } = req.body;

    if (typeof orderId !== 'string' || !orderId.trim()) {
      throw httpError(400, 'orderId requis');
    }

    const collection = getCollection(orderType);
    const orderRef = db.collection(collection).doc(orderId);
    const snap = await orderRef.get();

    if (!snap.exists) {
      throw httpError(404, 'Commande introuvable');
    }

    const order = snap.data();

    if (order.studentId !== req.user.uid) {
      throw httpError(403, 'Accès refusé');
    }

    if (order.status !== 'accepted') {
      throw httpError(
        409,
        'Votre réservation doit être acceptée par le commerçant avant le paiement.'
      );
    }

    if (order.paymentStatus === 'paid') {
      return res.json({
        orderId,
        orderType,
        paymentStatus: 'paid',
        status: order.status,
        simulated: order.paymentProvider !== 'konnect',
        message: 'Commande déjà payée'
      });
    }

    const mode = (process.env.PAYMENT_MODE || 'simulation').toLowerCase();

    if (mode === 'simulation') {
      const { already } = await markOrderAsPaid(orderRef);

      if (!already) {
        notifyPayment(order, orderId);
      }

      return res.json({
        orderId,
        orderType,
        paymentStatus: 'paid',
        status: 'accepted',
        simulated: true,
        message: 'Paiement simulé confirmé avec succès'
      });
    }

    if (mode !== 'konnect') {
      throw httpError(
        500,
        'PAYMENT_MODE doit être simulation ou konnect'
      );
    }

    const { PUBLIC_API_URL, WEB_URL } = process.env;

    if (!PUBLIC_API_URL) {
      throw httpError(500, 'PUBLIC_API_URL manquant dans .env');
    }

    const web = WEB_URL || 'http://localhost:5173';

    const { payUrl, paymentRef } = await paymentService.initPayment({
      amountMillimes: toMillimes(order),
      orderId,
      description: `Commande CampusSave ${orderId}`,
      webhookUrl:
        `${PUBLIC_API_URL.replace(/\/+$/, '')}/api/payments/webhook`,
      successUrl:
        process.env.KONNECT_SUCCESS_URL ||
        `${web}/payment/success?orderId=${orderId}&orderType=${orderType}`,
      failUrl:
        process.env.KONNECT_FAIL_URL ||
        `${web}/payment/fail?orderId=${orderId}&orderType=${orderType}`
    });

    await orderRef.update({
      paymentRef,
      paymentStatus: 'pending',
      paymentProvider: 'konnect',
      paymentInitAt: new Date().toISOString()
    });

    return res.json({
      orderId,
      orderType,
      payUrl,
      paymentRef,
      paymentStatus: 'pending',
      status: 'accepted',
      simulated: false
    });

  } catch (error) {
    handle(res, next, error);
  }
};

async function findOrderByPaymentRef(paymentRef) {
  for (const collection of Object.values(COLLECTIONS)) {
    const snapshot = await db
      .collection(collection)
      .where('paymentRef', '==', paymentRef)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      return {
        ref: snapshot.docs[0].ref,
        order: snapshot.docs[0].data(),
        orderId: snapshot.docs[0].id
      };
    }
  }

  return null;
}

exports.webhook = async (req, res, next) => {
  try {
    const paymentRef = req.query.payment_ref;

    if (typeof paymentRef !== 'string' || !paymentRef) {
      throw httpError(400, 'payment_ref requis');
    }

    const found = await findOrderByPaymentRef(paymentRef);

    if (!found) {
      throw httpError(404, 'Paiement inconnu');
    }

    const details = await paymentService.getPaymentDetails(paymentRef);

    if (!paymentService.isCompleted(details)) {
      return res.json({
        received: true,
        completed: false
      });
    }

    const { already, order } = await markOrderAsPaid(
      found.ref,
      paymentRef
    );

    if (!already) {
      notifyPayment(order, found.orderId);
    }

    return res.json({
      received: true,
      completed: true
    });

  } catch (error) {
    handle(res, next, error);
  }
};

exports.getPaymentStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { orderType = 'classic' } = req.query;

    const collection = getCollection(orderType);
    const orderRef = db.collection(collection).doc(orderId);

    let snap = await orderRef.get();

    if (!snap.exists) {
      throw httpError(404, 'Commande introuvable');
    }

    let order = snap.data();

    if (order.studentId !== req.user.uid) {
      throw httpError(403, 'Accès refusé');
    }

    if (order.paymentStatus === 'paid') {
      return res.json({
        orderId,
        orderType,
        paymentStatus: 'paid',
        status: order.status,
        simulated: order.paymentProvider !== 'konnect'
      });
    }

    if (order.status !== 'accepted') {
      return res.json({
        orderId,
        orderType,
        paymentStatus: order.paymentStatus || 'unpaid',
        status: order.status || null,
        simulated: order.paymentProvider !== 'konnect'
      });
    }

    if (
      order.paymentStatus === 'pending' &&
      order.paymentRef &&
      (process.env.PAYMENT_MODE || 'simulation').toLowerCase() === 'konnect'
    ) {
      try {
        const details = await paymentService.getPaymentDetails(
          order.paymentRef
        );

        if (paymentService.isCompleted(details)) {
          const { already, order: paidOrder } = await markOrderAsPaid(
            orderRef,
            order.paymentRef
          );

          if (!already) {
            notifyPayment(paidOrder, orderId);
          }

          snap = await orderRef.get();
          order = snap.data();
        }
      } catch (error) {
        console.error('Vérification Konnect échouée :', error.message);
      }
    }

    return res.json({
      orderId,
      orderType,
      paymentStatus: order.paymentStatus || 'unpaid',
      status: order.status || null,
      simulated: order.paymentProvider !== 'konnect'
    });

  } catch (error) {
    handle(res, next, error);
  }
};
