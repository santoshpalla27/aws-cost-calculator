import request from 'supertest';
import app from '../index';

describe('Health Check', () => {
  it('should return healthy status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('service', 'api-gateway');
  });
});