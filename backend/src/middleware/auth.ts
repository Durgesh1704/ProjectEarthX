import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../controllers/types';
import { db } from '../config/database';
import { User } from '../shared/types';

const JWT_SECRET = process.env.JWT_SECRET || 'earthx_dev_secret_key_change_in_production';

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. No token provided.'
      });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    const result = await db.query(
      'SELECT id, uuid, email, username, full_name, role, eiu_balance, wallet_address, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      res.status(401).json({
        success: false,
        error: 'Invalid or inactive user.'
      });
      return;
    }

    req.user = result.rows[0] as User;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({
        success: false,
        error: 'Invalid or expired token.'
      });
      return;
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error.'
    });
  }
};

export const generateToken = (user: User): string => {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};
