import { User } from '../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/database';

export interface LoginResult {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  error?: string;
}

export interface RegisterResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  token?: string;
  error?: string;
}

export class AuthService {
  static async login(email: string, password: string): Promise<LoginResult> {
    try {
      // Find user by email
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  static async register(email: string, password: string, role: string = 'user'): Promise<RegisterResult> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return { success: false, error: 'User already exists' };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await User.create({
        email,
        password: hashedPassword,
        role
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        token
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  static async validateToken(token: string): Promise<{ valid: boolean; userId?: string; email?: string; role?: string } | null> {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      return {
        valid: true,
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
    } catch (error) {
      return { valid: false };
    }
  }
}