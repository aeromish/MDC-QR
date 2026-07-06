import {
  Entity, PrimaryGeneratedColumn, PrimaryColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'role_id' })
  roleId: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255, nullable: true })
  description: string | null;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'permission_id' })
  permissionId: string;

  @Column({ length: 60, unique: true })
  code: string;

  @Column({ length: 255, nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

// Khoa chinh ghep (role_id, permission_id). Truy van chu yeu bang raw SQL.
@Entity('role_permissions')
export class RolePermission {
  @PrimaryColumn({ name: 'role_id', type: 'bigint' })
  roleId: string;

  @PrimaryColumn({ name: 'permission_id', type: 'bigint' })
  permissionId: string;
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'user_id' })
  userId: string;

  @Column({ length: 100, unique: true })
  username: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', length: 255, select: false })
  passwordHash: string;

  @Column({ name: 'role_id', type: 'bigint' })
  roleId: string;

  @ManyToOne(() => Role, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
