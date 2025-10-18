# Architectural Decision Record (ADR)

**Project:** SiteNinja Multi-Tenant Website Builder
**Date:** October 17, 2025
**Status:** Decision Pending
**Architect:** Winston (AI) + Development Team

---

## Context

SiteNinja is currently at a **critical decision point** in its development lifecycle. The frontend is functional (JSON-file based), but needs a production-ready backend with database, authentication, and proper API architecture.

### Current State

- ✅ **Frontend MVP**: Working React/Next.js 15 app with 19 section components
- ✅ **File-Based Multi-Tenancy**: JSON files in `public/API/tenant/`
- ✅ **Comprehensive Documentation**:
  - Backend Implementation Plan (6 weeks)
  - Frontend Compatibility Analysis (2-3 weeks migration)
  - Architecture Review (12 critical issues identified)
- ❌ **No Database**: Using JSON files instead of PostgreSQL
- ❌ **No Authentication**: No user management or RBAC
- ❌ **No Backend APIs**: Direct file access instead of REST APIs

### Key Documentation References

1. **`docs/backend-implementation-plan.md`**
   - 6-phase implementation plan (4-6 weeks)
   - Phase 1: Database schema + Prisma setup
   - Phase 2: 49 API endpoints implementation
   - Phase 3: Validation (Zod schemas)
   - Phase 4: Authentication (NextAuth.js)
   - Phase 5: Advanced features (audit logs, webhooks)
   - Phase 6: Performance (caching, rate limiting)

2. **`docs/frontend-backend-compatibility-analysis.md`**
   - Frontend needs **moderate changes** (30-40% of API-related code)
   - React components: 0% changes (✅ stay intact)
   - API services: 100% rewrite (🔴 40 files)
   - Authentication: 100% new (🔴 8 new files)
   - Data fetching: 40% update (⚠️ 15 files)
   - **Estimated effort**: 70-100 hours (2-3 weeks)

3. **`docs/architecture-review.md`**
   - **12 critical architectural issues** identified
   - **3 CRITICAL** (🔴): Must fix before backend
   - **5 HIGH** (🟡): Should fix during migration
   - **4 MEDIUM** (🟢): Quality improvements

---

## The Decision Point

### Three Strategic Options

We have three viable paths forward:

#### **Option A: Fix Frontend Issues First, Then Build Backend**

**Timeline:** 8-10 weeks total

```
Week 1-2:  Fix all 12 architecture issues (critical frontend problems)
Week 3-8:  Build complete backend (database + 49 APIs + auth)
Week 9-10: Migrate frontend to new backend APIs
```

**Pros:**
- ✅ Clean foundation before backend work
- ✅ CSS issues won't interfere with API integration
- ✅ Layout system simplifies authentication UI
- ✅ Zero technical debt carried forward
- ✅ Each phase is independent

**Cons:**
- ❌ Longest timeline (2 extra weeks upfront)
- ❌ Still maintaining JSON files during frontend fixes
- ❌ No immediate progress on "real" backend

**Best For:** Teams prioritizing code quality and long-term maintainability

---

#### **Option B: Build Backend Now, Fix Frontend During Migration**

**Timeline:** 6-8 weeks total

```
Week 1-6: Build backend (database + APIs + auth + performance)
Week 7-8: Fix frontend issues + migrate to APIs simultaneously
```

**Pros:**
- ✅ Fastest to "real" backend
- ✅ Can test APIs while fixing frontend
- ✅ Immediate progress on core infrastructure

**Cons:**
- ❌ CSS chaos during authentication integration
- ❌ Layout issues complicate API integration
- ❌ Memory leaks (#5) persist during backend build
- ❌ Higher risk of bugs (two massive changes at once)
- ❌ Potential for rework if frontend issues block integration

**Best For:** Teams with tight deadlines and high tolerance for technical debt

---

#### **Option C: Hybrid Approach** ⭐ **RECOMMENDED**

**Timeline:** 7-9 weeks total

```
Week 1:    Fix ONLY the 3 critical blockers (CSS, memory leak, API format)
Week 2-7:  Build complete backend (following implementation plan)
Week 8-9:  Migrate frontend (with minor issues remaining)
```

**Rationale:**

Fix only the **3 CRITICAL issues** that will directly interfere with backend integration:

1. **Issue #1 - CSS Consolidation** (2-3 days)
   - **Problem**: 3 conflicting CSS files, Tailwind loaded 3x, 400KB duplicate CSS
   - **Why Critical**: Authentication UI (Phase 4) will break with CSS conflicts
   - **Fix**: Single `app/globals.css`, remove CDN Tailwind, CSS variables for branding
   - **Impact**: Bundle size 400KB → 150KB, FCP improved by 200-300ms

2. **Issue #5 - Style Injection Memory Leak** (1 day)
   - **Problem**: Inline `<style>` tags never cleaned up between tenant switches
   - **Why Critical**: Multi-tenant testing painful, memory accumulates
   - **Fix**: Use `useRef` for proper cleanup
   - **Impact**: Prevents 10-20KB leak per tenant switch

3. **Issue #7 - API Response Format** (1-2 days)
   - **Problem**: Inconsistent response structure across endpoints
   - **Why Critical**: Must define before writing 49 endpoints (Phase 2)
   - **Fix**: Create `successResponse()`, `errorResponse()` helpers
   - **Impact**: Prevents rewriting all endpoints later

**Defer to Migration Phase:**
- Issue #2 (Layout system) - Can work around during backend build
- Issue #8 (Zustand expansion) - Part of frontend migration
- Issue #3 (Domain resolution) - Backend middleware task
- Issues #9-12 - Quality improvements, not blockers

**Pros:**
- ✅ Removes only the true blockers (5 days of work)
- ✅ Clean API foundation before writing 49 endpoints
- ✅ Frontend testable during backend development
- ✅ Reasonable timeline (7-9 weeks vs 6-8 or 8-10)
- ✅ Balanced risk/reward

**Cons:**
- ❌ 1 week delay before backend starts
- ❌ Some technical debt remains (but non-blocking)

**Best For:** Most teams - balances speed with quality

---

## Detailed Phase Breakdown (Hybrid Approach)

### **Phase 0: Critical Frontend Fixes** (Week 1)

#### Day 1-3: CSS Consolidation (Issue #1)

**Current State:**
```
app/globals.css                    (540 lines - Tailwind + Dashboard)
src/assets/css/styles.css          (644 lines - Tailwind + Tenant)
CDN: tailwindcss@2.2.19            (External link)
```

**Target State:**
```
app/globals.css                    (Tailwind 4.x + CSS variables)
src/styles/components/*.module.css (Scoped component styles)
```

**Implementation:**
1. Remove CDN Tailwind link from `app/layout.tsx`
2. Consolidate Tailwind imports into single `app/globals.css`
3. Extract CSS variables to `:root` in `globals.css`
4. Move component-specific styles to CSS modules
5. Create `src/utils/applyTenantBranding.ts` for dynamic branding
6. Update tenant page components to use CSS variables
7. Test across all portal types

**Success Criteria:**
- [ ] Single Tailwind import
- [ ] Bundle size reduced by 40-50%
- [ ] All portals render correctly
- [ ] Dynamic tenant branding works
- [ ] FCP improved by 200-300ms

**Files Changed:** ~10 files
**Lines Changed:** ~300 lines

---

#### Day 4: Memory Leak Fix (Issue #5)

**Current Problem:**
```typescript
// app/tenant/[tenantId]/[...slug]/page.tsx:45-96
useEffect(() => {
  const styleElement = document.createElement('style');
  document.head.appendChild(styleElement);

  return () => {
    // ❌ BROKEN: Cleanup uses stale closure
    const styleElement = document.getElementById(`tenant-styles-${tenantId}`);
    if (styleElement) styleElement.remove();
  };
}, [tenantId, slug]);
```

**Fix:**
```typescript
const styleRef = useRef<HTMLStyleElement | null>(null);
const fontRef = useRef<HTMLLinkElement | null>(null);
const faviconRef = useRef<HTMLLinkElement | null>(null);

useEffect(() => {
  // Cleanup FIRST (previous tenant)
  if (styleRef.current) styleRef.current.remove();
  if (fontRef.current) fontRef.current.remove();
  if (faviconRef.current) faviconRef.current.remove();

  // Create new elements
  const styleElement = document.createElement('style');
  styleElement.textContent = `...`;
  document.head.appendChild(styleElement);
  styleRef.current = styleElement;

  // Same for font and favicon

  return () => {
    if (styleRef.current) styleRef.current.remove();
    if (fontRef.current) fontRef.current.remove();
    if (faviconRef.current) faviconRef.current.remove();
  };
}, [tenantId]);
```

**Success Criteria:**
- [ ] No duplicate style tags in DOM
- [ ] Memory stable after 10+ tenant switches
- [ ] Fonts load/unload correctly
- [ ] Favicon updates properly

**Files Changed:** 1 file (`app/tenant/[tenantId]/[...slug]/page.tsx`)
**Lines Changed:** ~50 lines

---

#### Day 5: API Response Helpers (Issue #7)

**Create Standard Response Format:**

```typescript
// src/utils/apiResponse.ts
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: Array<{ field: string; message: string }>;
  meta?: { timestamp: string; requestId?: string };
}

export function successResponse<T>(data: T, message?: string): NextResponse<ApiResponse<T>>
export function errorResponse(error: string, statusCode: number): NextResponse<ApiResponse<never>>
export function validationErrorResponse(errors: ValidationError[]): NextResponse<ApiResponse<never>>
export function notFoundResponse(resource: string): NextResponse<ApiResponse<never>>
// ... etc
```

**Update Existing Endpoints:**
- `app/api/save-content/route.ts`
- `app/api/seo/save/route.ts`
- `app/api/seo/get/route.ts`
- `app/api/ai/content-optimize/route.ts`

**Success Criteria:**
- [ ] All API routes use response helpers
- [ ] Consistent error format across app
- [ ] TypeScript types match runtime
- [ ] Client-side error handling simplified

**Files Changed:** 6 files (1 new, 5 updated)
**Lines Changed:** ~200 lines

---

### **Phase 1-6: Backend Implementation** (Week 2-7)

Follow **`docs/backend-implementation-plan.md`** exactly:

#### **Phase 1: Foundation & Database** (Week 2)
- Complete database schema (9 new tables)
- Setup Prisma ORM
- Create migrations
- Prisma client singleton

**Deliverables:**
- [ ] PostgreSQL database created
- [ ] All 18+ tables created (existing + 9 new)
- [ ] Prisma schema complete
- [ ] Migrations tested
- [ ] Prisma client working

---

#### **Phase 2: Core API Implementation** (Week 3-4)
- Implement 49 API endpoints
- Use response helpers from Phase 0
- RESTful patterns
- Prisma queries

**Deliverables:**
- [ ] Tenant APIs (5 endpoints)
- [ ] Page APIs (7 endpoints)
- [ ] Section APIs (7 endpoints)
- [ ] Navigation APIs (6 endpoints)
- [ ] SEO APIs (3 endpoints)
- [ ] Branding APIs (3 endpoints)
- [ ] User APIs (6 endpoints)
- [ ] Subscription APIs (4 endpoints)
- [ ] Asset APIs (5 endpoints)
- [ ] AI APIs (3 endpoints)

---

#### **Phase 3: Validation & Error Handling** (Week 5 - Days 1-3)
- Zod schemas for all resources
- Input validation on POST/PUT
- Global error handler
- Prisma error handling

**Deliverables:**
- [ ] 10 Zod schema files
- [ ] Validation on all write endpoints
- [ ] Global error handler middleware
- [ ] Consistent error responses

---

#### **Phase 4: Authentication & Authorization** (Week 5 - Days 4-5, Week 6)
- NextAuth.js setup
- JWT-based auth
- Role-based access control
- Protected routes

**Deliverables:**
- [ ] NextAuth.js configured
- [ ] Login/signup endpoints
- [ ] Auth middleware
- [ ] Role checks on endpoints
- [ ] Session management

---

#### **Phase 5: Advanced Features** (Week 6 - Days 4-5, Week 7 - Days 1-2)
- Audit logging system
- Webhook delivery system
- API key authentication

**Deliverables:**
- [ ] Audit logs on all mutations
- [ ] Webhook trigger system
- [ ] API key generation/validation

---

#### **Phase 6: Performance & Security** (Week 7 - Days 3-5)
- Redis caching
- Rate limiting
- Security headers

**Deliverables:**
- [ ] Cache layer working
- [ ] Rate limits enforced
- [ ] Security headers set
- [ ] Performance tested

---

### **Phase 7: Frontend Migration** (Week 8-9)

Follow **`docs/frontend-backend-compatibility-analysis.md`**:

#### **Week 8: Authentication & Services**
- Add login page
- Add auth provider
- Rewrite 40 API service files
- Add protected routes

**Deliverables:**
- [ ] Login/signup UI
- [ ] NextAuth client integration
- [ ] All service files rewritten
- [ ] Protected route wrapper

---

#### **Week 9: Data Fetching & Cleanup**
- Update page components
- Expand Zustand store
- Add loading/error states
- Remove JSON files
- Final testing

**Deliverables:**
- [ ] All pages use new APIs
- [ ] Zustand store expanded
- [ ] JSON files deleted
- [ ] End-to-end testing complete
- [ ] Production deployment

---

## Critical Risks & Mitigations

### Risk 1: CSS Conflicts Break Authentication UI
**Likelihood:** High
**Impact:** High
**Mitigation:** Fix Issue #1 in Phase 0

### Risk 2: Memory Leaks Discovered During Backend Testing
**Likelihood:** Medium
**Impact:** Medium
**Mitigation:** Fix Issue #5 in Phase 0

### Risk 3: Inconsistent API Responses Require Endpoint Rewrites
**Likelihood:** High
**Impact:** High
**Mitigation:** Fix Issue #7 in Phase 0 (before writing 49 endpoints)

### Risk 4: Frontend Migration Takes Longer Than Estimated
**Likelihood:** Medium
**Impact:** Medium
**Mitigation:**
- Clear API documentation
- Parallel JSON + API operation during Week 8
- Incremental module-by-module migration

### Risk 5: Database Schema Incomplete (Missing Tables)
**Likelihood:** Medium
**Impact:** High
**Mitigation:** Add 9 missing tables in Phase 1 (already documented in backend plan)

---

## Success Metrics

### Phase 0 Success
- [ ] Bundle size: 400KB → 150KB (62% reduction)
- [ ] No memory leaks after 10 tenant switches
- [ ] All API routes use consistent response format
- [ ] All tests passing

### Backend Success (Phase 1-6)
- [ ] All 49 endpoints implemented
- [ ] 100% test coverage for critical paths
- [ ] Response times < 100ms (p95)
- [ ] Zero authentication bypasses
- [ ] All inputs validated with Zod
- [ ] Audit logs for all mutations

### Frontend Migration Success (Phase 7)
- [ ] All pages load from database
- [ ] Authentication working
- [ ] Edit mode functional
- [ ] All portals functional
- [ ] JSON files deleted
- [ ] Production deployment successful

---

## Timeline Summary

| Option | Total Time | Risk Level | Code Quality |
|--------|-----------|------------|--------------|
| **A: Frontend First** | 8-10 weeks | Low | Excellent |
| **B: Backend First** | 6-8 weeks | High | Good |
| **C: Hybrid** ⭐ | 7-9 weeks | Medium | Very Good |

---

## Recommendation

**Choose Option C: Hybrid Approach**

**Rationale:**
1. Fixes only the 3 true blockers (5 days)
2. Prevents major rework on 49 API endpoints
3. Enables proper multi-tenant testing during backend build
4. Balances speed with quality
5. Total timeline (7-9 weeks) is reasonable

---

## Next Steps (When Ready to Proceed)

### Step 1: Choose Your Path

**Say one of:**
- **"Start Hybrid"** → Begin Phase 0 (CSS consolidation)
- **"Start Backend"** → Skip to Phase 1 (database)
- **"Start Frontend"** → Fix all 12 issues first

### Step 2: Execute Phase 0 (If Hybrid)

Winston (AI Architect) will:
1. Run `*execute-checklist` with Phase 0 tasks
2. Generate all code changes
3. Test changes
4. Commit to git

### Step 3: Execute Backend Phases

Winston will:
1. Generate Prisma schemas
2. Create all 49 API endpoints
3. Implement auth system
4. Add caching/performance
5. Test everything

### Step 4: Frontend Migration

Winston will:
1. Rewrite API service files
2. Add authentication UI
3. Update data fetching patterns
4. Test end-to-end
5. Deploy to production

---

## References

- **Backend Plan**: `docs/backend-implementation-plan.md`
- **Frontend Compatibility**: `docs/frontend-backend-compatibility-analysis.md`
- **Architecture Review**: `docs/architecture-review.md`
- **Database Schema**: `docs/database-schema.md`
- **API Specification**: `docs/api-specification.md`

---

## Document History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-10-17 | 1.0 | Winston (AI Architect) | Initial ADR created |

---

**Status:** ⏸️ **DECISION PENDING**
**Next Action:** Development team to choose Option A, B, or C
**Contact:** Resume session with Winston by saying "Start [Hybrid\|Backend\|Frontend]"
