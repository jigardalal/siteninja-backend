# Swagger/OpenAPI Documentation Guide

## Overview

SiteNinja Backend now includes interactive API documentation powered by Swagger UI and OpenAPI 3.0.3 specification. This allows API consumers to explore, test, and understand all available endpoints directly in their browser.

## Accessing the Documentation

### Local Development
```
http://localhost:3000/api-docs
```

### Production
```
https://api.siteninja.com/api-docs
```

### Landing Page
Visit the root URL to see quick links to documentation:
```
http://localhost:3000
```

## Getting Started with Swagger UI

### 1. Open the Documentation
Navigate to `/api-docs` in your browser. You'll see the Swagger UI interface with all available endpoints organized by tags.

### 2. Explore Endpoints
- **Tags**: Endpoints are grouped by resource (Health, Authentication, Tenants, Pages, etc.)
- **Click any endpoint** to expand and see details:
  - Request parameters
  - Request body schema
  - Response schemas
  - Example values
  - Authentication requirements

### 3. Authentication

#### Using JWT Bearer Token

1. **Get a Token**:
   - First, use the `POST /api/auth/callback/credentials` endpoint to login
   - Click "Try it out"
   - Enter test credentials:
     ```json
     {
       "email": "admin@siteninja.com",
       "password": "Password123!"
     }
     ```
   - Click "Execute"
   - Copy the `token` from the response

2. **Authorize Swagger UI**:
   - Click the **"Authorize"** button at the top right
   - In the "BearerAuth" section, paste: `Bearer <your-token>`
   - Click "Authorize" then "Close"
   - All subsequent requests will include this token

#### Using API Key

1. **Create an API Key**:
   - Use the `POST /api/tenants/{tenantId}/api-keys` endpoint
   - Authenticate with JWT first
   - Copy the generated API key

2. **Authorize with API Key**:
   - Click the **"Authorize"** button
   - In the "ApiKeyAuth" section, paste your API key
   - Click "Authorize" then "Close"

### 4. Testing Endpoints

#### Example: Creating a Tenant

1. Navigate to **Tenants** section
2. Find `POST /api/tenants`
3. Click **"Try it out"**
4. Edit the request body:
   ```json
   {
     "name": "My Business",
     "businessName": "My Business LLC",
     "subdomain": "mybusiness",
     "businessType": "ecommerce",
     "contactEmail": "contact@mybusiness.com"
   }
   ```
5. Click **"Execute"**
6. View the response with status code, headers, and body

#### Example: Listing Pages

1. Navigate to **Pages** section
2. Find `GET /api/tenants/{tenantId}/pages`
3. Click **"Try it out"**
4. Enter your `tenantId` in the path parameter
5. Optionally set `page` and `limit` query parameters
6. Click **"Execute"**
7. View paginated results

## Features

### Interactive Testing
- **Try It Out**: Test any endpoint directly from the browser
- **Real Responses**: See actual API responses with status codes
- **Parameter Validation**: Required fields are marked
- **Schema Examples**: See example request bodies

### Comprehensive Documentation
- **Request Schemas**: Understand what data to send
- **Response Schemas**: Know what data to expect
- **Authentication Info**: Clear security requirements
- **Rate Limits**: Documented in the description
- **Test Credentials**: Available in the API description

### Developer Experience
- **Auto-complete**: Schema-based suggestions
- **Format Validation**: Email, UUID, pattern validation
- **Error Details**: Clear error messages
- **Version Info**: Track API version changes

## OpenAPI Specification

### Accessing the Spec

#### JSON Format
```
http://localhost:3000/api/openapi
```

#### YAML Source
Located at: `openapi.yaml` in project root

### Using the Spec

#### With Code Generators
Generate client SDKs using OpenAPI generators:
```bash
# Install OpenAPI Generator
npm install @openapitools/openapi-generator-cli -g

# Generate TypeScript client
openapi-generator-cli generate \
  -i http://localhost:3000/api/openapi \
  -g typescript-axios \
  -o ./generated-client
```

#### With Postman
Import the OpenAPI spec directly into Postman:
1. Open Postman
2. Click "Import"
3. Choose "Link"
4. Enter: `http://localhost:3000/api/openapi`
5. Click "Continue"

#### With Other Tools
The OpenAPI spec works with:
- **Insomnia**: Import via URL
- **Bruno**: Import OpenAPI collection
- **HTTPie Desktop**: Import specification
- **Paw/RapidAPI**: Load from URL

## Test Credentials

After running `npm run db:seed`, use these credentials:

### Super Admin
```
Email: admin@siteninja.com
Password: Password123!
```

### Restaurant Owner
```
Email: marco@bellaitalia.com
Password: Password123!
Tenant: Bella Italia (bellaitalia)
```

### Tech Startup Owner
```
Email: sarah@techflow.io
Password: Password123!
Tenant: TechFlow Solutions (techflow)
```

## Common Workflows

### 1. Complete User Registration Flow

1. **Register a new user**: `POST /api/auth/register`
   ```json
   {
     "email": "newuser@example.com",
     "password": "SecurePass123!",
     "firstName": "John",
     "lastName": "Doe",
     "tenantId": "<tenant-id>",
     "role": "editor"
   }
   ```

2. **Login**: `POST /api/auth/callback/credentials`
3. **Authorize Swagger UI** with the returned token
4. **Get user details**: `GET /api/users/{userId}`

### 2. Creating a Complete Page

1. **Login and authorize**
2. **Create a page**: `POST /api/tenants/{tenantId}/pages`
   ```json
   {
     "title": "About Us",
     "slug": "about",
     "status": "draft"
   }
   ```
3. **Add sections**: `POST /api/tenants/{tenantId}/pages/{pageId}/sections`
4. **Add SEO metadata**: `PUT /api/tenants/{tenantId}/pages/{pageId}/seo`
5. **Publish the page**: `PUT /api/tenants/{tenantId}/pages/{pageId}`
   ```json
   {
     "status": "published"
   }
   ```

### 3. Managing Tenant Settings

1. **Get tenant details**: `GET /api/tenants/{tenantId}`
2. **Update branding**: `PUT /api/tenants/{tenantId}/branding`
3. **Configure webhooks**: `POST /api/tenants/{tenantId}/webhooks`
4. **Create API keys**: `POST /api/tenants/{tenantId}/api-keys`

## Swagger UI vs Postman

### Use Swagger UI When:
- **Exploring the API**: First-time API discovery
- **Quick Testing**: Fast one-off requests
- **Documentation**: Share interactive docs with team
- **Public APIs**: Client-facing documentation
- **Learning**: Understanding request/response formats

### Use Postman When:
- **Complex Workflows**: Multi-step test scenarios
- **Automation**: Running test collections
- **Environment Management**: Multiple environments (dev/staging/prod)
- **Team Collaboration**: Shared workspaces
- **CI/CD Integration**: Automated testing pipelines

### Best Practice
Use both:
1. **Swagger UI** for exploration and documentation
2. **Postman** for systematic testing and automation

## Rate Limits

Rate limits are documented in the API description:

- **Anonymous**: 100 requests/hour
- **Authenticated (JWT)**: 1,000 requests/hour
- **API Keys**: 5,000 requests/hour

Monitor your rate limit status in response headers:
- `X-RateLimit-Limit`: Total requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Reset timestamp

## Troubleshooting

### Issue: "Authorize" button doesn't save token

**Solution**: Make sure to include `Bearer ` prefix:
```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Issue: 401 Unauthorized errors

**Solution**:
1. Check if your token is still valid (tokens expire)
2. Re-login to get a fresh token
3. Make sure you clicked "Authorize" after pasting the token

### Issue: CORS errors when testing

**Solution**: Swagger UI is served from the same domain, so CORS shouldn't be an issue. If you're accessing from a different origin:
- Use the hosted version at the same domain
- Or configure CORS in `next.config.js`

### Issue: Can't see request body examples

**Solution**: Click the **"Schema"** tab to see the schema, or **"Example Value"** tab to see sample data.

### Issue: 422 Validation errors

**Solution**:
1. Check the schema requirements (required fields, formats)
2. Ensure UUID fields have valid UUID format
3. Verify email format for email fields
4. Check pattern constraints (e.g., slugs must be lowercase)

## Advanced Features

### Downloading the Spec

Save the OpenAPI specification locally:
```bash
curl http://localhost:3000/api/openapi -o openapi.json
```

### Versioning

The API version is documented in the spec:
```yaml
info:
  version: 2.0.0
```

Check the version in Swagger UI at the top of the page.

### Custom Domains

If using a custom domain, update the servers in `openapi.yaml`:
```yaml
servers:
  - url: http://localhost:3000
    description: Local development
  - url: https://api.siteninja.com
    description: Production
  - url: https://api.yourcustomdomain.com
    description: Your custom domain
```

### Security Schemes

The API supports two authentication methods:

1. **Bearer Authentication** (Primary)
   - For user-based operations
   - JWT tokens from login
   - Include in header: `Authorization: Bearer <token>`

2. **API Key Authentication** (Server-to-server)
   - For service integrations
   - Created per tenant
   - Include in header: `X-API-Key: <key>`

## Additional Resources

### Documentation Files
- `README.md` - Complete setup and reference
- `POSTMAN_GUIDE.md` - Postman collection usage
- `DATABASE_SEEDING.md` - Test data generation
- `SEEDED_DATA_SUMMARY.md` - Available test data

### API Endpoints
- Landing Page: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api-docs`
- OpenAPI Spec: `http://localhost:3000/api/openapi`
- Health Check: `http://localhost:3000/api/health`

### External Resources
- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [OpenAPI Generator](https://openapi-generator.tech/)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the `README.md` for setup issues
3. Check the Postman collection for working examples
4. Contact: support@siteninja.com

---

**Version**: 2.0.0
**Last Updated**: 2025-10-19
**Maintained By**: SiteNinja Team
