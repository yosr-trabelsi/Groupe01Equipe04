require('dotenv').config();

console.log(
  'JWT_SECRET disponible au démarrage :',
  Boolean(process.env.JWT_SECRET)
);

const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});