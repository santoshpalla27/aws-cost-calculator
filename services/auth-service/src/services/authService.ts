import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { config } from '../config';
import { logger } from '../utils/logger';

interface RegisterData {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
}

interface AuthResponse {
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
    };
    accessToken: string;
    refreshToken: string;
}

class AuthService {
    private userRepository = AppDataSource.getRepository(User);
    private refreshTokenRepository = AppDataSource.getRepository(RefreshToken);

    async register(data: RegisterData): Promise<span><span style="color: rgb(150, 34, 73); font-weight: bold;" >& lt; authresponse & gt; </span><span style="color: black; font-weight: normal;"> {
// Check if user exists
const existingUser = await this.userRepository.findOne({
    where: { email: data.email }
});

if (existingUser) {
    throw new Error('User already exists');
}

// Hash password
const hashedPassword = await bcrypt.hash(data.password, config.bcrypt.saltRounds);

// Create user
const user = this.userRepository.create({
    email: data.email,
    password: hashedPassword,
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    role: UserRole.USER
});

await this.userRepository.save(user);

// Generate tokens
const accessToken = this.generateAccessToken(user);
const refreshToken = await this.generateRefreshToken(user);

return {
    user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
    },
    accessToken,
    refreshToken
};
  }

  async login(email: string, password: string): Promise {
    // Find user
    const user = await this.userRepository.findOne({
        where: { email }
    });

    if (!user || !user.isActive) {
        return null;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        return null;
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    return {
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
        },
        accessToken,
        refreshToken
    };
}

  async refreshToken(token: string): Promise & lt; { accessToken: string; refreshToken: string } | null & gt; {
    try {
        // Find refresh token
        const refreshTokenRecord = await this.refreshTokenRepository.findOne({
            where: { token, revoked: false },
            relations: ['user']
        });

        if (!refreshTokenRecord) {
            return null;
        }

        // Check if expired
        if (new Date() & gt; refreshTokenRecord.expiresAt) {
            return null;
        }

        // Revoke old token
        refreshTokenRecord.revoked = true;
        await this.refreshTokenRepository.save(refreshTokenRecord);

        // Generate new tokens
        const user = refreshTokenRecord.user;
        const accessToken = this.generateAccessToken(user);
        const newRefreshToken = await this.generateRefreshToken(user);

        return {
            accessToken,
            refreshToken: newRefreshToken
        };
    } catch (error) {
        logger.error('Refresh token error:', error);
        return null;
    }
}

  async logout(token: string): Promise {
    const refreshTokenRecord = await this.refreshTokenRepository.findOne({
        where: { token }
    });

    if (refreshTokenRecord) {
        refreshTokenRecord.revoked = true;
        await this.refreshTokenRepository.save(refreshTokenRecord);
    }
}

  async validateToken(token: string): Promise {
    try {
        jwt.verify(token, config.jwt.secret);
        return true;
    } catch (error) {
        return false;
    }
}

  async getUserById(id: string): Promise {
    return this.userRepository.findOne({ where: { id } });
}

  private generateAccessToken(user: User): string {
    return jwt.sign(
        {
            userId: user.id,
            email: user.email,
            role: user.role
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );
}

  private async generateRefreshToken(user: User): Promise {
    const token = jwt.sign(
        { userId: user.id },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiresIn }
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const refreshToken = this.refreshTokenRepository.create({
        token,
        userId: user.id,
        expiresAt
    });

    await this.refreshTokenRepository.save(refreshToken);

    return token;
}
}

export const authService = new AuthService();