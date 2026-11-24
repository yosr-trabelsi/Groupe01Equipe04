require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env'),
});

const admin = require('firebase-admin');
const firebase = require('../src/config/firebase');

const { db, firebaseConfigured } = firebase;
if (!firebaseConfigured || !db) {
  console.error('Firebase est désactivé. Vérifie FIREBASE_ENABLED=true dans backend/.env');
  process.exit(1);
}
const auth = firebase.auth || admin.auth();

const PASSWORD = 'Demo@2026';

// Mêmes uid que dans le fichier de données de l'équipe.
const MERCHANTS = [
  { uid: 'seed_cafe_chez_nous_001', email: 'cafe.chez.nous@campussave.demo', name: 'Café Chez Nous', phone: '90405341' },
  { uid: 'seed_cafe_virage_001', email: 'cafe.virage@campussave.demo', name: 'Café Virage', phone: '' },
  { uid: 'seed_gharbi_henda_001', email: 'gharbi.henda@campussave.demo', name: 'Gharbi Henda', phone: '' },
  { uid: 'seed_malfouf_essect_001', email: 'malfouf.essect@campussave.demo', name: 'Malfouf devant ESSECT', phone: '' },
];

const STUDENTS = [
  { email: 'donia@campussave.demo', name: 'Donia' },
  { email: 'yassine@campussave.demo', name: 'Yassine' },
  { email: 'sarra@campussave.demo', name: 'Sarra' },
];

const notFound = (e) => e && e.code === 'auth/user-not-found';

async function ensureAuthUser({ uid, email, name }) {
  if (uid) {
    try {
      await auth.getUser(uid);
      await auth.updateUser(uid, { email, password: PASSWORD, displayName: name });
      return uid;
    } catch (e) {
      if (!notFound(e)) throw e;
    }
    await auth.createUser({ uid, email, password: PASSWORD, displayName: name, emailVerified: true });
    return uid;
  }
  try {
    const u = await auth.getUserByEmail(email);
    await auth.updateUser(u.uid, { password: PASSWORD, displayName: name });
    return u.uid;
  } catch (e) {
    if (!notFound(e)) throw e;
  }
  const u = await auth.createUser({ email, password: PASSWORD, displayName: name, emailVerified: true });
  return u.uid;
}

async function ensureUserDoc({ uid, email, name, phone, role }) {
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  if (snap.exists && snap.data().demoSeed !== true) {
    throw new Error(`users/${uid} existe déjà et n'est pas une donnée de démo. Aucune modification.`);
  }
  const data = {
    uid,
    name,
    email,
    phone: phone || '',
    role,
    approvalStatus: 'approved',
    isActive: true,
    demoSeed: true,
    updatedAt: new Date().toISOString(),
  };
  if (!snap.exists) {
    data.createdAt = new Date().toISOString();
    if (role === 'student') data.ecoPoints = 0;
  }
  await ref.set(data, { merge: true });
}

async function run() {
  for (const m of MERCHANTS) {
    const uid = await ensureAuthUser(m);
    await ensureUserDoc({ ...m, uid, role: 'merchant' });
    console.log(`Commerçant : ${m.email}`);
  }
  for (const s of STUDENTS) {
    const uid = await ensureAuthUser(s);
    await ensureUserDoc({ ...s, uid, role: 'student' });
    console.log(`Étudiant : ${s.email}`);
  }
  console.log(`\nTerminé. Mot de passe de tous les comptes : ${PASSWORD}`);
}

async function clean() {
  const all = [...MERCHANTS, ...STUDENTS];
  for (const a of all) {
    let uid = a.uid;
    try {
      if (!uid) uid = (await auth.getUserByEmail(a.email)).uid;
      await auth.deleteUser(uid);
    } catch (e) {
      if (!notFound(e)) throw e;
    }
    if (uid) {
      const ref = db.collection('users').doc(uid);
      const snap = await ref.get();
      if (snap.exists && snap.data().demoSeed === true) await ref.delete();
    }
    console.log(`Supprimé : ${a.email}`);
  }
}

(process.argv[2] === 'clean' ? clean() : run())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erreur :', err.message);
    process.exit(1);
  });