import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/modules/auth/auth.service';
import { UsersService } from '../src/modules/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../src/database/prisma.service';

// Mock the dependencies
const mockUsersService = {
  findOneByEmail: jest.fn(),
  create: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        PrismaService, // In a real test, you might want to mock this too
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        passwordHash: '$2b$10$fakehash',
        fullName: 'Test User',
      };

      (mockUsersService.findOneByEmail as jest.Mock).mockResolvedValue(mockUser);
      jest
        .spyOn(require('bcrypt'), 'compare')
        .mockImplementation(() => Promise.resolve(true));

      const result = await service.validateUser('test@example.com', 'password');
      
      expect(result).toEqual({
        id: '1',
        email: 'test@example.com',
        fullName: 'Test User',
      });
    });

    it('should return null if credentials are invalid', async () => {
      (mockUsersService.findOneByEmail as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password');
      
      expect(result).toBeNull();
    });
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        passwordHash: '$2b$10$fakehash',
        fullName: 'Test User',
      };

      (mockUsersService.create as jest.Mock).mockResolvedValue(mockUser);
      (mockJwtService.sign as jest.Mock).mockReturnValue('fake-jwt-token');

      const result = await service.register('test@example.com', 'password', 'Test User');
      
      expect(mockUsersService.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        passwordHash: expect.any(String), // The password should be hashed
        fullName: 'Test User',
      });
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(result).toEqual({
        user: { id: '1', email: 'test@example.com', fullName: 'Test User' },
        access_token: 'fake-jwt-token',
      });
    });
  });
});