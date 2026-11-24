
const { auth, db } = require('../config/firebase');
const { GeoPoint } = require('firebase-admin/firestore');

exports.register = async (req, res, next) => {
  const {
    email,
    password,
    name,
    role,
    phone,
    businessName,
    address,
    latitude,
    longitude,
  } = req.body;

  let created;

  try {
    created = await auth.createUser({
      email,
      password,
      displayName: name,
    });
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      return res.status(409).json({
        message: 'Cet email est déjà utilisé',
      });
    }

    if (
      err.code === 'auth/invalid-password' ||
      err.code === 'auth/invalid-email'
    ) {
      return res.status(400).json({ message: err.message });
    }

    return next(err);
  }

  try {
    const safeRole = role === 'merchant' ? 'merchant' : 'student';
    const status = safeRole === 'merchant' ? 'pending' : 'active';

    let location = null;

    if (safeRole === 'merchant') {
      const lat = Number(latitude);
      const lng = Number(longitude);

      if (
        latitude === undefined ||
        longitude === undefined ||
        latitude === '' ||
        longitude === '' ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        await auth.deleteUser(created.uid).catch(() => {});

        return res.status(400).json({
          message: 'Veuillez fournir une position GPS valide.',
        });
      }

      location = new GeoPoint(lat, lng);
    }

    const profile = {
      uid: created.uid,
      email,
      name,
      role: safeRole,
      status,
      isActive: true,
      phone: phone || null,
      createdAt: new Date().toISOString(),
      ...(safeRole === 'merchant' && {
        businessName,
        address,
        approvalStatus: 'pending',
      }),
    };

    const batch = db.batch();

    batch.set(db.collection('users').doc(created.uid), profile);

    if (safeRole === 'merchant') {
      batch.set(db.collection('merchants').doc(created.uid), {
        uid: created.uid,
        businessName,
        address,
        location,
        approvalStatus: 'pending',
        createdAt: profile.createdAt,
      });
    }

    await batch.commit();

    return res.status(201).json({
      uid: created.uid,
      role: safeRole,
      status,
    });
  } catch (err) {
    await auth.deleteUser(created.uid).catch(() => {});
    return next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const snap = await db.collection('users').doc(req.user.uid).get();

    if (!snap.exists) {
      return res.status(404).json({
        message: 'Profil introuvable',
      });
    }

    return res.json(snap.data());
  } catch (err) {
    next(err);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    const { name, phone, businessName, address } = req.body;
    const update = {};

    if (typeof name === 'string' && name.trim().length >= 2) {
      update.name = name.trim();
    }

    if (typeof phone === 'string') {
      update.phone = phone.trim() || null;
    }

    const ref = db.collection('users').doc(req.user.uid);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({
        message: 'Profil introuvable',
      });
    }

    if (snap.data().role === 'merchant') {
      if (typeof businessName === 'string') {
        update.businessName = businessName.trim();
      }

      if (typeof address === 'string') {
        update.address = address.trim();
      }
    }

    await ref.update(update);

    return res.json({
      ...snap.data(),
      ...update,
    });
  } catch (err) {
    next(err);
  }
};
