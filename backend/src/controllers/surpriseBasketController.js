
const { db } = require('../config/firebase');

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const COLLECTION = 'surpriseBaskets';


const getSurpriseBaskets = async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTION)
      .where('status', '==', 'active')
      .where('remainingQuantity', '>', 0)
      .get();

    const baskets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.status(200).json(baskets);
  } catch (error) {
    console.error('Erreur getSurpriseBaskets :', error);

    return res.status(500).json({
      error: 'Erreur lors de la récupération des paniers surprises.'
    });
  }
};


const getMySurpriseBaskets = async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTION)
      .where('merchantId', '==', req.user.uid)
      .get();

    const baskets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.status(200).json(baskets);
  } catch (error) {
    console.error('Erreur getMySurpriseBaskets :', error);

    return res.status(500).json({
      error: 'Erreur lors de la récupération de vos paniers.'
    });
  }
};


const createSurpriseBasket = async (req, res) => {
  try {
    const {
      title,
      description,
      originalPrice,
      discountedPrice,
      quantity,
      category,
      imageUrl,
      pickupStart,
      pickupEnd
    } = req.body;

    if (
      !title ||
      originalPrice === undefined ||
      discountedPrice === undefined ||
      quantity === undefined
    ) {
      return res.status(400).json({
        error: 'Informations obligatoires manquantes.'
      });
    }

    const original = Number(originalPrice);
    const discounted = Number(discountedPrice);
    const qty = Number(quantity);

    if (
      !Number.isFinite(original) ||
      !Number.isFinite(discounted) ||
      !Number.isInteger(qty) ||
      original <= 0 ||
      discounted < 0 ||
      discounted >= original ||
      qty <= 0
    ) {
      return res.status(400).json({
        error: 'Prix ou quantité invalide.'
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

    const basketData = {
      merchantId: req.user.uid,
      businessName: merchantDoc.data().businessName || '',
      title: String(title).trim(),
      description: description || '',
      originalPrice: original,
      discountedPrice: discounted,
      quantity: qty,
      remainingQuantity: qty,
      category: category || 'autre',
      imageUrl: imageUrl || '',
      pickupStart: pickupStart || null,
      pickupEnd: pickupEnd || null,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    const basketRef = await db.collection(COLLECTION).add(basketData);

    return res.status(201).json({
      message: 'Panier surprise publié avec succès.',
      basketId: basketRef.id
    });
  } catch (error) {
    console.error('Erreur createSurpriseBasket :', error);

    return res.status(500).json({
      error: 'Erreur lors de la création du panier surprise.'
    });
  }
};


const updateSurpriseBasket = async (req, res) => {
  try {
    const basketRef = db.collection(COLLECTION).doc(req.params.id);
    const basketDoc = await basketRef.get();

    if (!basketDoc.exists) {
      return res.status(404).json({
        error: 'Panier surprise introuvable.'
      });
    }

    const basket = basketDoc.data();

    if (basket.merchantId !== req.user.uid) {
      return res.status(403).json({
        error: 'Vous ne pouvez pas modifier ce panier.'
      });
    }

    const {
      title,
      description,
      originalPrice,
      discountedPrice,
      quantity,
      category,
      imageUrl,
      pickupStart,
      pickupEnd
    } = req.body;

    const updates = {};

    if (title !== undefined) {
      if (!String(title).trim()) {
        return res.status(400).json({ error: 'Titre invalide.' });
      }
      updates.title = String(title).trim();
    }

    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl || '';

    if (originalPrice !== undefined) {
      if (!Number.isFinite(Number(originalPrice)) || Number(originalPrice) <= 0) {
        return res.status(400).json({ error: 'Prix initial invalide.' });
      }
      updates.originalPrice = Number(originalPrice);
    }

    if (discountedPrice !== undefined) {
      if (!Number.isFinite(Number(discountedPrice)) || Number(discountedPrice) < 0) {
        return res.status(400).json({ error: 'Prix réduit invalide.' });
      }
      updates.discountedPrice = Number(discountedPrice);
    }

    const finalOriginal = updates.originalPrice ?? basket.originalPrice;
    const finalDiscounted = updates.discountedPrice ?? basket.discountedPrice;

    if (finalDiscounted >= finalOriginal) {
      return res.status(400).json({
        error: 'Le prix réduit doit être inférieur au prix initial.'
      });
    }

    if (pickupStart !== undefined) {
      if (pickupStart && !TIME_RE.test(pickupStart)) {
        return res.status(400).json({ error: 'Heure de début invalide.' });
      }
      updates.pickupStart = pickupStart || null;
    }

    if (pickupEnd !== undefined) {
      if (pickupEnd && !TIME_RE.test(pickupEnd)) {
        return res.status(400).json({ error: 'Heure de fin invalide.' });
      }
      updates.pickupEnd = pickupEnd || null;
    }

    const finalStart = updates.pickupStart !== undefined
      ? updates.pickupStart
      : basket.pickupStart;

    const finalEnd = updates.pickupEnd !== undefined
      ? updates.pickupEnd
      : basket.pickupEnd;

    if (finalStart && finalEnd && finalEnd <= finalStart) {
      return res.status(400).json({
        error: "L'heure de fin doit être après l'heure de début."
      });
    }

    if (quantity !== undefined) {
      const newQuantity = Number(quantity);
      const alreadyReserved = basket.quantity - basket.remainingQuantity;

      if (
        !Number.isInteger(newQuantity) ||
        newQuantity < alreadyReserved
      ) {
        return res.status(400).json({
          error: 'La quantité ne peut pas être inférieure aux paniers déjà réservés.'
        });
      }

      updates.quantity = newQuantity;
      updates.remainingQuantity = newQuantity - alreadyReserved;
    }

    await basketRef.update(updates);

    return res.status(200).json({
      message: 'Panier surprise modifié avec succès.'
    });
  } catch (error) {
    console.error('Erreur updateSurpriseBasket :', error);

    return res.status(500).json({
      error: 'Erreur lors de la modification du panier.'
    });
  }
};


const deleteSurpriseBasket = async (req, res) => {
  try {
    const basketRef = db.collection(COLLECTION).doc(req.params.id);
    const basketDoc = await basketRef.get();

    if (!basketDoc.exists) {
      return res.status(404).json({
        error: 'Panier surprise introuvable.'
      });
    }

    if (basketDoc.data().merchantId !== req.user.uid) {
      return res.status(403).json({
        error: 'Vous ne pouvez pas supprimer ce panier.'
      });
    }

    await basketRef.delete();

    return res.status(200).json({
      message: 'Panier surprise supprimé avec succès.'
    });
  } catch (error) {
    console.error('Erreur deleteSurpriseBasket :', error);

    return res.status(500).json({
      error: 'Erreur lors de la suppression du panier.'
    });
  }
};

module.exports = {
  getSurpriseBaskets,
  getMySurpriseBaskets,
  createSurpriseBasket,
  updateSurpriseBasket,
  deleteSurpriseBasket
};