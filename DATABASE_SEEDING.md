# Database Seeding Guide

## Overview

The seed script populates your database with realistic test data including multiple tenants, users, pages, and content. This is perfect for testing the API and building the UI application.

## What's Included

### 3 Complete Tenants

#### 1. 🍝 Bella Italia (Restaurant)
- **Subdomain**: `bellaitalia.siteninja.com`
- **Business Type**: Restaurant
- **Status**: Active (Pro Plan)
- **Features**:
  - Italian-themed branding (Red, Green, Gold)
  - Complete menu page with categories
  - Photo gallery section
  - Business hours configured
  - 2 users (Owner + Editor)

#### 2. 💻 TechFlow Solutions (Tech Startup)
- **Subdomain**: `techflow.siteninja.com`
- **Business Type**: Technology
- **Status**: Active (Business Plan)
- **Features**:
  - Modern tech branding (Purple, Indigo)
  - Service offerings
  - Clean, professional design
  - 2 users (Owner + Admin)

#### 3. 🌿 Green Leaf Spa (Wellness Center)
- **Subdomain**: `greenleaf.siteninja.com`
- **Business Type**: Wellness
- **Status**: Trial (14-day trial)
- **Features**:
  - Calming green branding
  - Wellness treatments
  - Booking-focused design
  - 1 user (Owner)

### Users Created

All users have the password: **Password123!**

| Email | Name | Tenant | Role |
|-------|------|--------|------|
| admin@siteninja.com | Admin User | - | super_admin |
| marco@bellaitalia.com | Marco Rossi | Bella Italia | owner |
| sofia@bellaitalia.com | Sofia Romano | Bella Italia | editor |
| sarah@techflow.io | Sarah Chen | TechFlow | owner |
| david@techflow.io | David Park | TechFlow | admin |
| maya@greenleafspa.com | Maya Patel | Green Leaf | owner |

### Templates (3)
- Modern Restaurant
- SaaS Landing Page
- Wellness Center

### Pages & Sections
Each tenant has:
- Home page with hero section
- Feature/service sections
- SEO metadata
- Navigation menu
- Custom branding

### Additional Data
- Webhooks (2 sample webhooks)
- Domain lookups for all tenants
- Subscription plans
- Branding configurations

## How to Run

### First Time Setup

1. **Ensure your database is running**
   ```bash
   # Database should be configured in .env
   ```

2. **Run migrations**
   ```bash
   npm run prisma:migrate
   ```

3. **Seed the database**
   ```bash
   npm run db:seed
   ```
   or
   ```bash
   npx prisma db seed
   ```

### Reset and Reseed

If you want to start fresh:

```bash
# Reset database (WARNING: Deletes all data!)
npx prisma migrate reset

# This will automatically run the seed script after reset
```

Or manually:

```bash
# Push schema without migrations
npx prisma db push --force-reset

# Then seed
npm run db:seed
```

## Expected Output

When seeding completes successfully, you'll see:

```
🌱 Starting database seeding...

🗑️  Clearing existing data...
✅ Cleared existing data

🍝 Creating Bella Italia Restaurant...
✅ Bella Italia created

💻 Creating TechFlow Solutions...
✅ TechFlow Solutions created

🌿 Creating Green Leaf Spa...
✅ Green Leaf Spa created

👤 Creating super admin...
✅ Super admin created

📄 Creating templates...
✅ Templates created

🔗 Creating sample webhooks...
✅ Webhooks created

🎉 Seeding completed!

📊 Summary:
   - 3 Tenants created
   - 6 Users created (+ 1 super admin)
   - 4 Pages with sections
   - 3 Templates
   - 2 Webhooks

🔐 All users have the password: Password123!

📧 User accounts:
   Super Admin: admin@siteninja.com
   Bella Italia Owner: marco@bellaitalia.com
   Bella Italia Editor: sofia@bellaitalia.com
   TechFlow Owner: sarah@techflow.io
   TechFlow Admin: david@techflow.io
   Green Leaf Owner: maya@greenleafspa.com

🌐 Tenant subdomains:
   - bellaitalia.siteninja.com
   - techflow.siteninja.com
   - greenleaf.siteninja.com
```

## Testing with Postman

After seeding, you can test with Postman:

### 1. Login as Super Admin
```
POST /api/auth/callback/credentials
Body: {
  "email": "admin@siteninja.com",
  "password": "Password123!"
}
```

### 2. List All Tenants
```
GET /api/tenants
```
You should see all 3 tenants.

### 3. Login as Tenant Owner
```
POST /api/auth/callback/credentials
Body: {
  "email": "marco@bellaitalia.com",
  "password": "Password123!"
}
```

### 4. Get Tenant Pages
```
GET /api/tenants/{bella-italia-id}/pages
```

### 5. View Bella Italia's Menu
```
GET /api/tenants/{bella-italia-id}/pages/slug/menu
```

## Customizing the Seed Data

Edit `prisma/seed.ts` to:

- Add more tenants
- Change branding colors
- Add more pages and sections
- Modify menu items or content
- Add more users with different roles
- Create custom templates

### Example: Adding a New Tenant

```typescript
const newTenant = await prisma.tenant.create({
  data: {
    name: 'Your Business Name',
    businessName: 'Your Business Legal Name',
    subdomain: 'yourbusiness',
    businessType: 'retail', // or restaurant, technology, wellness, etc.
    description: 'Your business description',
    contactEmail: 'contact@yourbusiness.com',
    contactPhone: '+1-555-0123',
    status: 'active',
  },
});
```

## Data Structure

### Tenant Structure
Each tenant includes:
- Basic information (name, subdomain, business type)
- Branding settings (colors, fonts, logo)
- Subscription details
- Domain lookup entries
- Navigation items
- At least one user (owner)
- One or more pages with sections

### Page Structure
Pages include:
- Title and slug
- Content (HTML)
- Status (draft/published)
- SEO metadata
- Multiple sections (hero, features, gallery, etc.)

### Section Types
- `hero` - Large banner with heading and CTA
- `features` - Grid of feature items
- `gallery` - Image gallery
- `menu` - Menu items (for restaurants)
- `services` - Service listings
- `contact` - Contact information
- `cta` - Call to action
- `testimonials` - Customer reviews
- `pricing` - Pricing tables
- `booking` - Appointment booking

## Troubleshooting

### Error: "Table does not exist"
Run migrations first:
```bash
npm run prisma:migrate
```

### Error: "Unique constraint failed"
The seed script tries to clear all data first. If this fails, reset the database:
```bash
npx prisma migrate reset
```

### Error: "Cannot read property of undefined"
Make sure all required environment variables are set in `.env`:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

### Seed Script Hangs
Check your database connection. The script should complete in under 10 seconds.

## Integration with UI

The seeded data is ready for your UI application:

### Tenant Selection
Display all tenants and let users switch between them:
```javascript
// Fetch tenants
GET /api/tenants

// Each tenant has:
// - id, name, subdomain
// - branding (colors, fonts, logo)
// - subscription status
```

### Page Builder
Load pages and sections for editing:
```javascript
// Get all pages for a tenant
GET /api/tenants/{tenantId}/pages

// Get sections for a page
GET /api/tenants/{tenantId}/pages/{pageId}/sections

// Each section has:
// - type (hero, features, etc.)
// - content (JSON with section-specific data)
// - order (for positioning)
```

### Preview Mode
Use the slug to preview pages:
```javascript
GET /api/tenants/{tenantId}/pages/slug/{slug}
```

### Branding
Apply tenant branding in your UI:
```javascript
GET /api/tenants/{tenantId}/branding

// Returns:
// - primaryColor, secondaryColor, accentColor
// - fontFamily, headingFont
// - logo URL
```

## Next Steps

1. **Seed the database** with `npm run db:seed`
2. **Import Postman collection** from `postman_collection.json`
3. **Test endpoints** using the seeded data
4. **Build your UI** using the realistic data structure
5. **Add more seed data** as needed for specific features

## Notes

- All users share the same password for testing convenience
- The seed script is idempotent (clears data before seeding)
- Images referenced in seed data are placeholder URLs
- Webhook URLs point to webhook.site (for testing)
- All dates are set relative to the current date

## Production Considerations

⚠️ **DO NOT run the seed script in production!**

The seed script:
- Deletes all existing data
- Creates test accounts with known passwords
- Is designed for development/testing only

For production:
- Use migrations only (`npx prisma migrate deploy`)
- Create users through the registration API
- Set strong, unique passwords
- Configure proper domain names
- Set up real webhook endpoints
