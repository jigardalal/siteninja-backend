import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Helper to generate unique tenant ID
function generateTenantId(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${crypto.randomBytes(4).toString('hex')}`;
}

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Clear existing data (in development only!)
  console.log('🗑️  Clearing existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.webhookDelivery.deleteMany();
  await prisma.webhook.deleteMany();
  await prisma.apiKeyUsage.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.pageTemplate.deleteMany();
  await prisma.template.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.seoMetadata.deleteMany();
  await prisma.section.deleteMany();
  await prisma.navigation.deleteMany();
  await prisma.page.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.branding.deleteMany();
  await prisma.domainLookup.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
  console.log('✅ Cleared existing data\n');

  // Hash password for all users
  const password = await bcrypt.hash('Password123!', 10);

  // ============================================================================
  // TENANT 1: Bella Italia Restaurant
  // ============================================================================
  console.log('🍝 Creating Bella Italia Restaurant...');

  const bellaItalia = await prisma.tenant.create({
    data: {
      tenantId: generateTenantId('bellaitalia'),
      name: 'Bella Italia',
      businessName: 'Bella Italia Restaurant Inc.',
      subdomain: 'bellaitalia',
      businessType: 'restaurant',
      description: 'Authentic Italian cuisine in the heart of the city',
      contactEmail: 'info@bellaitalia.com',
      contactPhone: '+1-555-0101',
      businessHours: {
        monday: { open: '11:00', close: '22:00' },
        tuesday: { open: '11:00', close: '22:00' },
        wednesday: { open: '11:00', close: '22:00' },
        thursday: { open: '11:00', close: '22:00' },
        friday: { open: '11:00', close: '23:00' },
        saturday: { open: '10:00', close: '23:00' },
        sunday: { open: '10:00', close: '21:00' },
      },
      status: 'active',
    },
  });

  await prisma.domainLookup.create({
    data: {
      domain: 'bellaitalia.siteninja.com',
      tenantId: bellaItalia.id,
      isSubdomain: true,
      isVerified: true,
      dnsConfigured: true,
      sslEnabled: true,
      verifiedAt: new Date(),
    },
  });

  await prisma.branding.create({
    data: {
      tenantId: bellaItalia.id,
      primaryColor: '#C8102E',
      secondaryColor: '#009246',
      accentColor: '#F4C430',
      backgroundColor: '#FFFEF7',
      textColor: '#2C3E50',
      fontFamily: 'Playfair Display, serif',
      headingFontFamily: 'Playfair Display, serif',
      logoUrl: '/uploads/bellaitalia/logo.png',
    },
  });

  await prisma.subscription.create({
    data: {
      tenantId: bellaItalia.id,
      plan: 'pro',
      status: 'active',
      currentPeriodStart: new Date('2024-01-01'),
      currentPeriodEnd: new Date('2024-12-31'),
    },
  });

  // Users for Bella Italia
  const bellaOwner = await prisma.user.create({
    data: {
      email: 'marco@bellaitalia.com',
      passwordHash: password,
      firstName: 'Marco',
      lastName: 'Rossi',
      role: 'owner',
      status: 'active',
      tenantId: bellaItalia.id,
      emailVerified: true,
    },
  });

  const bellaEditor = await prisma.user.create({
    data: {
      email: 'sofia@bellaitalia.com',
      passwordHash: password,
      firstName: 'Sofia',
      lastName: 'Romano',
      role: 'editor',
      status: 'active',
      tenantId: bellaItalia.id,
      emailVerified: true,
    },
  });

  // Pages for Bella Italia
  const bellaHome = await prisma.page.create({
    data: {
      tenantId: bellaItalia.id,
      title: 'Home - Bella Italia',
      slug: 'home',
      status: 'published',
    },
  });

  await prisma.seoMetadata.create({
    data: {
      pageId: bellaHome.id,
      metaTitle: 'Bella Italia - Authentic Italian Restaurant',
      metaDescription: 'Experience the finest Italian cuisine with fresh ingredients and traditional recipes. Visit Bella Italia today!',
      keywords: 'italian restaurant, pasta, pizza, authentic italian, fine dining',
      ogTitle: 'Bella Italia Restaurant',
      ogDescription: 'Authentic Italian cuisine in the heart of the city',
      ogImage: '/uploads/bellaitalia/og-image.jpg',
    },
  });

  await prisma.section.createMany({
    data: [
      {
        pageId: bellaHome.id,
        sectionId: 'hero-1',
        type: 'hero',
        content: {
          heading: 'Benvenuti a Bella Italia',
          subheading: 'Experience the authentic taste of Italy',
          backgroundImage: '/uploads/bellaitalia/hero.jpg',
          ctaText: 'View Menu',
          ctaLink: '/menu',
        },
        sortOrder: 0,
      },
      {
        pageId: bellaHome.id,
        sectionId: 'features-1',
        type: 'features',
        content: {
          heading: 'Why Choose Us',
          items: [
            { title: 'Fresh Ingredients', description: 'Imported from Italy daily', icon: '🌿' },
            { title: 'Expert Chefs', description: 'Trained in Italy', icon: '👨‍🍳' },
            { title: 'Cozy Atmosphere', description: 'Romantic Italian ambiance', icon: '🕯️' },
          ],
        },
        sortOrder: 1,
      },
      {
        pageId: bellaHome.id,
        sectionId: 'gallery-1',
        type: 'gallery',
        content: {
          heading: 'Our Dishes',
          images: [
            { url: '/uploads/bellaitalia/pasta.jpg', alt: 'Fresh Pasta' },
            { url: '/uploads/bellaitalia/pizza.jpg', alt: 'Wood-fired Pizza' },
            { url: '/uploads/bellaitalia/risotto.jpg', alt: 'Seafood Risotto' },
          ],
        },
        sortOrder: 2,
      },
    ],
  });

  const bellaMenu = await prisma.page.create({
    data: {
      tenantId: bellaItalia.id,
      title: 'Menu',
      slug: 'menu',
      status: 'published',
    },
  });

  await prisma.section.create({
    data: {
      pageId: bellaMenu.id,
      sectionId: 'menu-1',
      type: 'menu',
      content: {
        categories: [
          {
            name: 'Antipasti',
            items: [
              { name: 'Bruschetta', description: 'Toasted bread with tomatoes and basil', price: 8.99 },
              { name: 'Caprese Salad', description: 'Fresh mozzarella, tomatoes, and basil', price: 10.99 },
            ],
          },
          {
            name: 'Pasta',
            items: [
              { name: 'Spaghetti Carbonara', description: 'Classic Roman pasta with eggs and pancetta', price: 16.99 },
              { name: 'Fettuccine Alfredo', description: 'Creamy parmesan sauce', price: 15.99 },
              { name: 'Lasagna', description: 'Layers of pasta, meat sauce, and cheese', price: 18.99 },
            ],
          },
        ],
      },
      sortOrder: 0,
    },
  });

  // Navigation for Bella Italia
  await prisma.navigation.createMany({
    data: [
      { tenantId: bellaItalia.id, title: 'Home', slug: '/', sortOrder: 0, isVisible: true },
      { tenantId: bellaItalia.id, title: 'Menu', slug: '/menu', sortOrder: 1, isVisible: true },
      { tenantId: bellaItalia.id, title: 'About', slug: '/about', sortOrder: 2, isVisible: true },
      { tenantId: bellaItalia.id, title: 'Contact', slug: '/contact', sortOrder: 3, isVisible: true },
    ],
  });

  console.log('✅ Bella Italia created\n');

  // ============================================================================
  // TENANT 2: TechFlow Solutions (Tech Startup)
  // ============================================================================
  console.log('💻 Creating TechFlow Solutions...');

  const techFlow = await prisma.tenant.create({
    data: {
      tenantId: generateTenantId('techflow'),
      name: 'TechFlow Solutions',
      businessName: 'TechFlow Solutions LLC',
      subdomain: 'techflow',
      businessType: 'technology',
      description: 'Innovative software solutions for modern businesses',
      contactEmail: 'hello@techflow.io',
      contactPhone: '+1-555-0202',
      status: 'active',
    },
  });

  await prisma.domainLookup.create({
    data: {
      domain: 'techflow.siteninja.com',
      tenantId: techFlow.id,
      isSubdomain: true,
      isVerified: true,
      dnsConfigured: true,
      sslEnabled: true,
      verifiedAt: new Date(),
    },
  });

  await prisma.branding.create({
    data: {
      tenantId: techFlow.id,
      primaryColor: '#6366F1',
      secondaryColor: '#8B5CF6',
      accentColor: '#EC4899',
      backgroundColor: '#FFFFFF',
      textColor: '#1F2937',
      fontFamily: 'Inter, sans-serif',
      headingFontFamily: 'Space Grotesk, sans-serif',
      logoUrl: '/uploads/techflow/logo.png',
    },
  });

  await prisma.subscription.create({
    data: {
      tenantId: techFlow.id,
      plan: 'business',
      status: 'active',
      currentPeriodStart: new Date('2024-01-01'),
      currentPeriodEnd: new Date('2025-01-01'),
    },
  });

  const techOwner = await prisma.user.create({
    data: {
      email: 'sarah@techflow.io',
      passwordHash: password,
      firstName: 'Sarah',
      lastName: 'Chen',
      role: 'owner',
      status: 'active',
      tenantId: techFlow.id,
      emailVerified: true,
    },
  });

  const techAdmin = await prisma.user.create({
    data: {
      email: 'david@techflow.io',
      passwordHash: password,
      firstName: 'David',
      lastName: 'Park',
      role: 'admin',
      status: 'active',
      tenantId: techFlow.id,
      emailVerified: true,
    },
  });

  const techFlowHome = await prisma.page.create({
    data: {
      tenantId: techFlow.id,
      title: 'TechFlow Solutions - Home',
      slug: 'home',
      status: 'published',
    },
  });

  await prisma.seoMetadata.create({
    data: {
      pageId: techFlowHome.id,
      metaTitle: 'TechFlow Solutions - Innovative Software Development',
      metaDescription: 'Transform your business with cutting-edge software solutions. Custom development, cloud migration, and digital transformation services.',
      keywords: 'software development, cloud solutions, digital transformation, tech consulting',
      ogTitle: 'TechFlow Solutions',
      ogDescription: 'Innovative software solutions for modern businesses',
      ogImage: '/uploads/techflow/og-image.jpg',
    },
  });

  await prisma.section.createMany({
    data: [
      {
        pageId: techFlowHome.id,
        sectionId: 'hero-1',
        type: 'hero',
        content: {
          heading: 'Transform Your Business with Technology',
          subheading: 'We build cutting-edge software solutions that drive growth',
          ctaText: 'Get Started',
          ctaLink: '/contact',
        },
        sortOrder: 0,
      },
      {
        pageId: techFlowHome.id,
        sectionId: 'features-1',
        type: 'features',
        content: {
          heading: 'Our Services',
          items: [
            { title: 'Custom Development', description: 'Tailored software solutions', icon: '💻' },
            { title: 'Cloud Migration', description: 'Seamless cloud transformation', icon: '☁️' },
            { title: 'AI Integration', description: 'Leverage artificial intelligence', icon: '🤖' },
            { title: '24/7 Support', description: 'Always here to help', icon: '🛟' },
          ],
        },
        sortOrder: 1,
      },
    ],
  });

  await prisma.navigation.createMany({
    data: [
      { tenantId: techFlow.id, title: 'Home', slug: '/', sortOrder: 0, isVisible: true },
      { tenantId: techFlow.id, title: 'Services', slug: '/services', sortOrder: 1, isVisible: true },
      { tenantId: techFlow.id, title: 'Portfolio', slug: '/portfolio', sortOrder: 2, isVisible: true },
      { tenantId: techFlow.id, title: 'Blog', slug: '/blog', sortOrder: 3, isVisible: true },
      { tenantId: techFlow.id, title: 'Contact', slug: '/contact', sortOrder: 4, isVisible: true },
    ],
  });

  console.log('✅ TechFlow Solutions created\n');

  // ============================================================================
  // TENANT 3: Green Leaf Spa (Wellness Center)
  // ============================================================================
  console.log('🌿 Creating Green Leaf Spa...');

  const greenLeaf = await prisma.tenant.create({
    data: {
      tenantId: generateTenantId('greenleaf'),
      name: 'Green Leaf Spa',
      businessName: 'Green Leaf Wellness Center LLC',
      subdomain: 'greenleaf',
      businessType: 'wellness',
      description: 'Holistic wellness and rejuvenation',
      contactEmail: 'info@greenleafspa.com',
      contactPhone: '+1-555-0303',
      businessHours: {
        monday: { open: '09:00', close: '20:00' },
        tuesday: { open: '09:00', close: '20:00' },
        wednesday: { open: '09:00', close: '20:00' },
        thursday: { open: '09:00', close: '20:00' },
        friday: { open: '09:00', close: '21:00' },
        saturday: { open: '08:00', close: '21:00' },
        sunday: { open: '10:00', close: '18:00' },
      },
      status: 'trial',
    },
  });

  await prisma.domainLookup.create({
    data: {
      domain: 'greenleaf.siteninja.com',
      tenantId: greenLeaf.id,
      isSubdomain: true,
      isVerified: true,
      dnsConfigured: true,
      sslEnabled: true,
      verifiedAt: new Date(),
    },
  });

  await prisma.branding.create({
    data: {
      tenantId: greenLeaf.id,
      primaryColor: '#10B981',
      secondaryColor: '#059669',
      accentColor: '#F59E0B',
      backgroundColor: '#F0FDF4',
      textColor: '#1F2937',
      fontFamily: 'Lora, serif',
      headingFontFamily: 'Montserrat, sans-serif',
      logoUrl: '/uploads/greenleaf/logo.png',
    },
  });

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14); // 14 days from now

  await prisma.subscription.create({
    data: {
      tenantId: greenLeaf.id,
      plan: 'starter',
      status: 'trialing',
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEnd,
      trialStart: new Date(),
      trialEnd: trialEnd,
    },
  });

  const spaOwner = await prisma.user.create({
    data: {
      email: 'maya@greenleafspa.com',
      passwordHash: password,
      firstName: 'Maya',
      lastName: 'Patel',
      role: 'owner',
      status: 'active',
      tenantId: greenLeaf.id,
      emailVerified: true,
    },
  });

  const greenLeafHome = await prisma.page.create({
    data: {
      tenantId: greenLeaf.id,
      title: 'Green Leaf Spa - Wellness & Relaxation',
      slug: 'home',
      status: 'published',
    },
  });

  await prisma.section.createMany({
    data: [
      {
        pageId: greenLeafHome.id,
        sectionId: 'hero-1',
        type: 'hero',
        content: {
          heading: 'Find Your Inner Peace',
          subheading: 'Holistic wellness and rejuvenation in a tranquil setting',
          backgroundImage: '/uploads/greenleaf/hero.jpg',
          ctaText: 'Book Now',
          ctaLink: '/booking',
        },
        sortOrder: 0,
      },
      {
        pageId: greenLeafHome.id,
        sectionId: 'features-1',
        type: 'features',
        content: {
          heading: 'Our Treatments',
          items: [
            { title: 'Massage Therapy', description: 'Deep tissue, Swedish, hot stone', icon: '💆' },
            { title: 'Facial Treatments', description: 'Rejuvenating and anti-aging', icon: '✨' },
            { title: 'Body Wraps', description: 'Detoxifying and nourishing', icon: '🌸' },
            { title: 'Aromatherapy', description: 'Essential oils and relaxation', icon: '🕯️' },
          ],
        },
        sortOrder: 1,
      },
    ],
  });

  await prisma.navigation.createMany({
    data: [
      { tenantId: greenLeaf.id, title: 'Home', slug: '/', sortOrder: 0, isVisible: true },
      { tenantId: greenLeaf.id, title: 'Treatments', slug: '/treatments', sortOrder: 1, isVisible: true },
      { tenantId: greenLeaf.id, title: 'Packages', slug: '/packages', sortOrder: 2, isVisible: true },
      { tenantId: greenLeaf.id, title: 'Book Online', slug: '/booking', sortOrder: 3, isVisible: true },
    ],
  });

  console.log('✅ Green Leaf Spa created\n');

  // ============================================================================
  // SUPER ADMIN USER
  // ============================================================================
  console.log('👤 Creating super admin...');

  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@siteninja.com',
      passwordHash: password,
      firstName: 'Admin',
      lastName: 'User',
      role: 'super_admin',
      status: 'active',
      tenantId: bellaItalia.id, // Just for reference, super_admin has access to all
      emailVerified: true,
    },
  });

  console.log('✅ Super admin created\n');

  // ============================================================================
  // TEMPLATES
  // ============================================================================
  console.log('📄 Creating templates...');

  const restaurantTemplate = await prisma.template.create({
    data: {
      name: 'Modern Restaurant',
      description: 'A sleek, modern template perfect for restaurants and cafes',
      category: 'restaurant',
      industry: 'food_beverage',
      previewImage: '/templates/modern-restaurant.jpg',
      isActive: true,
      defaultBranding: {
        primaryColor: '#C8102E',
        secondaryColor: '#009246',
        accentColor: '#F4C430',
        fontFamily: 'Playfair Display, serif',
      },
      defaultSections: [
        { type: 'hero', sectionId: 'hero-1', content: { heading: 'Your Restaurant Name' } },
        { type: 'menu', sectionId: 'menu-1', content: { categories: [] } },
        { type: 'gallery', sectionId: 'gallery-1', content: { images: [] } },
        { type: 'contact', sectionId: 'contact-1', content: {} },
      ],
    },
  });

  const techTemplate = await prisma.template.create({
    data: {
      name: 'SaaS Landing Page',
      description: 'Perfect for tech startups and SaaS products',
      category: 'technology',
      industry: 'software',
      previewImage: '/templates/saas-landing.jpg',
      isActive: true,
      defaultBranding: {
        primaryColor: '#6366F1',
        secondaryColor: '#8B5CF6',
        fontFamily: 'Inter, sans-serif',
      },
      defaultSections: [
        { type: 'hero', sectionId: 'hero-1', content: {} },
        { type: 'features', sectionId: 'features-1', content: {} },
        { type: 'pricing', sectionId: 'pricing-1', content: {} },
        { type: 'testimonials', sectionId: 'testimonials-1', content: {} },
        { type: 'cta', sectionId: 'cta-1', content: {} },
      ],
    },
  });

  const wellnessTemplate = await prisma.template.create({
    data: {
      name: 'Wellness Center',
      description: 'Calming template for spas and wellness centers',
      category: 'wellness',
      industry: 'health_wellness',
      previewImage: '/templates/wellness.jpg',
      isActive: true,
      defaultBranding: {
        primaryColor: '#10B981',
        secondaryColor: '#059669',
        fontFamily: 'Lora, serif',
      },
      defaultSections: [
        { type: 'hero', sectionId: 'hero-1', content: {} },
        { type: 'services', sectionId: 'services-1', content: {} },
        { type: 'testimonials', sectionId: 'testimonials-1', content: {} },
        { type: 'booking', sectionId: 'booking-1', content: {} },
      ],
    },
  });

  console.log('✅ Templates created\n');

  // ============================================================================
  // WEBHOOKS
  // ============================================================================
  console.log('🔗 Creating sample webhooks...');

  await prisma.webhook.create({
    data: {
      tenantId: bellaItalia.id,
      url: 'https://webhook.site/bella-italia',
      events: ['page.published', 'page.unpublished'],
      secret: 'bella-webhook-secret-key',
      isActive: true,
    },
  });

  await prisma.webhook.create({
    data: {
      tenantId: techFlow.id,
      url: 'https://webhook.site/techflow',
      events: ['user.created', 'user.updated'],
      secret: 'techflow-webhook-secret',
      isActive: true,
    },
  });

  console.log('✅ Webhooks created\n');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('🎉 Seeding completed!\n');
  console.log('📊 Summary:');
  console.log('   - 3 Tenants created');
  console.log('   - 6 Users created (+ 1 super admin)');
  console.log('   - 4 Pages with sections');
  console.log('   - 3 Templates');
  console.log('   - 2 Webhooks');
  console.log('\n🔐 All users have the password: Password123!');
  console.log('\n📧 User accounts:');
  console.log('   Super Admin: admin@siteninja.com');
  console.log('   Bella Italia Owner: marco@bellaitalia.com');
  console.log('   Bella Italia Editor: sofia@bellaitalia.com');
  console.log('   TechFlow Owner: sarah@techflow.io');
  console.log('   TechFlow Admin: david@techflow.io');
  console.log('   Green Leaf Owner: maya@greenleafspa.com');
  console.log('\n🌐 Tenant subdomains:');
  console.log('   - bellaitalia.siteninja.com');
  console.log('   - techflow.siteninja.com');
  console.log('   - greenleaf.siteninja.com');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
