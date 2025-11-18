import { Controller, Post, Body, UseGuards, Get, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.fullName
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('profile')
  getProfile(@Req() req: Request) {
    return req.user;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Res({ passthrough: true }) response: Response, @Body() refreshTokenDto: RefreshTokenDto) {
    try {
      const decoded = await this.authService.validateRefreshToken(refreshTokenDto.refreshToken);
      const newAccessToken = await this.authService.generateNewAccessToken(decoded.sub, decoded.email);
      
      return {
        access_token: newAccessToken
      };
    } catch (error) {
      return {
        error: 'Invalid refresh token'
      };
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    // In a real implementation, you would invalidate the refresh token in the database
    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    return { message: 'Logged out successfully' };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: Request) {
    // This endpoint will be handled by the GoogleStrategy
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    // In a real implementation, you would create or find a user based on the Google profile
    // and return an access token
    const user = req.user;
    const payload = { email: user.email, sub: user.id };
    const token = this.authService.generateNewAccessToken(user.id, user.email);
    
    // Redirect to frontend with token (in a real app, you'd probably set a cookie or redirect with token)
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${token}`);
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth(@Req() req: Request) {
    // This endpoint will be handled by the GithubStrategy
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthCallback(@Req() req: Request, @Res() res: Response) {
    // In a real implementation, you would create or find a user based on the GitHub profile
    // and return an access token
    const user = req.user;
    const payload = { email: user.email, sub: user.id };
    const token = this.authService.generateNewAccessToken(user.id, user.email);
    
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${token}`);
  }
}