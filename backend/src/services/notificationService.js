
const { FieldValue } = require('firebase-admin/firestore');
const { db, messaging } = require('../config/firebase');

const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

async function sendToUser({
  uid,
  title,
  body,
  data = {},
  database = db,
  messagingClient = messaging,
}) {
  if (!database || !uid) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const userRef = database.collection('users').doc(uid);

  const notificationRef = await userRef
    .collection('notifications')
    .add({
      title,
      body,
      data: Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          String(value),
        ])
      ),
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

  if (!messagingClient) {
    return {
      sent: 0,
      failed: 0,
      saved: true,
      notificationId: notificationRef.id,
    };
  }

  const userDoc = await userRef.get();

  const tokens = [...new Set(userDoc.data()?.fcmTokens || [])]
    .filter(Boolean)
    .slice(0, 500);

  if (!tokens.length) {
    return {
      sent: 0,
      failed: 0,
      skipped: true,
      saved: true,
      notificationId: notificationRef.id,
    };
  }

  const response = await messagingClient.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        String(value),
      ])
    ),
  });

  const invalidTokens = [];

  response.responses.forEach((result, index) => {
    if (
      result.error &&
      INVALID_TOKEN_CODES.has(result.error.code)
    ) {
      invalidTokens.push(tokens[index]);
    }
  });

  if (invalidTokens.length) {
    await userRef.update({
      fcmTokens: FieldValue.arrayRemove(...invalidTokens),
    });
  }

  return {
    sent: response.successCount,
    failed: response.failureCount,
    saved: true,
    notificationId: notificationRef.id,
  };
}

module.exports = { sendToUser };