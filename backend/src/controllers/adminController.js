const { db } = require('../config/firebase');

const getAllUsers = async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();

    const users = snapshot.docs.map(doc => doc.data());

    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({
      error: 'Erreur lors de la récupération des utilisateurs.'
    });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const snapshot = await db.collection('orders').get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(orders);
  } catch (error) {
    return res.status(500).json({ error: 'Erreur lors de la récupération des commandes.' });
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
    return res.status(500).json({
      error: 'Erreur lors de la modification du statut.'
    });
  }
};

module.exports = {
  getAllUsers,
  getAllOrders,
  approveMerchant,
  rejectMerchant,
  updateUserStatus
};