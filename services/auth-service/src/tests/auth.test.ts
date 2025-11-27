import { AuthService } from '../services/authService';

describe('AuthService', () => {
  describe('register', () => {
    it('should register a new user', async () => {
      const result = await AuthService.register('test@example.com', 'password123', 'user');
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      await AuthService.register('test2@example.com', 'password123', 'user');
      const result = await AuthService.login('test2@example.com', 'password123');
      
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
    });

    it('should fail with invalid credentials', async () => {
      const result = await AuthService.login('nonexistent@example.com', 'wrongpassword');
      expect(result.success).toBe(false);
    });
  });
});