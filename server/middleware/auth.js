import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { db } from '../db/store.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'aseasy_swipe_enterprise_jwt_super_secret_key_2026';

export const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
};

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access Denied: Missing or invalid Authorization header.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.users.find(u => u.id === decoded.id) || decoded;

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid session: User profile not found.' });
    }

    if (user.status === 'Blocked') {
      return res.status(403).json({ success: false, message: 'Account is Blocked due to security policies.' });
    }

    if (user.status === 'Inactive') {
      return res.status(403).json({ success: false, message: 'Account is Inactive. Please contact administrator.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session Expired: Please log in again.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Authentication Failed: Invalid security token.' });
  }
};

export const requireRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Forbidden: User role '${req.user.role}' is not authorized to access this resource. Required: ${allowedRoles.join(', ')}` 
      });
    }
    next();
  };
};
