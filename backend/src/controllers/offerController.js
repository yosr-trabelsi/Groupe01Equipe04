
const { db } = require('../config/firebase');

const CATEGORIES = [
  'boulangerie',
  'restaurant',
  'cafeteria',
  'epicerie',
  'patisserie',
  'autre'
];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;


const getOffers = async (req, res) => {
  try {
    const snapshot = await db.collection('offers')
      .where('status', '==', 'approved')
      .where('isAvailable', '==', true)
      .get();

    const offers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.status(200).json(offers);
  } catch (error) {
    console.error('Erreur getOffers :', error);

    return res.status(500).json({
      error: 'Erreur lors de la récupération des offres.'
    });
  }
};


const getOfferById = async (req, res) => {
  try {
    const offerDoc = await db.collection('offers')
      .doc(req.params.id)
      .get();

    if (!offerDoc.exists) {
      return res.status(404).json({
        error: 'Offre introuvable.'
      });
    }

    const offer = offerDoc.data();

    if (offer.status !== 'approved' || !offer.isAvailable) {
      return res.status(404).json({
        error: 'Offre introuvable.'
      });
    }

    return res.status(200).json({
      id: offerDoc.id,
      ...offer
    });
  } catch (error) {
    console.error('Erreur getOfferById :', error);

    return res.status(500).json({
      error: 'Erreur lors de la récupération de l’offre.'
    });
  }
};


const createOffer = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      originalPrice,
      quantity,
      expirationDate,
      category,
      imageUrl,
      pickupStart,
      pickupEnd
    } = req.body;


    if (
      !title ||
      price === undefined ||
      originalPrice === undefined ||
      quantity === undefined
    ) {
      return res.status(400).json({
        error: 'Informations obligatoires manquantes.'
      });
    }


    if (
      !Number.isFinite(Number(price)) ||
      !Number.isFinite(Number(originalPrice)) ||
      !Number.isInteger(Number(quantity)) ||
      Number(price) < 0 ||
      Number(originalPrice) < Number(price) ||
      Number(quantity) <= 0
    ) {
      return res.status(400).json({
        error: 'Prix ou quantité invalide.'
      });
    }


    if (category && !CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: 'Catégorie invalide.'
      });
    }


    if (pickupStart && !TIME_RE.test(pickupStart)) {
      return res.status(400).json({
        error: 'Heure de début invalide.'
      });
    }

    if (pickupEnd && !TIME_RE.test(pickupEnd)) {
      return res.status(400).json({
        error: 'Heure de fin invalide.'
      });
    }

    if (pickupStart && pickupEnd && pickupEnd <= pickupStart) {
      return res.status(400).json({
        error: "L'heure de fin doit être après l'heure de début."
      });
    }


    const merchantDoc = await db.collection('merchants')
      .doc(req.user.uid)
      .get();

    if (
      !merchantDoc.exists ||
      merchantDoc.data().approvalStatus !== 'approved'
    ) {
      return res.status(403).json({
        error: 'Commerce non approuvé.'
      });
    }


    const offerData = {
      merchantId: req.user.uid,
      businessName: merchantDoc.data().businessName || '',
      title: String(title).trim(),
      description: description || '',
      price: Number(price),
      originalPrice: Number(originalPrice),
      quantity: Number(quantity),
      expirationDate: expirationDate || null,
      category: category || 'autre',
      imageUrl: imageUrl || '',
      pickupStart: pickupStart || null,
      pickupEnd: pickupEnd || null,


      status: 'approved',
      isAvailable: Number(quantity) > 0,

      createdAt: new Date().toISOString()
    };

    const offerRef = await db.collection('offers').add(offerData);

    return res.status(201).json({
      message: 'Offre publiée avec succès.',
      offerId: offerRef.id
    });

  } catch (error) {
    console.error('Erreur createOffer :', error);

    return res.status(500).json({
      error: "Erreur lors de la création de l'offre."
    });
  }
};


const updateOffer = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      originalPrice,
      quantity,
      expirationDate,
      category,
      imageUrl,
      pickupStart,
      pickupEnd
    } = req.body;

    const offerRef = db.collection('offers').doc(req.params.id);
    const offerDoc = await offerRef.get();

    if (!offerDoc.exists) {
      return res.status(404).json({
        error: 'Offre introuvable.'
      });
    }

    const offer = offerDoc.data();

    if (offer.merchantId !== req.user.uid) {
      return res.status(403).json({
        error: 'Vous ne pouvez pas modifier cette offre.'
      });
    }

    const updates = {};


    if (title !== undefined) {
      if (!String(title).trim()) {
        return res.status(400).json({
          error: 'Titre invalide.'
        });
      }

      updates.title = String(title).trim();
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (expirationDate !== undefined) {
      updates.expirationDate = expirationDate || null;
    }

    if (imageUrl !== undefined) {
      updates.imageUrl = imageUrl || '';
    }

    if (category !== undefined) {
      if (!CATEGORIES.includes(category)) {
        return res.status(400).json({
          error: 'Catégorie invalide.'
        });
      }

      updates.category = category;
    }


    if (pickupStart !== undefined) {
      if (pickupStart && !TIME_RE.test(pickupStart)) {
        return res.status(400).json({
          error: 'Heure de début invalide.'
        });
      }

      updates.pickupStart = pickupStart || null;
    }

    if (pickupEnd !== undefined) {
      if (pickupEnd && !TIME_RE.test(pickupEnd)) {
        return res.status(400).json({
          error: 'Heure de fin invalide.'
        });
      }

      updates.pickupEnd = pickupEnd || null;
    }

    const finalStart = 'pickupStart' in updates
      ? updates.pickupStart
      : offer.pickupStart;

    const finalEnd = 'pickupEnd' in updates
      ? updates.pickupEnd
      : offer.pickupEnd;

    if (finalStart && finalEnd && finalEnd <= finalStart) {
      return res.status(400).json({
        error: "L'heure de fin doit être après l'heure de début."
      });
    }


    if (price !== undefined) {
      if (!Number.isFinite(Number(price)) || Number(price) < 0) {
        return res.status(400).json({
          error: 'Prix invalide.'
        });
      }

      updates.price = Number(price);
    }


    if (originalPrice !== undefined) {
      if (
        !Number.isFinite(Number(originalPrice)) ||
        Number(originalPrice) < 0
      ) {
        return res.status(400).json({
          error: 'Prix original invalide.'
        });
      }

      updates.originalPrice = Number(originalPrice);
    }

    const finalPrice = 'price' in updates
      ? updates.price
      : offer.price;

    const finalOriginal = 'originalPrice' in updates
      ? updates.originalPrice
      : offer.originalPrice;

    if (finalOriginal < finalPrice) {
      return res.status(400).json({
        error: 'Le prix réduit doit être inférieur au prix initial.'
      });
    }


    if (quantity !== undefined) {
      if (
        !Number.isInteger(Number(quantity)) ||
        Number(quantity) < 0
      ) {
        return res.status(400).json({
          error: 'Quantité invalide.'
        });
      }

      updates.quantity = Number(quantity);
      updates.isAvailable =
        offer.status === 'approved' && Number(quantity) > 0;
    }

    await offerRef.update(updates);

    return res.status(200).json({
      message: 'Offre modifiée avec succès.'
    });

  } catch (error) {
    console.error('Erreur updateOffer :', error);

    return res.status(500).json({
      error: "Erreur lors de la modification de l'offre."
    });
  }
};


const deleteOffer = async (req, res) => {
  try {
    const offerRef = db.collection('offers').doc(req.params.id);
    const offerDoc = await offerRef.get();

    if (!offerDoc.exists) {
      return res.status(404).json({
        error: 'Offre introuvable.'
      });
    }

    if (offerDoc.data().merchantId !== req.user.uid) {
      return res.status(403).json({
        error: 'Vous ne pouvez pas supprimer cette offre.'
      });
    }

    await offerRef.delete();

    return res.status(200).json({
      message: 'Offre supprimée avec succès.'
    });

  } catch (error) {
    console.error('Erreur deleteOffer :', error);

    return res.status(500).json({
      error: "Erreur lors de la suppression de l'offre."
    });
  }
};

module.exports = {
  getOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer
};