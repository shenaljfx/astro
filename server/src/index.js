require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Firebase initialization
const { initFirebase } = require('./config/firebase');
initFirebase();

const nakathRoutes = require('./routes/nakath');
const porondamRoutes = require('./routes/porondam');
const chatRoutes = require('./routes/chat');
const horoscopeRoutes = require('./routes/horoscope');
const shareRoutes = require('./routes/share');
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/auth');
const rectificationRoutes = require('./routes/rectification');
const predictionRoutes = require('./routes/predictions');
const tokensRoutes = require('./routes/tokens');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// CORS must be applied before helmet so browsers can reach the API
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false,          // Disable CSP in dev (blocks cross-origin fetch)
  crossOriginResourcePolicy: false,      // Allow cross-origin resource loading
  crossOriginOpenerPolicy: false,
}));
app.use(morgan('dev'));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Nakath AI',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/nakath', nakathRoutes);
app.use('/api/porondam', porondamRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/horoscope', horoscopeRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/rectification', rectificationRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/tokens', tokensRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`🪐 Nakath AI Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   AI Provider: ${process.env.AI_PROVIDER || 'openai'}`);
});

module.exports = app;
