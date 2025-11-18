import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && await bcrypt.compare(pass, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      user: { id: user.id, email: user.email, fullName: user.fullName },
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(email: string, password: string, fullName: string) {
    const existingUser = await this.usersService.findOneByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      email,
      passwordHash: hashedPassword,
      fullName,
    });
    
    const payload = { email: user.email, sub: user.id };
    return {
      user: { id: user.id, email: user.email, fullName: user.fullName },
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateRefreshToken(refreshToken: string) {
    // In a real implementation, you would check the refresh token against
    // a stored value in the database
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
      });
      return decoded;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async generateNewAccessToken(userId: string, email: string) {
    const payload = { email, sub: userId };
    return this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });
  }
}