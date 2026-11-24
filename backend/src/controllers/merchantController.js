const { db } = require('../config/firebase');

const applyForMerchant = async (req, res) => {
  try {
    const { businessName, description, address, phone } = req.body;

    if (!businessName || !address) {
      return res.status(400).json({
        error: 'Le nom du commerce et son adresse sont obligatoires.'
      });
    }

    const uid = req.user.uid;
    const userRef = db.collection('users').doc(uid);
    const merchantRef = db.collection('merchants').doc(uid);

    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        error: 'Utilisateur introuvable.'
      });
    }

    if (userDoc.data().role === 'merchant') {
      return res.status(409).json({
        error: 'Vous êtes déjà commerçant.'
      });
    }

    const existingApplication = await merchantRef.get();

    if (existingApplication.exists &&
        existingApplication.data().approvalStatus === 'pending') {
      return res.status(409).json({
        error: 'Une demande est déjà en attente.'
      });
    }

    const merchantData = {
      uid,
      businessName,
      description: description || '',
      address,
      phone: phone || '',
      approvalStatus: 'pending',
      createdAt: new Date().toISOString()
    };

    await merchantRef.set(merchantData);

    await userRef.update({
      approvalStatus: 'pending'
    });

    return res.status(201).json({
      message: 'Demande envoyée pour validation.'
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Erreur lors de la demande commerçant.'
    });
  }
};

const getMerchantProfile = async (req, res) => {
  try {
    const merchantDoc = await db.collection('merchants')
      .doc(req.user.uid)
      .get();

    if (!merchantDoc.exists) {
      return res.status(404).json({
        error: 'Commerce introuvable.'
      });
    }

    return res.status(200).json(merchantDoc.data());

  } catch (error) {
    return res.status(500).json({
      error: 'Erreur lors de la récupération du commerce.'
    });
  }
};

const updateMerchantProfile = async (req, res) => {
  try {
    const { businessName, description, address, phone } = req.body;

    const updates = {};

    if (businessName !== undefined) updates.businessName = businessName;
    if (description !== undefined) updates.description = description;
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'Aucune information à modifier.'
      });
    }

    await db.collection('merchants')
      .doc(req.user.uid)
      .update(updates);

    return res.status(200).json({
      message: 'Commerce modifié avec succès.'
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Erreur lors de la modification du commerce.'
    });
  }
};


const getApprovedMerchantsForRadar = async (req, res) => {
  try {
    const snapshot = await db.collection('merchants')
      .where('approvalStatus', '==', 'approved')
      .get();

    const merchants = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const location = data.location;

        if (
          !location ||
          typeof location.latitude !== 'number' ||
          typeof location.longitude !== 'number'
        ) {
          return null;
        }

        return {
          uid: data.uid || doc.id,
          businessName: data.businessName || '',
          address: data.address || '',
          category: data.category || null,
          latitude: location.latitude,
          longitude: location.longitude,
          ...(data.demoSeed !== undefined && {
            demoSeed: data.demoSeed,
          }),
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      count: merchants.length,
      merchants,
    });

  } catch (error) {
    console.error('Erreur Campus Radar:', error);

    return res.status(500).json({
      error: 'Erreur lors de la récupération des commerces.'
    });
  }
};

module.exports = {
  applyForMerchant,
  getMerchantProfile,
  updateMerchantProfile,
  getApprovedMerchantsForRadar
};