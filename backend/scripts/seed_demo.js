
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY) {
  console.error('Erreur : le fichier backend/.env est absent ou incomplet (clés Firebase).');
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});
const db = getFirestore();
const auth = getAuth();

const PASSWORD = 'Demo@2026';
const day = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// [titre, description, prix initial, prix réduit, quantité, début retrait, fin retrait]
const MERCHANTS = [
  {
    email: 'chez.nous@campussave.demo', business: 'Chez Nous', category: 'cafeteria',
    offers: [
      ["Jus d'orange pressé", 'Jus frais pressé le jour même, 33 cl.', 3.5, 2, 8, '17:00', '19:00'],
      ['Café glacé caramel', 'Café glacé onctueux au caramel.', 4.5, 2.5, 6, '17:00', '19:00'],
      ['Sandwich thon crudités', 'Baguette, thon, harissa, salade et olives.', 6, 3.5, 10, '17:00', '19:00'],
      ['Sandwich poulet fromage', 'Poulet grillé, fromage fondu et salade.', 7, 4.5, 6, '17:00', '19:00'],
      ['Pâtes sauce tomate', 'Portion de pâtes à la sauce tomate maison.', 8, 5, 5, '18:00', '20:00'],
      ['Pâtes bolognaise', 'Pâtes à la viande hachée, sauce maison.', 9, 5.5, 5, '18:00', '20:00'],
    ],
  },
  {
    email: 'pose@campussave.demo', business: 'Pose', category: 'restaurant',
    offers: [
      ['Jus de fraise', 'Jus de fraise frais, 33 cl.', 4, 2.5, 8, '17:30', '19:30'],
      ['Smoothie banane-lait', 'Smoothie crémeux banane et lait.', 5, 3, 5, '17:30', '19:30'],
      ['Sandwich escalope', 'Escalope panée, fromage, salade, mayonnaise.', 8, 5, 7, '17:30', '19:30'],
      ['Sandwich thon-olives', 'Thon, olives, œuf, salade et harissa.', 6, 3.5, 9, '17:30', '19:30'],
      ['Pâtes carbonara', 'Pâtes crémeuses aux lardons de volaille.', 9, 5.5, 4, '18:00', '20:30'],
      ['Pâtes aux légumes', 'Pâtes sautées aux légumes de saison.', 8, 5, 4, '18:00', '20:30'],
    ],
  },
  {
    email: 'express@campussave.demo', business: 'Express', category: 'restaurant',
    offers: [
      ['Malfouf poulet', 'Malfouf garni de poulet grillé et légumes.', 7, 4.5, 6, '18:00', '21:00'],
      ['Malfouf merguez', 'Malfouf aux merguez, harissa et frites.', 7, 4.5, 5, '18:00', '21:00'],
      ['Makloub viande hachée', 'Makloub viande hachée, fromage et salade.', 8, 5, 6, '18:00', '21:00'],
      ['Makloub fromage', 'Makloub au fromage fondu et olives.', 7, 4.5, 4, '18:00', '21:00'],
      ['Chapati thon', 'Chapati garni de thon, œuf et salade.', 7, 4.5, 5, '18:00', '21:00'],
      ['Chapati poulet', 'Chapati au poulet, fromage et sauce maison.', 8, 5, 5, '18:00', '21:00'],
    ],
  },
  {
    email: 'baraka@campussave.demo', business: 'Boulangerie El Baraka', category: 'boulangerie',
    offers: [
      ['Lot de 5 baguettes', 'Baguettes du jour, croustillantes.', 1.5, 1, 10, '19:00', '20:30'],
      ['Croissants x4', 'Quatre croissants au beurre.', 6, 3.5, 8, '19:00', '20:30'],
      ['Pain complet', 'Pain complet aux graines.', 2, 1.2, 6, '19:00', '20:30'],
      ['Panier viennoiseries', 'Six viennoiseries assorties.', 9, 5, 5, '19:00', '20:30'],
    ],
  },
  {
    email: 'delices@campussave.demo', business: 'Pâtisserie Les Délices', category: 'patisserie',
    offers: [
      ['Mille-feuille', 'Mille-feuille à la crème pâtissière.', 4.5, 2.5, 6, '18:00', '20:00'],
      ['Part de cake au chocolat', 'Cake moelleux au chocolat noir.', 3.5, 2, 8, '18:00', '20:00'],
      ['Boîte de makroudh (500 g)', 'Makroudh aux dattes, fait maison.', 12, 7, 4, '18:00', '20:00'],
      ['Boîte de baklawa (6 pièces)', 'Baklawa aux amandes et pistaches.', 15, 9, 3, '18:00', '20:00'],
    ],
  },
];

const STUDENTS = [
  { email: 'donia@campussave.demo', name: 'Donia Mansour' },
  { email: 'yassine@campussave.demo', name: 'Yassine Gharbi' },
  { email: 'sarra@campussave.demo', name: 'Sarra Jlassi' },
];

async function ensureAuthUser(email, name) {
  try {
    const u = await auth.getUserByEmail(email);
    await auth.updateUser(u.uid, { password: PASSWORD, displayName: name });
    return u.uid;
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    const u = await auth.createUser({ email, password: PASSWORD, displayName: name });
    return u.uid;
  }
}

async function deleteDemoOffers(uid) {
  const snap = await db.collection('offers')
    .where('merchantId', '==', uid)
    .where('demoSeed', '==', true)
    .get();
  const batch = db.batch();
  snap.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

async function seed() {
  const now = new Date().toISOString();
  let total = 0;

  for (const m of MERCHANTS) {
    const uid = await ensureAuthUser(m.email, m.business);
    await db.collection('users').doc(uid).set({
      uid, email: m.email, name: m.business, role: 'merchant',
      status: 'active', isActive: true, approvalStatus: 'approved',
      createdAt: now, demoSeed: true,
    }, { merge: true });
    await db.collection('merchants').doc(uid).set({
      uid, businessName: m.business, category: m.category,
      approvalStatus: 'approved', approvedAt: now, createdAt: now, demoSeed: true,
    }, { merge: true });

    await deleteDemoOffers(uid);
    const batch = db.batch();
    m.offers.forEach(([title, description, originalPrice, price, quantity, pickupStart, pickupEnd], i) => {
      batch.set(db.collection('offers').doc(), {
        merchantId: uid, businessName: m.business,
        title, description, price, originalPrice, quantity,
        expirationDate: day(1 + (i % 3)),
        category: m.category, imageUrl: '',
        pickupStart, pickupEnd,
        isAvailable: true, createdAt: now, demoSeed: true,
      });
      total++;
    });
    await batch.commit();
    console.log('OK  ' + m.business + ' (' + m.offers.length + ' offres)');
  }

  for (const s of STUDENTS) {
    const sUid = await ensureAuthUser(s.email, s.name);
    await db.collection('users').doc(sUid).set({
      uid: sUid, email: s.email, name: s.name, role: 'student',
      status: 'active', isActive: true, ecoPoints: 0, createdAt: now, demoSeed: true,
    }, { merge: true });
    console.log('OK  ' + s.name);
  }
  console.log('\nTerminé : ' + total + ' offres. Mot de passe de tous les comptes : ' + PASSWORD);
}

async function clean() {
  const all = [...MERCHANTS, ...STUDENTS, { email: 'etudiant@campussave.demo' }];
  for (const m of all) {
    let uid;
    try { uid = (await auth.getUserByEmail(m.email)).uid; } catch (e) { continue; }
    await deleteDemoOffers(uid);
    await db.collection('users').doc(uid).delete();
    await db.collection('merchants').doc(uid).delete();
    await auth.deleteUser(uid);
    console.log('Supprimé : ' + m.email);
  }
  console.log('Nettoyage terminé.');
}

(async () => {
  if (process.argv[2] === 'clean') await clean();
  else await seed();
  process.exit(0);
})().catch((e) => {
  console.error('Erreur : ' + e.message);
  process.exit(1);
});