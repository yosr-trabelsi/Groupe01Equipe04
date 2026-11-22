const { db } = require('../config/firebase');
const paymentService = require('../services/paymentService');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');
const qrTokenService = require('../services/qrTokenService');

const PENDING_ORDER_STATUSES = new Set(['pending', 'pending_payment']);
const PAID_ORDER_STATUS = 'confirmed';
const isMockRef = (ref) => process.env.PAYMENT_MOCK === 'true' && String(ref).startsWith('mock_');

const httpError = (status, message) => Object.assign(new Error(message), { status });

const handle = (res, next, err) =>
  err.status ? res.status(err.status).json({ message: err.message }) : next(err);

function toMillimes(order) {
  const total = order.totalPrice ?? order.total ?? order.amount;
  if (typeof total !== 'number' || !(total > 0)) throw httpError(422, 'Montant de la commande invalide');
  return Math.round(total * 1000);
}

async function sendReceipt(orderId, order) {
  const userSnap = await db.collection('users').doc(order.studentId).get();
  const user = userSnap.data() || {};
  if (!user.email) return;
  let qrImage = null;
  try {
    qrImage = (await qrTokenService.generateOrderQr(orderId)).qrImage;
  } catch (e) {
    console.error('QR pour le reçu impossible :', e.message);
  }
  await emailService.sendPaymentReceipt({
    to: user.email,
    name: user.name,
    orderId,
    offerTitle: order.offerTitle,
    quantity: order.quantity,
    totalPrice: order.totalPrice,
    qrImage,
  });
}
async function confirmPayment(paymentRef, { mockPay = false } = {}) {
  const found = await db.collection('orders').where('paymentRef', '==', paymentRef).limit(1).get();
  if (found.empty) return { found: false };
  const orderRef = found.docs[0].ref;

  if (isMockRef(paymentRef)) {
    if (!mockPay) return { found: true, completed: false };
  } else {
    const details = await paymentService.getPaymentDetails(paymentRef);
    if (!paymentService.isCompleted(details))
      return { found: true, completed: false, konnectStatus: details?.status };
  }

  const { already, order } = await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    const data = snap.data();
    if (data.paymentStatus === 'paid') return { already: true, order: data };

    const update = { paymentStatus: 'paid', paidAt: new Date().toISOString() };
    if (!data.status || PENDING_ORDER_STATUSES.has(data.status)) update.status = PAID_ORDER_STATUS;
    tx.update(orderRef, update);
    return { already: false, order: data };
  });

  if (!already) {
    notificationService
      .sendToUser({
        uid: order.studentId,
        title: 'Paiement confirmé',
        body: 'Ta commande est payée. Présente ton QR Code au commerçant.',
        data: { orderId: orderRef.id },
      })
      .catch((e) => console.error('Notification échouée :', e.message));

    if (order.merchantId) {
      notificationService
        .sendToUser({
          uid: order.merchantId,
          title: 'Nouvelle commande payée',
          body: `${order.offerTitle || 'Une offre'} × ${order.quantity || 1} : à préparer pour le retrait.`,
          data: { orderId: orderRef.id },
        })
        .catch((e) => console.error('Notification commerçant échouée :', e.message));
    }

    sendReceipt(orderRef.id, order).catch((e) => console.error('Email de reçu échoué :', e.message));
  }
  return { found: true, completed: true, already };
}

exports.initPayment = async (req, res, next) => {
  try {
    const { PUBLIC_API_URL, WEB_URL } = process.env;
    if (!PUBLIC_API_URL) throw httpError(500, 'PUBLIC_API_URL manquant dans .env');

    const orderRef = db.collection('orders').doc(req.body.orderId);
    const snap = await orderRef.get();
    if (!snap.exists) throw httpError(404, 'Commande introuvable');

    const order = snap.data();
    if (order.studentId !== req.user.uid) throw httpError(403, 'Accès refusé');
    if (order.paymentStatus === 'paid') throw httpError(409, 'Commande déjà payée');

    const apiBase = PUBLIC_API_URL.replace(/\/+$/, '');
    let payUrl;
    let paymentRef;

    if (process.env.PAYMENT_MOCK === 'true') {
      toMillimes(order); 
      paymentRef = `mock_${snap.id}_${Date.now()}`;
      payUrl = `${apiBase}/api/payments/webhook?payment_ref=${paymentRef}`;
    } else {
      const web = WEB_URL || 'http://localhost:5173';
      ({ payUrl, paymentRef } = await paymentService.initPayment({
        amountMillimes: toMillimes(order),
        orderId: snap.id,
        description: `Commande CampusSave ${snap.id}`,
        webhookUrl: `${apiBase}/api/payments/webhook`,
        successUrl: process.env.KONNECT_SUCCESS_URL || `${web}/payment/success?orderId=${snap.id}`,
        failUrl: process.env.KONNECT_FAIL_URL || `${web}/payment/fail?orderId=${snap.id}`,
      }));
    }

    await orderRef.update({
      paymentRef,
      paymentStatus: 'pending',
      paymentInitAt: new Date().toISOString(),
    });

    res.json({ payUrl, paymentRef });
  } catch (err) { handle(res, next, err); }
};

exports.webhook = async (req, res, next) => {
  try {
    const ref = req.query.payment_ref;
    if (typeof ref !== 'string' || !ref)
      return res.status(400).json({ message: 'payment_ref requis' });

    const mock = isMockRef(ref);
    const result = await confirmPayment(ref, { mockPay: mock });
    if (!result.found) return res.status(404).json({ message: 'Paiement inconnu' });

    if (mock) {
      return res.type('html').send(
        '<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Paiement simulé</title></head>' +
        '<body style="font-family:Arial,sans-serif;text-align:center;padding:40px 20px;color:#222">' +
        '<h1 style="color:#2e7d32">Paiement simulé confirmé ✅</h1>' +
        '<p>Mode test CampusSave : aucun vrai paiement n\'a été effectué.</p>' +
        '<p>Retournez dans l\'application.</p></body></html>'
      );
    }
    res.json({ received: true, completed: result.completed });
  } catch (err) { handle(res, next, err); }
};

exports.getPaymentStatus = async (req, res, next) => {
  try {
    const orderRef = db.collection('orders').doc(req.params.orderId);
    const snap = await orderRef.get();
    if (!snap.exists) throw httpError(404, 'Commande introuvable');

    let order = snap.data();
    if (order.studentId !== req.user.uid) throw httpError(403, 'Accès refusé');

    if (order.paymentStatus === 'pending' && order.paymentRef) {
      try {
        await confirmPayment(order.paymentRef);
        order = (await orderRef.get()).data();
      } catch (e) { console.error('Vérification du paiement échouée :', e.message); }
    }

    res.json({
      orderId: snap.id,
      paymentStatus: order.paymentStatus || 'unpaid',
      status: order.status || null,
    });
  } catch (err) { handle(res, next, err); }
};