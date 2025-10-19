# Implementation Plan: Perfect Backend Architecture

## Overview
This plan provides a comprehensive, step-by-step roadmap to transform the SiteNinja backend into a production-ready API with complete implementation of all 49 endpoints, authentication, validation, caching, rate limiting, audit logging, webhooks, and security features.

## Requirements Summary
Based on `/docs/backend-implementation-plan.md`, the backend requires:
- Complete implementation of 49 API endpoints across 10 resource types
- JWT-based authentication with role-based access control
- Comprehensive input validation using Zod schemas
- Audit logging for compliance and debugging
- Webhook system for external integrations
- API key authentication for programmatic access
- Rate limiting and caching for performance
- Security headers and best practices
- 100% test coverage for critical paths
- Response times < 100ms (p95)

## Research Findings

### Existing Codebase Analysis

**Current State:**
- ✅ Next.js 15 with TypeScript already setup
- ✅ Prisma ORM with complete schema (18 tables)
- ✅ Database migrations run successfully
- ✅ API response helpers implemented (`src/utils/apiResponse.ts`)
- ✅ Pagination utilities implemented (`src/utils/pagination.ts`)
- ✅ Prisma client singleton setup (`src/lib/prisma.ts`)
- ✅ Zod validation schemas created for core resources
- ✅ Basic API endpoints structure in place
- ✅ Health check endpoint operational
- ⚠️ Services and middleware directories empty (ready for implementation)

**Existing Patterns:**

1. **API Response Pattern:**
```typescript
// Consistent response structure using helper functions
return successResponse(data, message, statusCode);
return errorResponse(error, statusCode, details);
return paginatedResponse(items, page, limit, total);
```

2. **Validation Pattern:**
```typescript
// Zod schema validation with detailed error messages
const result = CreateTenantSchema.safeParse(body);
if (!result.success) {
  return validationErrorResponse(
    result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }))
  );
}
```

3. **Database Transaction Pattern:**
```typescript
// Use Prisma transactions for multi-step operations
const result = await prisma.$transaction(async (tx) => {
  const tenant = await tx.tenant.create({ data });
  await tx.branding.create({ data: { tenantId: tenant.id } });
  return tenant;
});
```

4. **Error Handling Pattern:**
```typescript
// Prisma error handling with specific error codes
if (error instanceof Prisma.PrismaClientKnownRequestError) {
  if (error.code === 'P2002') {
    return conflictResponse('Resource already exists');
  }
}
```

### Technology Decisions

1. **Authentication:** NextAuth.js v4 (already in dependencies)
   - Rationale: First-class Next.js integration, JWT support, flexible providers

2. **Validation:** Zod (already implemented)
   - Rationale: Type-safe, excellent TypeScript integration, already in use

3. **Caching:** Upstash Redis
   - Rationale: Serverless-first, low latency, simple API

4. **Rate Limiting:** @upstash/ratelimit
   - Rationale: Works seamlessly with Upstash Redis, sliding window algorithm

5. **Testing:** Jest + Supertest
   - Rationale: Industry standard, excellent Next.js support

## Implementation Tasks

### Phase 1: Authentication & Authorization System
**Duration:** 1 week
**Priority:** Critical (required for all protected endpoints)

#### 1.1 NextAuth.js Configuration
- **Description:** Setup NextAuth.js with credentials provider, JWT strategy, and session management
- **Files to create:**
  - `app/api/auth/[...nextauth]/route.ts` - NextAuth configuration
  - `src/types/next-auth.d.ts` - TypeScript augmentation for session
- **Files to modify:**
  - `package.json` - Verify next-auth and bcrypt dependencies
- **Dependencies:** None
- **Estimated effort:** 4 hours

**Implementation details:**
- Configure CredentialsProvider with email/password
- Implement JWT callbacks to include user role and tenantId
- Setup session callback for client-side access
- Hash password validation using bcrypt
- Update lastLogin timestamp on successful auth

#### 1.2 Authentication Middleware
- **Description:** Create reusable middleware for protecting API routes
- **Files to create:**
  - `src/middleware/auth.ts` - Authentication middleware functions
- **Dependencies:** Task 1.1
- **Estimated effort:** 3 hours

**Implementation details:**
- `requireAuth(request, requiredRoles?)` - General auth check
- `requireTenantAccess(request, tenantId)` - Tenant isolation
- `requireRole(request, role)` - Role-based access
- Super admin bypass for cross-tenant access

#### 1.3 User Management APIs
- **Description:** Complete user CRUD endpoints with password management
- **Files to create:**
  - `app/api/users/route.ts` - List and create users
  - `app/api/users/[userId]/route.ts` - Get, update, delete user
  - `app/api/users/[userId]/password/route.ts` - Password change
  - `app/api/auth/register/route.ts` - User registration
  - `app/api/auth/login/route.ts` - User login (if not using NextAuth UI)
- **Files to modify:**
  - `src/schemas/user.schema.ts` - Add password validation
- **Dependencies:** Task 1.1, 1.2
- **Estimated effort:** 6 hours

**Implementation details:**
- Hash passwords with bcrypt (cost factor 10)
- Validate password strength (min 8 chars, uppercase, number, special)
- Prevent email enumeration in error messages
- Implement email verification flow (token-based)
- Soft delete users (set deletedAt)

#### 1.4 Apply Authentication to Existing Endpoints
- **Description:** Protect all tenant, page, and resource endpoints
- **Files to modify:**
  - All files in `app/api/tenants/**`
  - All files in `app/api/users/**`
- **Dependencies:** Task 1.2
- **Estimated effort:** 4 hours

**Implementation details:**
- Add auth checks to all POST/PUT/DELETE endpoints
- Implement tenant isolation (users can only access their tenant's data)
- Allow super_admin to access all tenants
- Add auth checks to sensitive GET endpoints

### Phase 2: Advanced Validation & Error Handling
**Duration:** 3-4 days
**Priority:** High (ensures data integrity)

#### 2.1 Complete Zod Schemas
- **Description:** Create comprehensive validation schemas for all resources
- **Files to verify/create:**
  - ✅ `src/schemas/tenant.schema.ts` (exists)
  - ✅ `src/schemas/page.schema.ts` (exists)
  - ✅ `src/schemas/section.schema.ts` (exists)
  - ✅ `src/schemas/navigation.schema.ts` (exists)
  - ✅ `src/schemas/seo.schema.ts` (exists)
  - ✅ `src/schemas/branding.schema.ts` (exists)
  - ✅ `src/schemas/user.schema.ts` (exists)
  - ✅ `src/schemas/subscription.schema.ts` (exists)
  - ✅ `src/schemas/asset.schema.ts` (exists)
  - `src/schemas/template.schema.ts` (new)
  - `src/schemas/webhook.schema.ts` (new)
  - `src/schemas/apiKey.schema.ts` (new)
- **Dependencies:** None
- **Estimated effort:** 6 hours

**Implementation details:**
- Validate all string lengths match database constraints
- Add custom refinements for business logic (e.g., subdomain format)
- Create separate schemas for create, update, query operations
- Add coercion for query parameters (z.coerce.number())

#### 2.2 Global Error Handler
- **Description:** Centralized error handling with consistent responses
- **Files to create:**
  - `src/middleware/errorHandler.ts` - Global error handler
- **Dependencies:** None
- **Estimated effort:** 3 hours

**Implementation details:**
- Handle Prisma errors (P2002, P2003, P2025, etc.)
- Handle Zod validation errors
- Handle NextAuth errors
- Handle filesystem errors (asset uploads)
- Log errors with context (request ID, user ID, timestamp)
- Sanitize error messages for production (no stack traces)

#### 2.3 Request Validation Middleware
- **Description:** Automatically validate requests against schemas
- **Files to create:**
  - `src/middleware/validate.ts` - Request validation wrapper
- **Dependencies:** Task 2.1
- **Estimated effort:** 2 hours

**Implementation details:**
- Validate request body against schema
- Validate query parameters
- Validate path parameters
- Return detailed validation errors

### Phase 3: Audit Logging System
**Duration:** 3 days
**Priority:** High (compliance requirement)

#### 3.1 Audit Service Implementation
- **Description:** Service for logging all data mutations
- **Files to create:**
  - `src/services/audit.service.ts` - Audit logging service
- **Dependencies:** None
- **Estimated effort:** 4 hours

**Implementation details:**
- `logAudit()` - Create audit log entry
- Capture old value and new value for updates
- Extract IP address from request headers
- Extract user agent from request headers
- Store metadata (request ID, endpoint, method)
- Non-blocking (don't throw errors if logging fails)

#### 3.2 Audit Middleware
- **Description:** Automatically audit mutations
- **Files to create:**
  - `src/middleware/audit.ts` - Audit middleware wrapper
- **Dependencies:** Task 3.1
- **Estimated effort:** 3 hours

**Implementation details:**
- Intercept POST/PUT/DELETE requests
- Capture request body for new values
- Fetch old values before mutation
- Log after successful operation
- Include user context from session

#### 3.3 Audit Query APIs
- **Description:** Endpoints to query audit logs
- **Files to create:**
  - `app/api/tenants/[tenantId]/audit/route.ts` - List tenant audit logs
  - `app/api/audit/route.ts` - Global audit logs (super_admin only)
- **Dependencies:** Task 3.1
- **Estimated effort:** 3 hours

**Implementation details:**
- Filter by resource type, action, user
- Date range filtering
- Pagination support
- Export to CSV (optional)

### Phase 4: Webhook System
**Duration:** 4 days
**Priority:** Medium (external integrations)

#### 4.1 Webhook Management APIs
- **Description:** CRUD endpoints for webhook configuration
- **Files to create:**
  - `app/api/tenants/[tenantId]/webhooks/route.ts` - List and create webhooks
  - `app/api/tenants/[tenantId]/webhooks/[webhookId]/route.ts` - Update, delete webhook
  - `app/api/tenants/[tenantId]/webhooks/[webhookId]/test/route.ts` - Test webhook
  - `app/api/tenants/[tenantId]/webhooks/[webhookId]/deliveries/route.ts` - Delivery logs
- **Files to modify:**
  - Create `src/schemas/webhook.schema.ts`
- **Dependencies:** None
- **Estimated effort:** 5 hours

**Implementation details:**
- Validate webhook URL format
- Generate webhook secret on creation
- Validate event types against allowed list
- Support multiple events per webhook

#### 4.2 Webhook Delivery Service
- **Description:** Background service to trigger webhooks
- **Files to create:**
  - `src/services/webhook.service.ts` - Webhook delivery logic
- **Dependencies:** Task 4.1
- **Estimated effort:** 6 hours

**Implementation details:**
- `triggerWebhooks(tenantId, eventType, payload)` - Find and trigger webhooks
- `deliverWebhook(webhookId, event, payload)` - HTTP POST delivery
- HMAC signature generation (SHA256)
- Retry logic with exponential backoff
- Auto-disable after max failures
- Log all delivery attempts

#### 4.3 Integrate Webhooks into Mutations
- **Description:** Trigger webhooks on key events
- **Files to modify:**
  - All POST/PUT/DELETE endpoints
- **Dependencies:** Task 4.2
- **Estimated effort:** 4 hours

**Implementation details:**
- Events to support:
  - `page.created`, `page.updated`, `page.deleted`, `page.published`
  - `section.created`, `section.updated`, `section.deleted`
  - `branding.updated`
  - `tenant.created`, `tenant.updated`
  - `user.created`, `user.updated`
- Trigger asynchronously (don't block response)

### Phase 5: API Key Authentication
**Duration:** 3 days
**Priority:** Medium (programmatic access)

#### 5.1 API Key Management Service
- **Description:** Generate and validate API keys
- **Files to create:**
  - `src/services/apiKey.service.ts` - API key operations
- **Dependencies:** None
- **Estimated effort:** 4 hours

**Implementation details:**
- `generateApiKey(tenantId, name, permissions)` - Create API key
- `validateApiKey(key)` - Verify and return key details
- Keys prefixed with `sn_live_` or `sn_test_`
- Hash keys with bcrypt before storage
- Store prefix for quick lookup
- Support expiration dates
- Track last used timestamp

#### 5.2 API Key Authentication Middleware
- **Description:** Authenticate requests using API keys
- **Files to create:**
  - `src/middleware/apiKeyAuth.ts` - API key auth middleware
- **Dependencies:** Task 5.1
- **Estimated effort:** 3 hours

**Implementation details:**
- Check `Authorization: Bearer <api_key>` header
- Fall back to `x-api-key` header
- Validate key and check expiration
- Check permissions against endpoint
- Rate limit per API key
- Log usage to api_key_usage table

#### 5.3 API Key Management Endpoints
- **Description:** CRUD endpoints for API keys
- **Files to create:**
  - `app/api/tenants/[tenantId]/api-keys/route.ts` - List and create keys
  - `app/api/tenants/[tenantId]/api-keys/[keyId]/route.ts` - Revoke key
  - `app/api/tenants/[tenantId]/api-keys/[keyId]/usage/route.ts` - Usage stats
- **Files to modify:**
  - Create `src/schemas/apiKey.schema.ts`
- **Dependencies:** Task 5.1
- **Estimated effort:** 4 hours

**Implementation details:**
- Only return full key on creation (one-time display)
- Show prefix only on list endpoint
- Support key rotation
- Auto-expire old keys
- Usage analytics (requests per day, endpoints called)

### Phase 6: Rate Limiting & Caching
**Duration:** 4 days
**Priority:** High (performance & security)

#### 6.1 Setup Upstash Redis
- **Description:** Configure Redis for caching and rate limiting
- **Files to create:**
  - `src/lib/redis.ts` - Redis client singleton
- **Files to modify:**
  - `package.json` - Add @upstash/redis, @upstash/ratelimit
  - `.env` - Add UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
- **Dependencies:** None
- **Estimated effort:** 2 hours

**Implementation details:**
- Create Upstash account and database
- Configure Redis client with REST API
- Test connection in health check endpoint

#### 6.2 Rate Limiting Middleware
- **Description:** Implement rate limiting for all endpoints
- **Files to create:**
  - `src/middleware/rateLimit.ts` - Rate limiting logic
- **Dependencies:** Task 6.1
- **Estimated effort:** 4 hours

**Implementation details:**
- Different limits for authenticated vs unauthenticated requests
- Per-IP rate limiting for public endpoints
- Per-user rate limiting for authenticated endpoints
- Per-API-key rate limiting with custom limits
- Return rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
- 429 status code with Retry-After header

#### 6.3 Response Caching Service
- **Description:** Cache frequently accessed data
- **Files to create:**
  - `src/services/cache.service.ts` - Caching utilities
- **Dependencies:** Task 6.1
- **Estimated effort:** 4 hours

**Implementation details:**
- `getCached<T>(key)` - Retrieve from cache
- `setCached<T>(key, value, ttl)` - Store in cache
- `invalidateCache(pattern)` - Clear cache entries
- Cache key patterns:
  - `tenant:{tenantId}` - Tenant data (5 min)
  - `tenant:{tenantId}:pages` - Page list (2 min)
  - `page:{tenantId}:{slug}` - Page detail (5 min)
  - `nav:{tenantId}` - Navigation (10 min)
  - `branding:{tenantId}` - Branding (30 min)

#### 6.4 Integrate Caching into APIs
- **Description:** Add caching to GET endpoints
- **Files to modify:**
  - All GET endpoints in `app/api/**`
- **Dependencies:** Task 6.3
- **Estimated effort:** 4 hours

**Implementation details:**
- Cache GET requests only
- Invalidate on POST/PUT/DELETE
- Skip cache for search queries
- Add cache headers (Cache-Control, ETag)

### Phase 7: Template Management System
**Duration:** 3 days
**Priority:** Medium (content management)

#### 7.1 Template CRUD APIs
- **Description:** Endpoints for managing page templates
- **Files to create:**
  - `app/api/templates/route.ts` - List and create templates
  - `app/api/templates/[templateId]/route.ts` - Get, update, delete template
  - `app/api/templates/[templateId]/apply/route.ts` - Apply template to page
  - `app/api/industries/route.ts` - List industries (for filtering)
- **Files to modify:**
  - Create `src/schemas/template.schema.ts`
- **Dependencies:** None
- **Estimated effort:** 6 hours

**Implementation details:**
- Filter templates by category, industry, premium status
- Apply template to page (create PageTemplate record)
- Track customizations from default
- Support template preview
- Seed database with default templates

#### 7.2 Page-Template Integration
- **Description:** Link pages to templates and track customizations
- **Files to modify:**
  - `app/api/tenants/[tenantId]/pages/route.ts`
  - `app/api/tenants/[tenantId]/pages/[pageId]/route.ts`
- **Dependencies:** Task 7.1
- **Estimated effort:** 3 hours

**Implementation details:**
- Optional templateId on page creation
- Auto-populate sections from template
- Track which fields were customized
- Support "reset to template" operation

### Phase 8: Asset Management Enhancement
**Duration:** 3 days
**Priority:** Medium (file handling)

#### 8.1 File Upload Service
- **Description:** Handle file uploads with validation and storage
- **Files to create:**
  - `src/services/upload.service.ts` - File upload logic
- **Files to modify:**
  - `package.json` - Add sharp for image processing
- **Dependencies:** None
- **Estimated effort:** 5 hours

**Implementation details:**
- Validate file types (images, PDFs)
- Validate file sizes (max 5MB for images)
- Generate unique storage keys
- Extract image dimensions using sharp
- Support thumbnail generation
- Store files locally (for now, S3 later)

#### 8.2 Asset APIs Enhancement
- **Description:** Complete asset CRUD with upload support
- **Files to modify:**
  - `app/api/tenants/[tenantId]/assets/route.ts`
  - `app/api/tenants/[tenantId]/assets/[assetId]/route.ts`
- **Files to create:**
  - `app/api/tenants/[tenantId]/assets/upload/route.ts` - Multipart upload
- **Dependencies:** Task 8.1
- **Estimated effort:** 4 hours

**Implementation details:**
- Support multipart/form-data uploads
- Return signed URLs for downloads
- Support bulk uploads
- Lazy delete (soft delete assets)
- Track storage usage per tenant

### Phase 9: Security Hardening
**Duration:** 2 days
**Priority:** Critical (production requirement)

#### 9.1 Security Headers Middleware
- **Description:** Add security headers to all responses
- **Files to create:**
  - `src/middleware/security.ts` - Security headers
- **Files to modify:**
  - `middleware.ts` (root) - Apply globally
- **Dependencies:** None
- **Estimated effort:** 2 hours

**Implementation details:**
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()
- Content-Security-Policy (strict)

#### 9.2 CORS Configuration
- **Description:** Configure CORS for API access
- **Files to modify:**
  - `src/middleware/security.ts`
- **Dependencies:** Task 9.1
- **Estimated effort:** 1 hour

**Implementation details:**
- Allow specific origins only
- Support preflight requests (OPTIONS)
- Expose custom headers
- Allow credentials

#### 9.3 Input Sanitization
- **Description:** Sanitize user inputs to prevent XSS and injection
- **Files to create:**
  - `src/utils/sanitize.ts` - Sanitization utilities
- **Dependencies:** None
- **Estimated effort:** 3 hours

**Implementation details:**
- HTML sanitization for rich text fields
- SQL injection prevention (Prisma already handles this)
- Path traversal prevention for file uploads
- Validate and sanitize URLs

### Phase 10: Testing Infrastructure
**Duration:** 5 days
**Priority:** High (quality assurance)

#### 10.1 Testing Setup
- **Description:** Configure Jest and testing utilities
- **Files to create:**
  - `jest.config.js` - Jest configuration
  - `tests/setup.ts` - Test setup and utilities
  - `tests/helpers/mockData.ts` - Test data factories
- **Files to modify:**
  - `package.json` - Add testing dependencies
- **Dependencies:** None
- **Estimated effort:** 4 hours

**Implementation details:**
- Install jest, @testing-library/react, @testing-library/jest-dom
- Install supertest for API testing
- Setup test database (separate from dev)
- Create test data factories

#### 10.2 Unit Tests
- **Description:** Unit tests for utilities and services
- **Files to create:**
  - `tests/utils/apiResponse.test.ts`
  - `tests/utils/pagination.test.ts`
  - `tests/services/audit.test.ts`
  - `tests/services/webhook.test.ts`
  - `tests/services/apiKey.test.ts`
  - `tests/services/cache.test.ts`
- **Dependencies:** Task 10.1
- **Estimated effort:** 8 hours

#### 10.3 Integration Tests
- **Description:** API endpoint integration tests
- **Files to create:**
  - `tests/api/tenants.test.ts`
  - `tests/api/pages.test.ts`
  - `tests/api/auth.test.ts`
  - `tests/api/webhooks.test.ts`
- **Dependencies:** Task 10.1
- **Estimated effort:** 12 hours

**Implementation details:**
- Test all CRUD operations
- Test authentication and authorization
- Test validation errors
- Test edge cases
- Test pagination
- Test caching behavior

### Phase 11: Documentation & DevOps
**Duration:** 3 days
**Priority:** Medium (maintainability)

#### 11.1 API Documentation
- **Description:** Generate comprehensive API documentation
- **Files to create:**
  - `docs/api-reference.md` - Complete API reference
  - `docs/authentication.md` - Auth guide
  - `docs/webhooks.md` - Webhook integration guide
  - `docs/postman-collection.json` - Postman collection
- **Dependencies:** All API implementations
- **Estimated effort:** 6 hours

#### 11.2 Database Seeding
- **Description:** Create seed data for development and testing
- **Files to create:**
  - `prisma/seed.ts` - Database seed script
- **Files to modify:**
  - `package.json` - Add seed script
- **Dependencies:** None
- **Estimated effort:** 4 hours

**Implementation details:**
- Seed industries
- Seed default templates
- Seed test tenant with sample data
- Seed test users

#### 11.3 Docker Compose for Full Stack
- **Description:** Docker setup for local development
- **Files to create:**
  - `docker-compose.yml` - Full stack setup
  - `Dockerfile` - Application container
  - `.dockerignore` - Docker ignore file
- **Dependencies:** None
- **Estimated effort:** 3 hours

**Implementation details:**
- PostgreSQL service
- Redis service (Upstash local alternative)
- Application service
- Environment variable management

## Codebase Integration Points

### Files to Modify

1. **`app/api/tenants/route.ts`** - Add auth, audit logging, webhooks
2. **`app/api/tenants/[tenantId]/route.ts`** - Add auth, caching
3. **All page endpoints** - Add auth, validation, caching, audit, webhooks
4. **All section endpoints** - Add auth, validation, audit, webhooks
5. **`src/lib/prisma.ts`** - Add query logging middleware
6. **`package.json`** - Add new dependencies

### New Files to Create

**Services:** (23 files)
- `src/services/audit.service.ts`
- `src/services/webhook.service.ts`
- `src/services/apiKey.service.ts`
- `src/services/cache.service.ts`
- `src/services/upload.service.ts`

**Middleware:** (7 files)
- `src/middleware/auth.ts`
- `src/middleware/apiKeyAuth.ts`
- `src/middleware/audit.ts`
- `src/middleware/rateLimit.ts`
- `src/middleware/security.ts`
- `src/middleware/errorHandler.ts`
- `src/middleware/validate.ts`

**API Routes:** (15+ new endpoints)
- Template management (4 endpoints)
- Webhook management (4 endpoints)
- API key management (3 endpoints)
- Audit logs (2 endpoints)
- Auth endpoints (2 endpoints)
- Industries (1 endpoint)

**Schemas:** (3 new)
- `src/schemas/template.schema.ts`
- `src/schemas/webhook.schema.ts`
- `src/schemas/apiKey.schema.ts`

**Tests:** (20+ test files)
- Unit tests for all services
- Integration tests for all APIs
- Test utilities and helpers

**Configuration:**
- `jest.config.js`
- `docker-compose.yml`
- `Dockerfile`

### Existing Patterns to Follow

1. **Always use Prisma transactions for multi-step operations**
2. **Use Zod schemas for all input validation**
3. **Return consistent responses using apiResponse helpers**
4. **Handle Prisma errors explicitly**
5. **Use snake_case for database columns, camelCase in TypeScript**
6. **Include detailed JSDoc comments on all public functions**
7. **Use TypeScript strict mode**
8. **Prefer async/await over promises**

## Technical Design

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  (Frontend App, Mobile App, External Integrations)           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─── HTTP/REST
                 │
┌────────────────▼────────────────────────────────────────────┐
│                    Middleware Layer                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Security Headers │ CORS │ Rate Limiting              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Authentication (JWT/API Key)                          │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Request Validation (Zod) │ Error Handling            │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                      API Route Layer                         │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐   │
│  │ Tenants  │  Pages   │ Sections │  Users   │  Assets  │   │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘   │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐   │
│  │ Branding │  Nav     │   SEO    │Templates │Webhooks  │   │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘   │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                     Service Layer                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Audit │ Webhook │ Cache │ Upload │ API Key           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────┬───────────────────┬────────────────────┬──────────────┘
      │                   │                    │
┌─────▼──────┐  ┌────────▼─────────┐  ┌───────▼────────┐
│ PostgreSQL │  │  Redis (Upstash) │  │  File Storage  │
│  Database  │  │  Cache + Limits  │  │   (Local/S3)   │
└────────────┘  └──────────────────┘  └────────────────┘
```

### Data Flow

**Request Flow (Authenticated Endpoint):**
1. Request arrives at Next.js API route
2. Security middleware applies headers and CORS
3. Rate limiting middleware checks limits (Redis)
4. Authentication middleware validates JWT/API key
5. Request validation middleware checks input schema (Zod)
6. Check cache for GET requests (Redis)
7. API route handler processes request
8. Service layer performs business logic
9. Prisma ORM queries database (PostgreSQL)
10. Audit middleware logs mutation (async)
11. Webhook service triggers webhooks (async, background)
12. Response cached (if GET request)
13. Success response returned to client

**Mutation Flow with Audit & Webhooks:**
```
POST /api/tenants/{tenantId}/pages
  ├─> Validate auth
  ├─> Validate input
  ├─> Create page (Prisma)
  ├─> Log audit (background)
  │   └─> Insert into audit_logs
  ├─> Trigger webhooks (background)
  │   ├─> Find active webhooks for "page.created"
  │   ├─> Send HTTP POST with HMAC signature
  │   └─> Log delivery to webhook_deliveries
  ├─> Invalidate cache
  │   └─> Delete tenant:{id}:pages
  └─> Return 201 Created
```

### API Endpoints

**Authentication:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (alternative to NextAuth UI)
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token

**Tenants:** (5 endpoints - already implemented)
- `GET /api/tenants` - List tenants (paginated, filtered)
- `POST /api/tenants` - Create tenant
- `GET /api/tenants/:tenantId` - Get tenant details
- `PUT /api/tenants/:tenantId` - Update tenant
- `DELETE /api/tenants/:tenantId` - Delete tenant

**Pages:** (7 endpoints - partially implemented)
- `GET /api/tenants/:tenantId/pages` - List pages
- `POST /api/tenants/:tenantId/pages` - Create page
- `GET /api/tenants/:tenantId/pages/:pageId` - Get page
- `GET /api/tenants/:tenantId/pages/slug/:slug` - Get page by slug
- `PUT /api/tenants/:tenantId/pages/:pageId` - Update page
- `DELETE /api/tenants/:tenantId/pages/:pageId` - Delete page
- `POST /api/tenants/:tenantId/pages/:pageId/duplicate` - Duplicate page

**Sections:** (7 endpoints - partially implemented)
- `GET /api/tenants/:tenantId/pages/:pageId/sections` - List sections
- `POST /api/tenants/:tenantId/pages/:pageId/sections` - Create section
- `GET /api/tenants/:tenantId/pages/:pageId/sections/:sectionId` - Get section
- `PUT /api/tenants/:tenantId/pages/:pageId/sections/:sectionId` - Update section
- `DELETE /api/tenants/:tenantId/pages/:pageId/sections/:sectionId` - Delete section
- `PUT /api/tenants/:tenantId/pages/:pageId/sections/reorder` - Reorder sections
- `POST /api/tenants/:tenantId/pages/:pageId/sections/bulk` - Bulk operations

**Navigation:** (6 endpoints - partially implemented)
- `GET /api/tenants/:tenantId/navigation` - List nav items
- `POST /api/tenants/:tenantId/navigation` - Create nav item
- `GET /api/tenants/:tenantId/navigation/:navId` - Get nav item
- `PUT /api/tenants/:tenantId/navigation/:navId` - Update nav item
- `DELETE /api/tenants/:tenantId/navigation/:navId` - Delete nav item
- `PUT /api/tenants/:tenantId/navigation/reorder` - Reorder nav items

**SEO Metadata:** (3 endpoints - partially implemented)
- `GET /api/tenants/:tenantId/pages/:pageId/seo` - Get SEO metadata
- `PUT /api/tenants/:tenantId/pages/:pageId/seo` - Update SEO metadata
- `DELETE /api/tenants/:tenantId/pages/:pageId/seo` - Delete SEO metadata

**Branding:** (3 endpoints - partially implemented)
- `GET /api/tenants/:tenantId/branding` - Get branding
- `PUT /api/tenants/:tenantId/branding` - Update branding
- `DELETE /api/tenants/:tenantId/branding` - Reset to defaults

**Users:** (6 endpoints - partially implemented)
- `GET /api/users` - List users (super_admin only)
- `POST /api/users` - Create user
- `GET /api/users/:userId` - Get user
- `PUT /api/users/:userId` - Update user
- `DELETE /api/users/:userId` - Delete user
- `PUT /api/users/:userId/password` - Change password

**Subscriptions:** (4 endpoints - partially implemented)
- `GET /api/tenants/:tenantId/subscription` - Get subscription
- `POST /api/tenants/:tenantId/subscription` - Create subscription
- `PUT /api/tenants/:tenantId/subscription` - Update subscription
- `DELETE /api/tenants/:tenantId/subscription` - Cancel subscription

**Assets:** (5 endpoints - partially implemented)
- `GET /api/tenants/:tenantId/assets` - List assets
- `POST /api/tenants/:tenantId/assets/upload` - Upload asset
- `GET /api/tenants/:tenantId/assets/:assetId` - Get asset
- `PUT /api/tenants/:tenantId/assets/:assetId` - Update asset metadata
- `DELETE /api/tenants/:tenantId/assets/:assetId` - Delete asset

**Templates:** (4 endpoints - NEW)
- `GET /api/templates` - List templates (filtered by category, industry)
- `POST /api/templates` - Create template (admin only)
- `GET /api/templates/:templateId` - Get template
- `POST /api/templates/:templateId/apply` - Apply to page

**Webhooks:** (4 endpoints - NEW)
- `GET /api/tenants/:tenantId/webhooks` - List webhooks
- `POST /api/tenants/:tenantId/webhooks` - Create webhook
- `PUT /api/tenants/:tenantId/webhooks/:webhookId` - Update webhook
- `DELETE /api/tenants/:tenantId/webhooks/:webhookId` - Delete webhook

**API Keys:** (3 endpoints - NEW)
- `GET /api/tenants/:tenantId/api-keys` - List API keys
- `POST /api/tenants/:tenantId/api-keys` - Create API key
- `DELETE /api/tenants/:tenantId/api-keys/:keyId` - Revoke API key

**Audit Logs:** (2 endpoints - NEW)
- `GET /api/tenants/:tenantId/audit` - List tenant audit logs
- `GET /api/audit` - List all audit logs (super_admin only)

**AI/Content:** (3 endpoints - partially implemented)
- `POST /api/ai/content-optimize` - Optimize content
- `POST /api/ai/seo-optimize` - Optimize SEO
- `POST /api/ai/generate-page` - Generate page from prompt

**Total:** 63 endpoints (49 from original spec + 14 new)

## Dependencies and Libraries

**Current Dependencies:**
- ✅ next@15.5.6
- ✅ react@19.2.0
- ✅ typescript@5.9.3
- ✅ @prisma/client@6.17.1
- ✅ prisma@6.17.1
- ✅ zod@4.1.12
- ✅ next-auth@4.24.11
- ✅ @auth/prisma-adapter@2.11.0
- ✅ bcrypt@6.0.0

**To Add:**
```bash
# Caching and rate limiting
npm install @upstash/redis @upstash/ratelimit

# Image processing
npm install sharp

# Testing
npm install -D jest @testing-library/react @testing-library/jest-dom @types/jest ts-node supertest @types/supertest

# Utilities
npm install nanoid date-fns
```

## Testing Strategy

### Unit Tests
**Coverage Target:** 80%+

**Test Files:**
- `tests/utils/apiResponse.test.ts` - Response helper functions
- `tests/utils/pagination.test.ts` - Pagination utilities
- `tests/utils/sanitize.test.ts` - Input sanitization
- `tests/services/audit.test.ts` - Audit logging service
- `tests/services/webhook.test.ts` - Webhook delivery
- `tests/services/apiKey.test.ts` - API key generation/validation
- `tests/services/cache.test.ts` - Caching logic
- `tests/services/upload.test.ts` - File upload handling
- `tests/middleware/auth.test.ts` - Authentication middleware
- `tests/middleware/rateLimit.test.ts` - Rate limiting

### Integration Tests
**Coverage Target:** 100% of critical paths

**Test Files:**
- `tests/api/auth.test.ts` - Authentication flow
- `tests/api/tenants.test.ts` - Tenant CRUD operations
- `tests/api/pages.test.ts` - Page CRUD + pagination
- `tests/api/sections.test.ts` - Section management
- `tests/api/navigation.test.ts` - Navigation management
- `tests/api/branding.test.ts` - Branding updates
- `tests/api/webhooks.test.ts` - Webhook CRUD + delivery
- `tests/api/apiKeys.test.ts` - API key auth
- `tests/api/templates.test.ts` - Template application
- `tests/api/audit.test.ts` - Audit log queries

**Test Scenarios:**
1. Create tenant → verify branding created → verify domain lookup created
2. Login → access protected endpoint → verify auth
3. Create page → verify audit log → verify webhook triggered → verify cache invalidated
4. Rate limit exceeded → verify 429 response
5. Invalid input → verify 422 validation error
6. Duplicate subdomain → verify 409 conflict

### E2E Tests (Future)
- User registration to first page creation
- Template application workflow
- Webhook delivery end-to-end

## Success Criteria

The backend is considered **production-ready** when:

1. ✅ **All 63 API endpoints implemented and tested**
2. ✅ **100% authentication coverage** (all protected endpoints require auth)
3. ✅ **Input validation on all POST/PUT/DELETE** (Zod schemas)
4. ✅ **Audit logs for all mutations** (create, update, delete operations)
5. ✅ **Webhook system functional** (trigger, deliver, retry, logging)
6. ✅ **Rate limiting active** (prevents abuse, configurable limits)
7. ✅ **Caching reduces DB queries** (60%+ reduction for GET requests)
8. ✅ **Response times < 100ms** (p95, excluding external webhooks)
9. ✅ **Security headers applied** (all endpoints)
10. ✅ **Test coverage > 80%** (unit + integration tests)
11. ✅ **Zero critical vulnerabilities** (npm audit)
12. ✅ **API documentation complete** (Postman collection + Markdown)
13. ✅ **Database optimized** (indexes on foreign keys, no N+1 queries)
14. ✅ **Error handling consistent** (all errors return standard format)
15. ✅ **Tenant isolation enforced** (users cannot access other tenants' data)

## Performance Metrics

**Target Metrics:**
- API response time (p50): < 50ms
- API response time (p95): < 100ms
- API response time (p99): < 200ms
- Database query time (avg): < 10ms
- Cache hit rate: > 60%
- Webhook delivery success rate: > 95%
- Test execution time: < 2 minutes
- Build time: < 1 minute

**Monitoring:**
- Log all requests with timing
- Track cache hit/miss ratio
- Monitor webhook delivery status
- Alert on error rate > 1%
- Alert on p95 latency > 150ms

## Timeline Summary

| Phase | Duration | Tasks | Dependencies |
|-------|----------|-------|--------------|
| Phase 1: Auth & Authorization | 1 week | 4 tasks | None |
| Phase 2: Validation & Errors | 3-4 days | 3 tasks | None |
| Phase 3: Audit Logging | 3 days | 3 tasks | Phase 1 |
| Phase 4: Webhooks | 4 days | 3 tasks | Phase 1 |
| Phase 5: API Keys | 3 days | 3 tasks | Phase 1 |
| Phase 6: Rate Limit & Cache | 4 days | 4 tasks | None |
| Phase 7: Templates | 3 days | 2 tasks | None |
| Phase 8: Asset Management | 3 days | 2 tasks | None |
| Phase 9: Security | 2 days | 3 tasks | None |
| Phase 10: Testing | 5 days | 3 tasks | All phases |
| Phase 11: Docs & DevOps | 3 days | 3 tasks | All phases |

**Total Duration:** 5-6 weeks (with some parallel work)

**Critical Path:**
1. Phase 1 (Auth) → Phase 3 (Audit) → Phase 4 (Webhooks) → Phase 10 (Testing)
2. Phase 6 (Cache/Rate Limit) can run parallel with Phase 3-5
3. Phase 7-8 can run parallel with Phase 4-5

## Risk Mitigation

**Risks:**
1. **Upstash Redis costs** - Mitigation: Start with free tier, monitor usage
2. **Webhook delivery failures** - Mitigation: Retry logic, exponential backoff, logging
3. **Rate limiting too strict** - Mitigation: Make limits configurable per tenant
4. **Cache invalidation bugs** - Mitigation: Conservative TTLs, comprehensive testing
5. **File upload vulnerabilities** - Mitigation: Strict validation, virus scanning (future)

## Post-Implementation Tasks

**After completion:**
1. Performance testing with realistic load (1000+ concurrent users)
2. Security audit (penetration testing)
3. Documentation review and updates
4. Training materials for frontend team
5. Migration plan from development to production
6. Backup and disaster recovery procedures
7. Monitoring and alerting setup (Sentry, Datadog, etc.)
8. CI/CD pipeline configuration
9. Staging environment setup
10. Production deployment checklist

## Notes and Considerations

**Important Notes:**
- All phases can be implemented incrementally
- Each phase should be merged to main after testing
- Use feature flags for gradual rollout
- Maintain backward compatibility during changes
- Document breaking changes clearly

**Future Enhancements (Out of Scope):**
- S3/CloudFlare R2 for asset storage
- Elasticsearch for full-text search
- WebSocket support for real-time updates
- GraphQL API alternative
- Multi-region deployment
- Automated backups
- Advanced analytics and reporting

---

**This plan is ready for execution with `/execute-plan PRPs/backend-perfection-plan.md`**

*Generated: October 18, 2025*
*Version: 1.0*
*Status: Ready for Implementation*
