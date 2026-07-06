import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, OneToMany, Index,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'product_id' })
  productId: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, nullable: true })
  category: string | null;

  @Column({ name: 'power_w', type: 'int', nullable: true })
  powerW: number | null;

  @Column({ name: 'cct_k', type: 'int', nullable: true })
  cctK: number | null;

  @Column({ name: 'power_factor', length: 20, nullable: true })
  powerFactor: string | null;

  @Column({ length: 20, nullable: true })
  cri: string | null;

  @Column({ name: 'ip_rating', length: 10, nullable: true })
  ipRating: string | null;

  @Column({ name: 'ik_rating', length: 10, nullable: true })
  ikRating: string | null;

  @Column({ length: 30, nullable: true })
  dimming: string | null;

  @Column({ name: 'led_chip', length: 100, nullable: true })
  ledChip: string | null;

  @Column({ length: 100, nullable: true })
  driver: string | null;

  @Column({ name: 'warranty_months', type: 'int', default: 60 })
  warrantyMonths: number;

  @Column({ type: 'text', nullable: true })
  application: string | null;

  @Column({ type: 'text', nullable: true })
  features: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => ProductImage, (img) => img.product, { cascade: true })
  images: ProductImage[];
}

@Entity('product_images')
export class ProductImage {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'image_id' })
  imageId: string;

  @Index()
  @Column({ name: 'product_id', type: 'bigint' })
  productId: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Product, (p) => p.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}

@Entity('batches')
export class Batch {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'batch_id' })
  batchId: string;

  @Column({ name: 'batch_code', length: 50, unique: true })
  batchCode: string;

  @Index()
  @Column({ name: 'product_id', type: 'bigint', nullable: true })
  productId: string | null;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'manufactured_at', type: 'timestamptz', nullable: true })
  manufacturedAt: Date | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
