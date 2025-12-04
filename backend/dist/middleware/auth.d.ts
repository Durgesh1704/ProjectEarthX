import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../controllers/types';
import { User } from '../shared/types';
export interface JWTPayload {
    userId: number;
    email: string;
    role: string;
}
export declare const authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const generateToken: (user: User) => string;
//# sourceMappingURL=auth.d.ts.map