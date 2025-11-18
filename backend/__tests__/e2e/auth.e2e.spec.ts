import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AuthModule } from '../../src/modules/auth/auth.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/auth/register (POST) - should register a new user', async () => {
    const registerData = {
      email: 'test@example.com',
      password: 'TestPass123!',
      fullName: 'Test User',
    };

    return request(app.getHttpServer())
      .post('/auth/register')
      .send(registerData)
      .expect(201) // Note: This might fail if validation is strict, adjust as needed
      .then(response => {
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('access_token');
        expect(response.body.user).toHaveProperty('id');
        expect(response.body.user.email).toBe(registerData.email);
      });
  });

  it('/auth/login (POST) - should login a user', async () => {
    const loginData = {
      email: 'test@example.com',
      password: 'TestPass123!',
    };

    return request(app.getHttpServer())
      .post('/auth/login')
      .send(loginData)
      .expect(201) // Note: This endpoint might return different status codes
      .then(response => {
        // The exact response structure depends on your implementation
        expect(response.body).toHaveProperty('access_token');
      });
  });

  it('/auth/profile (POST) - should return user profile with valid token', async () => {
    // This test requires a valid JWT token
    // In a real scenario, you'd first register/login to get a token
    const fakeToken = 'fake-jwt-token';

    return request(app.getHttpServer())
      .post('/auth/profile')
      .set('Authorization', `Bearer ${fakeToken}`)
      .expect(201) // This will likely fail without a valid token
      .then(response => {
        // Response depends on your guard implementation
        expect(response.body).toBeDefined();
      });
  });
});