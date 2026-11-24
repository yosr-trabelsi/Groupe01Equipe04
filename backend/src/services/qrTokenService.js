
const crypto = require('crypto');

const secret = () => {
  console.log(
    '[QR DEBUG] JWT_SECRET disponible :',
    Boolean(process.env.JWT_SECRET)
  );

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET manquant dans .env');
  }

  return process.env.JWT_SECRET;
};

const sign = (orderId, orderType) =>
  crypto
    .createHmac('sha256', secret())
    .update(`${orderType}:${orderId}`)
    .digest('hex');

function createToken(orderId, orderType = 'classic') {
  return `${orderType}.${orderId}.${sign(orderId, orderType)}`;
}

function verifyToken(token) {
  if (typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [orderType, orderId, signature] = parts;

  if (
    !['classic', 'surprise'].includes(orderType) ||
    !orderId ||
    !signature
  ) {
    return null;
  }

  const expectedSignature = sign(orderId, orderType);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);

  if (
    a.length !== b.length ||
    !crypto.timingSafeEqual(a, b)
  ) {
    return null;
  }

  return { orderId, orderType };
}

async function generateOrderQr(orderId, orderType = 'classic') {
  const QRCode = require('qrcode');

  const token = createToken(orderId, orderType);

  const qrImage = await QRCode.toDataURL(token, {
    errorCorrectionLevel: 'H',
    width: 300,
  });

  return { token, qrImage };
}

module.exports = {
  createToken,
  verifyToken,
  generateOrderQr,
};
