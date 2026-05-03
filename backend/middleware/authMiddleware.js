const jwt = require('jsonwebtoken');

// ✅ UNIFIED SECRET — must match authRoutes.js, adminRoutes.js, courseRoutes.js
const JWT_SECRET = process.env.JWT_SECRET || 'tnp_secret_key';

const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tnp_secret_key');
    req.userId = decoded.userId;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

module.exports = { verifyToken };