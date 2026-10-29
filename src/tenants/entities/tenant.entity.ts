import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantBusinessType, TenantStatus } from '../tenant.enums.js';

@Entity({ name: 'tenants' })
@Index('UQ_tenants_subdomain', ['subdomain'], {
  unique: true,
})
@Check(
  'CHK_tenants_subdomain_format',
  `"subdomain" ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'`,
)
@Check(
  'CHK_tenants_business_type',
  `"business_type" IN ('GROCERY_STORE', 'BAKERY', 'RETAIL_STORE', 'OTHER')`,
)
@Check('CHK_tenants_status', `"status" IN ('ACTIVE', 'SUSPENDED')`)
@Check(
  'CHK_tenants_primary_color_format',
  `"primary_color" IS NULL OR "primary_color" ~ '^#[0-9A-Fa-f]{6}$'`,
)
@Check('CHK_tenants_country_format', `"country" ~ '^[A-Z]{2}$'`)
@Check('CHK_tenants_currency_format', `"currency" ~ '^[A-Z]{3}$'`)
@Check('CHK_tenants_name_not_blank', `btrim("name") <> ''`)
@Check('CHK_tenants_timezone_not_blank', `btrim("timezone") <> ''`)
export class Tenant {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_tenants',
  })
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 63 })
  subdomain: string;

  @Column({ type: 'varchar', length: 32 })
  businessType: TenantBusinessType;

  @Column({ type: 'char', length: 2, default: 'PE' })
  country: string;

  @Column({ type: 'char', length: 3, default: 'PEN' })
  currency: string;

  @Column({
    type: 'varchar',
    length: 64,
    default: 'America/Lima',
  })
  timezone: string;

  @Column({
    type: 'varchar',
    length: 7,
    nullable: true,
  })
  primaryColor: string | null;

  @Column({
    type: 'varchar',
    length: 16,
    default: TenantStatus.Active,
  })
  status: TenantStatus;

  @Column({
    type: 'date',
    nullable: true,
  })
  paidUntil: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
