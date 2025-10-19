# Seeded Data Summary

## Overview
Your database has been populated with realistic, production-ready test data for 3 different business types.

## Quick Access Credentials

**Password for all users:** `Password123!`

| Role | Email | Tenant | Access Level |
|------|-------|--------|--------------|
| Super Admin | admin@siteninja.com | All tenants | Full system access |
| Owner | marco@bellaitalia.com | Bella Italia | Full tenant access |
| Editor | sofia@bellaitalia.com | Bella Italia | Content editing |
| Owner | sarah@techflow.io | TechFlow | Full tenant access |
| Admin | david@techflow.io | TechFlow | Tenant administration |
| Owner | maya@greenleafspa.com | Green Leaf Spa | Full tenant access |

## Tenants Created

### 1. 🍝 Bella Italia (Italian Restaurant)
- **ID**: `bellaitalia-[random]`
- **Subdomain**: bellaitalia.siteninja.com
- **Business Type**: restaurant
- **Status**: Active (Pro Plan)
- **Theme Colors**: Red (#C8102E), Green (#009246), Gold (#F4C430)
- **Font**: Playfair Display (Italian elegance)

**Pages:**
- Home page with hero section, features, and gallery
- Menu page with Antipasti and Pasta categories

**Content Highlights:**
- Business hours: Mon-Thu 11am-10pm, Fri 11am-11pm, Sat 10am-11pm, Sun 10am-9pm
- Menu items with prices (Bruschetta $8.99, Spaghetti Carbonara $16.99, etc.)
- 3 featured items: Fresh Ingredients, Expert Chefs, Cozy Atmosphere

**Navigation:**
- Home, Menu, About, Contact

**Users:**
- Marco Rossi (Owner)
- Sofia Romano (Editor)

### 2. 💻 TechFlow Solutions (Software Company)
- **ID**: `techflow-[random]`
- **Subdomain**: techflow.siteninja.com
- **Business Type**: technology
- **Status**: Active (Business Plan)
- **Theme Colors**: Indigo (#6366F1), Purple (#8B5CF6), Pink (#EC4899)
- **Font**: Inter, Space Grotesk (Modern tech aesthetic)

**Pages:**
- Home page with hero and services sections

**Content Highlights:**
- Services: Custom Development, Cloud Migration, AI Integration, 24/7 Support
- Professional tech startup branding
- Clean, modern design aesthetic

**Navigation:**
- Home, Services, Portfolio, Blog, Contact

**Users:**
- Sarah Chen (Owner)
- David Park (Admin)

### 3. 🌿 Green Leaf Spa (Wellness Center)
- **ID**: `greenleaf-[random]`
- **Subdomain**: greenleaf.siteninja.com
- **Business Type**: wellness
- **Status**: Trial (14-day trial active)
- **Theme Colors**: Green (#10B981), Darker Green (#059669), Amber (#F59E0B)
- **Font**: Lora, Montserrat (Calming wellness style)

**Pages:**
- Home page with hero and treatments sections

**Content Highlights:**
- Business hours: Mon-Thu 9am-8pm, Fri 9am-9pm, Sat 8am-9pm, Sun 10am-6pm
- Treatments: Massage Therapy, Facial Treatments, Body Wraps, Aromatherapy
- Peaceful, rejuvenating atmosphere

**Navigation:**
- Home, Treatments, Packages, Book Online

**Users:**
- Maya Patel (Owner)

## Templates Available

### 1. Modern Restaurant Template
- Category: restaurant
- Industry: food_beverage
- Default branding: Italian theme (red, green, gold)
- Sections: Hero, Menu, Gallery, Contact

### 2. SaaS Landing Page Template
- Category: technology
- Industry: software
- Default branding: Modern tech (purple, indigo)
- Sections: Hero, Features, Pricing, Testimonials, CTA

### 3. Wellness Center Template
- Category: wellness
- Industry: health_wellness
- Default branding: Calming green theme
- Sections: Hero, Services, Testimonials, Booking

## Webhooks Configured

### Bella Italia Webhook
- URL: https://webhook.site/bella-italia
- Events: page.published, page.unpublished
- Secret: bella-webhook-secret-key
- Status: Active

### TechFlow Webhook
- URL: https://webhook.site/techflow
- Events: user.created, user.updated
- Secret: techflow-webhook-secret
- Status: Active

## Testing with Postman

### Step 1: Import the Collection
Import `postman_collection.json` into Postman.

### Step 2: Login as Super Admin
```
POST /api/auth/callback/credentials
{
  "email": "admin@siteninja.com",
  "password": "Password123!"
}
```

### Step 3: Test Endpoints

**Get all tenants:**
```
GET /api/tenants
```

**Get Bella Italia details:**
```
GET /api/tenants/{bella-italia-id}
```

**Get Bella Italia pages:**
```
GET /api/tenants/{bella-italia-id}/pages
```

**Get menu page by slug:**
```
GET /api/tenants/{bella-italia-id}/pages/slug/menu
```

**Get branding:**
```
GET /api/tenants/{bella-italia-id}/branding
```

### Step 4: Login as Tenant Owner
```
POST /api/auth/callback/credentials
{
  "email": "marco@bellaitalia.com",
  "password": "Password123!"
}
```

Now you can test tenant-specific operations.

## Database Statistics

- **Tenants**: 3
- **Users**: 7 (1 super admin + 6 tenant users)
- **Pages**: 4 (with multiple sections each)
- **Sections**: 9 total
- **Templates**: 3
- **Navigation Items**: 13 total
- **Webhooks**: 2
- **Branding Configs**: 3
- **Subscriptions**: 3
- **Domain Lookups**: 3
- **SEO Metadata**: 3

## Data Structure Examples

### Tenant Object
```json
{
  "id": "uuid",
  "tenantId": "bellaitalia-abc123",
  "name": "Bella Italia",
  "subdomain": "bellaitalia",
  "businessType": "restaurant",
  "status": "active",
  "contactEmail": "info@bellaitalia.com",
  "businessHours": {
    "monday": { "open": "11:00", "close": "22:00" }
  }
}
```

### Page with Sections
```json
{
  "id": "uuid",
  "title": "Menu",
  "slug": "menu",
  "status": "published",
  "sections": [
    {
      "type": "menu",
      "content": {
        "categories": [
          {
            "name": "Pasta",
            "items": [
              {
                "name": "Spaghetti Carbonara",
                "price": 16.99
              }
            ]
          }
        ]
      }
    }
  ]
}
```

### Branding Object
```json
{
  "primaryColor": "#C8102E",
  "secondaryColor": "#009246",
  "fontFamily": "Playfair Display, serif",
  "logoUrl": "/uploads/bellaitalia/logo.png"
}
```

## Using the Data in Your UI

### 1. Tenant Switcher
Build a tenant switcher using the GET /api/tenants endpoint. Display:
- Tenant name
- Business type
- Status (active/trial)
- Branding colors

### 2. Page Builder
Load pages and sections dynamically:
```javascript
// Get pages for current tenant
const pages = await fetch(`/api/tenants/${tenantId}/pages`);

// Get sections for a page
const sections = await fetch(`/api/tenants/${tenantId}/pages/${pageId}/sections`);
```

### 3. Apply Branding
Use the branding API to style your UI:
```javascript
const branding = await fetch(`/api/tenants/${tenantId}/branding`);

// Apply colors
document.documentElement.style.setProperty('--primary-color', branding.primaryColor);
document.documentElement.style.setProperty('--font-family', branding.fontFamily);
```

### 4. Section Rendering
Each section has a `type` and `content` object. Render based on type:
```javascript
switch (section.type) {
  case 'hero':
    return <HeroSection content={section.content} />;
  case 'features':
    return <FeaturesSection content={section.content} />;
  case 'menu':
    return <MenuSection content={section.content} />;
  // ... etc
}
```

## Resetting the Data

To reset and reseed the database:

```bash
# Option 1: Run seed command (clears data first)
npm run db:seed

# Option 2: Reset migrations and seed
npx prisma migrate reset
```

## Next Steps

1. **Test all endpoints** using the Postman collection
2. **Build your UI** using the realistic data structure
3. **Add more tenants** by modifying `prisma/seed.ts` if needed
4. **Test with different roles** to verify permissions
5. **Check webhook deliveries** at webhook.site URLs

## Notes

- All placeholder image URLs reference `/uploads/[tenant]/` paths
- Dates are set relative to the current date
- All passwords are identical for easy testing
- Domain lookups are pre-verified for convenience
- Webhooks point to webhook.site for easy testing

## Production Considerations

⚠️ **Before deploying to production:**

1. **Remove the seed script** or disable it
2. **Change all passwords** to secure values
3. **Set up real domain verification**
4. **Configure actual webhook endpoints**
5. **Set proper subscription plans and billing**
6. **Enable email verification**
7. **Set up proper file storage** (not placeholder URLs)

---

**Happy Testing!** 🎉

All the data is ready to use with your Postman collection and UI application.
