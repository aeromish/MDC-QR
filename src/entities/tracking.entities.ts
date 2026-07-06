import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Product, Batch } from './catalog.entities';

export type LightStatus = 'in_stock' | 'sold' | 'installed' | 'maintenance' | 'faulty';
export type WarrantyStatus = 'inactive' | 'active' | 'expired' | 'void';
export type QrState = 'created' | 'activated' | 'assigned';
export type MaintenanceType =
  | 'inspection' | 'repair' | 'replacement' | 'installation' | 'other';

@Entity('lights')
export class Light {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'light_id' })
  lightId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, nullable: true })
  location: string | null;

  @Index()
  @Column({ type: 'enum', enum: ['in_stock', 'sold', 'installed', 'maintenance', 'faulty'], default: 'in_stock' })
  status: LightStatus;

  @Column({ name: 'installed_at', type: 'timestamptz', nullable: true })
  installedAt: Date | null;

  @Index()
  @Column({ name: 'product_id', type: 'bigint', nullable: true })
  productId: string | null;

  @Index()
  @Column({ name: 'batch_id', type: 'bigint', nullable: true })
  batchId: string | null;

  @ManyToOne(() => Product, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product: Product | null;

  @ManyToOne(() => Batch, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'batch_id' })
  batch: Batch | null;
}

@Entity('qr_codes')
export class QrCode {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'qr_code_id' })
  qrCodeId: string;

  @Column({ name: 'qr_code_value', length: 255, unique: true })
  qrCodeValue: string;

  @Index()
  @Column({ name: 'light_id', type: 'bigint' })
  lightId: string;

  @Index()
  @Column({ type: 'enum', enum: ['created', 'activated', 'assigned'], default: 'created' })
  state: QrState;

  @Column({ name: 'activated_at', type: 'timestamptz', nullable: true })
  activatedAt: Date | null;

  @Column({ name: 'voided_at', type: 'timestamptz', nullable: true })
  voidedAt: Date | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Light, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'light_id' })
  light: Light;
}

@Entity('warranties')
export class Warranty {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'warranty_id' })
  warrantyId: string;

  @Column({ name: 'light_id', type: 'bigint', unique: true })
  lightId: string;

  @Column({ name: 'customer_name', length: 255, nullable: true })
  customerName: string | null;

  @Index()
  @Column({ name: 'customer_phone', length: 30, nullable: true })
  customerPhone: string | null;

  @Column({ name: 'customer_email', length: 255, nullable: true })
  customerEmail: string | null;

  @Index()
  @Column({ type: 'enum', enum: ['inactive', 'active', 'expired', 'void'], default: 'inactive' })
  status: WarrantyStatus;

  @Column({ name: 'activated_at', type: 'timestamptz', nullable: true })
  activatedAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Light, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'light_id' })
  light: Light;
}

@Entity('maintenance_logs')
export class MaintenanceLog {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'maintenance_log_id' })
  maintenanceLogId: string;

  @Index()
  @Column({ name: 'light_id', type: 'bigint' })
  lightId: string;

  @Index()
  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId: string | null;

  @Column({ name: 'maintenance_type', type: 'enum', enum: ['inspection', 'repair', 'replacement', 'installation', 'other'], default: 'other' })
  maintenanceType: MaintenanceType;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @Column({ name: 'performed_at', type: 'timestamptz', nullable: true })
  performedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
