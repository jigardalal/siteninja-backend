# SiteNinja API Specification

**Version:** 1.0
**Date:** October 16, 2025
**Base URL:** `https://api.siteninja.com` (Production) | `http://localhost:3000` (Development)
**Protocol:** REST over HTTPS
**Authentication:** JWT Bearer Token (Planned)

---

## Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Common Patterns](#common-patterns)
4. [Tenant APIs](#tenant-apis)
5. [Page APIs](#page-apis)
6. [Section APIs](#section-apis)
7. [Navigation APIs](#navigation-apis)
8. [SEO Metadata APIs](#seo-metadata-apis)
9. [Branding APIs](#branding-apis)
10. [User APIs](#user-apis)
11. [Subscription APIs](#subscription-apis)
12. [Asset APIs](#asset-apis)
13. [AI/Content Optimization APIs](#aicontent-optimization-apis)
14. [Error Codes](#error-codes)

---

## API Overview

### Base Response Format

All API responses follow this structure:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error, malformed request |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists (duplicate) |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## Authentication

### Header Format

```http
Authorization: Bearer <jwt_token>
```

### JWT Token Structure

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "role": "owner",
  "tenantId": "123",
  "exp": 1234567890
}
```

### Roles & Permissions

| Role | Permissions |
|------|------------|
| **super_admin** | Full platform access, all tenants |
| **admin** | Admin portal access, customer management |
| **owner** | Full access to own tenant |
| **editor** | Edit content, cannot delete or change settings |
| **viewer** | Read-only access |

---

## Common Patterns

### Pagination

Query parameters for paginated endpoints:

```
GET /api/tenants?page=1&limit=20&sort=createdAt&order=desc
```

**Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 20, max: 100) - Items per page
- `sort` (default: createdAt) - Sort field
- `order` (default: desc) - Sort order (asc|desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Filtering

```
GET /api/pages?tenantId=123&status=published&search=home
```

### Soft Deletes

Resources with `deletedAt` timestamp are soft-deleted. Include `?includeDeleted=true` to fetch them.

---

## Tenant APIs

### 1. List Tenants

**Endpoint:** `GET /api/tenants`

**Query Parameters:**
```typescript
{
  page?: number;          // Page number (default: 1)
  limit?: number;         // Items per page (default: 20, max: 100)
  sort?: string;          // Sort field (default: 'createdAt')
  order?: 'asc' | 'desc'; // Sort order (default: 'desc')
  status?: string;        // Filter by status (active|suspended|cancelled|trial)
  search?: string;        // Search by name, businessName, subdomain
  businessType?: string;  // Filter by business type
  includeDeleted?: boolean; // Include soft-deleted (default: false)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "tenantId": "123",
        "name": "Mountain View Plumbing",
        "subdomain": "mountainplumbing",
        "customDomain": "mountainplumbing.com",
        "businessName": "Mountain View Plumbing",
        "businessType": "Plumbing",
        "status": "active",
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-15T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### 2. Get Tenant by ID

**Endpoint:** `GET /api/tenants/:tenantId`

**URL Parameters:**
- `tenantId` - Tenant ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "123",
    "name": "Mountain View Plumbing",
    "subdomain": "mountainplumbing",
    "customDomain": "mountainplumbing.com",
    "businessName": "Mountain View Plumbing",
    "businessType": "Plumbing",
    "description": "Denver's most trusted plumbing service",
    "contactPhone": "(555) 123-PLUMB",
    "contactEmail": "info@mountainplumbing.com",
    "businessHours": {
      "Monday-Friday": "7AM-6PM",
      "Saturday": "8AM-4PM",
      "Emergency": "24/7"
    },
    "status": "active",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T00:00:00Z"
  }
}
```

### 3. Create Tenant

**Endpoint:** `POST /api/tenants`

**Request Body:**
```json
{
  "name": "Mountain View Plumbing",
  "subdomain": "mountainplumbing",
  "customDomain": "mountainplumbing.com",
  "businessName": "Mountain View Plumbing",
  "businessType": "Plumbing",
  "description": "Denver's most trusted plumbing service",
  "contactPhone": "(555) 123-PLUMB",
  "contactEmail": "info@mountainplumbing.com",
  "businessHours": {
    "Monday-Friday": "7AM-6PM",
    "Saturday": "8AM-4PM"
  }
}
```

**Validation:**
- `name` - Required, 1-255 chars
- `businessName` - Required, 1-255 chars
- `subdomain` - Optional, unique, alphanumeric + hyphens
- `customDomain` - Optional, unique, valid domain format
- `contactEmail` - Optional, valid email format

**Response:** `201 Created`

### 4. Update Tenant

**Endpoint:** `PUT /api/tenants/:tenantId`

**Request Body:** (All fields optional)
```json
{
  "name": "Mountain View Plumbing & Heating",
  "description": "Updated description",
  "contactPhone": "(555) 999-PIPE",
  "businessHours": {
    "Monday-Friday": "6AM-8PM"
  }
}
```

**Response:** `200 OK`

### 5. Delete Tenant (Soft Delete)

**Endpoint:** `DELETE /api/tenants/:tenantId`

**Response:** `204 No Content`

**Note:** Sets `deletedAt` timestamp. Use `?hard=true` for permanent deletion (super_admin only).

---

## Page APIs

### 1. List Pages

**Endpoint:** `GET /api/tenants/:tenantId/pages`

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
  sort?: string;          // createdAt|updatedAt|title (default: 'createdAt')
  order?: 'asc' | 'desc';
  status?: string;        // draft|published|archived
  search?: string;        // Search by title, slug
  includeDeleted?: boolean;
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "tenantId": "uuid",
        "slug": "home",
        "title": "Home - Denver's Most Trusted Plumbers",
        "status": "published",
        "sectionCount": 5,
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-15T00:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

### 2. Get Page by ID

**Endpoint:** `GET /api/tenants/:tenantId/pages/:pageId`

**Query Parameters:**
```typescript
{
  include?: string; // Comma-separated: sections,seo,navigation
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "slug": "home",
    "title": "Home - Denver's Most Trusted Plumbers",
    "status": "published",
    "sections": [
      {
        "id": "uuid",
        "sectionId": "hero-123",
        "type": "hero",
        "content": {...},
        "sortOrder": 0
      }
    ],
    "seoMetadata": {
      "metaTitle": "...",
      "metaDescription": "..."
    },
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T00:00:00Z"
  }
}
```

### 3. Get Page by Slug

**Endpoint:** `GET /api/tenants/:tenantId/pages/slug/:slug`

**Query Parameters:** Same as Get Page by ID

**Response:** Same as Get Page by ID

### 4. Create Page

**Endpoint:** `POST /api/tenants/:tenantId/pages`

**Request Body:**
```json
{
  "slug": "services",
  "title": "Our Services - Plumbing & Heating",
  "status": "draft",
  "sections": [
    {
      "sectionId": "hero-services",
      "type": "hero",
      "content": {
        "title": "Professional Plumbing Services",
        "subtitle": "Emergency & Scheduled Services"
      },
      "sortOrder": 0
    }
  ]
}
```

**Validation:**
- `slug` - Required, unique per tenant, alphanumeric + hyphens
- `title` - Required, 1-500 chars
- `status` - Optional, default: 'draft'
- `sections` - Optional, array

**Response:** `201 Created`

### 5. Update Page

**Endpoint:** `PUT /api/tenants/:tenantId/pages/:pageId`

**Request Body:** (All fields optional)
```json
{
  "title": "Updated Title",
  "status": "published"
}
```

**Response:** `200 OK`

### 6. Delete Page

**Endpoint:** `DELETE /api/tenants/:tenantId/pages/:pageId`

**Query Parameters:**
- `hard` - Boolean (default: false), permanent delete

**Response:** `204 No Content`

### 7. Duplicate Page

**Endpoint:** `POST /api/tenants/:tenantId/pages/:pageId/duplicate`

**Request Body:**
```json
{
  "newSlug": "services-copy",
  "newTitle": "Services Copy"
}
```

**Response:** `201 Created`

---

## Section APIs

### 1. List Sections

**Endpoint:** `GET /api/tenants/:tenantId/pages/:pageId/sections`

**Query Parameters:**
```typescript
{
  type?: string;  // Filter by type (hero|features|services|etc)
  sort?: string;  // sortOrder|type|createdAt (default: 'sortOrder')
  order?: 'asc' | 'desc'; // (default: 'asc')
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "pageId": "uuid",
      "sectionId": "hero-123",
      "type": "hero",
      "content": {
        "title": "Denver's Most Trusted Plumbers",
        "subtitle": "24/7 Emergency Service",
        "cta": {
          "label": "Contact Us",
          "href": "/contact"
        }
      },
      "sortOrder": 0,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-15T00:00:00Z"
    }
  ]
}
```

### 2. Get Section by ID

**Endpoint:** `GET /api/tenants/:tenantId/pages/:pageId/sections/:sectionId`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "pageId": "uuid",
    "sectionId": "hero-123",
    "type": "hero",
    "content": {...},
    "sortOrder": 0,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T00:00:00Z"
  }
}
```

### 3. Create Section

**Endpoint:** `POST /api/tenants/:tenantId/pages/:pageId/sections`

**Request Body:**
```json
{
  "sectionId": "features-main",
  "type": "features",
  "content": {
    "title": "Why Choose Us",
    "features": [
      {
        "icon": "shield",
        "title": "Licensed & Insured",
        "description": "Fully licensed and insured for your protection"
      }
    ]
  },
  "sortOrder": 1
}
```

**Validation:**
- `sectionId` - Required, unique per page
- `type` - Required, valid section type
- `content` - Required, JSONB object
- `sortOrder` - Optional, default: 0

**Response:** `201 Created`

### 4. Update Section

**Endpoint:** `PUT /api/tenants/:tenantId/pages/:pageId/sections/:sectionId`

**Request Body:**
```json
{
  "content": {
    "title": "Updated Title",
    "subtitle": "Updated Subtitle"
  },
  "sortOrder": 2
}
```

**Response:** `200 OK`

### 5. Delete Section

**Endpoint:** `DELETE /api/tenants/:tenantId/pages/:pageId/sections/:sectionId`

**Response:** `204 No Content`

### 6. Reorder Sections

**Endpoint:** `PUT /api/tenants/:tenantId/pages/:pageId/sections/reorder`

**Request Body:**
```json
{
  "sections": [
    { "id": "uuid1", "sortOrder": 0 },
    { "id": "uuid2", "sortOrder": 1 },
    { "id": "uuid3", "sortOrder": 2 }
  ]
}
```

**Response:** `200 OK`

### 7. Bulk Update Sections

**Endpoint:** `PUT /api/tenants/:tenantId/pages/:pageId/sections/bulk`

**Request Body:**
```json
{
  "sections": [
    {
      "id": "uuid1",
      "content": {...}
    },
    {
      "id": "uuid2",
      "content": {...}
    }
  ]
}
```

**Response:** `200 OK`

---

## Navigation APIs

### 1. List Navigation Items

**Endpoint:** `GET /api/tenants/:tenantId/navigation`

**Query Parameters:**
```typescript
{
  isVisible?: boolean; // Filter by visibility
  sort?: string;       // sortOrder|title (default: 'sortOrder')
  order?: 'asc' | 'desc'; // (default: 'asc')
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "pageId": "uuid",
      "title": "Home",
      "slug": "home",
      "sortOrder": 0,
      "isVisible": true,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### 2. Get Navigation Item

**Endpoint:** `GET /api/tenants/:tenantId/navigation/:navId`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "pageId": "uuid",
    "title": "Home",
    "slug": "home",
    "sortOrder": 0,
    "isVisible": true,
    "page": {
      "id": "uuid",
      "title": "Home Page",
      "slug": "home"
    }
  }
}
```

### 3. Create Navigation Item

**Endpoint:** `POST /api/tenants/:tenantId/navigation`

**Request Body:**
```json
{
  "pageId": "uuid",
  "title": "Services",
  "slug": "services",
  "sortOrder": 1,
  "isVisible": true
}
```

**Validation:**
- `title` - Required, 1-255 chars
- `slug` - Required, alphanumeric + hyphens
- `pageId` - Optional (external links)
- `sortOrder` - Optional, default: 0
- `isVisible` - Optional, default: true

**Response:** `201 Created`

### 4. Update Navigation Item

**Endpoint:** `PUT /api/tenants/:tenantId/navigation/:navId`

**Request Body:**
```json
{
  "title": "Our Services",
  "sortOrder": 2,
  "isVisible": false
}
```

**Response:** `200 OK`

### 5. Delete Navigation Item

**Endpoint:** `DELETE /api/tenants/:tenantId/navigation/:navId`

**Response:** `204 No Content`

### 6. Reorder Navigation

**Endpoint:** `PUT /api/tenants/:tenantId/navigation/reorder`

**Request Body:**
```json
{
  "items": [
    { "id": "uuid1", "sortOrder": 0 },
    { "id": "uuid2", "sortOrder": 1 },
    { "id": "uuid3", "sortOrder": 2 }
  ]
}
```

**Response:** `200 OK`

---

## SEO Metadata APIs

### 1. Get SEO Metadata

**Endpoint:** `GET /api/tenants/:tenantId/pages/:pageId/seo`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "pageId": "uuid",
    "metaTitle": "Plumbing Services Denver | Mountain View Plumbing",
    "metaDescription": "Professional plumbing services in Denver. 24/7 emergency service, licensed & insured.",
    "keywords": "plumbing denver, emergency plumber, licensed plumber",
    "ogTitle": "Mountain View Plumbing - Denver's Trusted Plumbers",
    "ogDescription": "24/7 emergency plumbing services in Denver",
    "ogImage": "https://cdn.example.com/og-image.jpg",
    "ogType": "website",
    "twitterCard": "summary_large_image",
    "schemaMarkup": {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": "Mountain View Plumbing"
    }
  }
}
```

### 2. Create/Update SEO Metadata

**Endpoint:** `PUT /api/tenants/:tenantId/pages/:pageId/seo`

**Request Body:**
```json
{
  "metaTitle": "Plumbing Services Denver | Mountain View Plumbing",
  "metaDescription": "Professional plumbing services in Denver",
  "keywords": "plumbing denver, emergency plumber",
  "ogTitle": "Mountain View Plumbing - Denver's Trusted Plumbers",
  "ogDescription": "24/7 emergency plumbing services in Denver",
  "ogImage": "https://cdn.example.com/og-image.jpg",
  "schemaMarkup": {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Mountain View Plumbing"
  }
}
```

**Validation:**
- `metaTitle` - Max 60 chars recommended
- `metaDescription` - Max 160 chars recommended
- `ogImage` - Valid URL
- `schemaMarkup` - Valid JSON-LD

**Response:** `200 OK`

### 3. Delete SEO Metadata

**Endpoint:** `DELETE /api/tenants/:tenantId/pages/:pageId/seo`

**Response:** `204 No Content`

---

## Branding APIs

### 1. Get Branding

**Endpoint:** `GET /api/tenants/:tenantId/branding`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "primaryColor": "#1D4ED8",
    "secondaryColor": "#3B82F6",
    "accentColor": "#F59E0B",
    "backgroundColor": "#FFFFFF",
    "textColor": "#374151",
    "fontFamily": "Source Sans Pro, sans-serif",
    "headingFontFamily": "Source Sans Pro, sans-serif",
    "logoUrl": "/assets/logo.png",
    "faviconUrl": "/assets/favicon.ico",
    "darkLogoUrl": "/assets/logo-dark.png",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T00:00:00Z"
  }
}
```

### 2. Create/Update Branding

**Endpoint:** `PUT /api/tenants/:tenantId/branding`

**Request Body:**
```json
{
  "primaryColor": "#1D4ED8",
  "secondaryColor": "#3B82F6",
  "accentColor": "#F59E0B",
  "fontFamily": "Inter, sans-serif",
  "logoUrl": "/assets/new-logo.png"
}
```

**Validation:**
- Colors - Valid hex format (#RRGGBB)
- URLs - Valid URL or path format

**Response:** `200 OK`

### 3. Delete Branding

**Endpoint:** `DELETE /api/tenants/:tenantId/branding`

**Response:** `204 No Content` (Resets to default values)

---

## User APIs

### 1. List Users

**Endpoint:** `GET /api/users`

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
  sort?: string;       // createdAt|email|lastLogin (default: 'createdAt')
  order?: 'asc' | 'desc';
  tenantId?: string;   // Filter by tenant
  role?: string;       // Filter by role
  status?: string;     // Filter by status (active|inactive|suspended)
  search?: string;     // Search by email, firstName, lastName
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "tenantId": "uuid",
        "email": "john@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "owner",
        "status": "active",
        "emailVerified": true,
        "lastLogin": "2025-01-15T10:30:00Z",
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

### 2. Get User by ID

**Endpoint:** `GET /api/users/:userId`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "owner",
    "status": "active",
    "emailVerified": true,
    "lastLogin": "2025-01-15T10:30:00Z",
    "createdAt": "2025-01-01T00:00:00Z",
    "tenant": {
      "id": "uuid",
      "name": "Mountain View Plumbing"
    }
  }
}
```

### 3. Create User

**Endpoint:** `POST /api/users`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "tenantId": "uuid",
  "role": "editor"
}
```

**Validation:**
- `email` - Required, unique, valid email
- `password` - Required, min 8 chars
- `role` - Required, valid role

**Response:** `201 Created`

### 4. Update User

**Endpoint:** `PUT /api/users/:userId`

**Request Body:**
```json
{
  "firstName": "Jonathan",
  "lastName": "Smith",
  "role": "owner",
  "status": "active"
}
```

**Response:** `200 OK`

### 5. Delete User

**Endpoint:** `DELETE /api/users/:userId`

**Response:** `204 No Content`

### 6. Change Password

**Endpoint:** `PUT /api/users/:userId/password`

**Request Body:**
```json
{
  "currentPassword": "oldPassword",
  "newPassword": "newSecurePassword123"
}
```

**Response:** `200 OK`

---

## Subscription APIs

### 1. Get Subscription

**Endpoint:** `GET /api/tenants/:tenantId/subscription`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "stripeSubscriptionId": "sub_xxxxx",
    "stripeCustomerId": "cus_xxxxx",
    "plan": "professional",
    "status": "active",
    "currentPeriodStart": "2025-01-01T00:00:00Z",
    "currentPeriodEnd": "2025-02-01T00:00:00Z",
    "trialEnd": null,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T00:00:00Z"
  }
}
```

### 2. Create Subscription

**Endpoint:** `POST /api/tenants/:tenantId/subscription`

**Request Body:**
```json
{
  "plan": "professional",
  "paymentMethodId": "pm_xxxxx",
  "trialDays": 14
}
```

**Validation:**
- `plan` - Required, basic|professional|enterprise
- `paymentMethodId` - Required (Stripe payment method)

**Response:** `201 Created`

### 3. Update Subscription

**Endpoint:** `PUT /api/tenants/:tenantId/subscription`

**Request Body:**
```json
{
  "plan": "enterprise"
}
```

**Response:** `200 OK`

### 4. Cancel Subscription

**Endpoint:** `DELETE /api/tenants/:tenantId/subscription`

**Query Parameters:**
- `immediate` - Boolean (default: false), cancel immediately vs at period end

**Response:** `200 OK`

---

## Asset APIs

### 1. List Assets

**Endpoint:** `GET /api/tenants/:tenantId/assets`

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
  sort?: string;       // createdAt|filename|sizeBytes (default: 'createdAt')
  order?: 'asc' | 'desc';
  mimeType?: string;   // Filter by MIME type (image/jpeg, image/png, etc)
  search?: string;     // Search by filename
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "tenantId": "uuid",
        "filename": "hero-image.jpg",
        "storageKey": "tenants/123/hero-image.jpg",
        "mimeType": "image/jpeg",
        "sizeBytes": 245760,
        "width": 1920,
        "height": 1080,
        "altText": "Professional plumber fixing sink",
        "url": "https://cdn.example.com/tenants/123/hero-image.jpg",
        "uploadedBy": "uuid",
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

### 2. Get Asset by ID

**Endpoint:** `GET /api/tenants/:tenantId/assets/:assetId`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "filename": "hero-image.jpg",
    "storageKey": "tenants/123/hero-image.jpg",
    "mimeType": "image/jpeg",
    "sizeBytes": 245760,
    "width": 1920,
    "height": 1080,
    "altText": "Professional plumber fixing sink",
    "url": "https://cdn.example.com/tenants/123/hero-image.jpg",
    "uploadedBy": {
      "id": "uuid",
      "email": "john@example.com",
      "firstName": "John"
    },
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

### 3. Upload Asset

**Endpoint:** `POST /api/tenants/:tenantId/assets`

**Request:** `multipart/form-data`
```
file: <binary>
altText: "Professional plumber fixing sink"
```

**Validation:**
- `file` - Required, max 10MB
- Allowed MIME types: image/jpeg, image/png, image/webp, image/svg+xml

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "hero-image.jpg",
    "url": "https://cdn.example.com/tenants/123/hero-image.jpg",
    "storageKey": "tenants/123/hero-image.jpg"
  }
}
```

### 4. Update Asset

**Endpoint:** `PUT /api/tenants/:tenantId/assets/:assetId`

**Request Body:**
```json
{
  "altText": "Updated alt text",
  "filename": "new-filename.jpg"
}
```

**Response:** `200 OK`

### 5. Delete Asset

**Endpoint:** `DELETE /api/tenants/:tenantId/assets/:assetId`

**Response:** `204 No Content`

---

## AI/Content Optimization APIs

### 1. Optimize Content

**Endpoint:** `POST /api/ai/content-optimize`

**Request Body:**
```json
{
  "tenantId": "uuid",
  "field": "title",
  "text": "We fix pipes and stuff",
  "context": {
    "businessType": "Plumbing",
    "sectionType": "hero",
    "tone": "professional"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "original": "We fix pipes and stuff",
    "optimized": "Professional Plumbing Services - Emergency Repairs & Installations",
    "suggestions": [
      "Consider adding location (Denver area)",
      "Emphasize 24/7 availability"
    ],
    "confidence": 0.92
  }
}
```

### 2. Generate SEO Metadata

**Endpoint:** `POST /api/ai/seo-optimize`

**Request Body:**
```json
{
  "tenantId": "uuid",
  "slug": "services",
  "pageContent": {
    "title": "Our Services",
    "sections": [...]
  },
  "businessInfo": {
    "name": "Mountain View Plumbing",
    "type": "Plumbing",
    "location": "Denver, CO"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "metaTitle": "Plumbing Services Denver | Mountain View Plumbing",
    "metaDescription": "Professional plumbing services in Denver. 24/7 emergency repairs, installations & maintenance. Licensed & insured. Call now!",
    "keywords": "plumbing services denver, emergency plumber, licensed plumber denver, plumbing repair",
    "ogTitle": "Mountain View Plumbing - Professional Services in Denver",
    "ogDescription": "Expert plumbing services available 24/7 in Denver area",
    "schemaMarkup": {
      "@context": "https://schema.org",
      "@type": "Service",
      "serviceType": "Plumbing",
      "provider": {
        "@type": "LocalBusiness",
        "name": "Mountain View Plumbing"
      }
    }
  }
}
```

### 3. Generate Page Content

**Endpoint:** `POST /api/ai/generate-page`

**Request Body:**
```json
{
  "tenantId": "uuid",
  "prompt": "Create a services page for a plumbing company in Denver that offers emergency repairs",
  "businessInfo": {
    "name": "Mountain View Plumbing",
    "type": "Plumbing",
    "location": "Denver, CO"
  },
  "template": "services"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Professional Plumbing Services - Denver Area",
    "sections": [
      {
        "type": "hero",
        "content": {
          "title": "Expert Plumbing Services in Denver",
          "subtitle": "24/7 Emergency Repairs & Installations"
        }
      },
      {
        "type": "services",
        "content": {
          "title": "Our Services",
          "services": [...]
        }
      }
    ]
  }
}
```

---

## Error Codes

### Error Response Format

```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Invalid input data",
  "details": [
    {
      "field": "email",
      "message": "Email is required"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

### Common Error Codes

| Code | Error | Description |
|------|-------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | Insufficient permissions for this action |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Input validation failed |
| `DUPLICATE_RESOURCE` | 409 | Resource already exists (duplicate slug, email, etc) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests, try again later |
| `INTERNAL_ERROR` | 500 | Internal server error |

### Validation Error Codes

| Field Error | Message |
|-------------|---------|
| `REQUIRED` | Field is required |
| `INVALID_FORMAT` | Invalid format (email, URL, etc) |
| `TOO_SHORT` | Value is too short (min length) |
| `TOO_LONG` | Value is too long (max length) |
| `INVALID_ENUM` | Value must be one of: [options] |
| `DUPLICATE` | Value already exists (must be unique) |
| `INVALID_REFERENCE` | Referenced resource does not exist |

---

## Rate Limiting

**Limits:**
- **Authenticated requests:** 1000 requests/hour per user
- **Unauthenticated requests:** 100 requests/hour per IP
- **Asset uploads:** 50 uploads/hour per tenant

**Headers:**
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 997
X-RateLimit-Reset: 1640995200
```

**Rate Limit Response:**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again in 15 minutes.",
  "retryAfter": 900
}
```

---

## Webhooks (Planned)

**Events:**
- `tenant.created`
- `tenant.updated`
- `tenant.deleted`
- `page.created`
- `page.updated`
- `page.published`
- `page.deleted`
- `subscription.created`
- `subscription.updated`
- `subscription.canceled`

**Webhook Payload:**
```json
{
  "id": "evt_xxxxx",
  "type": "page.published",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "tenantId": "uuid",
    "pageId": "uuid",
    "slug": "services",
    "title": "Our Services"
  }
}
```

---

**Last Updated:** October 16, 2025
**API Version:** 1.0
