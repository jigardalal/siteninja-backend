# Persona-Based Testing Guide

## Overview

The SiteNinja Backend API now includes **persona-based Postman environments** that make testing super easy! Each persona has pre-configured credentials and auto-login functionality.

## Available Personas

### 1. **Super Admin** (`admin@siteninja.com`)
- **Full access** to all API endpoints
- Can create/delete tenants
- Can access all tenants' data
- Can manage global templates
- **Environment File**: `postman_environment_super_admin.json`

### 2. **Restaurant Owner - Marco** (`marco@bellaitalia.com`)
- Owner of "Bella Italia" restaurant
- Full control over restaurant tenant
- Can manage pages, sections, branding
- Can create webhooks and API keys
- **Environment File**: `postman_environment_restaurant_owner.json`

### 3. **Tech Startup Owner - Sarah** (`sarah@techflow.io`)
- Owner of "TechFlow Solutions" tech startup
- Full control over tech startup tenant
- Can manage all aspects of their tenant
- Cannot access other tenants
- **Environment File**: `postman_environment_tech_owner.json`

## Setup Instructions

### Step 1: Import Environments

1. Open Postman
2. Click **Environments** in the left sidebar
3. Click **Import**
4. Select all three environment files:
   - `postman_environment_super_admin.json`
   - `postman_environment_restaurant_owner.json`
   - `postman_environment_tech_owner.json`
5. Click **Import**

### Step 2: Import Collection

1. Click **Collections** in the left sidebar
2. Click **Import**
3. Select `postman_collection.json`
4. Click **Import**

### Step 3: Select a Persona

1. In the top-right corner, click the environment dropdown
2. Select one of the personas:
   - **SiteNinja - Super Admin**
   - **SiteNinja - Restaurant Owner (Marco)**
   - **SiteNinja - Tech Startup Owner (Sarah)**

### Step 4: Auto-Login

1. Expand the **Authentication** folder in the collection
2. Run the **"Login (Auto from Environment)"** request
3. The JWT token is **automatically saved** to your environment
4. All subsequent requests will use this token automatically!

## Quick Start

### Testing as Restaurant Owner

1. **Select Environment**: "SiteNinja - Restaurant Owner (Marco)"
2. **Run Login**: Authentication → Login (Auto from Environment)
3. **Test Endpoints**:
   - Get my tenant: `GET /api/tenants/{{tenant_id}}`
   - List my pages: `GET /api/tenants/{{tenant_id}}/pages`
   - Create a page: `POST /api/tenants/{{tenant_id}}/pages`

### Testing as Super Admin

1. **Select Environment**: "SiteNinja - Super Admin"
2. **Run Login**: Authentication → Login (Auto from Environment)
3. **Test Admin Endpoints**:
   - List all tenants: `GET /api/tenants`
   - Create a tenant: `POST /api/tenants`
   - View all audit logs: `GET /api/audit`

### Testing as Tech Startup Owner

1. **Select Environment**: "SiteNinja - Tech Startup Owner (Sarah)"
2. **Run Login**: Authentication → Login (Auto from Environment)
3. **Test Endpoints**:
   - Get my tenant: `GET /api/tenants/{{tenant_id}}`
   - Update branding: `PUT /api/tenants/{{tenant_id}}/branding`
   - Create webhook: `POST /api/tenants/{{tenant_id}}/webhooks`

## Environment Variables

Each environment includes:

### Pre-configured (No setup needed!)
- `base_url`: `http://localhost:3021`
- `email`: Pre-set for each persona
- `password`: `Password123!` (hidden/secret)
- `persona`: Identifier for the persona

### Auto-populated (Set automatically after login)
- `jwt_token`: JWT authentication token (secret)
- `user_id`: Current user's ID
- `tenant_id`: Current user's tenant ID

### Auto-populated (Set by requests)
- `page_id`: Last created/accessed page ID
- `section_id`: Last created/accessed section ID
- `asset_id`: Last created/accessed asset ID
- `template_id`: Last created/accessed template ID
- `webhook_id`: Last created/accessed webhook ID
- `api_key_id`: Last created/accessed API key ID

## How Auto-Login Works

The updated login request:

```json
{
  "email": "{{email}}",
  "password": "{{password}}"
}
```

With a test script that:
1. Extracts the JWT token from the response
2. Saves it to `jwt_token` environment variable
3. Extracts user info and saves `user_id` and `tenant_id`

**Result**: All subsequent requests automatically use the correct token and IDs!

## Switching Between Personas

Just change the environment in the top-right dropdown:

1. **Click** the environment dropdown
2. **Select** a different persona
3. **Run** the login request again
4. **Done!** All requests now use the new persona's credentials

## Testing Scenarios

### Scenario 1: Multi-Tenant Isolation

Test that tenants can't access each other's data:

1. **Login as Marco** (Restaurant Owner)
2. Note the `tenant_id` (Bella Italia)
3. **Try to access Sarah's tenant**: `GET /api/tenants/{sarah-tenant-id}`
4. **Expected**: 403 Forbidden ❌

### Scenario 2: Role-Based Permissions

Test super admin privileges:

1. **Login as Marco** (Restaurant Owner)
2. **Try to list all tenants**: `GET /api/tenants`
3. **Expected**: 403 Forbidden ❌
4. **Login as Admin** (Super Admin)
5. **Try again**: `GET /api/tenants`
6. **Expected**: 200 Success ✅

### Scenario 3: AI Features

Test AI content enhancement:

1. **Login as Marco**
2. Run: `POST /api/ai/enhance`
   ```json
   {
     "content": "We make authentic Italian pizza",
     "tenantId": "{{tenant_id}}",
     "tone": "professional"
   }
   ```
3. **Result**: Enhanced content returned!

## Pro Tips

### Tip 1: Run Multiple Personas Simultaneously

Postman allows multiple windows:
1. Open multiple Postman windows
2. Each can use a different environment
3. Test cross-tenant scenarios side-by-side

### Tip 2: Monitor Variables

View current variable values:
1. Click the **eye icon** (👁️) in top-right
2. See all current environment variables
3. Monitor `tenant_id`, `jwt_token`, etc.

### Tip 3: Quick Token Refresh

If your token expires:
1. Just run the login request again
2. No need to change anything
3. Token is automatically updated

### Tip 4: Use Test Scripts

Many requests auto-populate IDs:
- Create Tenant → Sets `tenant_id`
- Create Page → Sets `page_id`
- Create Section → Sets `section_id`

**Result**: You can run a series of requests without manual copying!

### Tip 5: Save Custom Variables

Add your own variables to environments:
1. Go to Environments
2. Select an environment
3. Add custom variables (e.g., `custom_domain`, `api_key`)

## Common Workflows

### Create a Complete Restaurant Website

**As Marco (Restaurant Owner):**

1. ✅ **Login**: Run Authentication → Login (Auto)
2. ✅ **Create Home Page**:
   ```
   POST /api/tenants/{{tenant_id}}/pages
   {
     "title": "Home",
     "slug": "home",
     "status": "published"
   }
   ```
3. ✅ **Add Hero Section**:
   ```
   POST /api/tenants/{{tenant_id}}/pages/{{page_id}}/sections
   {
     "type": "hero",
     "content": {"heading": "Welcome to Bella Italia"}
   }
   ```
4. ✅ **Add SEO**:
   ```
   PUT /api/tenants/{{tenant_id}}/pages/{{page_id}}/seo
   {
     "metaTitle": "Bella Italia - Authentic Italian Restaurant",
     "metaDescription": "Best Italian food in town"
   }
   ```
5. ✅ **Update Branding**:
   ```
   PUT /api/tenants/{{tenant_id}}/branding
   {
     "primaryColor": "#C41E3A",
     "fontFamily": "Georgia"
   }
   ```

### Setup Webhooks for External Integration

**As Sarah (Tech Owner):**

1. ✅ **Login**
2. ✅ **Create Webhook**:
   ```
   POST /api/tenants/{{tenant_id}}/webhooks
   {
     "url": "https://your-app.com/webhook",
     "events": ["page.published", "page.updated"],
     "secret": "your-secret-key"
   }
   ```
3. ✅ **Test Webhook**:
   ```
   POST /api/tenants/{{tenant_id}}/webhooks/{{webhook_id}}/test
   ```

### AI-Powered Content Creation

**As Any Persona:**

1. ✅ **Login**
2. ✅ **Generate Content Ideas**:
   ```
   POST /api/ai/ideas
   {
     "tenantId": "{{tenant_id}}",
     "count": 5,
     "businessType": "{{business_type}}"
   }
   ```
3. ✅ **Enhance Content**:
   ```
   POST /api/ai/enhance
   {
     "content": "Original text...",
     "tenantId": "{{tenant_id}}",
     "tone": "professional"
   }
   ```
4. ✅ **Generate SEO**:
   ```
   POST /api/ai/seo
   {
     "content": "Page content...",
     "currentTitle": "Page Title",
     "tenantId": "{{tenant_id}}"
   }
   ```

## Troubleshooting

### Issue: "401 Unauthorized"

**Solution**: Token expired or not set
1. Run the login request again
2. Check that environment is selected (top-right)
3. Verify `jwt_token` variable is set (eye icon)

### Issue: "403 Forbidden"

**Solution**: Insufficient permissions
1. Check which persona you're using
2. Verify the endpoint requires the correct role
3. Use Super Admin for admin-only endpoints

### Issue: Variables not populating

**Solution**: Ensure environment is selected
1. Check top-right corner shows environment name
2. If "(No Environment)", select one
3. Re-run login request

### Issue: "Tenant not found"

**Solution**: Run database seed
```bash
npm run db:seed
```

This creates all test tenants and users.

## Credentials Reference

### All Passwords
All personas use the same password: **`Password123!`**

### Email Addresses
- **Super Admin**: `admin@siteninja.com`
- **Restaurant Owner**: `marco@bellaitalia.com`
- **Tech Owner**: `sarah@techflow.io`

### Tenant IDs
These are auto-populated after login, but for reference:
- **Bella Italia**: Set automatically to `tenant_id` after Marco logs in
- **TechFlow**: Set automatically to `tenant_id` after Sarah logs in

## API Coverage

All 70+ endpoints work with persona environments:

- ✅ Authentication (2 endpoints)
- ✅ Tenants (6 endpoints)
- ✅ Users (6 endpoints)
- ✅ Pages (6 endpoints)
- ✅ Sections (6 endpoints)
- ✅ SEO (2 endpoints)
- ✅ Navigation (5 endpoints)
- ✅ Branding (2 endpoints)
- ✅ Subscription (2 endpoints)
- ✅ Assets (5 endpoints)
- ✅ Templates (6 endpoints)
- ✅ Webhooks (5 endpoints)
- ✅ API Keys (3 endpoints)
- ✅ Audit Logs (2 endpoints)
- ✅ AI Features (5 endpoints)

## Next Steps

1. **Import all environments**
2. **Import the collection**
3. **Select a persona**
4. **Run login**
5. **Start testing!**

---

**Happy Testing! 🚀**

For more details, see:
- `README.md` - Full API documentation
- `POSTMAN_GUIDE.md` - General Postman guide
- `AI_INTEGRATION_GUIDE.md` - AI features guide
