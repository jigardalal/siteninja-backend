/**
 * Create Test Data Script
 *
 * This script creates initial test data for the SiteNinja backend:
 * - Super admin user
 * - Test tenant
 * - Regular users for testing
 *
 * Run with: npx ts-node scripts/create-test-data.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Creating test data...\n');

  // 1. Create Super Admin User
  console.log('1. Creating super admin user...');
  const superAdminPassword = await bcrypt.hash('Admin123!', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@siteninja.com' },
    update: {},
    create: {
      email: 'admin@siteninja.com',
      passwordHash: superAdminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
      status: 'active',
      emailVerified: true,
    },
  });
  console.log('✅ Super admin created:', superAdmin.email);
  console.log('   Password: Admin123!\n');

  // 2. Create Test Tenant
  console.log('2. Creating test tenant...');
  const testTenant = await prisma.tenant.upsert({
    where: { subdomain: 'test-company' },
    update: {},
    create: {
      tenantId: 'test-company-001',
      name: 'Test Company',
      businessName: 'Test Company LLC',
      subdomain: 'test-company',
      businessType: 'services',
      description: 'A test company for development and testing',
      contactEmail: 'contact@test-company.com',
      contactPhone: '+1-555-0123',
      status: 'active',
    },
  });
  console.log('✅ Test tenant created:', testTenant.name);
  console.log('   ID:', testTenant.id);
  console.log('   Subdomain:', testTenant.subdomain, '\n');

  // 3. Create default branding for tenant (if not exists)
  console.log('3. Creating default branding...');
  const branding = await prisma.branding.upsert({
    where: { tenantId: testTenant.id },
    update: {},
    create: {
      tenantId: testTenant.id,
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981',
      accentColor: '#F59E0B',
      backgroundColor: '#FFFFFF',
      textColor: '#1F2937',
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFontFamily: 'Inter, system-ui, sans-serif',
    },
  });
  console.log('✅ Branding created\n');

  // 4. Create domain lookup
  console.log('4. Creating domain lookup...');
  await prisma.domainLookup.upsert({
    where: { domain: 'test-company.siteninja.com' },
    update: {},
    create: {
      domain: 'test-company.siteninja.com',
      tenantId: testTenant.id,
      isSubdomain: true,
      isVerified: true,
      dnsConfigured: true,
      sslEnabled: true,
    },
  });
  console.log('✅ Domain lookup created\n');

  // 5. Create Test Users
  console.log('5. Creating test users...');

  // Owner
  const ownerPassword = await bcrypt.hash('Owner123!', 10);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@test-company.com' },
    update: {},
    create: {
      email: 'owner@test-company.com',
      passwordHash: ownerPassword,
      firstName: 'John',
      lastName: 'Owner',
      role: 'owner',
      status: 'active',
      emailVerified: true,
      tenantId: testTenant.id,
    },
  });
  console.log('✅ Owner created:', owner.email, '(Password: Owner123!)');

  // Admin
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test-company.com' },
    update: {},
    create: {
      email: 'admin@test-company.com',
      passwordHash: adminPassword,
      firstName: 'Jane',
      lastName: 'Admin',
      role: 'admin',
      status: 'active',
      emailVerified: true,
      tenantId: testTenant.id,
    },
  });
  console.log('✅ Admin created:', admin.email, '(Password: Admin123!)');

  // Editor
  const editorPassword = await bcrypt.hash('Editor123!', 10);
  const editor = await prisma.user.upsert({
    where: { email: 'editor@test-company.com' },
    update: {},
    create: {
      email: 'editor@test-company.com',
      passwordHash: editorPassword,
      firstName: 'Bob',
      lastName: 'Editor',
      role: 'editor',
      status: 'active',
      emailVerified: true,
      tenantId: testTenant.id,
    },
  });
  console.log('✅ Editor created:', editor.email, '(Password: Editor123!)');

  // Viewer
  const viewerPassword = await bcrypt.hash('Viewer123!', 10);
  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@test-company.com' },
    update: {},
    create: {
      email: 'viewer@test-company.com',
      passwordHash: viewerPassword,
      firstName: 'Alice',
      lastName: 'Viewer',
      role: 'viewer',
      status: 'active',
      emailVerified: true,
      tenantId: testTenant.id,
    },
  });
  console.log('✅ Viewer created:', viewer.email, '(Password: Viewer123!)\n');

  // 6. Create a second tenant for testing isolation
  console.log('6. Creating second tenant for isolation testing...');
  const secondTenant = await prisma.tenant.upsert({
    where: { subdomain: 'other-company' },
    update: {},
    create: {
      tenantId: 'other-company-001',
      name: 'Other Company',
      businessName: 'Other Company Inc',
      subdomain: 'other-company',
      businessType: 'retail',
      description: 'Another test company',
      contactEmail: 'contact@other-company.com',
      status: 'active',
    },
  });
  console.log('✅ Second tenant created:', secondTenant.name, '\n');

  // Create user for second tenant
  const otherUserPassword = await bcrypt.hash('Other123!', 10);
  const otherUser = await prisma.user.upsert({
    where: { email: 'user@other-company.com' },
    update: {},
    create: {
      email: 'user@other-company.com',
      passwordHash: otherUserPassword,
      firstName: 'Other',
      lastName: 'User',
      role: 'owner',
      status: 'active',
      emailVerified: true,
      tenantId: secondTenant.id,
    },
  });
  console.log('✅ Other tenant user created:', otherUser.email, '(Password: Other123!)\n');

  // Summary
  console.log('════════════════════════════════════════════════════════════');
  console.log('🎉 Test Data Created Successfully!\n');
  console.log('Test Accounts:');
  console.log('─────────────────────────────────────────────────────────');
  console.log('Super Admin:  admin@siteninja.com        (Admin123!)');
  console.log('Owner:        owner@test-company.com     (Owner123!)');
  console.log('Admin:        admin@test-company.com     (Admin123!)');
  console.log('Editor:       editor@test-company.com    (Editor123!)');
  console.log('Viewer:       viewer@test-company.com    (Viewer123!)');
  console.log('Other User:   user@other-company.com     (Other123!)');
  console.log('─────────────────────────────────────────────────────────');
  console.log('\nTenants:');
  console.log('─────────────────────────────────────────────────────────');
  console.log('Test Company:  ID:', testTenant.id);
  console.log('Other Company: ID:', secondTenant.id);
  console.log('════════════════════════════════════════════════════════════\n');
  console.log('You can now test authentication with these accounts!');
  console.log('Try logging in at: POST http://localhost:3000/api/auth/callback/credentials\n');
}

main()
  .catch((e) => {
    console.error('❌ Error creating test data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
