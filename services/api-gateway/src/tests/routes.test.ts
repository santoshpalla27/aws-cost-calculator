import request from 'supertest';
import app from '../index';

describe('API Routes', () => {
  describe('Authentication Required Routes', () => {
    it('should return 401 without token', async () => {
      await request(app)
        .get('/api/reports')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app)
        .get('/api/reports')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});