import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as dotenv } from 'dotenv';
import { Role, Permission, RolePermission, User } from '../entities/identity.entities';
import { Product, ProductImage, Batch } from '../entities/catalog.entities';
import { Light, QrCode, Warranty, MaintenanceLog } from '../entities/tracking.entities';
import { Init1710000000000 } from './migrations/1710000000000-Init';

dotenv();

export const entities = [
  Role, Permission, RolePermission, User,
  Product, ProductImage, Batch,
  Light, QrCode, Warranty, MaintenanceLog,
];

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'mdc',
  password: process.env.DB_PASSWORD || 'mdc',
  database: process.env.DB_DATABASE || 'mdc_lms',
  entities,
  migrations: [Init1710000000000],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production' ? ['error', 'warn'] : ['error'],
});
