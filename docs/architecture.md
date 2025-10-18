# SiteNinja Backend Architecture Document

**Version:** 1.0
**Date:** October 16, 2025
**Status:** MVP Active Development
**Author:** Architecture Team

---

## Table of Contents

1. [Introduction](#introduction)
2. [High-Level Architecture](#high-level-architecture)
3. [Technology Stack](#technology-stack)
4. [Data Models & Storage](#data-models--storage)
5. [API Layer Architecture](#api-layer-architecture)
6. [Service Layer Organization](#service-layer-organization)
7. [Database Schema Design](#database-schema-design)
8. [Multi-Tenant Isolation](#multi-tenant-isolation)
9. [Security Architecture](#security-architecture)
10. [Scalability & Performance](#scalability--performance)
11. [Integration Points](#integration-points)
12. [Migration Path](#migration-path)

---

## Introduction

### Purpose

This document defines the backend architecture for **SiteNinja**, a multi-tenant website builder platform for service-based businesses. The architecture supports rapid website creation with AI-powered content optimization, real-time inline editing, and comprehensive SEO management.

### Scope

This architecture document covers:
- Backend API design and implementation
- Data storage and persistence layer
- Service contracts (JSON-based currently, database-backed future)
- Multi-tenant data isolation mechanisms
- Authentication and authorization (planned)
- External service integrations
- Database migration strategy from file-based to PostgreSQL

**Note:** Frontend architecture is documented separately. This document focuses exclusively on backend systems, APIs, data models, and infrastructure.

### Architectural Goals

1. **Multi-Tenant Isolation:** Complete data separation between tenants with zero data leakage
2. **Rapid Development:** MVP-first approach with clear path to production scale
3. **Type Safety:** TypeScript-first design with comprehensive type definitions
4. **Service Contract Clarity:** JSON schemas serve as API contracts between frontend and backend
5. **Migration Ready:** File-based storage designed for seamless PostgreSQL migration
6. **Stateless APIs:** Horizontal scalability through stateless API design
7. **Performance:** <2s page load times, <100ms API response times
8. **Developer Experience:** Clear separation of concerns, modular service architecture

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-16 | 1.0 | Initial backend architecture document | Architecture Team |

---

## High-Level Architecture

### Technical Summary

SiteNinja employs a **serverless-first, file-based multi-tenant architecture** for MVP with a clear migration path to database-backed production infrastructure. The system uses Next.js 15 API Routes for backend functionality, TypeScript for type safety, and JSON files as the current persistence layer serving as API contracts.

**Key characteristics:**
- Serverless compute via Next.js API Routes (Vercel Functions)
- File-based JSON storage for tenant data (MVP phase, scalable to 100-500 tenants)
- RESTful API design with consistent response format
- Service layer organized by portal/domain (tenant, admin, business-owner, support, super-admin, AI)
- CORS-enabled for cross-origin requests
- Comprehensive logging with `[API RouteName]` prefixes for debugging

### Architectural Style

**Current (MVP):** Monolithic serverless application with modular service architecture
- All backend logic in single Next.js application
- API Routes provide RESTful endpoints
- File system serves as database
- Stateless request handling

**Future (Production):** Hybrid serverless + microservices
- Primary application remains serverless (Next.js API Routes)
- Compute-intensive operations extracted to microservices (AI processing, image optimization)
- PostgreSQL database with Prisma ORM
- Redis for caching and session management
- Message queue (AWS SQS / Redis Queue) for async operations

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  (React 19 + Next.js 15 Frontend - See Frontend Architecture)   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTPS/REST
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                           │
│                 (Next.js API Routes - app/api/)                  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Tenant     │  │    Admin     │  │      AI      │         │
│  │     APIs     │  │    Portal    │  │   Services   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Business   │  │    Super     │  │     SEO      │         │
│  │    Owner     │  │    Admin     │  │   Services   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Service Calls
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
│                  (src/api/modules/*)                             │
│                                                                   │
│  Organized by Domain:                                            │
│  • tenant/          - Tenant data operations                     │
│  • admin/           - Admin portal services                      │
│  • business-owner/  - Business owner dashboard                   │
│  • support/         - Customer support services                  │
│  • super-admin/     - Platform operations                        │
│  • ai/              - AI content optimization                    │
│  • sign-up/         - Customer onboarding                        │
│  • login/           - Authentication (stub)                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ File I/O (MVP) / Database (Production)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Data Persistence Layer                       │
│                                                                   │
│  CURRENT (MVP):                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  File-Based JSON Storage (public/API/tenant/)            │  │
│  │  • tenant/{tenantId}/website.json (branding, metadata)   │  │
│  │  │  tenant/{tenantId}/{slug}.json (page content)         │  │
│  │  │  tenant/{tenantId}/header.json (navigation)           │  │
│  │  │  tenant/{tenantId}/seo/{slug}.json (SEO metadata)     │  │
│  │  └─ tenant/lookup/{domain}.json (domain→tenant mapping)  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  FUTURE (Production):                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL 15+ with Row-Level Security (RLS)           │  │
│  │  • Prisma ORM for type-safe database access              │  │
│  │  • Redis for caching and session management              │  │
│  │  • S3/R2 for image and asset storage                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

External Integrations (Planned):
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│    Stripe    │  │  OpenAI API  │  │  SendGrid    │
│   Payments   │  │  (AI/LLM)    │  │    Email     │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Repository Structure

**Current:** Single repository (monolith)
```
SiteNinja-React/
├── app/
│   ├── api/              # API Routes (backend endpoints)
│   │   ├── tenant/       # Tenant-specific APIs
│   │   ├── ai/           # AI optimization endpoints
│   │   ├── seo/          # SEO management APIs
│   │   └── save-content/ # Content persistence API
│   └── tenant/           # Tenant page rendering (SSR)
├── src/
│   ├── api/
│   │   ├── client.ts     # HTTP client wrapper
│   │   └── modules/      # Service layer by domain
│   │       ├── tenant/
│   │       ├── admin/
│   │       ├── business-owner/
│   │       ├── super-admin/
│   │       ├── support/
│   │       ├── ai/
│   │       ├── sign-up/
│   │       └── login/
│   ├── types/
│   │   └── index.ts      # Comprehensive type definitions (900+ lines)
│   └── components/       # React components (see Frontend Architecture)
├── public/
│   └── API/
│       └── tenant/       # JSON data storage (service contracts)
└── package.json
```

**Future Consideration:** Monorepo with Turborepo/Nx for better separation once codebase scales beyond 100K LOC.

---

## Technology Stack

### Backend Runtime & Framework

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| **Runtime** | Node.js | 20.11.0 LTS | JavaScript runtime | Long-term support, stable, ecosystem maturity |
| **Framework** | Next.js | 15.5.0 | Full-stack framework | Built-in API routes, SSR/SSG, excellent DX, Vercel optimization |
| **Language** | TypeScript | 5.x | Type-safe development | Catch errors at compile-time, superior IDE support, self-documenting code |
| **API Pattern** | REST | - | API architecture | Simple, cacheable, stateless, widely understood |

### Data & Storage (Current MVP)

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| **Storage** | File System (JSON) | - | Data persistence (MVP) | Zero infrastructure cost, rapid development, easy inspection, acts as service contract |
| **Type Validation** | TypeScript Interfaces | 5.x | Runtime type safety | 900+ lines of comprehensive type definitions in `src/types/index.ts` |

### Data & Storage (Future Production)

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| **Database** | PostgreSQL | 15+ | Primary data store | ACID compliance, JSON support, row-level security for multi-tenancy, excellent performance |
| **ORM** | Prisma | 5.x | Database access layer | Type-safe queries, migration management, excellent DX, auto-generated types |
| **Caching** | Redis | 7.x | Session & cache store | Fast in-memory operations, pub/sub for real-time features |
| **Object Storage** | AWS S3 / Cloudflare R2 | - | Image & asset storage | Scalable, CDN-integrated, cost-effective |

### Infrastructure & Deployment

| Category | Technology | Purpose | Rationale |
|----------|------------|---------|-----------|
| **Hosting (MVP)** | Vercel | Next.js deployment | Zero-config deployment, preview environments, edge network, generous free tier |
| **Hosting (Prod)** | AWS / GCP | Production infrastructure | Full control, scalability, cost optimization at scale |
| **CDN** | Cloudflare / CloudFront | Global asset delivery | Fast content delivery, DDoS protection, edge caching |
| **Monitoring** | Sentry / Datadog | Error tracking & APM | Real-time error alerts, performance monitoring, user impact analysis |

### External Services (Planned)

| Service | Purpose | Integration Status |
|---------|---------|-------------------|
| **Stripe** | Payment processing | Planned (Priority 4) |
| **OpenAI / Anthropic** | AI content optimization | Architecture ready, using heuristics currently |
| **SendGrid / AWS SES** | Transactional email | Planned for contact forms |
| **Auth0 / NextAuth.js** | Authentication & authorization | Planned (Priority 1) |
| **Google Analytics** | Website analytics | Planned (Phase 2) |

---

## Data Models & Storage

### Current Storage Architecture (MVP)

**File-Based JSON Storage** in `public/API/tenant/` directory

**Key Design Principles:**
1. Each JSON file represents a **service contract** between API and UI
2. File structure mirrors API endpoint structure
3. TypeScript interfaces in `src/types/index.ts` define all data shapes
4. JSON files are directly accessible via HTTP (`/API/tenant/{tenantId}/{slug}.json`)
5. API Routes provide CRUD operations with validation and business logic

### Tenant Data Organization

```
public/API/tenant/
├── lookup/
│   ├── {domain}.json          # Domain → Tenant ID mapping
│   │   Example: denversplumbing.json → { "tenantId": "123" }
│   │
│   └── siteninja.com.json     # Subdomain lookups
│
├── {tenantId}/                # Tenant-specific data (isolated by folder)
│   ├── website.json           # Tenant metadata & branding
│   ├── common.json            # Shared tenant configuration
│   ├── header.json            # Navigation menu items
│   │
│   ├── {slug}.json            # Page content (home.json, services.json, etc.)
│   │
│   └── seo/
│       └── {slug}.json        # Per-page SEO metadata
│
└── {tenantId}/                # Multiple tenants, completely isolated
    ├── website.json
    ├── header.json
    └── ...
```

### Core Data Models

#### 1. Tenant Model

**File:** `public/API/tenant/{tenantId}/website.json`

**TypeScript Interface:** `TenantData`

```typescript
export interface TenantData {
  id: string;              // Unique tenant identifier
  tenantId: string;        // Same as id (redundancy for compatibility)
  name: string;            // Display name
  subdomain: string;       // Subdomain (e.g., "mountainplumbing")
  customDomain?: string;   // Custom domain (e.g., "mountainplumbing.com")
  businessName: string;    // Business legal name
  businessType: string;    // Industry (e.g., "Plumbing", "IT Consulting")
  description?: string;    // Business description
  contactInfo?: {
    phone?: string;
    email?: string;
  };
  businessHours?: Record<string, string>;  // Day → Hours mapping
  branding?: Branding;     // Visual identity
}
```

**Relationships:**
- **1:N** with Pages (one tenant has many pages)
- **1:N** with Navigation Items (one tenant has many menu items)
- **1:1** with Branding configuration

**Example JSON:**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Mountain View Plumbing",
    "subdomain": "mountainplumbing",
    "businessName": "Mountain View Plumbing",
    "businessType": "Plumbing",
    "description": "Denver's most trusted plumbing service...",
    "contactInfo": {
      "phone": "(555) 123-PLUMB",
      "email": "info@mountainviewplumbing.com"
    },
    "businessHours": {
      "Monday-Friday": "7AM-6PM",
      "Saturday": "8AM-4PM",
      "Emergency": "24/7"
    },
    "branding": {
      "primaryColor": "#1D4ED8",
      "secondaryColor": "#3B82F6",
      "accentColor": "#F59E0B",
      "backgroundColor": "#FFFFFF",
      "textColor": "#374151",
      "fontFamily": "Source Sans Pro, sans-serif",
      "headingFontFamily": "Source Sans Pro, sans-serif",
      "logoUrl": "/assets/mountain-view-plumbing-logo.png",
      "faviconUrl": "/assets/mountain-view-plumbing-favicon.ico"
    }
  }
}
```

#### 2. Page Model

**File:** `public/API/tenant/{tenantId}/{slug}.json`

**TypeScript Interface:** `PageData`

```typescript
export interface PageData {
  id: string;              // Unique page identifier
  title: string;           // Page title
  metadata?: Metadata;     // SEO metadata (optional, also in seo/ folder)
  sections: Section[];     // Array of page sections
}

export interface Section {
  id: string;              // Unique section identifier
  type: string;            // Section type (hero, services, testimonials, etc.)
  content: any;            // Section-specific content (strongly typed per type)
}
```

**Relationships:**
- **N:1** with Tenant (many pages belong to one tenant)
- **1:N** with Sections (one page has many sections)
- **1:1** with SEO Metadata (one page has one SEO config)

**Supported Section Types:**
- `navigation` - Site navigation
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

**Example JSON:**
```json
{
  "id": "home-123",
  "title": "Denver's Most Trusted Emergency Plumbers",
  "metadata": {
    "metaTitle": "Mountain View Plumbing - Emergency Plumbers in Denver",
    "metaDescription": "24/7 emergency plumbing services..."
  },
  "sections": [
    {
      "id": "hero-123",
      "type": "hero",
      "content": {
        "title": "Denver's Most Trusted Emergency Plumbers",
        "subtitle": "Available 24/7 for all your plumbing emergencies...",
        "phone": "(555) 123-PLUMB",
        "cta": {
          "label": "View Our Services",
          "href": "/tenant/123/services"
        },
        "features": [
          "Licensed & Insured",
          "24/7 Emergency Service",
          "Upfront Pricing"
        ]
      }
    },
    {
      "id": "footer-123",
      "type": "footer",
      "content": {
        "businessName": "Mountain View Plumbing",
        "description": "Denver's most trusted plumbing service...",
        "sections": [...],
        "copyright": "© 2024 Mountain View Plumbing"
      }
    }
  ]
}
```

#### 3. Navigation Model

**File:** `public/API/tenant/{tenantId}/header.json`

**TypeScript Interface:** `PublicPageListItem[]`

```typescript
export interface PublicPageListItem {
  slug: string;         // Page slug (URL segment)
  title: string;        // Display title
  sortOrder: number;    // Display order (0-indexed)
}
```

**Business Rules:**
- Maximum 10 navigation items per tenant
- No duplicate slugs allowed
- `sortOrder` determines display sequence
- Automatically updated when pages are created/deleted

**Example JSON:**
```json
[
  {
    "title": "Home",
    "slug": "home",
    "sortOrder": 0
  },
  {
    "title": "Services",
    "slug": "services",
    "sortOrder": 1
  },
  {
    "title": "About",
    "slug": "about",
    "sortOrder": 2
  },
  {
    "title": "Contact Us",
    "slug": "contactus",
    "sortOrder": 3
  }
]
```

#### 4. SEO Metadata Model

**File:** `public/API/tenant/{tenantId}/seo/{slug}.json`

**TypeScript Interface:** `Metadata` (extended)

```typescript
export interface Metadata {
  title: string;             // Meta title (30-60 chars recommended)
  description: string;       // Meta description (120-160 chars)
  keywords: string;          // Comma-separated keywords
  schema: string;            // JSON-LD structured data
  ogTitle: string;           // Open Graph title
  ogDescription: string;     // Open Graph description
  ogImage: string;           // Open Graph image URL
}
```

**Example JSON:**
```json
{
  "title": "IT Consulting Services - Technology Solutions",
  "description": "Professional IT consulting...",
  "keywords": "IT consulting, cloud migration, cybersecurity...",
  "schema": "{\n  \"@context\": \"https://schema.org\",\n  \"@type\": \"LocalBusiness\"...}",
  "ogTitle": "Professional IT Consulting - Technology Solutions",
  "ogDescription": "Expert IT consulting services...",
  "ogImage": ""
}
```

#### 5. Domain Lookup Model

**File:** `public/API/tenant/lookup/{domain}.json`

**Purpose:** Maps custom domains and subdomains to tenant IDs

```typescript
export interface TenantLookup {
  tenantId: string;         // Target tenant ID
  customDomain?: string;    // Custom domain if applicable
}
```

**Example JSON:**
```json
{
  "tenantId": "123"
}
```

**Lookup Strategy:**
1. Extract domain/subdomain from request
2. Check `lookup/{domain}.json` for tenant ID
3. Load tenant data from `tenant/{tenantId}/`
4. Fallback to error page if tenant not found

### API Response Format

**All API endpoints return consistent response structure:**

```typescript
export interface ApiResponse<T> {
  success: boolean;          // Operation success flag
  data?: T;                  // Response payload (if successful)
  message?: string;          // Human-readable message
  error?: string;            // Error message (if failed)
  details?: Array<{          // Validation errors (if applicable)
    field: string;
    message: string;
  }>;
}
```

**Success Response Example:**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Mountain View Plumbing",
    ...
  },
  "message": "Page data retrieved successfully"
}
```

**Error Response Example:**
```json
{
  "success": false,
  "error": "Tenant not found",
  "message": "No tenant exists with ID: invalid-id",
  "details": [
    {
      "field": "tenantId",
      "message": "Invalid tenant identifier"
    }
  ]
}
```

---

## API Layer Architecture

### API Routes Overview

**Location:** `app/api/`

All API routes follow Next.js App Router conventions using Route Handlers (`route.ts` files).

**Key Design Principles:**
1. **RESTful routing:** Resources mapped to URL paths
2. **HTTP method semantics:** GET (read), POST (create/update), DELETE (remove)
3. **Consistent responses:** All endpoints return `ApiResponse<T>` format
4. **CORS enabled:** Cross-origin requests supported with proper headers
5. **Comprehensive logging:** `[API RouteName]` prefixes for debugging
6. **Input validation:** Server-side validation for all inputs
7. **Error handling:** Try-catch blocks with user-friendly error messages

### API Route Structure

```
app/api/
├── tenant/
│   ├── [tenantId]/
│   │   ├── header/
│   │   │   └── route.ts            # GET/POST navigation items
│   │   ├── pages/
│   │   │   ├── route.ts            # GET (list), POST (create), DELETE
│   │   │   └── [slug]/
│   │   │       └── sections/
│   │   │           └── route.ts    # GET page sections
│   │   └── design/
│   │       └── save/
│   │           └── route.ts        # POST branding updates
│   └── design/
│       └── save/
│           └── route.ts            # POST design changes
├── save-content/
│   └── route.ts                    # POST content updates (main edit endpoint)
├── seo/
│   ├── get/
│   │   └── route.ts                # GET SEO metadata
│   └── save/
│       └── route.ts                # POST SEO updates
└── ai/
    ├── content-optimize/
    │   └── route.ts                # POST AI content suggestions
    └── seo-optimize/
        └── route.ts                # POST AI SEO optimization
```

### Core API Endpoints

#### Tenant Data APIs

| Endpoint | Method | Purpose | Request | Response |
|----------|--------|---------|---------|----------|
| `/api/tenant/{tenantId}/pages` | GET | List all pages for tenant | - | `ApiResponse<PageListItem[]>` |
| `/api/tenant/{tenantId}/pages` | POST | Create new page | `{ title, slug?, schema? }` | `ApiResponse<{ success: boolean }>` |
| `/api/tenant/{tenantId}/pages` | DELETE | Delete page | `{ slug }` | `ApiResponse<{ success: boolean }>` |
| `/api/tenant/{tenantId}/pages/{slug}/sections` | GET | Get page sections | - | `ApiResponse<Section[]>` |
| `/api/tenant/{tenantId}/header` | GET | Get navigation items | - | `ApiResponse<NavItem[]>` |
| `/api/tenant/{tenantId}/header` | POST | Update navigation | `NavItem[]` | `ApiResponse<{ success: boolean }>` |

#### Content Management APIs

| Endpoint | Method | Purpose | Request | Response |
|----------|--------|---------|---------|----------|
| `/api/save-content` | POST | Save section edits | `{ tenantId, slug, updatedSections }` | `ApiResponse<{ success: boolean }>` |
| `/api/tenant/design/save` | POST | Save branding changes | `{ tenantId, branding }` | `ApiResponse<{ success: boolean }>` |

#### SEO Management APIs

| Endpoint | Method | Purpose | Request | Response |
|----------|--------|---------|---------|----------|
| `/api/seo/get` | GET | Get SEO metadata | `?tenantId=X&slug=Y` | `ApiResponse<Metadata>` |
| `/api/seo/save` | POST | Save SEO settings | `{ tenantId, slug, ...metadata }` | `ApiResponse<{ success: boolean }>` |

#### AI Optimization APIs

| Endpoint | Method | Purpose | Request | Response |
|----------|--------|---------|---------|----------|
| `/api/ai/content-optimize` | POST | Optimize content with AI | `{ tenantId, field, text, context }` | `ApiResponse<{ optimized: string }>` |
| `/api/ai/seo-optimize` | POST | Generate SEO metadata | `{ tenantId, slug, pageContent }` | `ApiResponse<Metadata>` |

### API Implementation Example

**File:** `app/api/save-content/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { corsHeaders } from '../cors';

export async function POST(request: Request) {
  const origin = request.headers.get('origin') || '*';

  try {
    // Parse request body
    const body = await request.json();
    const { tenantId, slug, updatedSections } = body;

    // Input validation
    if (!tenantId || !slug || !updatedSections) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // File path construction
    const filePath = path.join(
      process.cwd(),
      'public',
      'API',
      'tenant',
      tenantId,
      `${slug}.json`
    );

    // Read existing data
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const existingData = JSON.parse(fileContent);

    // Update sections (merge logic)
    existingData.sections = existingData.sections.map((section: any) => {
      if (updatedSections[section.id]) {
        return {
          ...section,
          content: updatedSections[section.id]
        };
      }
      return section;
    });

    // Write updated data
    await fs.writeFile(
      filePath,
      JSON.stringify(existingData, null, 2),
      'utf-8'
    );

    return NextResponse.json(
      { success: true, message: 'Changes saved successfully' },
      { headers: corsHeaders(origin) }
    );

  } catch (err: any) {
    console.error('[API SaveContent] Error:', err);
    return NextResponse.json(
      { success: false, message: `Failed to save changes: ${err.message}` },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
```

**Key Implementation Patterns:**
1. **CORS handling:** Headers applied to all responses
2. **Comprehensive logging:** `console.log('[API SaveContent]', ...)` for debugging
3. **Input validation:** Explicit checks with user-friendly error messages
4. **File operations:** `fs/promises` for async file I/O
5. **Error handling:** Try-catch with detailed error responses
6. **JSON formatting:** Pretty-printed with 2-space indentation for human readability

### CORS Configuration

**File:** `app/api/cors.ts`

```typescript
export function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}
```

**Applied to:**
- All API route responses
- OPTIONS preflight requests handled separately

---

## Service Layer Organization

### Architecture

**Location:** `src/api/modules/`

The service layer provides a clean abstraction between React components and backend APIs. Services are organized by **domain/portal** rather than by technical function.

**Key Design Principles:**
1. **Domain-driven organization:** Services grouped by business domain (tenant, admin, business-owner, etc.)
2. **Single responsibility:** Each service module handles one specific domain
3. **Type-safe:** All services use TypeScript interfaces from `src/types/index.ts`
4. **Reusable:** Services called from multiple components
5. **Testable:** Pure functions with no side effects (besides HTTP calls)
6. **Consistent:** All services return `ApiResponse<T>` or `Promise<ApiResponse<T>>`

### Service Module Structure

```
src/api/
├── client.ts                    # HTTP client wrapper (fetch-based)
└── modules/
    ├── tenant/                  # Tenant-facing services
    │   ├── GetPageData.service.ts
    │   ├── GetTenantData.service.ts
    │   ├── GetHeaderData.service.ts
    │   ├── GetNavData.service.ts
    │   ├── SaveContent.service.ts
    │   ├── PageService.ts
    │   ├── TenantService.ts
    │   ├── UpdateHeaderData.service.ts
    │   ├── GetTenantIdsByWebsiteName.service.ts
    │   └── Design.service.ts
    │
    ├── admin/                   # Admin portal services
    │   ├── adminAnalytics.service.ts
    │   ├── getActiveAdminOverrides.service.ts
    │   ├── getAllCustomerData.service.ts
    │   ├── goDaddyIntegration.service.ts
    │   ├── getSubscriptionPlan.service.ts
    │   ├── getConfigurationMetrics.service.ts
    │   ├── llmUsedByModel.service.ts
    │   ├── llmUsage.service.ts
    │   ├── llmTopCustomer.service.ts
    │   ├── managedDomains.service.ts
    │   ├── manageCustomerWebsite.service.ts
    │   ├── templateManage.Service.ts
    │   ├── recentWebsite.Service.ts
    │   └── statsCards.service.ts
    │
    ├── business-owner/          # Business owner dashboard services
    │   ├── billing.service.ts
    │   ├── support.service.ts
    │   ├── dashboard.service.ts
    │   ├── website.service.ts
    │   └── team.service.ts
    │
    ├── super-admin/             # Super admin portal services
    │   ├── billing-revenue.service.ts
    │   ├── customer-management.service.ts
    │   ├── infrastructure.service.ts
    │   └── staff-management.service.ts
    │
    ├── support/                 # Customer support portal services
    │   ├── contentModeration.service.ts
    │   ├── supportStats.service.ts
    │   ├── customers.service.ts
    │   └── supportTickets.service.ts
    │
    ├── ai/                      # AI services
    │   └── aiService.ts
    │
    ├── sign-up/                 # Customer onboarding services
    │   ├── country.service.ts
    │   ├── industry.service.ts
    │   ├── palettes.service.ts
    │   └── template.service.ts
    │
    └── login/                   # Authentication services (stub)
        └── login.service.ts
```

### HTTP Client Wrapper

**File:** `src/api/client.ts`

```typescript
import { ApiResponse } from '@/types';

export async function http<T>(
  url: string,
  config?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...config,
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data.data || data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network request failed',
    };
  }
}
```

**Features:**
- Consistent error handling
- Automatic JSON parsing
- Type-safe responses
- Works with both absolute and relative URLs

### Service Example

**File:** `src/api/modules/tenant/GetPageData.service.ts`

```typescript
import { http } from '@/api/client';
import { PublicPageResponse, ApiResponse } from '@/types';

export const GetPageData = {
  get: (
    tenantId: string,
    slug: string
  ): Promise<ApiResponse<PublicPageResponse['data']>> =>
    http<PublicPageResponse['data']>(
      `/API/tenant/${tenantId}/${slug}.json`,
      { method: 'GET' }
    ),
};
```

**Usage in Component:**
```typescript
import { GetPageData } from '@/api/modules/tenant/GetPageData.service';

// Inside React component
const response = await GetPageData.get('123', 'home');
if (response.success) {
  setPageData(response.data);
} else {
  setError(response.error);
}
```

### Service Naming Conventions

**Pattern:** `{Action}{Resource}.service.ts`

**Examples:**
- `GetPageData.service.ts` - Retrieves page data
- `SaveContent.service.ts` - Saves content updates
- `UpdateHeaderData.service.ts` - Updates navigation
- `adminAnalytics.service.ts` - Admin analytics data

**Export Pattern:**
- Named export as object with methods: `export const ServiceName = { method: ... }`
- Allows multiple related methods: `GetPageData.get()`, `GetPageData.list()`

---

## Database Schema Design

### PostgreSQL Migration Strategy

**Current State:** File-based JSON storage (MVP)
**Target State:** PostgreSQL 15+ with Prisma ORM
**Migration Timeline:** When tenant count reaches 100-200

### Proposed Database Schema

#### Core Tables

**1. tenants**
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) UNIQUE NOT NULL,  -- Business identifier
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
  deleted_at TIMESTAMP  -- Soft delete support
);

CREATE INDEX idx_tenants_tenant_id ON tenants(tenant_id);
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain);
CREATE INDEX idx_tenants_status ON tenants(status);
```

**2. branding**
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
  UNIQUE(tenant_id)  -- One branding config per tenant
);

CREATE INDEX idx_branding_tenant_id ON branding(tenant_id);
```

**3. pages**
```sql
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  status VARCHAR(50) DEFAULT 'published',  -- draft, published, archived
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(tenant_id, slug)  -- Unique slug per tenant
);

CREATE INDEX idx_pages_tenant_id ON pages(tenant_id);
CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_status ON pages(status);
```

**4. sections**
```sql
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  section_id VARCHAR(255) NOT NULL,  -- User-facing ID (hero-123, footer-456)
  type VARCHAR(100) NOT NULL,        -- hero, services, testimonials, etc.
  content JSONB NOT NULL,            -- Section-specific content
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sections_page_id ON sections(page_id);
CREATE INDEX idx_sections_type ON sections(type);
CREATE INDEX idx_sections_sort_order ON sections(sort_order);
CREATE INDEX idx_sections_content_gin ON sections USING gin(content);  -- JSONB index
```

**5. navigation**
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

CREATE INDEX idx_navigation_tenant_id ON navigation(tenant_id);
CREATE INDEX idx_navigation_page_id ON navigation(page_id);
CREATE INDEX idx_navigation_sort_order ON navigation(sort_order);
```

**6. seo_metadata**
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
  UNIQUE(page_id)  -- One SEO config per page
);

CREATE INDEX idx_seo_metadata_page_id ON seo_metadata(page_id);
```

#### Multi-Tenant Isolation with Row-Level Security (RLS)

**Enable RLS on all tenant-scoped tables:**

```sql
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_metadata ENABLE ROW LEVEL SECURITY;

-- Create policy to isolate tenant data
CREATE POLICY tenant_isolation_policy ON pages
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_policy ON sections
  USING (page_id IN (
    SELECT id FROM pages
    WHERE tenant_id = current_setting('app.current_tenant_id')::UUID
  ));

-- Apply similar policies to all tenant-scoped tables
```

**Application-Level Tenant Context:**

```typescript
// Set tenant context at start of request
await prisma.$executeRaw`SET app.current_tenant_id = ${tenantId}`;

// All subsequent queries automatically filtered by RLS
const pages = await prisma.page.findMany();  // Only returns current tenant's pages
```

#### Supporting Tables (Future)

**7. users** (for authentication)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),  -- Hashed with bcrypt
  role VARCHAR(50) DEFAULT 'owner',  -- owner, editor, viewer
  status VARCHAR(50) DEFAULT 'active',
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
```

**8. subscriptions** (for billing)
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  plan VARCHAR(50) NOT NULL,  -- basic, professional, enterprise
  status VARCHAR(50) DEFAULT 'active',  -- active, past_due, canceled
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at TIMESTAMP,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id)  -- One subscription per tenant
);

CREATE INDEX idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

**9. assets** (for image/file storage)
```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  filename VARCHAR(500) NOT NULL,
  storage_key VARCHAR(500) NOT NULL,  -- S3/R2 object key
  mime_type VARCHAR(100),
  size_bytes BIGINT,
  width INTEGER,  -- For images
  height INTEGER,  -- For images
  alt_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assets_tenant_id ON assets(tenant_id);
CREATE INDEX idx_assets_storage_key ON assets(storage_key);
```

### Prisma Schema

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
```

### Migration Scripts

**Data Migration from JSON to PostgreSQL:**

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
        ...websiteData.data.branding,
      },
    });
  }

  // Migrate pages
  const pages = await fs.readdir(
    path.join(process.cwd(), 'public/API/tenant', tenantId)
  );

  for (const pageFile of pages.filter(f => f.endsWith('.json') && f !== 'website.json' && f !== 'header.json' && f !== 'common.json')) {
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
    const seoPath = path.join(process.cwd(), 'public/API/tenant', tenantId, 'seo', `${pageFile}`);
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

  console.log(`✓ Migrated tenant: ${tenantId}`);
}

async function main() {
  const tenantDirs = await fs.readdir(
    path.join(process.cwd(), 'public/API/tenant')
  );

  for (const tenantId of tenantDirs.filter(d => d !== 'lookup')) {
    await migrateTenantData(tenantId);
  }

  console.log('✓ All tenants migrated successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## Multi-Tenant Isolation

### Current Implementation (File-Based)

**Isolation Mechanism:** Filesystem directory separation

**Structure:**
```
public/API/tenant/
├── {tenantId-1}/     # Tenant 1 data (completely isolated)
│   ├── website.json
│   ├── home.json
│   └── ...
├── {tenantId-2}/     # Tenant 2 data (completely isolated)
│   ├── website.json
│   ├── home.json
│   └── ...
```

**Security:**
- **Read isolation:** API routes validate `tenantId` parameter before file access
- **Write isolation:** All write operations scoped to tenant directory
- **No cross-tenant access:** Path traversal prevented by strict path validation

**Validation Example:**
```typescript
// Prevent path traversal attacks
const filePath = path.join(
  process.cwd(),
  'public',
  'API',
  'tenant',
  tenantId,  // Validated to be alphanumeric only
  `${slug}.json`
);

// Ensure path is within tenant directory
if (!filePath.startsWith(path.join(process.cwd(), 'public/API/tenant/', tenantId))) {
  throw new Error('Invalid path');
}
```

### Future Implementation (PostgreSQL with RLS)

**Isolation Mechanism:** Row-Level Security (RLS) policies

**How it works:**
1. **Session variable:** Set tenant context at request start
   ```sql
   SET app.current_tenant_id = '123';
   ```

2. **RLS policies:** Automatically filter all queries
   ```sql
   CREATE POLICY tenant_isolation_policy ON pages
     USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
   ```

3. **Transparent filtering:** All Prisma queries auto-scoped
   ```typescript
   await prisma.$executeRaw`SET app.current_tenant_id = ${tenantId}`;
   const pages = await prisma.page.findMany();  // Auto-filtered to tenant
   ```

**Advantages:**
- **Database-enforced:** Even SQL injection can't bypass RLS
- **Zero trust:** No reliance on application-level filtering
- **Performance:** PostgreSQL optimizes RLS-filtered queries
- **Audit trail:** All queries logged with tenant context

**Backup Isolation:**
- Separate backup schedules per tenant (premium feature)
- Point-in-time recovery scoped to tenant
- Export tenant data for GDPR compliance

---

## Security Architecture

### Current Security Measures (MVP)

#### 1. CORS Protection
```typescript
export function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,  // Validated origin
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
```

#### 2. Input Validation
- **Server-side validation:** All API inputs validated before processing
- **Type checking:** TypeScript types enforced at compile time
- **Sanitization:** User inputs sanitized to prevent XSS

**Example:**
```typescript
// Validate tenantId (alphanumeric only)
if (!tenantId || !/^[a-zA-Z0-9-_]+$/.test(tenantId)) {
  return NextResponse.json(
    { success: false, message: 'Invalid tenant ID' },
    { status: 400 }
  );
}

// Validate slug (alphanumeric + hyphens only)
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  return NextResponse.json(
    { success: false, message: 'Invalid page slug' },
    { status: 400 }
  );
}
```

#### 3. Path Traversal Prevention
```typescript
// Ensure file path is within tenant directory
const normalizedPath = path.normalize(filePath);
if (!normalizedPath.startsWith(expectedBasePath)) {
  throw new Error('Security violation: Path traversal detected');
}
```

#### 4. Rate Limiting (Planned)
- **API rate limits:** 100 requests/minute per tenant
- **Implementation:** Vercel Edge Config or Upstash Redis
- **Response:** HTTP 429 (Too Many Requests) when exceeded

### Future Security Enhancements (Production)

#### 1. Authentication & Authorization

**Technology:** NextAuth.js or Auth0

**User Roles:**
- **Owner:** Full access to tenant (create, edit, delete)
- **Editor:** Can edit content, cannot delete pages or change settings
- **Viewer:** Read-only access

**JWT Structure:**
```typescript
{
  sub: "user-id",
  email: "user@example.com",
  role: "owner",
  tenantId: "123",
  exp: 1234567890
}
```

**Authorization Middleware:**
```typescript
export async function withAuth(
  request: NextRequest,
  requiredRole: 'owner' | 'editor' | 'viewer'
) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const decoded = await verifyJWT(token);

  if (!hasRole(decoded.role, requiredRole)) {
    return NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: 403 }
    );
  }

  return decoded;
}
```

#### 2. Data Encryption

**In Transit:**
- TLS 1.3 for all HTTPS connections
- Certificate pinning for mobile apps (future)

**At Rest:**
- AES-256 encryption for database fields containing PII
- Encrypted backups with separate key management
- AWS KMS or HashiCorp Vault for key management

#### 3. Secrets Management

**Development:**
- `.env.local` for local secrets (gitignored)
- Never commit secrets to version control

**Production:**
- **Vercel:** Environment variables via Vercel dashboard
- **AWS:** AWS Secrets Manager or Parameter Store
- **Access pattern:** Secrets loaded at runtime, never hardcoded

**Example:**
```typescript
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}
```

#### 4. SQL Injection Prevention

**Prisma ORM:** Parameterized queries by default
```typescript
// Safe - Prisma handles parameterization
await prisma.page.findMany({
  where: { tenantId: userProvidedTenantId }
});

// Unsafe - Raw SQL (only use with $queryRaw parameterization)
await prisma.$queryRaw`
  SELECT * FROM pages WHERE tenant_id = ${userProvidedTenantId}
`;  // Prisma automatically parameterizes
```

#### 5. XSS Prevention

**Content Security Policy (CSP):**
```typescript
export function securityHeaders() {
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Next.js requirements
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
      "img-src 'self' data: https:",
      "font-src 'self' fonts.gstatic.com",
      "connect-src 'self' https://api.stripe.com",
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
}
```

**Sanitization:**
- User-generated content sanitized with DOMPurify
- HTML encoding for display

#### 6. CSRF Protection

**NextAuth.js CSRF tokens:**
```typescript
// Automatic CSRF token validation for authenticated requests
export async function POST(request: NextRequest) {
  const csrfToken = request.headers.get('X-CSRF-Token');
  const session = await getServerSession();

  if (!session || session.csrfToken !== csrfToken) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  // Process request...
}
```

#### 7. Security Auditing

**Logging:**
- All API requests logged with timestamp, user, tenant, action
- Failed auth attempts logged and monitored
- Suspicious activity alerts (multiple failed logins, unusual access patterns)

**Audit Trail:**
```typescript
await prisma.auditLog.create({
  data: {
    userId: user.id,
    tenantId: tenant.id,
    action: 'page.delete',
    resourceType: 'page',
    resourceId: pageId,
    ipAddress: request.ip,
    userAgent: request.headers.get('user-agent'),
    timestamp: new Date(),
  },
});
```

---

## Scalability & Performance

### Current Performance (MVP)

**File-Based Storage:**
- **Read performance:** <10ms (filesystem cache)
- **Write performance:** <50ms (synchronous file write)
- **Concurrent requests:** Limited by Node.js event loop (thousands/sec possible)
- **Tenant capacity:** 100-500 tenants before performance degradation

**Bottlenecks:**
1. Synchronous file I/O blocks event loop
2. No caching layer (every request reads from disk)
3. No connection pooling (not applicable for file storage)

### Future Performance Optimizations

#### 1. Database Connection Pooling

**Prisma Configuration:**
```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Connection pool via DATABASE_URL
DATABASE_URL="postgresql://user:pass@host:5432/db?pool_timeout=10&connection_limit=20"
```

**Connection Pool Sizing:**
- **Formula:** `connections = ((core_count * 2) + effective_spindle_count)`
- **Example:** 4-core server = `(4 * 2) + 1 = 9 connections`
- **Recommendation:** Start with 10-20 connections, monitor and adjust

#### 2. Caching Strategy

**Redis Caching Layers:**

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

// Cache tenant data (TTL: 1 hour)
export async function getTenantData(tenantId: string) {
  const cacheKey = `tenant:${tenantId}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  // Cache miss - fetch from database
  const tenant = await prisma.tenant.findUnique({
    where: { tenantId },
    include: { branding: true },
  });

  // Store in cache
  await redis.set(cacheKey, tenant, { ex: 3600 });  // 1 hour TTL

  return tenant;
}

// Cache page data (TTL: 5 minutes)
export async function getPageData(tenantId: string, slug: string) {
  const cacheKey = `page:${tenantId}:${slug}`;

  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  const page = await prisma.page.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
    include: { sections: true, seoMetadata: true },
  });

  await redis.set(cacheKey, page, { ex: 300 });  // 5 minutes TTL

  return page;
}
```

**Cache Invalidation:**
```typescript
// Invalidate cache on updates
export async function updatePageContent(
  tenantId: string,
  slug: string,
  updates: any
) {
  // Update database
  const page = await prisma.page.update({
    where: { tenantId_slug: { tenantId, slug } },
    data: updates,
  });

  // Invalidate cache
  await redis.del(`page:${tenantId}:${slug}`);

  return page;
}
```

#### 3. CDN & Edge Caching

**Vercel Edge Network:**
- Automatic edge caching for static assets
- `Cache-Control` headers for API responses

```typescript
export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId');
  const slug = request.nextUrl.searchParams.get('slug');

  const page = await getPageData(tenantId!, slug!);

  return NextResponse.json(
    { success: true, data: page },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    }
  );
}
```

#### 4. Database Query Optimization

**Indexes:**
```sql
-- Composite index for tenant + slug lookups
CREATE INDEX idx_pages_tenant_slug ON pages(tenant_id, slug);

-- JSONB GIN index for section content search
CREATE INDEX idx_sections_content_gin ON sections USING gin(content);

-- Covering index for common queries
CREATE INDEX idx_pages_list ON pages(tenant_id, status, created_at DESC)
  INCLUDE (id, slug, title);
```

**Query Optimization:**
```typescript
// Inefficient - N+1 query problem
const pages = await prisma.page.findMany({ where: { tenantId } });
for (const page of pages) {
  page.sections = await prisma.section.findMany({ where: { pageId: page.id } });
}

// Efficient - Single query with eager loading
const pages = await prisma.page.findMany({
  where: { tenantId },
  include: { sections: true },
});
```

#### 5. Horizontal Scaling

**Stateless API Design:**
- No session state stored in server memory
- Session data in Redis (shared across instances)
- JWT tokens for authentication (no server-side session)

**Load Balancing:**
```
              ┌─────────────┐
              │ Load Balancer│
              │  (AWS ALB)   │
              └──────┬───────┘
         ┌───────────┼───────────┐
         │           │           │
    ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
    │ API     │ │ API     │ │ API     │
    │ Instance│ │ Instance│ │ Instance│
    │    1    │ │    2    │ │    3    │
    └────┬────┘ └────┬────┘ └────┬────┘
         │           │           │
         └───────────┼───────────┘
                     │
              ┌──────▼───────┐
              │  PostgreSQL  │
              │   (RDS)      │
              └──────────────┘
```

#### 6. Async Processing with Message Queues

**For long-running operations:**

```typescript
import { Queue } from 'bullmq';

const aiOptimizationQueue = new Queue('ai-optimization', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT!),
  },
});

// API endpoint - queue job and return immediately
export async function POST(request: NextRequest) {
  const { tenantId, slug, content } = await request.json();

  // Add job to queue
  await aiOptimizationQueue.add('optimize-content', {
    tenantId,
    slug,
    content,
  });

  return NextResponse.json({
    success: true,
    message: 'Optimization queued',
    jobId: job.id,
  });
}

// Worker process - processes jobs asynchronously
const worker = new Worker('ai-optimization', async (job) => {
  const { tenantId, slug, content } = job.data;

  // Call OpenAI API (slow operation)
  const optimized = await openai.complete({
    prompt: `Optimize this content: ${content}`,
  });

  // Update database with result
  await prisma.section.update({
    where: { /* ... */ },
    data: { content: optimized },
  });
}, {
  connection: { /* ... */ },
});
```

### Performance Targets

| Metric | MVP (File-Based) | Production (PostgreSQL) |
|--------|------------------|-------------------------|
| API Response Time (p50) | <100ms | <50ms |
| API Response Time (p95) | <500ms | <200ms |
| API Response Time (p99) | <2s | <500ms |
| Page Load Time (SSR) | <2s | <1s |
| Concurrent Requests | 1,000/sec | 10,000/sec |
| Tenant Capacity | 500 | 100,000+ |
| Database Query Time (p95) | N/A | <10ms |
| Cache Hit Rate | 0% (no cache) | 90%+ |

---

## Integration Points

### Current Integrations (MVP)

**None** - All functionality is self-contained

### Planned Integrations (Production)

#### 1. Payment Processing - Stripe

**Purpose:** Subscription billing, payment processing

**Integration Points:**
- `POST /api/billing/create-subscription` - Create subscription
- `POST /api/billing/update-payment-method` - Update card
- `POST /api/webhooks/stripe` - Handle Stripe webhooks

**Webhook Events:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Example:**
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createSubscription(
  customerId: string,
  priceId: string
) {
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });

  return subscription;
}
```

#### 2. AI/LLM - OpenAI / Anthropic Claude

**Purpose:** Content optimization, SEO generation

**Integration Points:**
- `POST /api/ai/content-optimize` - Optimize section content
- `POST /api/ai/seo-optimize` - Generate SEO metadata
- `POST /api/ai/generate-page` - Generate entire page from prompt

**Current Implementation (Heuristic):**
```typescript
// src/api/modules/ai/aiService.ts
export const aiService = {
  optimizeContent: async (text: string, context: string) => {
    // Heuristic-based optimization (MVP)
    // TODO: Replace with OpenAI API call
    return {
      optimized: text.trim(),
      suggestions: [
        'Consider adding more specific details',
        'Use active voice for stronger impact',
      ],
    };
  },
};
```

**Future Implementation (LLM):**
```typescript
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const aiService = {
  optimizeContent: async (text: string, context: string) => {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a professional copywriter specializing in service business websites.',
        },
        {
          role: 'user',
          content: `Optimize this content for a ${context} business: "${text}"`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return {
      optimized: completion.choices[0].message.content,
      suggestions: [],
    };
  },
};
```

#### 3. Email Delivery - SendGrid / AWS SES

**Purpose:** Transactional emails, notifications

**Integration Points:**
- Contact form submissions
- Welcome emails
- Password reset
- Billing notifications

**Example:**
```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendContactFormNotification(
  to: string,
  formData: any
) {
  await sgMail.send({
    to,
    from: 'noreply@siteninja.com',
    subject: 'New Contact Form Submission',
    templateId: 'd-xxxxxxxxxxxxx',
    dynamicTemplateData: {
      name: formData.name,
      email: formData.email,
      message: formData.message,
    },
  });
}
```

#### 4. Analytics - Google Analytics 4

**Purpose:** Website traffic analytics, conversion tracking

**Integration:**
- Server-side Google Analytics 4 API
- Event tracking via Measurement Protocol

**Example:**
```typescript
export async function trackEvent(
  tenantId: string,
  eventName: string,
  eventParams: Record<string, any>
) {
  await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`,
    {
      method: 'POST',
      body: JSON.stringify({
        client_id: tenantId,
        events: [
          {
            name: eventName,
            params: eventParams,
          },
        ],
      }),
    }
  );
}
```

#### 5. Domain Management - GoDaddy / Cloudflare

**Purpose:** Custom domain provisioning, DNS management, SSL certificates

**Integration Points:**
- `POST /api/domains/provision` - Provision custom domain
- `POST /api/domains/verify` - Verify domain ownership
- `POST /api/domains/ssl` - Provision SSL certificate

**Example (Cloudflare API):**
```typescript
export async function addDNSRecord(
  domain: string,
  tenantSubdomain: string
) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'CNAME',
        name: domain,
        content: `${tenantSubdomain}.siteninja.com`,
        proxied: true,
      }),
    }
  );

  return response.json();
}
```

---

## Migration Path

### Phase 1: MVP (Current State)

**Timeline:** Complete (October 2025)

**Infrastructure:**
- File-based JSON storage
- Next.js API Routes
- Vercel hosting
- No authentication
- No payment processing

**Capacity:** 100-500 tenants

### Phase 2: Database Migration

**Timeline:** When tenant count reaches 100-200

**Steps:**

1. **Preparation** (Week 1)
   - Set up PostgreSQL database (AWS RDS or Supabase)
   - Install and configure Prisma ORM
   - Write Prisma schema
   - Create migration scripts

2. **Data Migration** (Week 2)
   - Run migration script to convert JSON → PostgreSQL
   - Validate data integrity
   - Keep JSON files as backup

3. **API Updates** (Week 2-3)
   - Update all API routes to use Prisma instead of `fs`
   - Implement RLS policies
   - Add database connection pooling
   - Update service layer

4. **Testing** (Week 3)
   - Integration tests for all API endpoints
   - Load testing with 1,000+ concurrent requests
   - Multi-tenant isolation verification
   - Performance benchmarking

5. **Deployment** (Week 4)
   - Deploy database to production
   - Blue-green deployment of updated API
   - Monitor for errors
   - Rollback plan: Revert to JSON files if issues

**Rollback Strategy:**
- Keep JSON files for 30 days post-migration
- Automated rollback script if database issues detected
- Database backups before migration

### Phase 3: Authentication & Authorization

**Timeline:** Immediately after database migration

**Implementation:**
- Install NextAuth.js or Auth0
- Create users table in database
- Implement JWT-based authentication
- Add authorization middleware to API routes
- Update frontend with login/signup flows

### Phase 4: Payment Integration

**Timeline:** Q1 2026

**Implementation:**
- Integrate Stripe SDK
- Create subscriptions table
- Implement webhook handlers
- Add billing portal
- Test subscription lifecycle (create, update, cancel)

### Phase 5: Production Scaling

**Timeline:** Q2 2026 (when reaching 1,000+ tenants)

**Implementation:**
- Set up Redis caching layer
- Implement CDN for static assets (Cloudflare/CloudFront)
- Add message queue for async operations (BullMQ)
- Set up monitoring (Datadog/Sentry)
- Implement rate limiting
- Database read replicas for scaling reads

### Migration Checklist

- [ ] **Database Setup**
  - [ ] Provision PostgreSQL instance (AWS RDS / Supabase)
  - [ ] Configure connection pooling
  - [ ] Set up SSL connections
  - [ ] Create database backups strategy

- [ ] **Prisma Configuration**
  - [ ] Install Prisma CLI and client
  - [ ] Write Prisma schema
  - [ ] Generate Prisma client
  - [ ] Test database connection

- [ ] **Data Migration**
  - [ ] Write migration script (JSON → PostgreSQL)
  - [ ] Test migration on staging environment
  - [ ] Run migration on production data
  - [ ] Validate data integrity (row counts, checksums)

- [ ] **API Updates**
  - [ ] Replace `fs` operations with Prisma queries
  - [ ] Implement RLS policies
  - [ ] Update error handling for database errors
  - [ ] Add transaction support for multi-step operations

- [ ] **Testing**
  - [ ] Unit tests for all Prisma queries
  - [ ] Integration tests for API endpoints
  - [ ] Load testing (1,000+ concurrent requests)
  - [ ] Multi-tenant isolation verification
  - [ ] Performance benchmarking (latency, throughput)

- [ ] **Deployment**
  - [ ] Deploy database to production
  - [ ] Deploy updated API code
  - [ ] Update environment variables (DATABASE_URL)
  - [ ] Monitor error rates and performance
  - [ ] Keep JSON files as backup for 30 days

- [ ] **Post-Migration**
  - [ ] Monitor database performance (slow queries, connection pool)
  - [ ] Optimize queries with indexes
  - [ ] Set up database monitoring (CloudWatch, Datadog)
  - [ ] Document database schema and migrations

---

## Summary

This backend architecture document provides a comprehensive blueprint for SiteNinja's backend systems, covering:

1. **Current MVP implementation** with file-based JSON storage serving as both persistence layer and API contracts
2. **Clear migration path** to production-grade PostgreSQL database with Prisma ORM
3. **Multi-tenant isolation** mechanisms for both file-based and database-backed architectures
4. **Security architecture** with authentication, authorization, and data protection strategies
5. **Scalability planning** with caching, CDN, message queues, and horizontal scaling
6. **Integration points** for payment processing, AI/LLM, email, analytics, and domain management

**Key Architectural Decisions:**

| Decision | Rationale |
|----------|-----------|
| File-based JSON storage (MVP) | Zero infrastructure cost, rapid development, JSON files serve as service contracts |
| PostgreSQL (Production) | ACID compliance, JSON support, row-level security for multi-tenancy |
| Prisma ORM | Type-safe queries, excellent DX, auto-generated types |
| Next.js API Routes | Serverless, zero-config deployment, excellent DX |
| TypeScript-first | Type safety, self-documenting code, catch errors at compile time |
| Monolithic architecture (MVP) | Faster development, simpler deployment, easier debugging |
| Microservices extraction (Future) | Scale compute-intensive operations independently (AI, image processing) |

**Next Steps:**

1. Complete authentication system (NextAuth.js / Auth0)
2. Implement payment integration (Stripe)
3. Plan database migration when approaching 100-200 tenants
4. Set up monitoring and error tracking (Sentry / Datadog)
5. Implement caching layer (Redis / Upstash)

---

**Document Maintenance:**

This document should be updated when:
- Major architectural changes are made
- New integrations are added
- Database schema changes significantly
- Performance characteristics change materially
- Security vulnerabilities are discovered and mitigated

**Last Updated:** October 16, 2025
**Next Review:** December 2025 (Post-Database Migration)
