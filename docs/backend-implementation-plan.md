# SiteNinja Backend Implementation Plan

**Version:** 1.0
**Date:** October 17, 2025
**Goal:** Perfect Backend Architecture Before Frontend Integration
**Status:** Implementation Ready

---

## Executive Summary

This document provides a step-by-step plan to implement a production-ready backend for SiteNinja, addressing all architectural issues and implementing the complete API specification. The plan is designed for sequential execution with clear milestones.

**Timeline Estimate:** 4-6 weeks
**Priority:** Backend perfection, frontend adjusts later

---

## Table of Contents

1. [Phase 1: Foundation & Database](#phase-1-foundation--database)
2. [Phase 2: Core API Implementation](#phase-2-core-api-implementation)
3. [Phase 3: Validation & Error Handling](#phase-3-validation--error-handling)
4. [Phase 4: Authentication & Authorization](#phase-4-authentication--authorization)
5. [Phase 5: Advanced Features](#phase-5-advanced-features)
6. [Phase 6: Performance & Security](#phase-6-performance--security)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Checklist](#deployment-checklist)

---

## Phase 1: Foundation & Database

**Duration:** 1 week
**Goal:** Complete database schema, migrations, and ORM setup

### Step 1.1: Complete Database Schema

**File:** `docs/database-schema.md` (update)

Add missing tables:

```sql
-- Templates Table (for template management)
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,  -- 'business', 'portfolio', 'ecommerce'
  industry VARCHAR(100),            -- 'Plumbing', 'IT', 'Healthcare', etc.
  preview_image TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  default_branding JSONB NOT NULL,  -- Default colors, fonts
  default_sections JSONB NOT NULL,  -- Default page structure
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_industry ON templates(industry);
CREATE INDEX idx_templates_is_active ON templates(is_active);

-- Page Templates Junction Table
CREATE TABLE page_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  customizations JSONB,              -- Track what was customized
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(page_id)                    -- One template per page
);

CREATE INDEX idx_page_templates_page_id ON page_templates(page_id);
CREATE INDEX idx_page_templates_template_id ON page_templates(template_id);

-- Industries Table (for dropdown/filtering)
CREATE TABLE industries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(100),                 -- Icon identifier (e.g., 'wrench', 'laptop')
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_industries_is_active ON industries(is_active);

-- Insert default industries
INSERT INTO industries (name, description, icon, sort_order) VALUES
  ('Plumbing', 'Plumbing and HVAC services', 'wrench', 10),
  ('IT Consulting', 'Technology consulting services', 'laptop', 20),
  ('Healthcare', 'Medical and healthcare services', 'heartbeat', 30),
  ('Legal', 'Legal and law services', 'balance-scale', 40),
  ('Real Estate', 'Real estate and property services', 'home', 50),
  ('Automotive', 'Auto repair and services', 'car', 60),
  ('Restaurant', 'Food and beverage services', 'utensils', 70),
  ('Retail', 'Retail and e-commerce', 'shopping-cart', 80),
  ('Education', 'Education and training services', 'graduation-cap', 90),
  ('Other', 'Other services', 'ellipsis-h', 100);

-- Audit Logs Table (for compliance & debugging)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  action VARCHAR(255) NOT NULL,      -- 'page.create', 'page.update', 'branding.update'
  resource_type VARCHAR(100),        -- 'page', 'section', 'branding', 'user'
  resource_id UUID,
  old_value JSONB,                   -- Previous state (for updates/deletes)
  new_value JSONB,                   -- New state (for creates/updates)
  ip_address VARCHAR(45),            -- IPv4 or IPv6
  user_agent TEXT,
  metadata JSONB,                    -- Additional context
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Webhooks Table (for external integrations)
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,            -- ['page.published', 'contact.submitted']
  secret VARCHAR(255) NOT NULL,      -- For HMAC signature verification
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP,
  last_status_code INTEGER,
  failure_count INTEGER DEFAULT 0,
  max_failures INTEGER DEFAULT 5,    -- Disable after 5 consecutive failures
  retry_backoff INTEGER DEFAULT 60,  -- Seconds to wait before retry
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhooks_tenant_id ON webhooks(tenant_id);
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active);

-- Webhook Delivery Logs (for debugging)
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);

-- API Keys Table (for future API access)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,  -- bcrypt hash of API key
  key_prefix VARCHAR(20) NOT NULL,        -- First 8 chars for identification (e.g., 'sn_live_...')
  permissions TEXT[] DEFAULT '{}',        -- ['read:pages', 'write:sections', 'delete:pages']
  rate_limit INTEGER DEFAULT 1000,        -- Requests per hour
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);

-- API Key Usage Tracking
CREATE TABLE api_key_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_key_usage_api_key_id ON api_key_usage(api_key_id);
CREATE INDEX idx_api_key_usage_created_at ON api_key_usage(created_at DESC);

-- Domain Lookup Table (replaces JSON files)
CREATE TABLE domain_lookups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain VARCHAR(255) UNIQUE NOT NULL,  -- 'mountainplumbing.com' or 'mountainplumbing.siteninja.com'
  is_subdomain BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  dns_configured BOOLEAN DEFAULT FALSE,
  ssl_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_domain_lookups_tenant_id ON domain_lookups(tenant_id);
CREATE INDEX idx_domain_lookups_domain ON domain_lookups(domain);
CREATE INDEX idx_domain_lookups_is_verified ON domain_lookups(is_verified);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_domain_lookups_updated_at BEFORE UPDATE ON domain_lookups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Step 1.2: Update Prisma Schema

**File:** `prisma/schema.prisma`

```prisma
// Add to existing schema

model Template {
  id              String    @id @default(uuid()) @db.Uuid
  name            String    @db.VarChar(255)
  description     String?   @db.Text
  category        String    @db.VarChar(100)
  industry        String?   @db.VarChar(100)
  previewImage    String?   @map("preview_image") @db.Text
  isPremium       Boolean   @default(false) @map("is_premium")
  isActive        Boolean   @default(true) @map("is_active")
  defaultBranding Json      @map("default_branding") @db.JsonB
  defaultSections Json      @map("default_sections") @db.JsonB
  sortOrder       Int       @default(0) @map("sort_order")
  createdBy       String?   @map("created_by") @db.Uuid
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  creator       User?          @relation(fields: [createdBy], references: [id])
  pageTemplates PageTemplate[]

  @@index([category])
  @@index([industry])
  @@index([isActive])
  @@map("templates")
}

model PageTemplate {
  id             String   @id @default(uuid()) @db.Uuid
  pageId         String   @unique @map("page_id") @db.Uuid
  templateId     String   @map("template_id") @db.Uuid
  customizations Json?    @db.JsonB
  createdAt      DateTime @default(now()) @map("created_at")

  page     Page     @relation(fields: [pageId], references: [id], onDelete: Cascade)
  template Template @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@index([pageId])
  @@index([templateId])
  @@map("page_templates")
}

model Industry {
  id          Int      @id @default(autoincrement())
  name        String   @unique @db.VarChar(255)
  description String?  @db.Text
  icon        String?  @db.VarChar(100)
  sortOrder   Int      @default(0) @map("sort_order")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([isActive])
  @@map("industries")
}

model AuditLog {
  id           String    @id @default(uuid()) @db.Uuid
  userId       String?   @map("user_id") @db.Uuid
  tenantId     String?   @map("tenant_id") @db.Uuid
  action       String    @db.VarChar(255)
  resourceType String?   @map("resource_type") @db.VarChar(100)
  resourceId   String?   @map("resource_id") @db.Uuid
  oldValue     Json?     @map("old_value") @db.JsonB
  newValue     Json?     @map("new_value") @db.JsonB
  ipAddress    String?   @map("ip_address") @db.VarChar(45)
  userAgent    String?   @map("user_agent") @db.Text
  metadata     Json?     @db.JsonB
  createdAt    DateTime  @default(now()) @map("created_at")

  user   User?   @relation(fields: [userId], references: [id])
  tenant Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([userId])
  @@index([action])
  @@index([resourceType])
  @@index([resourceId])
  @@index([createdAt(sort: Desc)])
  @@map("audit_logs")
}

model Webhook {
  id              String    @id @default(uuid()) @db.Uuid
  tenantId        String    @map("tenant_id") @db.Uuid
  url             String    @db.Text
  events          String[]
  secret          String    @db.VarChar(255)
  isActive        Boolean   @default(true) @map("is_active")
  lastTriggeredAt DateTime? @map("last_triggered_at")
  lastStatusCode  Int?      @map("last_status_code")
  failureCount    Int       @default(0) @map("failure_count")
  maxFailures     Int       @default(5) @map("max_failures")
  retryBackoff    Int       @default(60) @map("retry_backoff")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  tenant     Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  deliveries WebhookDelivery[]

  @@index([tenantId])
  @@index([isActive])
  @@map("webhooks")
}

model WebhookDelivery {
  id             String   @id @default(uuid()) @db.Uuid
  webhookId      String   @map("webhook_id") @db.Uuid
  eventType      String   @map("event_type") @db.VarChar(255)
  payload        Json     @db.JsonB
  responseStatus Int?     @map("response_status")
  responseBody   String?  @map("response_body") @db.Text
  errorMessage   String?  @map("error_message") @db.Text
  durationMs     Int?     @map("duration_ms")
  createdAt      DateTime @default(now()) @map("created_at")

  webhook Webhook @relation(fields: [webhookId], references: [id], onDelete: Cascade)

  @@index([webhookId])
  @@index([createdAt(sort: Desc)])
  @@map("webhook_deliveries")
}

model ApiKey {
  id         String    @id @default(uuid()) @db.Uuid
  tenantId   String    @map("tenant_id") @db.Uuid
  name       String    @db.VarChar(255)
  keyHash    String    @unique @map("key_hash") @db.VarChar(255)
  keyPrefix  String    @map("key_prefix") @db.VarChar(20)
  permissions String[] @default([])
  rateLimit  Int       @default(1000) @map("rate_limit")
  lastUsedAt DateTime? @map("last_used_at")
  expiresAt  DateTime? @map("expires_at")
  isActive   Boolean   @default(true) @map("is_active")
  createdBy  String?   @map("created_by") @db.Uuid
  createdAt  DateTime  @default(now()) @map("created_at")
  updatedAt  DateTime  @updatedAt @map("updated_at")

  tenant  Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  creator User?          @relation(fields: [createdBy], references: [id])
  usage   ApiKeyUsage[]

  @@index([tenantId])
  @@index([keyHash])
  @@index([keyPrefix])
  @@index([isActive])
  @@map("api_keys")
}

model ApiKeyUsage {
  id             String   @id @default(uuid()) @db.Uuid
  apiKeyId       String   @map("api_key_id") @db.Uuid
  endpoint       String   @db.VarChar(255)
  method         String   @db.VarChar(10)
  statusCode     Int?     @map("status_code")
  responseTimeMs Int?     @map("response_time_ms")
  ipAddress      String?  @map("ip_address") @db.VarChar(45)
  createdAt      DateTime @default(now()) @map("created_at")

  apiKey ApiKey @relation(fields: [apiKeyId], references: [id], onDelete: Cascade)

  @@index([apiKeyId])
  @@index([createdAt(sort: Desc)])
  @@map("api_key_usage")
}

model DomainLookup {
  id                String    @id @default(uuid()) @db.Uuid
  tenantId          String    @map("tenant_id") @db.Uuid
  domain            String    @unique @db.VarChar(255)
  isSubdomain       Boolean   @default(false) @map("is_subdomain")
  isVerified        Boolean   @default(false) @map("is_verified")
  verificationToken String?   @map("verification_token") @db.VarChar(255)
  dnsConfigured     Boolean   @default(false) @map("dns_configured")
  sslEnabled        Boolean   @default(false) @map("ssl_enabled")
  createdAt         DateTime  @default(now()) @map("created_at")
  verifiedAt        DateTime? @map("verified_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([domain])
  @@index([isVerified])
  @@map("domain_lookups")
}

// Update existing models to include new relations

model Tenant {
  // ... existing fields ...

  auditLogs     AuditLog[]
  webhooks      Webhook[]
  apiKeys       ApiKey[]
  domainLookups DomainLookup[]
}

model User {
  // ... existing fields ...

  auditLogs       AuditLog[]
  createdTemplates Template[]
  createdApiKeys  ApiKey[]
}

model Page {
  // ... existing fields ...

  pageTemplate PageTemplate?
}
```

### Step 1.3: Setup Prisma & Database

```bash
# Install Prisma
npm install prisma @prisma/client
npm install -D prisma

# Initialize Prisma
npx prisma init

# Configure .env
# DATABASE_URL="postgresql://user:password@localhost:5432/siteninja?schema=public"

# Generate Prisma Client
npx prisma generate

# Create migration
npx prisma migrate dev --name initial_schema

# Push to database
npx prisma db push
```

### Step 1.4: Prisma Client Singleton

**File:** `src/lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
```

**Checklist:**
- [ ] All 9 new tables added to SQL schema
- [ ] Prisma schema updated with all models
- [ ] Database created and migrations run
- [ ] Prisma Client generated
- [ ] Connection tested

---

## Phase 2: Core API Implementation

**Duration:** 2 weeks
**Goal:** Implement all CRUD endpoints from API specification

### Step 2.1: API Response Helpers

**File:** `src/utils/apiResponse.ts`

```typescript
import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function successResponse<T>(
  data: T,
  message?: string,
  statusCode: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status: statusCode }
  );
}

export function createdResponse<T>(
  data: T,
  message?: string
): NextResponse<ApiResponse<T>> {
  return successResponse(data, message, 201);
}

export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function errorResponse(
  error: string,
  statusCode: number = 500,
  details?: Array<{ field: string; message: string }>
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error,
      details,
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status: statusCode }
  );
}

export function validationErrorResponse(
  errors: Array<{ field: string; message: string }>
): NextResponse<ApiResponse<never>> {
  return errorResponse('Validation failed', 422, errors);
}

export function notFoundResponse(
  resource: string = 'Resource'
): NextResponse<ApiResponse<never>> {
  return errorResponse(`${resource} not found`, 404);
}

export function unauthorizedResponse(
  message: string = 'Unauthorized'
): NextResponse<ApiResponse<never>> {
  return errorResponse(message, 401);
}

export function forbiddenResponse(
  message: string = 'Forbidden'
): NextResponse<ApiResponse<never>> {
  return errorResponse(message, 403);
}

export function conflictResponse(
  message: string
): NextResponse<ApiResponse<never>> {
  return errorResponse(message, 409);
}

export function rateLimitResponse(
  retryAfter: number = 900
): NextResponse<ApiResponse<never>> {
  const response = errorResponse(
    'Rate limit exceeded',
    429,
    [{ field: 'retryAfter', message: `${retryAfter} seconds` }]
  );

  response.headers.set('Retry-After', retryAfter.toString());
  return response;
}

export function paginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number
): NextResponse<ApiResponse<PaginatedResponse<T>>> {
  const totalPages = Math.ceil(total / limit);

  return successResponse({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}
```

### Step 2.2: Pagination Helper

**File:** `src/utils/pagination.ts`

```typescript
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const sort = searchParams.get('sort') || 'createdAt';
  const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';

  return { page, limit, sort, order };
}

export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function buildPrismaOrderBy(sort: string, order: 'asc' | 'desc') {
  return { [sort]: order };
}
```

### Step 2.3: Tenant APIs

**File:** `app/api/tenants/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  createdResponse,
} from '@/utils/apiResponse';
import {
  parsePaginationParams,
  calculateSkip,
  buildPrismaOrderBy,
} from '@/utils/pagination';
import { CreateTenantSchema } from '@/schemas/tenant.schema';

// GET /api/tenants - List all tenants with pagination & filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sort, order } = parsePaginationParams(searchParams);

    // Filters
    const status = searchParams.get('status');
    const businessType = searchParams.get('businessType');
    const search = searchParams.get('search');
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    // Build where clause
    const where: any = {};

    if (status) where.status = status;
    if (businessType) where.businessType = businessType;
    if (!includeDeleted) where.deletedAt = null;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
        { subdomain: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Execute query
    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip: calculateSkip(page, limit),
        take: limit,
        orderBy: buildPrismaOrderBy(sort, order),
        select: {
          id: true,
          tenantId: true,
          name: true,
          subdomain: true,
          customDomain: true,
          businessName: true,
          businessType: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    return paginatedResponse(tenants, page, limit, total);
  } catch (error: any) {
    console.error('[API] GET /api/tenants error:', error);
    return errorResponse(error.message || 'Failed to fetch tenants');
  }
}

// POST /api/tenants - Create new tenant
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate with Zod (we'll create this schema next)
    const result = CreateTenantSchema.safeParse(body);

    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const data = result.data;

    // Check for duplicate subdomain/custom domain
    const existing = await prisma.tenant.findFirst({
      where: {
        OR: [
          { subdomain: data.subdomain },
          { customDomain: data.customDomain },
        ],
      },
    });

    if (existing) {
      return conflictResponse(
        'Subdomain or custom domain already exists'
      );
    }

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        tenantId: crypto.randomUUID(), // Generate unique tenant ID
        name: data.name,
        subdomain: data.subdomain,
        customDomain: data.customDomain,
        businessName: data.businessName,
        businessType: data.businessType,
        description: data.description,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        businessHours: data.businessHours || {},
        status: 'trial', // Default to trial
      },
    });

    // Create default branding
    await prisma.branding.create({
      data: {
        tenantId: tenant.id,
        primaryColor: '#1D4ED8',
        secondaryColor: '#3B82F6',
        accentColor: '#F59E0B',
        backgroundColor: '#FFFFFF',
        textColor: '#374151',
        fontFamily: 'Inter, sans-serif',
        headingFontFamily: 'Inter, sans-serif',
      },
    });

    // Create domain lookup entry
    if (tenant.subdomain) {
      await prisma.domainLookup.create({
        data: {
          tenantId: tenant.id,
          domain: `${tenant.subdomain}.siteninja.com`,
          isSubdomain: true,
          isVerified: true, // Auto-verify subdomains
        },
      });
    }

    return createdResponse(tenant, 'Tenant created successfully');
  } catch (error: any) {
    console.error('[API] POST /api/tenants error:', error);
    return errorResponse(error.message || 'Failed to create tenant');
  }
}
```

**File:** `app/api/tenants/[tenantId]/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  noContentResponse,
} from '@/utils/apiResponse';

// GET /api/tenants/:tenantId - Get tenant by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { tenantId: params.tenantId },
      include: {
        branding: true,
        subscription: true,
        domainLookups: true,
      },
    });

    if (!tenant) {
      return notFoundResponse('Tenant');
    }

    return successResponse(tenant);
  } catch (error: any) {
    console.error(`[API] GET /api/tenants/${params.tenantId} error:`, error);
    return errorResponse(error.message || 'Failed to fetch tenant');
  }
}

// PUT /api/tenants/:tenantId - Update tenant
export async function PUT(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const body = await request.json();

    // Validate partial update (we'll create UpdateTenantSchema)
    // ...validation code...

    const tenant = await prisma.tenant.update({
      where: { tenantId: params.tenantId },
      data: {
        name: body.name,
        description: body.description,
        contactPhone: body.contactPhone,
        contactEmail: body.contactEmail,
        businessHours: body.businessHours,
        // Don't allow updating tenantId, subdomain, customDomain via this endpoint
      },
    });

    return successResponse(tenant, 'Tenant updated successfully');
  } catch (error: any) {
    console.error(`[API] PUT /api/tenants/${params.tenantId} error:`, error);
    return errorResponse(error.message || 'Failed to update tenant');
  }
}

// DELETE /api/tenants/:tenantId - Soft delete tenant
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hard = searchParams.get('hard') === 'true';

    if (hard) {
      // Hard delete (super_admin only - add auth check)
      await prisma.tenant.delete({
        where: { tenantId: params.tenantId },
      });
    } else {
      // Soft delete
      await prisma.tenant.update({
        where: { tenantId: params.tenantId },
        data: { deletedAt: new Date() },
      });
    }

    return noContentResponse();
  } catch (error: any) {
    console.error(`[API] DELETE /api/tenants/${params.tenantId} error:`, error);
    return errorResponse(error.message || 'Failed to delete tenant');
  }
}
```

### Implementation Plan Summary

Continue implementing all endpoints from API specification:

1. ✅ **Tenant APIs** (5 endpoints)
2. **Page APIs** (7 endpoints) - Similar pattern
3. **Section APIs** (7 endpoints)
4. **Navigation APIs** (6 endpoints)
5. **SEO Metadata APIs** (3 endpoints)
6. **Branding APIs** (3 endpoints)
7. **User APIs** (6 endpoints)
8. **Subscription APIs** (4 endpoints)
9. **Asset APIs** (5 endpoints)
10. **AI/Content APIs** (3 endpoints)

**Total:** 49 API endpoints to implement

**Checklist:**
- [ ] API response helpers created
- [ ] Pagination helpers created
- [ ] Tenant APIs implemented (5 endpoints)
- [ ] Page APIs implemented (7 endpoints)
- [ ] Section APIs implemented (7 endpoints)
- [ ] Navigation APIs implemented (6 endpoints)
- [ ] SEO APIs implemented (3 endpoints)
- [ ] Branding APIs implemented (3 endpoints)
- [ ] User APIs implemented (6 endpoints)
- [ ] Subscription APIs implemented (4 endpoints)
- [ ] Asset APIs implemented (5 endpoints)
- [ ] AI APIs implemented (3 endpoints)

---

## Phase 3: Validation & Error Handling

**Duration:** 3-4 days
**Goal:** Bulletproof validation and consistent error handling

### Step 3.1: Zod Schemas

**File:** `src/schemas/tenant.schema.ts`

```typescript
import { z } from 'zod';

export const CreateTenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  subdomain: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Subdomain must be alphanumeric with hyphens')
    .min(3, 'Subdomain must be at least 3 characters')
    .max(63, 'Subdomain too long')
    .optional(),
  customDomain: z
    .string()
    .regex(
      /^[a-z0-9.-]+\.[a-z]{2,}$/,
      'Invalid domain format'
    )
    .optional(),
  businessName: z
    .string()
    .min(1, 'Business name is required')
    .max(255, 'Business name too long'),
  businessType: z.string().min(1).max(100),
  description: z.string().max(5000).optional(),
  contactPhone: z.string().max(50).optional(),
  contactEmail: z.string().email('Invalid email').optional(),
  businessHours: z.record(z.string()).optional(),
});

export const UpdateTenantSchema = CreateTenantSchema.partial();

export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;
export type UpdateTenantInput = z.infer<typeof UpdateTenantSchema>;
```

**File:** `src/schemas/page.schema.ts`

```typescript
import { z } from 'zod';

export const CreatePageSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must be alphanumeric with hyphens')
    .min(1, 'Slug is required')
    .max(255, 'Slug too long'),
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  sections: z
    .array(
      z.object({
        sectionId: z.string().min(1, 'Section ID required'),
        type: z.string().min(1, 'Section type required'),
        content: z.any(), // Validate per section type
        sortOrder: z.number().int().min(0).default(0),
      })
    )
    .optional(),
});

export const UpdatePageSchema = CreatePageSchema.partial().omit({ slug: true });

export type CreatePageInput = z.infer<typeof CreatePageSchema>;
export type UpdatePageInput = z.infer<typeof UpdatePageSchema>;
```

Create schemas for all resources:
- `tenant.schema.ts`
- `page.schema.ts`
- `section.schema.ts`
- `navigation.schema.ts`
- `seo.schema.ts`
- `branding.schema.ts`
- `user.schema.ts`
- `subscription.schema.ts`
- `asset.schema.ts`

### Step 3.2: Global Error Handler

**File:** `app/api/error-handler.ts`

```typescript
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { errorResponse, validationErrorResponse } from '@/utils/apiResponse';

export function handleApiError(error: any): NextResponse {
  console.error('[API Error]', error);

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        return errorResponse(
          `Duplicate value: ${error.meta?.target}`,
          409
        );
      case 'P2025': // Record not found
        return errorResponse('Resource not found', 404);
      case 'P2003': // Foreign key constraint failed
        return errorResponse('Referenced resource does not exist', 400);
      default:
        return errorResponse('Database error', 500);
    }
  }

  // Validation errors (Zod)
  if (error.name === 'ZodError') {
    return validationErrorResponse(
      error.errors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      }))
    );
  }

  // Generic error
  return errorResponse(
    error.message || 'Internal server error',
    500
  );
}
```

**Checklist:**
- [ ] All Zod schemas created (10 schema files)
- [ ] Input validation added to all POST/PUT endpoints
- [ ] Global error handler created
- [ ] Prisma error handling integrated
- [ ] Error responses tested

---

## Phase 4: Authentication & Authorization

**Duration:** 1 week
**Goal:** JWT-based auth with role-based access control

### Step 4.1: NextAuth.js Setup

```bash
npm install next-auth @auth/prisma-adapter bcrypt
npm install -D @types/bcrypt
```

**File:** `app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing credentials');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true },
        });

        if (!user || !user.passwordHash) {
          throw new Error('Invalid credentials');
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) {
          throw new Error('Invalid credentials');
        }

        if (user.status !== 'active') {
          throw new Error('Account is not active');
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### Step 4.2: Auth Middleware

**File:** `src/middleware/auth.ts`

```typescript
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { unauthorizedResponse, forbiddenResponse } from '@/utils/apiResponse';

export async function requireAuth(
  request: NextRequest,
  requiredRole?: string[]
) {
  const token = await getToken({ req: request });

  if (!token) {
    return unauthorizedResponse('Authentication required');
  }

  if (requiredRole && !requiredRole.includes(token.role as string)) {
    return forbiddenResponse('Insufficient permissions');
  }

  return token;
}

export async function requireTenantAccess(
  request: NextRequest,
  tenantId: string
) {
  const token = await getToken({ req: request });

  if (!token) {
    return unauthorizedResponse('Authentication required');
  }

  // Super admin can access all tenants
  if (token.role === 'super_admin') {
    return token;
  }

  // Check if user belongs to this tenant
  if (token.tenantId !== tenantId) {
    return forbiddenResponse('Access denied to this tenant');
  }

  return token;
}
```

### Step 4.3: Apply Auth to APIs

**Update:** `app/api/tenants/route.ts`

```typescript
import { requireAuth } from '@/middleware/auth';

export async function GET(request: NextRequest) {
  // Require super_admin or admin role
  const authResult = await requireAuth(request, ['super_admin', 'admin']);
  if (authResult instanceof NextResponse) {
    return authResult; // Return error response
  }

  // ... rest of implementation
}
```

**Checklist:**
- [ ] NextAuth.js configured
- [ ] Credentials provider setup
- [ ] JWT callbacks implemented
- [ ] Auth middleware created
- [ ] Auth applied to all protected endpoints
- [ ] Role-based access control tested

---

## Phase 5: Advanced Features

**Duration:** 1 week
**Goal:** Audit logging, webhooks, API keys

### Step 5.1: Audit Logging

**File:** `src/services/audit.service.ts`

```typescript
import { prisma } from '@/lib/prisma';

export async function logAudit({
  userId,
  tenantId,
  action,
  resourceType,
  resourceId,
  oldValue,
  newValue,
  ipAddress,
  userAgent,
  metadata,
}: {
  userId?: string;
  tenantId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        tenantId,
        action,
        resourceType,
        resourceId,
        oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
        ipAddress,
        userAgent,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      },
    });
  } catch (error) {
    console.error('[Audit] Failed to log audit entry:', error);
    // Don't throw - audit logging should not break the main flow
  }
}
```

**Usage in APIs:**

```typescript
// In tenant creation endpoint
const tenant = await prisma.tenant.create({ data });

await logAudit({
  userId: token.id,
  tenantId: tenant.id,
  action: 'tenant.create',
  resourceType: 'tenant',
  resourceId: tenant.id,
  newValue: tenant,
  ipAddress: request.headers.get('x-forwarded-for') || request.ip,
  userAgent: request.headers.get('user-agent'),
});
```

### Step 5.2: Webhook System

**File:** `src/services/webhook.service.ts`

```typescript
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function triggerWebhooks(
  tenantId: string,
  eventType: string,
  payload: any
) {
  // Find active webhooks for this tenant and event
  const webhooks = await prisma.webhook.findMany({
    where: {
      tenantId,
      isActive: true,
      events: {
        has: eventType,
      },
      failureCount: {
        lt: prisma.webhook.fields.maxFailures,
      },
    },
  });

  // Trigger each webhook
  for (const webhook of webhooks) {
    await deliverWebhook(webhook.id, eventType, payload);
  }
}

async function deliverWebhook(
  webhookId: string,
  eventType: string,
  payload: any
) {
  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId },
  });

  if (!webhook) return;

  const startTime = Date.now();
  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let errorMessage: string | null = null;

  try {
    // Create HMAC signature
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    // Send webhook
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': eventType,
      },
      body: JSON.stringify(payload),
    });

    responseStatus = response.status;
    responseBody = await response.text();

    // Update webhook status
    if (response.ok) {
      await prisma.webhook.update({
        where: { id: webhookId },
        data: {
          lastTriggeredAt: new Date(),
          lastStatusCode: responseStatus,
          failureCount: 0, // Reset on success
        },
      });
    } else {
      // Increment failure count
      await prisma.webhook.update({
        where: { id: webhookId },
        data: {
          failureCount: { increment: 1 },
          lastStatusCode: responseStatus,
        },
      });
    }
  } catch (error: any) {
    errorMessage = error.message;

    // Increment failure count
    await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        failureCount: { increment: 1 },
      },
    });
  }

  // Log delivery
  await prisma.webhookDelivery.create({
    data: {
      webhookId,
      eventType,
      payload: JSON.parse(JSON.stringify(payload)),
      responseStatus,
      responseBody,
      errorMessage,
      durationMs: Date.now() - startTime,
    },
  });
}
```

### Step 5.3: API Key Authentication

**File:** `src/services/apiKey.service.ts`

```typescript
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export async function generateApiKey(
  tenantId: string,
  name: string,
  permissions: string[],
  createdBy: string
): Promise<{ key: string; keyId: string }> {
  // Generate random API key
  const key = `sn_${crypto.randomBytes(32).toString('hex')}`;
  const keyPrefix = key.substring(0, 12); // sn_xxxxxxxx
  const keyHash = await bcrypt.hash(key, 10);

  // Store in database
  const apiKey = await prisma.apiKey.create({
    data: {
      tenantId,
      name,
      keyHash,
      keyPrefix,
      permissions,
      createdBy,
    },
  });

  return { key, keyId: apiKey.id };
}

export async function validateApiKey(key: string): Promise<any | null> {
  const keyPrefix = key.substring(0, 12);

  // Find API key by prefix
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      keyPrefix,
      isActive: true,
    },
    include: {
      tenant: true,
    },
  });

  if (!apiKey) return null;

  // Check if expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }

  // Verify hash
  const isValid = await bcrypt.compare(key, apiKey.keyHash);
  if (!isValid) return null;

  // Update last used
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return apiKey;
}
```

**Checklist:**
- [ ] Audit logging service created
- [ ] Audit logs integrated into all CRUD operations
- [ ] Webhook delivery system implemented
- [ ] Webhook triggers added to key events
- [ ] API key generation implemented
- [ ] API key authentication middleware created

---

## Phase 6: Performance & Security

**Duration:** 3-4 days
**Goal:** Caching, rate limiting, security headers

### Step 6.1: Rate Limiting

```bash
npm install @upstash/ratelimit @upstash/redis
```

**File:** `src/middleware/rateLimit.ts`

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';
import { rateLimitResponse } from '@/utils/apiResponse';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Create rate limiter
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1000, '1 h'), // 1000 requests per hour
  analytics: true,
});

export async function checkRateLimit(
  request: NextRequest,
  identifier: string
) {
  const { success, limit, remaining, reset } = await ratelimit.limit(
    identifier
  );

  // Add rate limit headers
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', limit.toString());
  headers.set('X-RateLimit-Remaining', remaining.toString());
  headers.set('X-RateLimit-Reset', reset.toString());

  if (!success) {
    return rateLimitResponse(Math.ceil((reset - Date.now()) / 1000));
  }

  return null; // No rate limit hit
}
```

### Step 6.2: Caching Strategy

**File:** `src/services/cache.service.ts`

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    return cached as T | null;
  } catch (error) {
    console.error('[Cache] Get error:', error);
    return null;
  }
}

export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds: number = 300
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch (error) {
    console.error('[Cache] Set error:', error);
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('[Cache] Invalidate error:', error);
  }
}

// Cache keys
export const CacheKeys = {
  tenant: (tenantId: string) => `tenant:${tenantId}`,
  tenantPages: (tenantId: string) => `tenant:${tenantId}:pages`,
  page: (tenantId: string, slug: string) => `page:${tenantId}:${slug}`,
  navigation: (tenantId: string) => `nav:${tenantId}`,
  branding: (tenantId: string) => `branding:${tenantId}`,
};
```

**Usage in APIs:**

```typescript
// In GET /api/tenants/:tenantId
const cacheKey = CacheKeys.tenant(params.tenantId);

// Try cache first
const cached = await getCached(cacheKey);
if (cached) {
  return successResponse(cached);
}

// Cache miss - fetch from database
const tenant = await prisma.tenant.findUnique({
  where: { tenantId: params.tenantId },
});

// Store in cache (5 minutes)
await setCached(cacheKey, tenant, 300);

return successResponse(tenant);
```

### Step 6.3: Security Headers

**File:** `src/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set(
    'X-Content-Type-Options',
    'nosniff'
  );
  response.headers.set(
    'X-Frame-Options',
    'DENY'
  );
  response.headers.set(
    'X-XSS-Protection',
    '1; mode=block'
  );
  response.headers.set(
    'Referrer-Policy',
    'strict-origin-when-cross-origin'
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  // CORS (if needed)
  if (request.method === 'OPTIONS') {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );
    return response;
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

**Checklist:**
- [ ] Rate limiting implemented
- [ ] Redis caching setup
- [ ] Cache invalidation on updates
- [ ] Security headers added
- [ ] CORS configured

---

## Testing Strategy

### Unit Tests (Jest)

```bash
npm install -D jest @testing-library/react @testing-library/jest-dom
npm install -D @types/jest ts-node
```

**File:** `tests/utils/apiResponse.test.ts`

```typescript
import { successResponse, errorResponse } from '@/utils/apiResponse';

describe('API Response Helpers', () => {
  it('should create success response', () => {
    const response = successResponse({ id: '123' }, 'Success');
    expect(response.status).toBe(200);
  });

  it('should create error response', () => {
    const response = errorResponse('Error', 400);
    expect(response.status).toBe(400);
  });
});
```

### Integration Tests (API Routes)

**File:** `tests/api/tenants.test.ts`

```typescript
import { GET, POST } from '@/app/api/tenants/route';
import { prisma } from '@/lib/prisma';

describe('Tenant API', () => {
  beforeEach(async () => {
    // Clean database
    await prisma.tenant.deleteMany();
  });

  it('should create tenant', async () => {
    const request = new Request('http://localhost:3000/api/tenants', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Tenant',
        businessName: 'Test Business',
        businessType: 'Testing',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Test Tenant');
  });
});
```

---

## Deployment Checklist

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/siteninja"

# Auth
NEXTAUTH_URL="https://api.siteninja.com"
NEXTAUTH_SECRET="your-secret-here"

# Redis
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# External Services
STRIPE_SECRET_KEY="sk_..."
OPENAI_API_KEY="sk-..."
SENDGRID_API_KEY="SG..."

# Monitoring
SENTRY_DSN="https://..."
```

### Pre-Deployment

- [ ] All tests passing
- [ ] Database migrations run
- [ ] Environment variables set
- [ ] API documentation updated
- [ ] Postman collection exported
- [ ] Rate limits configured
- [ ] Error tracking setup (Sentry)
- [ ] Health check endpoint created

### Post-Deployment

- [ ] Monitor error rates
- [ ] Check database performance
- [ ] Verify rate limiting working
- [ ] Test authentication flow
- [ ] Validate webhook deliveries
- [ ] Review audit logs

---

## Success Criteria

Backend is considered "perfect" when:

1. ✅ All 49 API endpoints implemented
2. ✅ 100% test coverage for critical paths
3. ✅ Response times < 100ms (p95)
4. ✅ Zero authentication bypasses
5. ✅ All inputs validated with Zod
6. ✅ Consistent error responses
7. ✅ Audit logs for all mutations
8. ✅ Rate limiting prevents abuse
9. ✅ Caching reduces DB load by 60%+
10. ✅ Database queries optimized (no N+1)

---

**Timeline Summary:**
- Phase 1: 1 week (Database)
- Phase 2: 2 weeks (API Implementation)
- Phase 3: 3-4 days (Validation)
- Phase 4: 1 week (Auth)
- Phase 5: 1 week (Advanced Features)
- Phase 6: 3-4 days (Performance)

**Total: 4-6 weeks** to perfect backend

---

**Next Step:** Start with Phase 1 - Database Schema completion. Let me know when you're ready to begin implementation!
