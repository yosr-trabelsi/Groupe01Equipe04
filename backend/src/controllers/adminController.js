
const { db } = require('../config/firebase');

const getAllUsers = async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();

    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.status(200).json(users);
  } catch (error) {
    console.error('Erreur getAllUsers :', error);

    return res.status(500).json({
      error: 'Erreur lors de la récupération des utilisateurs.'
    });
  }
};

// Récupérer toutes les commandes avec les vraies informations
const getAllOrders = async (req, res) => {
  try {
    const snapshot = await db.collection('orders').get();

    const orders = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const order = doc.data();

        // Récupérer les profils étudiant et commerçant
        const studentPromise = order.studentId
          ? db.collection('users').doc(order.studentId).get()
          : Promise.resolve(null);

        const merchantPromise = order.merchantId
          ? db.collection('merchants').doc(order.merchantId).get()
          : Promise.resolve(null);

        // Récupérer l'offre associée
        const offerPromise = order.offerId
          ? db.collection('offers').doc(order.offerId).get()
          : Promise.resolve(null);

        const [studentDoc, merchantDoc, offerDoc] =
          await Promise.all([
            studentPromise,
            merchantPromise,
            offerPromise
          ]);

        const student = studentDoc?.exists
          ? studentDoc.data()
          : {};

        const merchant = merchantDoc?.exists
          ? merchantDoc.data()
          : {};

        const offer = offerDoc?.exists
          ? offerDoc.data()
          : {};

        return {
          id: doc.id,
          ...order,

          // Informations de l'étudiant
          studentName:
            order.studentName ||
            student.name ||
            student.displayName ||
            student.fullName ||
            'Étudiant inconnu',

          // Informations du commerce
          businessName:
            order.businessName ||
            merchant.businessName ||
            merchant.name ||
            offer.businessName ||
            'Commerce inconnu',

          // Informations financières
          totalPrice:
            order.totalPrice ??
            order.totalAmount ??
            (order.unitPrice !== undefined && order.quantity !== undefined
              ? Number(order.unitPrice) * Number(order.quantity)
              : offer.price !== undefined && order.quantity !== undefined
                ? Number(offer.price) * Number(order.quantity)
                : null),

          // Informations de l'offre
          offerTitle:
            order.offerTitle ||
            offer.title ||
            'Offre inconnue'
        };
      })
    );

    return res.status(200).json(orders);

  } catch (error) {
    console.error('Erreur getAllOrders :', error);

    return res.status(500).json({
      error: 'Erreur lors de la récupération des commandes.'
    });
  }
};

const approveMerchant = async (req, res) => {
  try {
    const { uid } = req.params;

    const userRef = db.collection('users').doc(uid);
    const merchantRef = db.collection('merchants').doc(uid);

    await db.runTransaction(async transaction => {
      const userDoc = await transaction.get(userRef);
      const merchantDoc = await transaction.get(merchantRef);

      if (!userDoc.exists || !merchantDoc.exists) {
        throw new Error('Demande de commerçant introuvable.');
      }

      if (merchantDoc.data().approvalStatus !== 'pending') {
        throw new Error('Cette demande a déjà été traitée.');
      }

      transaction.update(userRef, {
        role: 'merchant',
        approvalStatus: 'approved'
      });

      transaction.update(merchantRef, {
        approvalStatus: 'approved',
        approvedAt: new Date().toISOString()
      });
    });

    return res.status(200).json({
      message: 'Commerçant approuvé avec succès.'
    });

  } catch (error) {
    console.error('Erreur approveMerchant :', error);

    return res.status(400).json({
      error: error.message
    });
  }
};

const rejectMerchant = async (req, res) => {
  try {
    const { uid } = req.params;

    const userRef = db.collection('users').doc(uid);
    const merchantRef = db.collection('merchants').doc(uid);

    await db.runTransaction(async transaction => {
      const userDoc = await transaction.get(userRef);
      const merchantDoc = await transaction.get(merchantRef);

      if (!userDoc.exists || !merchantDoc.exists) {
        throw new Error('Demande de commerçant introuvable.');
      }

      if (merchantDoc.data().approvalStatus !== 'pending') {
        throw new Error('Cette demande a déjà été traitée.');
      }

      transaction.update(userRef, {
        approvalStatus: 'rejected'
      });

      transaction.update(merchantRef, {
        approvalStatus: 'rejected',
        rejectedAt: new Date().toISOString()
      });
    });

    return res.status(200).json({
      message: 'Demande de commerçant rejetée.'
    });

  } catch (error) {
    console.error('Erreur rejectMerchant :', error);

    return res.status(400).json({
      error: error.message
    });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { uid } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        error: 'Le statut doit être true ou false.'
      });
    }

    if (uid === req.user.uid && !isActive) {
      return res.status(400).json({
        error: 'Vous ne pouvez pas désactiver votre propre compte.'
      });
    }

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        error: 'Utilisateur introuvable.'
      });
    }

    await userRef.update({ isActive });

    return res.status(200).json({
      message: 'Statut utilisateur modifié.'
    });

  } catch (error) {
    console.error('Erreur updateUserStatus :', error);

    return res.status(500).json({
      error: 'Erreur lors de la modification du statut.'
    });
  }
};

const getPendingOffers = async (req, res) => {
  try {
    const snapshot = await db.collection('offers')
      .where('status', '==', 'pending')
      .get();

    const offers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.status(200).json(offers);

  } catch (error) {
    console.error('Erreur getPendingOffers :', error);

    return res.status(500).json({
      error: 'Erreur lors de la récupération des offres en attente.'
    });
  }
};

const approveOffer = async (req, res) => {
  try {
    const offerRef = db.collection('offers').doc(req.params.id);
    const offerDoc = await offerRef.get();

    if (!offerDoc.exists) {
      return res.status(404).json({
        error: 'Offre introuvable.'
      });
    }

    if (offerDoc.data().status !== 'pending') {
      return res.status(400).json({
        error: 'Cette offre a déjà été traitée.'
      });
    }

    await offerRef.update({
      status: 'approved',
      isAvailable: Number(offerDoc.data().quantity) > 0,
      approvedAt: new Date().toISOString()
    });

    return res.status(200).json({
      message: 'Offre approuvée avec succès.'
    });

  } catch (error) {
    console.error('Erreur approveOffer :', error);

    return res.status(500).json({
      error: "Erreur lors de l'approbation de l'offre."
    });
  }
};

const rejectOffer = async (req, res) => {
  try {
    const offerRef = db.collection('offers').doc(req.params.id);
    const offerDoc = await offerRef.get();

    if (!offerDoc.exists) {
      return res.status(404).json({
        error: 'Offre introuvable.'
      });
    }

    if (offerDoc.data().status !== 'pending') {
      return res.status(400).json({
        error: 'Cette offre a déjà été traitée.'
      });
    }

    await offerRef.update({
      status: 'rejected',
      isAvailable: false,
      rejectedAt: new Date().toISOString()
    });

    return res.status(200).json({
      message: 'Offre rejetée.'
    });

  } catch (error) {
    console.error('Erreur rejectOffer :', error);

    return res.status(500).json({
      error: "Erreur lors du rejet de l'offre."
    });
  }
};

module.exports = {
  getAllUsers,
  getAllOrders,
  approveMerchant,
  rejectMerchant,
  updateUserStatus,
  getPendingOffers,
  approveOffer,
  rejectOffer
};
