

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s]{8,15}$/;

function checkField(field, value, rule) {
  const errors = [];

  if (rule.type === 'email') {
    if (typeof value !== 'string' || !EMAIL_RE.test(value)) {
      errors.push(`${field} doit être une adresse email valide`);
    }
  } else if (rule.type === 'phone') {
    if (typeof value !== 'string' || !PHONE_RE.test(value)) {
      errors.push(`${field} doit être un numéro de téléphone valide`);
    }
  } else if (rule.type === 'string') {
    if (typeof value !== 'string') {
      errors.push(`${field} doit être une chaîne de caractères`);
    } else {
      const len = rule.noTrim ? value.length : value.trim().length;

      if (rule.min && len < rule.min) {
        errors.push(`${field} doit contenir au moins ${rule.min} caractères`);
      }

      if (rule.max && len > rule.max) {
        errors.push(`${field} doit contenir au plus ${rule.max} caractères`);
      }
    }
  }

  if (rule.oneOf && !rule.oneOf.includes(value)) {
    errors.push(
      `${field} doit être l'une des valeurs : ${rule.oneOf.join(', ')}`
    );
  }

  return errors;
}

function validate(rules, source = 'body') {
  return (req, res, next) => {
    const input = req[source] || {};
    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = input[field];

      const missing =
        value === undefined || value === null || value === '';

      const required =
        rule.required ||
        (rule.requiredIf &&
          input[rule.requiredIf.field] === rule.requiredIf.equals);

      if (missing) {
        if (required) {
          errors.push(`${field} est requis`);
        }
        continue;
      }

      errors.push(...checkField(field, value, rule));
    }

    if (errors.length) {
      return res.status(400).json({
        message: 'Données invalides',
        errors,
      });
    }

    next();
  };
}


const registerRules = {
  email: { type: 'email', required: true },
  password: {
    type: 'string',
    required: true,
    min: 8,
    max: 128,
    noTrim: true,
  },
  name: {
    type: 'string',
    required: true,
    min: 2,
    max: 80,
  },
  role: {
    type: 'string',
    required: true,
    oneOf: ['student', 'merchant'],
  },
  phone: { type: 'phone' },
  businessName: {
    type: 'string',
    max: 120,
    requiredIf: { field: 'role', equals: 'merchant' },
  },
  address: {
    type: 'string',
    max: 200,
    requiredIf: { field: 'role', equals: 'merchant' },
  },
};


const initPaymentRules = {
  orderId: {
    type: 'string',
    required: true,
    max: 128,
  },
  orderType: {
    type: 'string',
    oneOf: ['classic', 'surprise'],
  },
};


const qrValidateRules = {
  token: {
    type: 'string',
    required: true,
    max: 300,
  },
};


const fcmTokenRules = {
  fcmToken: {
    type: 'string',
    required: true,
    max: 4096,
  },
};

module.exports = {
  validate,
  registerRules,
  initPaymentRules,
  qrValidateRules,
  fcmTokenRules,
};
