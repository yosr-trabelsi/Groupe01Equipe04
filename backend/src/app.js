require('dotenv').config();
const express = require('express');
const corsConfig = require('./config/cors');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(corsConfig);
app.use(express.json());

app.get('/', (req, res) => res.json({ message: 'CampusSave API OK' }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/merchants', require('./routes/merchantRoutes'));
app.use('/api/offers', require('./routes/offerRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/qr', require('./routes/qrRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;