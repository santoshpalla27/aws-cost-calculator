import { DataSource } from 'typeorm';
import { config } from './index';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: config.database.host,
    port: config.database.port,
    username: config.database.username,
    password: config.database.password,
    database: config.database.database,
    synchronize: config.nodeEnv === 'development',
    logging: config.nodeEnv === 'development',
    entities: [User, RefreshToken],
    migrations: ['src/migrations/**/*.ts'],
    subscribers: []
});