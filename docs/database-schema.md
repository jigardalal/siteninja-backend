# SiteNinja Database Schema

**Version:** 1.0
**Date:** October 16, 2025
**Database:** PostgreSQL 15+
**ORM:** Prisma 5.x

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Core Tables](#core-tables)
3. [Supporting Tables](#supporting-tables)
4. [Indexes](#indexes)
5. [Row-Level Security (RLS)](#row-level-security-rls)
6. [Prisma Schema](#prisma-schema)
7. [Migration Scripts](#migration-scripts)

---

## Schema Overview

### Entity Relationship Diagram

```
┌─────────────┐
│   tenants   │
│ (id, PK)    │
└──────┬──────┘
       │
       ├─────────────────┬─────────────────┬─────────────────┬─────────────────┬─────────────────┐
       │                 │                 │                 │                 │                 │
       ▼                 ▼                 ▼                 ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌──────────────┐   ┌─────────────┐
│   branding  │   │    pages    │   │ navigation  │   │    users    │   │subscriptions │   │   assets    │
│(tenant_id,FK)│   │(tenant_id,FK)│   │(tenant_id,FK)│   │(tenant_id,FK)│   │(tenant_id,FK)│   │(tenant_id,FK)│
└─────────────┘   └──────┬──────┘   └─────────────┘   └─────────────┘   └──────────────┘   └─────────────┘
                         │
                         ├─────────────────┬─────────────────┐
                         ▼                 ▼                 ▼
                  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
                  │  sections   │   │seo_metadata │   │ navigation  │
                  │ (page_id,FK)│   │ (page_id,FK)│   │ (page_id,FK)│
                  └─────────────┘   └─────────────┘   └─────────────┘
```

### Key Relationships

- **Tenant** → Branding (1:1)
- **Tenant** → Pages (1:N)
- **Tenant** → Navigation (1:N)
- **Tenant** → Users (1:N)
- **Tenant** → Subscription (1:1)
- **Tenant** → Assets (1:N)
- **Page** → Sections (1:N)
- **Page** → SEO Metadata (1:1)
- **Page** → Navigation (1:1 optional)

---

## Core Tables

### 1. tenants

**Purpose:** Store tenant/customer information and business metadata

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(255) UNIQUE,
  custom_domain VARCHAR(255) UNIQUE,
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100),
  description TEXT,
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  business_hours JSONB,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tenants_tenant_id ON tenants(tenant_id);
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_created_at ON tenants(created_at DESC);

-- Comments
COMMENT ON TABLE tenants IS 'Core tenant table storing customer/business information';
COMMENT ON COLUMN tenants.tenant_id IS 'Business-facing tenant identifier';
COMMENT ON COLUMN tenants.status IS 'Values: active, suspended, cancelled, trial';
COMMENT ON COLUMN tenants.business_hours IS 'JSON object with day/hours mapping';
```

**business_hours JSON Schema:**
```json
{
  "Monday": "9AM-5PM",
  "Tuesday": "9AM-5PM",
  "Wednesday": "9AM-5PM",
  "Thursday": "9AM-5PM",
  "Friday": "9AM-5PM",
  "Saturday": "10AM-2PM",
  "Sunday": "Closed",
  "Emergency": "24/7"
}
```

### 2. branding

**Purpose:** Store visual identity and theme configuration per tenant

```sql
CREATE TABLE branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  primary_color VARCHAR(20) DEFAULT '#1D4ED8',
  secondary_color VARCHAR(20) DEFAULT '#3B82F6',
  accent_color VARCHAR(20) DEFAULT '#F59E0B',
  background_color VARCHAR(20) DEFAULT '#FFFFFF',
  text_color VARCHAR(20) DEFAULT '#374151',
  font_family VARCHAR(255) DEFAULT 'Inter, sans-serif',
  heading_font_family VARCHAR(255) DEFAULT 'Inter, sans-serif',
  logo_url TEXT,
  favicon_url TEXT,
  dark_logo_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id)
);

-- Indexes
CREATE INDEX idx_branding_tenant_id ON branding(tenant_id);

-- Comments
COMMENT ON TABLE branding IS 'Tenant visual identity and branding configuration';
COMMENT ON COLUMN branding.primary_color IS 'Hex color code for primary brand color';
```

### 3. pages

**Purpose:** Store page metadata and structure

```sql
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  status VARCHAR(50) DEFAULT 'published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(tenant_id, slug)
);

-- Indexes
CREATE INDEX idx_pages_tenant_id ON pages(tenant_id);
CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_status ON pages(status);
CREATE INDEX idx_pages_created_at ON pages(created_at DESC);
CREATE INDEX idx_pages_tenant_slug ON pages(tenant_id, slug);

-- Comments
COMMENT ON TABLE pages IS 'Page metadata and structure';
COMMENT ON COLUMN pages.status IS 'Values: draft, published, archived';
COMMENT ON COLUMN pages.slug IS 'URL-friendly page identifier';
```

### 4. sections

**Purpose:** Store page section content (JSONB for flexibility)

```sql
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  section_id VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  content JSONB NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_sections_page_id ON sections(page_id);
CREATE INDEX idx_sections_type ON sections(type);
CREATE INDEX idx_sections_sort_order ON sections(sort_order);
CREATE INDEX idx_sections_content_gin ON sections USING gin(content);

-- Comments
COMMENT ON TABLE sections IS 'Page sections with flexible JSONB content';
COMMENT ON COLUMN sections.type IS 'Values: hero, features, services, testimonials, pricing, faq, gallery, contact, footer, cta, demo, comparison, projects';
COMMENT ON COLUMN sections.content IS 'Section-specific content stored as JSONB';
```

**Supported Section Types:**
- `hero` - Hero banner with CTA
- `features` - Feature grid
- `services` - Service listings
- `about` - About business
- `testimonials` - Customer reviews
- `pricing` - Pricing plans
- `faq` - FAQ accordion
- `gallery` - Image gallery
- `contact` - Contact form
- `footer` - Site footer
- `cta` - Call-to-action blocks
- `demo` - Product demo section
- `comparison` - Feature comparison table
- `projects` - Portfolio/projects showcase

### 5. navigation

**Purpose:** Store navigation menu items

```sql
CREATE TABLE navigation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_navigation_tenant_id ON navigation(tenant_id);
CREATE INDEX idx_navigation_page_id ON navigation(page_id);
CREATE INDEX idx_navigation_sort_order ON navigation(sort_order);
CREATE INDEX idx_navigation_visible ON navigation(is_visible);

-- Comments
COMMENT ON TABLE navigation IS 'Navigation menu items per tenant';
COMMENT ON COLUMN navigation.page_id IS 'Optional link to page, can be external link';
```

### 6. seo_metadata

**Purpose:** Store SEO and social sharing metadata per page

```sql
CREATE TABLE seo_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  meta_title VARCHAR(255),
  meta_description TEXT,
  keywords TEXT,
  og_title VARCHAR(255),
  og_description TEXT,
  og_image TEXT,
  og_type VARCHAR(50) DEFAULT 'website',
  twitter_card VARCHAR(50) DEFAULT 'summary_large_image',
  schema_markup JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(page_id)
);

-- Indexes
CREATE INDEX idx_seo_metadata_page_id ON seo_metadata(page_id);

-- Comments
COMMENT ON TABLE seo_metadata IS 'SEO and social sharing metadata per page';
COMMENT ON COLUMN seo_metadata.schema_markup IS 'JSON-LD structured data for rich snippets';
```

---

## Supporting Tables

### 7. users

**Purpose:** Store user accounts and authentication data

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'owner',
  status VARCHAR(50) DEFAULT 'active',
  last_login TIMESTAMP,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Comments
COMMENT ON TABLE users IS 'User accounts and authentication';
COMMENT ON COLUMN users.role IS 'Values: owner, editor, viewer, admin, super_admin';
COMMENT ON COLUMN users.status IS 'Values: active, inactive, suspended';
```

### 8. subscriptions

**Purpose:** Store billing and subscription information

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  plan VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at TIMESTAMP,
  canceled_at TIMESTAMP,
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id)
);

-- Indexes
CREATE INDEX idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan);

-- Comments
COMMENT ON TABLE subscriptions IS 'Billing and subscription information';
COMMENT ON COLUMN subscriptions.plan IS 'Values: basic, professional, enterprise';
COMMENT ON COLUMN subscriptions.status IS 'Values: active, past_due, canceled, trialing';
```

### 9. assets

**Purpose:** Store uploaded images and files metadata

```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  filename VARCHAR(500) NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100),
  size_bytes BIGINT,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_assets_tenant_id ON assets(tenant_id);
CREATE INDEX idx_assets_storage_key ON assets(storage_key);
CREATE INDEX idx_assets_mime_type ON assets(mime_type);
CREATE INDEX idx_assets_uploaded_by ON assets(uploaded_by);

-- Comments
COMMENT ON TABLE assets IS 'Uploaded images and files metadata';
COMMENT ON COLUMN assets.storage_key IS 'S3/R2 object key for cloud storage';
```

---

## Indexes

### Composite Indexes

```sql
-- Optimized tenant + slug lookups
CREATE INDEX idx_pages_tenant_slug ON pages(tenant_id, slug);

-- List pages for tenant with filters
CREATE INDEX idx_pages_list ON pages(tenant_id, status, created_at DESC)
  INCLUDE (id, slug, title);

-- Navigation ordering
CREATE INDEX idx_navigation_order ON navigation(tenant_id, sort_order, is_visible);

-- Section ordering
CREATE INDEX idx_sections_order ON sections(page_id, sort_order);
```

### Full-Text Search (Optional)

```sql
-- Add full-text search capability
CREATE INDEX idx_pages_title_search ON pages USING gin(to_tsvector('english', title));

-- Search section content
CREATE INDEX idx_sections_content_search ON sections USING gin(to_tsvector('english', content::text));
```

---

## Row-Level Security (RLS)

### Enable RLS

```sql
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
```

### Create Policies

```sql
-- Tenant isolation policy
CREATE POLICY tenant_isolation_policy ON tenants
  USING (id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_policy ON branding
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_policy ON pages
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_policy ON navigation
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_policy ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_policy ON subscriptions
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_policy ON assets
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Sections isolated via page
CREATE POLICY tenant_isolation_policy ON sections
  USING (page_id IN (
    SELECT id FROM pages
    WHERE tenant_id = current_setting('app.current_tenant_id')::UUID
  ));

-- SEO metadata isolated via page
CREATE POLICY tenant_isolation_policy ON seo_metadata
  USING (page_id IN (
    SELECT id FROM pages
    WHERE tenant_id = current_setting('app.current_tenant_id')::UUID
  ));
```

### Set Tenant Context (Application Level)

```typescript
// Set tenant context at start of request
await prisma.$executeRaw`SET app.current_tenant_id = ${tenantId}`;

// All subsequent queries automatically filtered
const pages = await prisma.page.findMany(); // Only returns current tenant's pages
```

---

## Prisma Schema

**File:** `prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Tenant {
  id              String    @id @default(uuid()) @db.Uuid
  tenantId        String    @unique @map("tenant_id") @db.VarChar(255)
  name            String    @db.VarChar(255)
  subdomain       String?   @unique @db.VarChar(255)
  customDomain    String?   @unique @map("custom_domain") @db.VarChar(255)
  businessName    String    @map("business_name") @db.VarChar(255)
  businessType    String?   @map("business_type") @db.VarChar(100)
  description     String?   @db.Text
  contactPhone    String?   @map("contact_phone") @db.VarChar(50)
  contactEmail    String?   @map("contact_email") @db.VarChar(255)
  businessHours   Json?     @map("business_hours") @db.JsonB
  status          String    @default("active") @db.VarChar(50)
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  branding     Branding?
  pages        Page[]
  navigation   Navigation[]
  users        User[]
  subscription Subscription?
  assets       Asset[]

  @@map("tenants")
}

model Branding {
  id                  String   @id @default(uuid()) @db.Uuid
  tenantId            String   @unique @map("tenant_id") @db.Uuid
  primaryColor        String   @default("#1D4ED8") @map("primary_color") @db.VarChar(20)
  secondaryColor      String   @default("#3B82F6") @map("secondary_color") @db.VarChar(20)
  accentColor         String   @default("#F59E0B") @map("accent_color") @db.VarChar(20)
  backgroundColor     String   @default("#FFFFFF") @map("background_color") @db.VarChar(20)
  textColor           String   @default("#374151") @map("text_color") @db.VarChar(20)
  fontFamily          String   @default("Inter, sans-serif") @map("font_family") @db.VarChar(255)
  headingFontFamily   String   @default("Inter, sans-serif") @map("heading_font_family") @db.VarChar(255)
  logoUrl             String?  @map("logo_url") @db.Text
  faviconUrl          String?  @map("favicon_url") @db.Text
  darkLogoUrl         String?  @map("dark_logo_url") @db.Text
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("branding")
}

model Page {
  id        String    @id @default(uuid()) @db.Uuid
  tenantId  String    @map("tenant_id") @db.Uuid
  slug      String    @db.VarChar(255)
  title     String    @db.VarChar(500)
  status    String    @default("published") @db.VarChar(50)
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  tenant      Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  sections    Section[]
  seoMetadata SeoMetadata?
  navigation  Navigation?

  @@unique([tenantId, slug])
  @@map("pages")
}

model Section {
  id         String   @id @default(uuid()) @db.Uuid
  pageId     String   @map("page_id") @db.Uuid
  sectionId  String   @map("section_id") @db.VarChar(255)
  type       String   @db.VarChar(100)
  content    Json     @db.JsonB
  sortOrder  Int      @default(0) @map("sort_order")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  page Page @relation(fields: [pageId], references: [id], onDelete: Cascade)

  @@map("sections")
}

model Navigation {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  pageId    String?  @map("page_id") @db.Uuid
  title     String   @db.VarChar(255)
  slug      String   @db.VarChar(255)
  sortOrder Int      @default(0) @map("sort_order")
  isVisible Boolean  @default(true) @map("is_visible")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  page   Page?  @relation(fields: [pageId], references: [id], onDelete: Cascade)

  @@map("navigation")
}

model SeoMetadata {
  id              String   @id @default(uuid()) @db.Uuid
  pageId          String   @unique @map("page_id") @db.Uuid
  metaTitle       String?  @map("meta_title") @db.VarChar(255)
  metaDescription String?  @map("meta_description") @db.Text
  keywords        String?  @db.Text
  ogTitle         String?  @map("og_title") @db.VarChar(255)
  ogDescription   String?  @map("og_description") @db.Text
  ogImage         String?  @map("og_image") @db.Text
  ogType          String   @default("website") @map("og_type") @db.VarChar(50)
  twitterCard     String   @default("summary_large_image") @map("twitter_card") @db.VarChar(50)
  schemaMarkup    Json?    @map("schema_markup") @db.JsonB
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  page Page @relation(fields: [pageId], references: [id], onDelete: Cascade)

  @@map("seo_metadata")
}

model User {
  id            String    @id @default(uuid()) @db.Uuid
  tenantId      String?   @map("tenant_id") @db.Uuid
  email         String    @unique @db.VarChar(255)
  passwordHash  String?   @map("password_hash") @db.VarChar(255)
  firstName     String?   @map("first_name") @db.VarChar(100)
  lastName      String?   @map("last_name") @db.VarChar(100)
  role          String    @default("owner") @db.VarChar(50)
  status        String    @default("active") @db.VarChar(50)
  lastLogin     DateTime? @map("last_login")
  emailVerified Boolean   @default(false) @map("email_verified")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  tenant Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  assets Asset[]

  @@map("users")
}

model Subscription {
  id                   String    @id @default(uuid()) @db.Uuid
  tenantId             String    @unique @map("tenant_id") @db.Uuid
  stripeSubscriptionId String?   @unique @map("stripe_subscription_id") @db.VarChar(255)
  stripeCustomerId     String?   @map("stripe_customer_id") @db.VarChar(255)
  plan                 String    @db.VarChar(50)
  status               String    @default("active") @db.VarChar(50)
  currentPeriodStart   DateTime? @map("current_period_start")
  currentPeriodEnd     DateTime? @map("current_period_end")
  cancelAt             DateTime? @map("cancel_at")
  canceledAt           DateTime? @map("canceled_at")
  trialStart           DateTime? @map("trial_start")
  trialEnd             DateTime? @map("trial_end")
  createdAt            DateTime  @default(now()) @map("created_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("subscriptions")
}

model Asset {
  id         String   @id @default(uuid()) @db.Uuid
  tenantId   String   @map("tenant_id") @db.Uuid
  filename   String   @db.VarChar(500)
  storageKey String   @map("storage_key") @db.VarChar(500)
  mimeType   String?  @map("mime_type") @db.VarChar(100)
  sizeBytes  BigInt?  @map("size_bytes")
  width      Int?
  height     Int?
  altText    String?  @map("alt_text") @db.Text
  uploadedBy String?  @map("uploaded_by") @db.Uuid
  createdAt  DateTime @default(now()) @map("created_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User?  @relation(fields: [uploadedBy], references: [id])

  @@map("assets")
}
```

---

## Migration Scripts

### Initial Migration

```sql
-- Run this after creating all tables
-- Set up initial data and constraints

-- Add check constraints
ALTER TABLE tenants ADD CONSTRAINT chk_tenant_status
  CHECK (status IN ('active', 'suspended', 'cancelled', 'trial'));

ALTER TABLE pages ADD CONSTRAINT chk_page_status
  CHECK (status IN ('draft', 'published', 'archived'));

ALTER TABLE users ADD CONSTRAINT chk_user_role
  CHECK (role IN ('owner', 'editor', 'viewer', 'admin', 'super_admin'));

ALTER TABLE users ADD CONSTRAINT chk_user_status
  CHECK (status IN ('active', 'inactive', 'suspended'));

ALTER TABLE subscriptions ADD CONSTRAINT chk_subscription_plan
  CHECK (plan IN ('basic', 'professional', 'enterprise'));

ALTER TABLE subscriptions ADD CONSTRAINT chk_subscription_status
  CHECK (status IN ('active', 'past_due', 'canceled', 'trialing'));

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branding_updated_at BEFORE UPDATE ON branding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_navigation_updated_at BEFORE UPDATE ON navigation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_metadata_updated_at BEFORE UPDATE ON seo_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Data Migration from JSON

```typescript
// scripts/migrate-json-to-postgres.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function migrateTenantData(tenantId: string) {
  console.log(`Migrating tenant: ${tenantId}`);

  // Read tenant data
  const websiteData = JSON.parse(
    await fs.readFile(
      path.join(process.cwd(), 'public/API/tenant', tenantId, 'website.json'),
      'utf-8'
    )
  );

  // Create tenant record
  const tenant = await prisma.tenant.create({
    data: {
      tenantId: websiteData.data.id,
      name: websiteData.data.name,
      subdomain: websiteData.data.subdomain,
      customDomain: websiteData.data.customDomain,
      businessName: websiteData.data.businessName,
      businessType: websiteData.data.businessType,
      description: websiteData.data.description,
      contactPhone: websiteData.data.contactInfo?.phone,
      contactEmail: websiteData.data.contactInfo?.email,
      businessHours: websiteData.data.businessHours || {},
    },
  });

  // Create branding
  if (websiteData.data.branding) {
    await prisma.branding.create({
      data: {
        tenantId: tenant.id,
        primaryColor: websiteData.data.branding.primaryColor,
        secondaryColor: websiteData.data.branding.secondaryColor,
        accentColor: websiteData.data.branding.accentColor,
        backgroundColor: websiteData.data.branding.backgroundColor,
        textColor: websiteData.data.branding.textColor,
        fontFamily: websiteData.data.branding.fontFamily,
        headingFontFamily: websiteData.data.branding.headingFontFamily,
        logoUrl: websiteData.data.branding.logoUrl,
        faviconUrl: websiteData.data.branding.faviconUrl,
        darkLogoUrl: websiteData.data.branding.darkLogoUrl,
      },
    });
  }

  // Migrate pages
  const pages = await fs.readdir(
    path.join(process.cwd(), 'public/API/tenant', tenantId)
  );

  for (const pageFile of pages.filter(
    (f) =>
      f.endsWith('.json') &&
      f !== 'website.json' &&
      f !== 'header.json' &&
      f !== 'common.json'
  )) {
    const pageData = JSON.parse(
      await fs.readFile(
        path.join(process.cwd(), 'public/API/tenant', tenantId, pageFile),
        'utf-8'
      )
    );

    const page = await prisma.page.create({
      data: {
        tenantId: tenant.id,
        slug: pageFile.replace('.json', ''),
        title: pageData.title,
        status: 'published',
      },
    });

    // Create sections
    for (const [index, section] of pageData.sections.entries()) {
      await prisma.section.create({
        data: {
          pageId: page.id,
          sectionId: section.id,
          type: section.type,
          content: section.content,
          sortOrder: index,
        },
      });
    }

    // Create SEO metadata if exists
    const seoPath = path.join(
      process.cwd(),
      'public/API/tenant',
      tenantId,
      'seo',
      `${pageFile}`
    );
    try {
      const seoData = JSON.parse(await fs.readFile(seoPath, 'utf-8'));
      await prisma.seoMetadata.create({
        data: {
          pageId: page.id,
          metaTitle: seoData.title,
          metaDescription: seoData.description,
          keywords: seoData.keywords,
          ogTitle: seoData.ogTitle,
          ogDescription: seoData.ogDescription,
          ogImage: seoData.ogImage,
          schemaMarkup: JSON.parse(seoData.schema || '{}'),
        },
      });
    } catch (err) {
      console.log(`No SEO data for ${pageFile}`);
    }
  }

  // Migrate navigation
  try {
    const headerData = JSON.parse(
      await fs.readFile(
        path.join(process.cwd(), 'public/API/tenant', tenantId, 'header.json'),
        'utf-8'
      )
    );

    for (const navItem of headerData) {
      await prisma.navigation.create({
        data: {
          tenantId: tenant.id,
          title: navItem.title,
          slug: navItem.slug,
          sortOrder: navItem.sortOrder,
          isVisible: true,
        },
      });
    }
  } catch (err) {
    console.log(`No navigation data for ${tenantId}`);
  }

  console.log(`✓ Migrated tenant: ${tenantId}`);
}

async function main() {
  const tenantDirs = await fs.readdir(
    path.join(process.cwd(), 'public/API/tenant')
  );

  for (const tenantId of tenantDirs.filter((d) => d !== 'lookup')) {
    await migrateTenantData(tenantId);
  }

  console.log('✓ All tenants migrated successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## Prisma Commands

```bash
# Install Prisma
npm install prisma @prisma/client

# Initialize Prisma
npx prisma init

# Generate Prisma Client
npx prisma generate

# Create migration
npx prisma migrate dev --name init

# Apply migrations to production
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

---

## Environment Variables

```env
# Database connection
DATABASE_URL="postgresql://user:password@localhost:5432/siteninja?schema=public"

# Connection pooling (production)
DATABASE_URL="postgresql://user:password@localhost:5432/siteninja?schema=public&connection_limit=20&pool_timeout=10"
```

---

**Last Updated:** October 16, 2025
**Next Review:** After database implementation
