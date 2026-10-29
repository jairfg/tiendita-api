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
import { Tenant } from './tenant.entity.js';

@Entity({ name: 'locations' })
@Index('IDX_locations_tenant_id', ['tenantId'])
@Index('UQ_locations_main_per_tenant', ['tenantId'], {
  unique: true,
  where: '"is_main" = true',
})
@Check('CHK_locations_name_not_blank', `btrim("name") <> ''`)
export class Location {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_locations',
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
    foreignKeyConstraintName: 'FK_locations_tenant',
  })
  tenant?: Tenant;

  @Column({
    type: 'varchar',
    length: 120,
  })
  name: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  isMain: boolean;

  @Column({
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
