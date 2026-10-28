import { SnakeCaseNamingStrategy } from './snake-case-naming.strategy.js';

describe('SnakeCaseNamingStrategy', () => {
  const strategy = new SnakeCaseNamingStrategy();

  it('converts generated table names to snake case', () => {
    expect(strategy.tableName('PasswordResetToken', undefined)).toBe(
      'password_reset_token',
    );
  });

  it('preserves explicitly configured table names', () => {
    expect(strategy.tableName('Tenant', 'custom_tenants')).toBe(
      'custom_tenants',
    );
  });

  it('converts property names to snake case columns', () => {
    expect(strategy.columnName('createdAt', undefined, [])).toBe('created_at');
  });

  it('includes embedded prefixes in column names', () => {
    expect(
      strategy.columnName('postalCode', undefined, ['billingAddress']),
    ).toBe('billing_address_postal_code');
  });

  it('converts relation join columns to snake case', () => {
    expect(strategy.joinColumnName('tenant', 'id')).toBe('tenant_id');
  });

  it('converts join table columns to snake case', () => {
    expect(strategy.joinTableColumnName('userRoles', 'roles', 'roleId')).toBe(
      'user_roles_role_id',
    );
  });
});
