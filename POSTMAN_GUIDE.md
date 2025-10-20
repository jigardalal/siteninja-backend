# SiteNinja Postman Collection Guide

## Quick Start

### 1. Import the Collection

1. Open Postman
2. Click **Import** button
3. Select `postman_collection.json` from this repository
4. The collection will be imported with all 70+ endpoints organized by resource

### 2. Set Collection Variables

The collection uses variables for easy testing. Set these in the collection variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `base_url` | API base URL | `http://localhost:3021` |
| `jwt_token` | JWT authentication token | (set after login) |
| `tenant_id` | Current tenant ID | (auto-set after creating tenant) |
| `user_id` | Current user ID | (auto-set after creating user) |
| `page_id` | Current page ID | (auto-set after creating page) |
| `section_id` | Current section ID | (auto-set after creating section) |
| `asset_id` | Current asset ID | (auto-set after creating asset) |
| `template_id` | Current template ID | (auto-set after creating template) |
| `webhook_id` | Current webhook ID | (auto-set after creating webhook) |
| `api_key_id` | Current API key ID | (auto-set after creating key) |

### 3. Testing Workflow

#### Step 1: Health Check
```
GET /api/health
```
Verify the API is running and database is connected.

#### Step 2: Create a Tenant
```
POST /api/tenants
```
Creates a new tenant. Requires `super_admin` authentication.
- Response sets `tenant_id` variable automatically

#### Step 3: Register a User
```
POST /api/auth/register
```
Register a new user for the tenant.
- Use the `tenant_id` from step 2
- Response sets `user_id` variable automatically

#### Step 4: Login
```
POST /api/auth/callback/credentials
```
Login with credentials to get JWT token.
- Manually copy the JWT token to `jwt_token` variable
- All subsequent requests will use this token

#### Step 5: Create Pages & Content
```
POST /api/tenants/{{tenant_id}}/pages
POST /api/tenants/{{tenant_id}}/pages/{{page_id}}/sections
```
Create pages and add sections to build your site.

## API Endpoints Overview

### Authentication (2 endpoints)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/callback/credentials` - Login

### Tenants (6 endpoints)
- `GET /api/tenants` - List all tenants
- `POST /api/tenants` - Create tenant
- `GET /api/tenants/:id` - Get tenant
- `PUT /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Soft delete tenant
- `DELETE /api/tenants/:id?hard=true` - Hard delete tenant

### Users (6 endpoints)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PUT /api/users/:id/password` - Change password

### Pages (7 endpoints)
- `GET /api/tenants/:tenantId/pages` - List pages
- `POST /api/tenants/:tenantId/pages` - Create page
- `GET /api/tenants/:tenantId/pages/:id` - Get page
- `GET /api/tenants/:tenantId/pages/slug/:slug` - Get by slug
- `PUT /api/tenants/:tenantId/pages/:id` - Update page
- `DELETE /api/tenants/:tenantId/pages/:id` - Delete page
- `POST /api/tenants/:tenantId/pages/:id/duplicate` - Duplicate page

### Sections (6 endpoints)
- `GET /api/tenants/:tenantId/pages/:pageId/sections` - List sections
- `POST /api/tenants/:tenantId/pages/:pageId/sections` - Create section
- `PUT /api/tenants/:tenantId/pages/:pageId/sections/:id` - Update section
- `DELETE /api/tenants/:tenantId/pages/:pageId/sections/:id` - Delete section
- `POST /api/tenants/:tenantId/pages/:pageId/sections/reorder` - Reorder sections
- `POST /api/tenants/:tenantId/pages/:pageId/sections/bulk` - Bulk create sections

### SEO (2 endpoints)
- `GET /api/tenants/:tenantId/pages/:pageId/seo` - Get SEO metadata
- `PUT /api/tenants/:tenantId/pages/:pageId/seo` - Update SEO metadata

### Navigation (5 endpoints)
- `GET /api/tenants/:tenantId/navigation` - List navigation items
- `POST /api/tenants/:tenantId/navigation` - Create navigation item
- `PUT /api/tenants/:tenantId/navigation/:id` - Update navigation item
- `DELETE /api/tenants/:tenantId/navigation/:id` - Delete navigation item
- `POST /api/tenants/:tenantId/navigation/reorder` - Reorder navigation

### Branding (2 endpoints)
- `GET /api/tenants/:tenantId/branding` - Get branding settings
- `PUT /api/tenants/:tenantId/branding` - Update branding settings

### Subscription (2 endpoints)
- `GET /api/tenants/:tenantId/subscription` - Get subscription
- `PUT /api/tenants/:tenantId/subscription` - Update subscription

### Assets (5 endpoints)
- `GET /api/tenants/:tenantId/assets` - List assets
- `POST /api/tenants/:tenantId/assets/upload` - Upload asset
- `GET /api/tenants/:tenantId/assets/:id` - Get asset
- `PUT /api/tenants/:tenantId/assets/:id` - Update asset metadata
- `DELETE /api/tenants/:tenantId/assets/:id` - Delete asset

### Templates (6 endpoints)
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `GET /api/templates/:id` - Get template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template
- `POST /api/templates/:id/apply` - Apply template to page

### Webhooks (5 endpoints)
- `GET /api/tenants/:tenantId/webhooks` - List webhooks
- `POST /api/tenants/:tenantId/webhooks` - Create webhook
- `PUT /api/tenants/:tenantId/webhooks/:id` - Update webhook
- `DELETE /api/tenants/:tenantId/webhooks/:id` - Delete webhook
- `POST /api/tenants/:tenantId/webhooks/:id/test` - Test webhook

### API Keys (3 endpoints)
- `GET /api/tenants/:tenantId/api-keys` - List API keys
- `POST /api/tenants/:tenantId/api-keys` - Create API key
- `DELETE /api/tenants/:tenantId/api-keys/:id` - Revoke API key

### Audit Logs (2 endpoints)
- `GET /api/tenants/:tenantId/audit` - Get tenant audit logs
- `GET /api/audit` - Get all audit logs (super_admin)

### AI Features (3 endpoints)
- `POST /api/ai/content-optimize` - Optimize content with AI
- `POST /api/ai/seo-optimize` - Generate SEO optimizations
- `POST /api/ai/generate-page` - Generate complete page with AI

### Health (1 endpoint)
- `GET /api/health` - Health check

## Authentication Methods

### 1. JWT Bearer Token (Recommended)
```
Authorization: Bearer <jwt_token>
```
Used for all authenticated requests. Set in collection auth.

### 2. API Key (For Programmatic Access)
```
X-API-Key: <api_key>
```
Use API keys for server-to-server communication.

## Common Query Parameters

### Pagination
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sort` - Sort field (default: createdAt)
- `order` - Sort order: 'asc' | 'desc' (default: desc)

### Filtering
- `status` - Filter by status
- `search` - Search in text fields
- `tenantId` - Filter by tenant
- `role` - Filter by user role

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Validation Error Response
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## Role-Based Access Control

### Roles
- `super_admin` - Full system access
- `admin` - Tenant administration
- `owner` - Tenant ownership (similar to admin)
- `editor` - Content editing
- `viewer` - Read-only access

### Permission Matrix

| Endpoint | viewer | editor | admin | owner | super_admin |
|----------|--------|--------|-------|-------|-------------|
| List tenants | ✗ | ✗ | ✓ | ✓ | ✓ |
| Create tenant | ✗ | ✗ | ✗ | ✗ | ✓ |
| Update tenant | ✗ | ✗ | ✓ | ✓ | ✓ |
| Delete tenant | ✗ | ✗ | ✗ | ✗ | ✓ |
| List users | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create user | ✗ | ✗ | ✓ | ✓ | ✓ |
| Update user | ✗ | ✗ | ✓ | ✓ | ✓ |
| Create page | ✗ | ✓ | ✓ | ✓ | ✓ |
| Update page | ✗ | ✓ | ✓ | ✓ | ✓ |
| Delete page | ✗ | ✓ | ✓ | ✓ | ✓ |

## Tips & Best Practices

### 1. Use Test Scripts
Many requests have test scripts that automatically set variables. For example, creating a tenant automatically sets `tenant_id`.

### 2. Environment Variables
Create separate environments for:
- Local Development (`http://localhost:3021`)
- Staging (`https://staging-api.siteninja.com`)
- Production (`https://api.siteninja.com`)

### 3. File Uploads
For asset upload endpoint:
1. Select `form-data` body type
2. Set `file` field type to `File`
3. Add optional `altText` and `category` as text fields

### 4. API Key Creation
When creating an API key, the raw key is only shown once in the response. Save it immediately!

### 5. Webhook Testing
Use webhook.site or similar services to test webhook deliveries:
```
url: https://webhook.site/your-unique-url
```

## Troubleshooting

### 401 Unauthorized
- Ensure `jwt_token` variable is set
- Check if token has expired
- Verify you're logged in as the correct user

### 403 Forbidden
- Check your user role
- Verify you have permission for the operation
- Ensure you're accessing your own tenant's resources

### 404 Not Found
- Verify the resource ID is correct
- Check if resource belongs to your tenant
- Ensure resource hasn't been soft-deleted

### 422 Validation Error
- Review the error response for specific field errors
- Check required fields are provided
- Verify field formats (email, dates, etc.)

### 500 Internal Server Error
- Check server logs
- Verify database connection
- Ensure required services (Redis, Prisma) are running

## Sample Testing Sequence

```
1. GET /api/health
   ✓ Verify API is running

2. POST /api/tenants (as super_admin)
   ✓ Create test tenant
   ✓ Save tenant_id

3. POST /api/auth/register
   ✓ Register user
   ✓ Save user_id

4. POST /api/auth/callback/credentials
   ✓ Login and get JWT
   ✓ Save jwt_token

5. PUT /api/tenants/:tenant_id/branding
   ✓ Customize branding

6. POST /api/tenants/:tenant_id/pages
   ✓ Create home page
   ✓ Save page_id

7. POST /api/tenants/:tenant_id/pages/:page_id/sections
   ✓ Add hero section
   ✓ Add features section

8. PUT /api/tenants/:tenant_id/pages/:page_id/seo
   ✓ Set SEO metadata

9. GET /api/tenants/:tenant_id/pages/slug/home
   ✓ Verify page is accessible

10. POST /api/tenants/:tenant_id/webhooks
    ✓ Setup webhook for page events
```

## Additional Resources

- **API Documentation**: `/docs` endpoint (if Swagger is enabled)
- **Schema Definitions**: `src/schemas/` directory
- **Example Requests**: See Postman collection examples
- **Error Codes**: See `src/utils/apiResponse.ts`

## Support

For issues or questions:
- Check server logs in development
- Review Prisma queries with `DEBUG=prisma:query`
- Check Redis connection with `redis-cli ping`
- Verify environment variables in `.env`
