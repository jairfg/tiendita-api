import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity.js';
import { UserStatus } from '../user.enums.js';

@Entity({ name: 'users' })
@Index('IDX_users_tenant_id', ['tenantId'])
@Index('UQ_users_email', ['email'], {
  unique: true,
})
@Check('CHK_users_email_normalized', `"email" = lower(btrim("email"))`)
@Check('CHK_users_email_format', `"email" ~ '^[^@]+@[^@]+$'`)
@Check('CHK_users_status', `"status" IN ('ACTIVE', 'DISABLED')`)
@Check('CHK_users_first_name_not_blank', `btrim("first_name") <> ''`)
@Check('CHK_users_last_name_not_blank', `btrim("last_name") <> ''`)
export class User {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_users',
  })
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'tenant_id',
    foreignKeyConstraintName: 'FK_users_tenant',
  })
  tenant?: Tenant;

  @Column({ type: 'varchar', length: 80 })
  firstName: string;

  @Column({ type: 'varchar', length: 120 })
  lastName: string;

  @Column({ type: 'varchar', length: 254 })
  email: string;

  @Column({ type: 'text', select: false })
  passwordHash: string;

  @Column({
    type: 'varchar',
    length: 16,
    default: UserStatus.Active,
  })
  status: UserStatus;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  lastLoginAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
