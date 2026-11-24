
const nodemailer = require('nodemailer');

const getTransporter = () => {
  const user = process.env.EMAIL_USER;
  const password = process.env.EMAIL_APP_PASSWORD;

  if (!user || !password) {
    throw new Error('Configuration Gmail manquante dans .env');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass: password,
    },
  });
};

const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) {
    throw new Error('Adresse e-mail du destinataire manquante');
  }

  const transporter = getTransporter();

  return transporter.sendMail({
    from: `"CampusSave" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
};

const sendOrderDecisionEmail = async ({
  to,
  studentName,
  businessName,
  orderTitle,
  accepted,
}) => {
  const subject = accepted
    ? 'Votre réservation a été acceptée - CampusSave'
    : 'Votre réservation a été refusée - CampusSave';

  const decision = accepted ? 'acceptée' : 'refusée';

  const text = `Bonjour ${studentName || ''},

Votre réservation auprès de ${businessName || 'notre commerçant'} pour "${orderTitle}" a été ${decision}.

${accepted
    ? 'Vous pouvez maintenant procéder au paiement depuis votre espace CampusSave.'
    : 'Vous pouvez consulter les autres offres disponibles sur CampusSave.'}

Merci d'utiliser CampusSave !`;

  return sendEmail({
    to,
    subject,
    text,
  });
};

const sendPaymentConfirmationEmail = async ({
  to,
  studentName,
  businessName,
  orderTitle,
  amount,
}) => {
  const text = `Bonjour ${studentName || ''},

Votre paiement a été confirmé !

Commande : ${orderTitle}
Commerçant : ${businessName || 'CampusSave'}
Montant : ${Number(amount || 0).toFixed(2)} DT

Votre QR Code est disponible dans votre espace CampusSave. Présentez-le au commerçant lors de la récupération.

Merci d'utiliser CampusSave !`;

  return sendEmail({
    to,
    subject: 'Paiement confirmé - CampusSave',
    text,
  });
};

module.exports = {
  sendEmail,
  sendOrderDecisionEmail,
  sendPaymentConfirmationEmail,
};
