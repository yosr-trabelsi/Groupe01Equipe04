const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

const formatTnd = (v) =>
  Number(v).toFixed(3).replace(/\.?0+$/, '').replace('.', ',') + ' TND';

const shortId = (id) => '#' + String(id).slice(0, 6).toUpperCase();

// Reçu de paiement. Sans configuration SMTP, ne fait rien (le paiement n'est jamais bloqué).
async function sendPaymentReceipt({ to, name, orderId, offerTitle, quantity, totalPrice, qrImage }) {
  const t = getTransporter();
  if (!t || !to) return false;

  const hasQr = typeof qrImage === 'string' && qrImage.startsWith('data:image');
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#222">
      <h2 style="color:#2e7d32">Paiement confirmé ✅</h2>
      <p>Bonjour ${name || ''},</p>
      <p>Nous avons bien reçu votre paiement. Merci d'avoir sauvé de la nourriture !</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0;color:#666">Commande</td><td style="text-align:right"><b>${shortId(orderId)}</b></td></tr>
        <tr><td style="padding:6px 0;color:#666">Produit</td><td style="text-align:right">${offerTitle || ''}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Quantité</td><td style="text-align:right">${quantity || 1}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Total payé</td><td style="text-align:right"><b>${formatTnd(totalPrice)}</b></td></tr>
      </table>
      <p>Présentez ce QR code au commerçant lors du retrait de votre commande.</p>
      ${hasQr ? '<p style="text-align:center"><img src="cid:qrcode" alt="QR code" width="220" height="220"></p>' : '<p>Retrouvez votre QR code dans l\'application, rubrique Mes commandes.</p>'}
      <p style="color:#888;font-size:12px">CampusSave : ensemble contre le gaspillage alimentaire.</p>
    </div>`;

  await t.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: 'Paiement confirmé : commande ' + shortId(orderId),
    html,
    attachments: hasQr ? [{ filename: 'qrcode.png', path: qrImage, cid: 'qrcode' }] : [],
  });
  return true;
}

module.exports = { sendPaymentReceipt };