import { Request, Response, NextFunction } from 'express';
import { SupabaseService } from '../services/supabaseService.js';

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

// Augment Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Express middleware to enforce Supabase Auth on protected routes.
 * Verifies the JWT session token passed in Authorization: Bearer <token>.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  let token = '';

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token.trim();
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in to access your data.',
    });
    return;
  }

  try {
    const verifiedUser = await SupabaseService.verifyUserToken(token);
    if (!verifiedUser) {
      res.status(401).json({
        success: false,
        error: 'Session invalid or expired. Please sign in again.',
      });
      return;
    }

    req.user = verifiedUser;
    next();
  } catch (err: any) {
    console.error('[AuthMiddleware] Error verifying token:', err.message);
    res.status(401).json({
      success: false,
      error: 'Failed to verify session token.',
    });
  }
}
