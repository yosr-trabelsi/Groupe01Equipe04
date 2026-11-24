
const admin = require('firebase-admin');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');

const firebaseConfigured = process.env.FIREBASE_ENABLED === 'true';

let app = null;
let db = null;
let auth = null;
let messaging = null;

if (firebaseConfigured) {
  const serviceAccount = require('../../serviceAccountKey.json');

  app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
      });

  db = getFirestore(app);
  auth = getAuth(app);
  messaging = getMessaging(app);

  console.log('Firebase initialized');
} else {
  console.log('Firebase disabled in development');
}

module.exports = {
  admin,
  app,
  db,
  auth,
  messaging,
  firebaseConfigured,
};
