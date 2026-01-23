import { UserRole } from '../enums/user.enum';

/**
 * User entity type
 */
export interface User {
  id: string;
  email: string;
  username: string;
  password: string;
  name?: string | null;
  avatar?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User without password (for responses)
 */
export type UserPublic = Omit<User, 'password'>;

/**
 * JWT Payload
 */
export interface JwtPayload {
  sub: string; // userId
  email: string;
  username: string;
}

/**
 * Request with user
 */
export interface RequestWithUser extends Request {
  user: UserPublic;
}

