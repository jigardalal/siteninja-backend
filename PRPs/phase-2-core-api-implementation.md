# Implementation Plan: Phase 2 - Core API Implementation

## Overview

Implement all 49 CRUD API endpoints for the SiteNinja backend, organized into 10 resource categories. This phase builds upon Phase 1's completed foundation (database schema, Prisma ORM, response helpers, and pagination utilities).

## Requirements Summary

- Implement 49 REST API endpoints across 10 resource types
- Follow consistent API patterns for CRUD operations
- Implement proper validation using Zod schemas
- Use standardized response formats from existing helpers
- Support pagination, filtering, and search capabilities
- Ensure proper error handling and response codes
- Maintain RESTful conventions and best practices

## Research Findings

### Best Practices

- **Next.js 15 App Router** - Uses route handlers in `app/api/` directories
- **Prisma ORM Patterns** - Utilize `include`, `select`, and `where` clauses for efficient queries
- **Zod Validation** - Schema-first validation with type inference
- **Soft Deletes** - Use `deletedAt` timestamp for recoverable deletions
- **Pagination** - Standardized page/limit/sort/order parameters
- **Error Handling** - Consistent error responses with proper HTTP status codes

### Reference Implementations

**Existing Patterns (from codebase):**
- `app/api/health/route.ts` - Health check endpoint pattern
- `src/utils/apiResponse.ts` - All response helper functions
- `src/utils/pagination.ts` - Pagination utilities
- `src/lib/prisma.ts` - Prisma client singleton
- `prisma/schema.prisma` - Complete database schema with 18 models

**Documentation References:**
- `docs/api-specification.md` - Complete API endpoint specifications
- `docs/backend-implementation-plan.md` - Phase 2 implementation examples
- `docs/database-schema.md` - Database structure and relationships

### Technology Decisions

- **Validation Library:** Zod - Type-safe schema validation with inference
- **ORM:** Prisma - Already configured with full schema
- **Response Format:** Standardized `ApiResponse<T>` interface
- **Routing:** Next.js 15 App Router file-based routing
- **TypeScript:** Strict mode enabled for type safety

## Implementation Tasks

### Phase 2.1: Validation Schemas (Estimated: 2 days)

#### 1. Create Tenant Validation Schemas
- **Description:** Create Zod schemas for tenant create/update operations
- **Files to create:**
  - `src/schemas/tenant.schema.ts`
- **Dependencies:** None
- **Estimated effort:** 2 hours

#### 2. Create Page Validation Schemas
- **Description:** Create Zod schemas for page create/update operations
- **Files to create:**
  - `src/schemas/page.schema.ts`
- **Dependencies:** None
- **Estimated effort:** 2 hours

#### 3. Create Section Validation Schemas
- **Description:** Create Zod schemas for section create/update/bulk operations
- **Files to create:**
  - `src/schemas/section.schema.ts`
- **Dependencies:** None
- **Estimated effort:** 2 hours

#### 4. Create Navigation Validation Schemas
- **Description:** Create Zod schemas for navigation create/update/reorder operations
- **Files to create:**
  - `src/schemas/navigation.schema.ts`
- **Dependencies:** None
- **Estimated effort:** 1.5 hours

#### 5. Create SEO Metadata Validation Schemas
- **Description:** Create Zod schemas for SEO metadata
- **Files to create:**
  - `src/schemas/seo.schema.ts`
- **Dependencies:** None
- **Estimated effort:** 1.5 hours

#### 6. Create Branding Validation Schemas
- **Description:** Create Zod schemas for branding with color validation
- **Files to create:**
  - `src/schemas/branding.schema.ts`
- **Dependencies:** None
- **Estimated effort:** 1.5 hours

#### 7. Create User Validation Schemas
- **Description:** Create Zod schemas for user create/update/password change
- **Files to create:**
  - `src/schemas/user.schema.ts`
- **Dependencies:** None
- **Estimated effort:** 2 hours

#### 8. Create Subscription Validation Schemas
- **Description:** Create Zod schemas for subscription operations
- **Files to create:**
  - `src/schemas/subscription.schema.ts`
- **Dependencies:** None
- **Estimated effort:** 1.5 hours

#### 9. Create Asset Validation Schemas
- **Description:** Create Zod schemas for asset uploads and metadata
- **Files to create:**
  - `src/schemas/asset.schema.ts`
- **Dependencies:** None
- **Estimated effort:** 2 hours

### Phase 2.2: Tenant APIs (Estimated: 1 day)

#### 10. Implement List Tenants Endpoint
- **Description:** GET /api/tenants with pagination, filtering, and search
- **Files to create:**
  - `app/api/tenants/route.ts` (GET handler)
- **Dependencies:** Task 1 (tenant schemas)
- **Estimated effort:** 3 hours
- **Features:**
  - Pagination support
  - Filter by status, businessType
  - Search by name, businessName, subdomain
  - includeDeleted parameter

#### 11. Implement Create Tenant Endpoint
- **Description:** POST /api/tenants with validation and default branding
- **Files to modify:**
  - `app/api/tenants/route.ts` (POST handler)
- **Dependencies:** Task 1 (tenant schemas)
- **Estimated effort:** 4 hours
- **Features:**
  - Zod validation
  - Duplicate checking (subdomain/domain)
  - Auto-create default branding
  - Auto-create domain lookup entry
  - Return 201 Created

#### 12. Implement Get Tenant Endpoint
- **Description:** GET /api/tenants/:tenantId with includes
- **Files to create:**
  - `app/api/tenants/[tenantId]/route.ts` (GET handler)
- **Dependencies:** Task 1
- **Estimated effort:** 2 hours
- **Features:**
  - Include branding, subscription, domainLookups
  - Return 404 if not found

#### 13. Implement Update Tenant Endpoint
- **Description:** PUT /api/tenants/:tenantId
- **Files to modify:**
  - `app/api/tenants/[tenantId]/route.ts` (PUT handler)
- **Dependencies:** Task 1
- **Estimated effort:** 2 hours
- **Features:**
  - Partial updates
  - Zod validation
  - Prevent updating tenantId, subdomain, customDomain

#### 14. Implement Delete Tenant Endpoint
- **Description:** DELETE /api/tenants/:tenantId with soft/hard delete
- **Files to modify:**
  - `app/api/tenants/[tenantId]/route.ts` (DELETE handler)
- **Dependencies:** None
- **Estimated effort:** 2 hours
- **Features:**
  - Soft delete by default (sets deletedAt)
  - Hard delete with ?hard=true query param
  - Return 204 No Content

### Phase 2.3: Page APIs (Estimated: 1.5 days)

#### 15. Implement List Pages Endpoint
- **Description:** GET /api/tenants/:tenantId/pages
- **Files to create:**
  - `app/api/tenants/[tenantId]/pages/route.ts` (GET handler)
- **Dependencies:** Task 2
- **Estimated effort:** 3 hours

#### 16. Implement Create Page Endpoint
- **Description:** POST /api/tenants/:tenantId/pages with sections
- **Files to modify:**
  - `app/api/tenants/[tenantId]/pages/route.ts` (POST handler)
- **Dependencies:** Task 2, Task 3
- **Estimated effort:** 4 hours
- **Features:**
  - Create page and sections in transaction
  - Validate unique slug per tenant
  - Set default status to 'draft'

#### 17. Implement Get Page by ID Endpoint
- **Description:** GET /api/tenants/:tenantId/pages/:pageId
- **Files to create:**
  - `app/api/tenants/[tenantId]/pages/[pageId]/route.ts` (GET handler)
- **Dependencies:** None
- **Estimated effort:** 2.5 hours
- **Features:**
  - Optional includes: sections, seo, navigation
  - Parse ?include query parameter

#### 18. Implement Get Page by Slug Endpoint
- **Description:** GET /api/tenants/:tenantId/pages/slug/:slug
- **Files to create:**
  - `app/api/tenants/[tenantId]/pages/slug/[slug]/route.ts` (GET handler)
- **Dependencies:** None
- **Estimated effort:** 2 hours

#### 19. Implement Update Page Endpoint
- **Description:** PUT /api/tenants/:tenantId/pages/:pageId
- **Files to modify:**
  - `app/api/tenants/[tenantId]/pages/[pageId]/route.ts` (PUT handler)
- **Dependencies:** Task 2
- **Estimated effort:** 2 hours
- **Features:**
  - Prevent slug updates (immutable after creation)
  - Support status changes

#### 20. Implement Delete Page Endpoint
- **Description:** DELETE /api/tenants/:tenantId/pages/:pageId
- **Files to modify:**
  - `app/api/tenants/[tenantId]/pages/[pageId]/route.ts` (DELETE handler)
- **Dependencies:** None
- **Estimated effort:** 1.5 hours
- **Features:**
  - Soft delete by default
  - Hard delete with ?hard=true
  - Cascade delete sections via Prisma

#### 21. Implement Duplicate Page Endpoint
- **Description:** POST /api/tenants/:tenantId/pages/:pageId/duplicate
- **Files to create:**
  - `app/api/tenants/[tenantId]/pages/[pageId]/duplicate/route.ts` (POST handler)
- **Dependencies:** Task 2, Task 3
- **Estimated effort:** 3 hours
- **Features:**
  - Copy page with new slug/title
  - Copy all sections with new IDs
  - Copy SEO metadata if exists
  - Use database transaction

### Phase 2.4: Section APIs (Estimated: 1.5 days)

#### 22. Implement List Sections Endpoint
- **Description:** GET /api/tenants/:tenantId/pages/:pageId/sections
- **Files to create:**
  - `app/api/tenants/[tenantId]/pages/[pageId]/sections/route.ts` (GET handler)
- **Dependencies:** None
- **Estimated effort:** 2.5 hours
- **Features:**
  - Filter by type
  - Sort by sortOrder (default)
  - Return sections with content

#### 23. Implement Create Section Endpoint
- **Description:** POST /api/tenants/:tenantId/pages/:pageId/sections
- **Files to modify:**
  - `app/api/tenants/[tenantId]/pages/[pageId]/sections/route.ts` (POST handler)
- **Dependencies:** Task 3
- **Estimated effort:** 3 hours
- **Features:**
  - Validate unique sectionId per page
  - JSONB content validation
  - Auto-increment sortOrder if not provided

#### 24. Implement Get Section Endpoint
- **Description:** GET /api/tenants/:tenantId/pages/:pageId/sections/:sectionId
- **Files to create:**
  - `app/api/tenants/[tenantId]/pages/[pageId]/sections/[sectionId]/route.ts` (GET handler)
- **Dependencies:** None
- **Estimated effort:** 2 hours

#### 25. Implement Update Section Endpoint
- **Description:** PUT /api/tenants/:tenantId/pages/:pageId/sections/:sectionId
- **Files to modify:**
  - `app/api/tenants/[tenantId]/pages/[pageId]/sections/[sectionId]/route.ts` (PUT handler)
- **Dependencies:** Task 3
- **Estimated effort:** 2.5 hours
- **Features:**
  - Partial content updates
  - Update sortOrder

#### 26. Implement Delete Section Endpoint
- **Description:** DELETE /api/tenants/:tenantId/pages/:pageId/sections/:sectionId
- **Files to modify:**
  - `app/api/tenants/[tenantId]/pages/[pageId]/sections/[sectionId]/route.ts` (DELETE handler)
- **Dependencies:** None
- **Estimated effort:** 1.5 hours

#### 27. Implement Reorder Sections Endpoint
- **Description:** PUT /api/tenants/:tenantId/pages/:pageId/sections/reorder
- **Files to create:**
  - `app/api/tenants/[tenantId]/pages/[pageId]/sections/reorder/route.ts` (PUT handler)
- **Dependencies:** Task 3
- **Estimated effort:** 3 hours
- **Features:**
  - Bulk update sortOrder
  - Use database transaction
  - Validate all sections belong to page

#### 28. Implement Bulk Update Sections Endpoint
- **Description:** PUT /api/tenants/:tenantId/pages/:pageId/sections/bulk
- **Files to create:**
  - `app/api/tenants/[tenantId]/pages/[pageId]/sections/bulk/route.ts` (PUT handler)
- **Dependencies:** Task 3
- **Estimated effort:** 3 hours
- **Features:**
  - Update multiple sections in one request
  - Use database transaction
  - Validate all section IDs exist

### Phase 2.5: Navigation APIs (Estimated: 1 day)

#### 29. Implement List Navigation Endpoint
- **Description:** GET /api/tenants/:tenantId/navigation
- **Files to create:**
  - `app/api/tenants/[tenantId]/navigation/route.ts` (GET handler)
- **Dependencies:** None
- **Estimated effort:** 2.5 hours
- **Features:**
  - Filter by isVisible
  - Sort by sortOrder
  - Include page information

#### 30. Implement Create Navigation Item Endpoint
- **Description:** POST /api/tenants/:tenantId/navigation
- **Files to modify:**
  - `app/api/tenants/[tenantId]/navigation/route.ts` (POST handler)
- **Dependencies:** Task 4
- **Estimated effort:** 2.5 hours
- **Features:**
  - Optional pageId (for external links)
  - Auto-increment sortOrder if not provided

#### 31. Implement Get Navigation Item Endpoint
- **Description:** GET /api/tenants/:tenantId/navigation/:navId
- **Files to create:**
  - `app/api/tenants/[tenantId]/navigation/[navId]/route.ts` (GET handler)
- **Dependencies:** None
- **Estimated effort:** 2 hours

#### 32. Implement Update Navigation Item Endpoint
- **Description:** PUT /api/tenants/:tenantId/navigation/:navId
- **Files to modify:**
  - `app/api/tenants/[tenantId]/navigation/[navId]/route.ts` (PUT handler)
- **Dependencies:** Task 4
- **Estimated effort:** 2 hours

#### 33. Implement Delete Navigation Item Endpoint
- **Description:** DELETE /api/tenants/:tenantId/navigation/:navId
- **Files to modify:**
  - `app/api/tenants/[tenantId]/navigation/[navId]/route.ts` (DELETE handler)
- **Dependencies:** None
- **Estimated effort:** 1.5 hours

#### 34. Implement Reorder Navigation Endpoint
- **Description:** PUT /api/tenants/:tenantId/navigation/reorder
- **Files to create:**
  - `app/api/tenants/[tenantId]/navigation/reorder/route.ts` (PUT handler)
- **Dependencies:** Task 4
- **Estimated effort:** 2.5 hours
- **Features:**
  - Bulk update sortOrder
  - Use database transaction

### Phase 2.6: SEO, Branding, and Supporting APIs (Estimated: 1.5 days)

#### 35. Implement Get SEO Metadata Endpoint
- **Description:** GET /api/tenants/:tenantId/pages/:pageId/seo
- **Files to create:**
  - `app/api/tenants/[tenantId]/pages/[pageId]/seo/route.ts` (GET handler)
- **Dependencies:** None
- **Estimated effort:** 1.5 hours

#### 36. Implement Create/Update SEO Metadata Endpoint
- **Description:** PUT /api/tenants/:tenantId/pages/:pageId/seo (upsert)
- **Files to modify:**
  - `app/api/tenants/[tenantId]/pages/[pageId]/seo/route.ts` (PUT handler)
- **Dependencies:** Task 5
- **Estimated effort:** 2.5 hours
- **Features:**
  - Upsert operation (create or update)
  - Validate schema markup JSON

#### 37. Implement Delete SEO Metadata Endpoint
- **Description:** DELETE /api/tenants/:tenantId/pages/:pageId/seo
- **Files to modify:**
  - `app/api/tenants/[tenantId]/pages/[pageId]/seo/route.ts` (DELETE handler)
- **Dependencies:** None
- **Estimated effort:** 1.5 hours

#### 38. Implement Get Branding Endpoint
- **Description:** GET /api/tenants/:tenantId/branding
- **Files to create:**
  - `app/api/tenants/[tenantId]/branding/route.ts` (GET handler)
- **Dependencies:** None
- **Estimated effort:** 1.5 hours

#### 39. Implement Create/Update Branding Endpoint
- **Description:** PUT /api/tenants/:tenantId/branding (upsert)
- **Files to modify:**
  - `app/api/tenants/[tenantId]/branding/route.ts` (PUT handler)
- **Dependencies:** Task 6
- **Estimated effort:** 2.5 hours
- **Features:**
  - Upsert operation
  - Validate hex colors
  - Validate URLs

#### 40. Implement Delete Branding Endpoint
- **Description:** DELETE /api/tenants/:tenantId/branding
- **Files to modify:**
  - `app/api/tenants/[tenantId]/branding/route.ts` (DELETE handler)
- **Dependencies:** None
- **Estimated effort:** 1.5 hours
- **Features:**
  - Reset to default values instead of deleting

### Phase 2.7: User APIs (Estimated: 1 day)

#### 41. Implement List Users Endpoint
- **Description:** GET /api/users
- **Files to create:**
  - `app/api/users/route.ts` (GET handler)
- **Dependencies:** None
- **Estimated effort:** 2.5 hours
- **Features:**
  - Filter by tenantId, role, status
  - Search by email, firstName, lastName
  - Pagination support

#### 42. Implement Create User Endpoint
- **Description:** POST /api/users
- **Files to modify:**
  - `app/api/users/route.ts` (POST handler)
- **Dependencies:** Task 7
- **Estimated effort:** 3 hours
- **Features:**
  - Hash password with bcrypt
  - Validate unique email
  - Set default role and status

#### 43. Implement Get User Endpoint
- **Description:** GET /api/users/:userId
- **Files to create:**
  - `app/api/users/[userId]/route.ts` (GET handler)
- **Dependencies:** None
- **Estimated effort:** 2 hours
- **Features:**
  - Include tenant information
  - Exclude passwordHash from response

#### 44. Implement Update User Endpoint
- **Description:** PUT /api/users/:userId
- **Files to modify:**
  - `app/api/users/[userId]/route.ts` (PUT handler)
- **Dependencies:** Task 7
- **Estimated effort:** 2 hours
- **Features:**
  - Prevent password updates (use separate endpoint)
  - Exclude passwordHash from response

#### 45. Implement Delete User Endpoint
- **Description:** DELETE /api/users/:userId
- **Files to modify:**
  - `app/api/users/[userId]/route.ts` (DELETE handler)
- **Dependencies:** None
- **Estimated effort:** 1.5 hours

#### 46. Implement Change Password Endpoint
- **Description:** PUT /api/users/:userId/password
- **Files to create:**
  - `app/api/users/[userId]/password/route.ts` (PUT handler)
- **Dependencies:** Task 7
- **Estimated effort:** 2.5 hours
- **Features:**
  - Verify current password
  - Hash new password with bcrypt
  - Validate password strength

### Phase 2.8: Subscription and Asset APIs (Estimated: 1.5 days)

#### 47. Implement Get Subscription Endpoint
- **Description:** GET /api/tenants/:tenantId/subscription
- **Files to create:**
  - `app/api/tenants/[tenantId]/subscription/route.ts` (GET handler)
- **Dependencies:** None
- **Estimated effort:** 2 hours

#### 48. Implement Create Subscription Endpoint
- **Description:** POST /api/tenants/:tenantId/subscription
- **Files to modify:**
  - `app/api/tenants/[tenantId]/subscription/route.ts` (POST handler)
- **Dependencies:** Task 8
- **Estimated effort:** 4 hours
- **Features:**
  - Stripe integration placeholder
  - Set trial period if specified
  - Create Stripe customer and subscription

#### 49. Implement Update Subscription Endpoint
- **Description:** PUT /api/tenants/:tenantId/subscription
- **Files to modify:**
  - `app/api/tenants/[tenantId]/subscription/route.ts` (PUT handler)
- **Dependencies:** Task 8
- **Estimated effort:** 3 hours
- **Features:**
  - Update Stripe subscription
  - Change plan

#### 50. Implement Cancel Subscription Endpoint
- **Description:** DELETE /api/tenants/:tenantId/subscription
- **Files to modify:**
  - `app/api/tenants/[tenantId]/subscription/route.ts` (DELETE handler)
- **Dependencies:** None
- **Estimated effort:** 2.5 hours
- **Features:**
  - Cancel immediately or at period end
  - Update Stripe subscription

#### 51. Implement List Assets Endpoint
- **Description:** GET /api/tenants/:tenantId/assets
- **Files to create:**
  - `app/api/tenants/[tenantId]/assets/route.ts` (GET handler)
- **Dependencies:** None
- **Estimated effort:** 2.5 hours
- **Features:**
  - Filter by mimeType
  - Search by filename
  - Include upload URL generation

#### 52. Implement Upload Asset Endpoint
- **Description:** POST /api/tenants/:tenantId/assets
- **Files to modify:**
  - `app/api/tenants/[tenantId]/assets/route.ts` (POST handler)
- **Dependencies:** Task 9
- **Estimated effort:** 4 hours
- **Features:**
  - Handle multipart/form-data
  - Validate file size (max 10MB)
  - Validate MIME types
  - Generate unique storage key
  - Extract image dimensions
  - Store file metadata

#### 53. Implement Get Asset Endpoint
- **Description:** GET /api/tenants/:tenantId/assets/:assetId
- **Files to create:**
  - `app/api/tenants/[tenantId]/assets/[assetId]/route.ts` (GET handler)
- **Dependencies:** None
- **Estimated effort:** 2 hours
- **Features:**
  - Include uploader information
  - Generate presigned URL if needed

#### 54. Implement Update Asset Endpoint
- **Description:** PUT /api/tenants/:tenantId/assets/:assetId
- **Files to modify:**
  - `app/api/tenants/[tenantId]/assets/[assetId]/route.ts` (PUT handler)
- **Dependencies:** Task 9
- **Estimated effort:** 2 hours
- **Features:**
  - Update altText and filename only
  - Cannot change file itself

#### 55. Implement Delete Asset Endpoint
- **Description:** DELETE /api/tenants/:tenantId/assets/:assetId
- **Files to modify:**
  - `app/api/tenants/[tenantId]/assets/[assetId]/route.ts` (DELETE handler)
- **Dependencies:** None
- **Estimated effort:** 2.5 hours
- **Features:**
  - Delete from storage (S3/R2)
  - Delete database record

### Phase 2.9: AI/Content APIs (Estimated: 1 day) [Placeholder Implementation]

#### 56. Implement Content Optimization Endpoint
- **Description:** POST /api/ai/content-optimize
- **Files to create:**
  - `app/api/ai/content-optimize/route.ts` (POST handler)
- **Dependencies:** None
- **Estimated effort:** 3 hours
- **Features:**
  - Placeholder implementation returning mock data
  - TODO: Integrate with OpenAI/Claude API later

#### 57. Implement SEO Generation Endpoint
- **Description:** POST /api/ai/seo-optimize
- **Files to create:**
  - `app/api/ai/seo-optimize/route.ts` (POST handler)
- **Dependencies:** None
- **Estimated effort:** 3 hours
- **Features:**
  - Placeholder implementation
  - TODO: Integrate with AI service

#### 58. Implement Page Generation Endpoint
- **Description:** POST /api/ai/generate-page
- **Files to create:**
  - `app/api/ai/generate-page/route.ts` (POST handler)
- **Dependencies:** None
- **Estimated effort:** 3 hours
- **Features:**
  - Placeholder implementation
  - TODO: Integrate with AI service

## Codebase Integration Points

### Files to Modify
- `app/api/health/route.ts` - Reference pattern for error handling
- None (all endpoints are new)

### New Files to Create

**Validation Schemas (9 files):**
- `src/schemas/tenant.schema.ts`
- `src/schemas/page.schema.ts`
- `src/schemas/section.schema.ts`
- `src/schemas/navigation.schema.ts`
- `src/schemas/seo.schema.ts`
- `src/schemas/branding.schema.ts`
- `src/schemas/user.schema.ts`
- `src/schemas/subscription.schema.ts`
- `src/schemas/asset.schema.ts`

**API Route Handlers (40+ files):**
- `app/api/tenants/route.ts`
- `app/api/tenants/[tenantId]/route.ts`
- `app/api/tenants/[tenantId]/pages/route.ts`
- `app/api/tenants/[tenantId]/pages/[pageId]/route.ts`
- `app/api/tenants/[tenantId]/pages/[pageId]/duplicate/route.ts`
- `app/api/tenants/[tenantId]/pages/slug/[slug]/route.ts`
- `app/api/tenants/[tenantId]/pages/[pageId]/sections/route.ts`
- `app/api/tenants/[tenantId]/pages/[pageId]/sections/[sectionId]/route.ts`
- `app/api/tenants/[tenantId]/pages/[pageId]/sections/reorder/route.ts`
- `app/api/tenants/[tenantId]/pages/[pageId]/sections/bulk/route.ts`
- `app/api/tenants/[tenantId]/navigation/route.ts`
- `app/api/tenants/[tenantId]/navigation/[navId]/route.ts`
- `app/api/tenants/[tenantId]/navigation/reorder/route.ts`
- `app/api/tenants/[tenantId]/pages/[pageId]/seo/route.ts`
- `app/api/tenants/[tenantId]/branding/route.ts`
- `app/api/tenants/[tenantId]/subscription/route.ts`
- `app/api/tenants/[tenantId]/assets/route.ts`
- `app/api/tenants/[tenantId]/assets/[assetId]/route.ts`
- `app/api/users/route.ts`
- `app/api/users/[userId]/route.ts`
- `app/api/users/[userId]/password/route.ts`
- `app/api/ai/content-optimize/route.ts`
- `app/api/ai/seo-optimize/route.ts`
- `app/api/ai/generate-page/route.ts`

### Existing Patterns to Follow

1. **Response Helpers** (from `src/utils/apiResponse.ts`):
   ```typescript
   successResponse(data, message?, statusCode?)
   createdResponse(data, message?)
   errorResponse(error, statusCode?, details?)
   validationErrorResponse(errors)
   notFoundResponse(resource?)
   paginatedResponse(items, page, limit, total)
   ```

2. **Pagination Utilities** (from `src/utils/pagination.ts`):
   ```typescript
   parsePaginationParams(searchParams)
   calculateSkip(page, limit)
   buildPrismaOrderBy(sort, order)
   ```

3. **Prisma Client** (from `src/lib/prisma.ts`):
   ```typescript
   import { prisma } from '@/lib/prisma';
   ```

4. **Route Handler Pattern** (from `app/api/health/route.ts`):
   ```typescript
   import { NextRequest } from 'next/server';

   export async function GET(request: NextRequest) {
     try {
       // Implementation
       return successResponse(data);
     } catch (error: any) {
       return errorResponse(error.message);
     }
   }
   ```

5. **Zod Validation Pattern**:
   ```typescript
   const result = Schema.safeParse(body);
   if (!result.success) {
     return validationErrorResponse(
       result.error.errors.map(err => ({
         field: err.path.join('.'),
         message: err.message,
       }))
     );
   }
   ```

## Technical Design

### API Route Structure

```
app/api/
├── health/
│   └── route.ts                    ✅ Implemented
├── tenants/
│   ├── route.ts                    📝 GET, POST
│   └── [tenantId]/
│       ├── route.ts                📝 GET, PUT, DELETE
│       ├── pages/
│       │   ├── route.ts            📝 GET, POST
│       │   ├── [pageId]/
│       │   │   ├── route.ts        📝 GET, PUT, DELETE
│       │   │   ├── duplicate/
│       │   │   │   └── route.ts    📝 POST
│       │   │   ├── sections/
│       │   │   │   ├── route.ts    📝 GET, POST
│       │   │   │   ├── [sectionId]/
│       │   │   │   │   └── route.ts 📝 GET, PUT, DELETE
│       │   │   │   ├── reorder/
│       │   │   │   │   └── route.ts 📝 PUT
│       │   │   │   └── bulk/
│       │   │   │       └── route.ts 📝 PUT
│       │   │   └── seo/
│       │   │       └── route.ts    📝 GET, PUT, DELETE
│       │   └── slug/
│       │       └── [slug]/
│       │           └── route.ts    📝 GET
│       ├── navigation/
│       │   ├── route.ts            📝 GET, POST
│       │   ├── [navId]/
│       │   │   └── route.ts        📝 GET, PUT, DELETE
│       │   └── reorder/
│       │       └── route.ts        📝 PUT
│       ├── branding/
│       │   └── route.ts            📝 GET, PUT, DELETE
│       ├── subscription/
│       │   └── route.ts            📝 GET, POST, PUT, DELETE
│       └── assets/
│           ├── route.ts            📝 GET, POST
│           └── [assetId]/
│               └── route.ts        📝 GET, PUT, DELETE
├── users/
│   ├── route.ts                    📝 GET, POST
│   └── [userId]/
│       ├── route.ts                📝 GET, PUT, DELETE
│       └── password/
│           └── route.ts            📝 PUT
└── ai/
    ├── content-optimize/
    │   └── route.ts                📝 POST (placeholder)
    ├── seo-optimize/
    │   └── route.ts                📝 POST (placeholder)
    └── generate-page/
        └── route.ts                📝 POST (placeholder)
```

### Request/Response Flow

```
1. Request → Route Handler
2. Parse & Validate (Zod Schema)
3. Check Permissions (Phase 4)
4. Execute Business Logic (Prisma)
5. Format Response (Response Helpers)
6. Return JSON
```

### Error Handling Strategy

```typescript
try {
  // 1. Parse request
  const body = await request.json();

  // 2. Validate with Zod
  const result = Schema.safeParse(body);
  if (!result.success) {
    return validationErrorResponse(errors);
  }

  // 3. Check existence/permissions
  const existing = await prisma.model.findUnique(...);
  if (!existing) {
    return notFoundResponse('Resource');
  }

  // 4. Execute operation
  const result = await prisma.model.create(...);

  // 5. Return success
  return createdResponse(result, 'Created successfully');

} catch (error: any) {
  // 6. Handle errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle Prisma errors
  }
  return errorResponse(error.message);
}
```

## Dependencies and Libraries

**Existing Dependencies:**
- ✅ `next` - Next.js framework
- ✅ `@prisma/client` - Prisma ORM client
- ✅ `prisma` - Prisma CLI
- ✅ `zod` - Schema validation
- ✅ `bcrypt` - Password hashing
- ✅ `typescript` - Type safety

**Future Dependencies (Phase 5+):**
- `stripe` - Payment processing (Subscription APIs integration)
- `sharp` - Image processing (Asset uploads)
- `@upstash/ratelimit` - Rate limiting (Phase 6)
- `@upstash/redis` - Caching (Phase 6)

## Testing Strategy

### Unit Tests (for each validation schema)

```typescript
// Example: src/schemas/tenant.schema.test.ts
describe('TenantSchema', () => {
  it('should validate correct tenant data', () => {
    const result = CreateTenantSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid subdomain format', () => {
    const result = CreateTenantSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
```

### Integration Tests (for each API endpoint)

```typescript
// Example: app/api/tenants/route.test.ts
describe('POST /api/tenants', () => {
  beforeEach(async () => {
    await prisma.tenant.deleteMany();
  });

  it('should create tenant with valid data', async () => {
    const response = await POST(mockRequest);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(response.status).toBe(201);
  });

  it('should reject duplicate subdomain', async () => {
    await createTenant({ subdomain: 'test' });
    const response = await POST(mockRequest);

    expect(response.status).toBe(409);
  });
});
```

### Manual Testing Checklist

For each endpoint:
- [ ] Valid request succeeds
- [ ] Invalid request returns 422
- [ ] Not found returns 404
- [ ] Duplicate resource returns 409
- [ ] Pagination works correctly
- [ ] Filtering works correctly
- [ ] Sorting works correctly
- [ ] Soft delete works
- [ ] Hard delete works
- [ ] Response format matches specification

## Success Criteria

### Phase 2 Complete When:

1. ✅ All 9 Zod validation schemas created
2. ✅ All 49 API endpoints implemented
3. ✅ All endpoints return proper HTTP status codes
4. ✅ All endpoints follow consistent response format
5. ✅ Pagination works on all list endpoints
6. ✅ Filtering and search work correctly
7. ✅ Soft delete implemented where specified
8. ✅ Database transactions used for multi-step operations
9. ✅ All endpoints tested manually
10. ✅ No TypeScript errors
11. ✅ All responses match API specification
12. ✅ README updated with endpoint list

### Quality Checks:

- **Code Quality:** No duplicate code, DRY principles followed
- **Error Handling:** All errors properly caught and formatted
- **Validation:** All inputs validated with Zod schemas
- **Documentation:** Inline comments for complex logic
- **Performance:** No N+1 query problems
- **Type Safety:** Full TypeScript type coverage

## Notes and Considerations

### Important Notes

1. **Authentication Skipped for Now:** Phase 2 focuses on core functionality. Authentication and authorization will be added in Phase 4. All endpoints are currently **unauthenticated**.

2. **File Storage Placeholder:** Asset upload endpoints will use local filesystem initially. Cloud storage (S3/R2) integration deferred to Phase 5.

3. **Stripe Integration Minimal:** Subscription endpoints will create database records but won't integrate with Stripe API until Phase 5.

4. **AI Endpoints are Placeholders:** AI content optimization endpoints return mock data. Real AI integration deferred to Phase 5.

5. **No Rate Limiting Yet:** Rate limiting will be added in Phase 6 along with caching.

### Potential Challenges

1. **File Upload Handling:** Next.js 15 multipart/form-data requires special handling. May need to use `formidable` or similar library.

2. **Nested Route Complexity:** Deep nesting (e.g., `/tenants/:id/pages/:id/sections/:id`) requires careful parameter extraction.

3. **Transaction Management:** Bulk operations and duplication require proper database transactions to maintain data integrity.

4. **JSONB Validation:** Section content is stored as JSONB. Need flexible validation that works with different section types.

5. **Performance on List Endpoints:** Large tenants with many pages/sections may need query optimization and indexing.

### Future Enhancements

- **GraphQL API:** Consider GraphQL alternative for more flexible queries
- **Batch Operations:** Add batch endpoints for bulk operations
- **Search Improvements:** Add full-text search with PostgreSQL
- **Versioning:** Add API versioning support (/api/v1/)
- **OpenAPI Spec:** Generate OpenAPI/Swagger documentation
- **Response Caching:** Add ETag support for conditional requests

### Development Tips

1. **Test Each Endpoint:** Use Postman/Insomnia to test as you build
2. **Prisma Studio:** Use `npm run prisma:studio` to inspect database
3. **Hot Reload:** Next.js dev server auto-reloads on file changes
4. **Type Checking:** Run `npx tsc --noEmit` to check types
5. **Database Reset:** Use `npx prisma migrate reset` if needed (dev only)

## Execution Order

**Recommended Implementation Sequence:**

1. **Week 1:** Tasks 1-14 (Schemas + Tenant APIs)
2. **Week 2:** Tasks 15-28 (Page + Section APIs)
3. **Week 3:** Tasks 29-46 (Navigation, SEO, Branding, User APIs)
4. **Week 4:** Tasks 47-58 (Subscription, Asset, AI APIs + Testing)

**Daily Goals:**
- Complete 3-4 tasks per day
- Test each endpoint as you build
- Commit working code daily
- Update checklist in README

---

*This plan is ready for execution with `/execute-plan PRPs/phase-2-core-api-implementation.md`*

**Estimated Total Time:** 2 weeks (80 hours)
**Dependencies:** Phase 1 complete ✅
**Next Phase:** Phase 3 - Validation & Error Handling
