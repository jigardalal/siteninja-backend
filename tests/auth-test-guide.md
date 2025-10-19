# Authentication System Testing Guide

## Prerequisites

1. Server is running: `npm run dev` (should be on http://localhost:3000)
2. Database is running and migrated
3. You have a tool like **Postman**, **Insomnia**, or **curl** ready

## Test Scenarios

### 1. Create a Test Tenant (Super Admin Required)

First, we need a tenant. Since only super_admins can create tenants, we'll need to create a super_admin user directly in the database first.

**Option A: Create super_admin via database**
```bash
# Connect to your database
docker exec -it postgres psql -U siteninja -d siteninja

# Create a super admin user
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@siteninja.com',
  '$2b$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
  'Super',
  'Admin',
  'super_admin',
  'active',
  true,
  NOW(),
  NOW()
);
```

**Option B: Generate bcrypt hash for password**
```bash
# Run this in Node.js console or create a simple script
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('Admin123!', 10).then(hash => console.log(hash));"
```

### 2. Test User Registration

**Create a tenant first (via super_admin), then register a user:**

**Request:**
```bash
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test123!",
  "firstName": "Test",
  "lastName": "User",
  "tenantId": "your-tenant-uuid-here",
  "role": "editor"
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "role": "editor",
    "status": "active",
    "tenantId": "tenant-uuid",
    "emailVerified": false,
    "tenant": {
      "id": "tenant-uuid",
      "name": "Tenant Name",
      "tenantId": "tenant-id"
    }
  },
  "message": "Account created successfully. Please verify your email.",
  "meta": {
    "timestamp": "2025-10-19T..."
  }
}
```

**Test Validations:**

❌ **Weak Password:**
```bash
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "test2@example.com",
  "password": "weak",
  "tenantId": "your-tenant-uuid-here"
}
```

Expected: 422 Validation Error

❌ **Duplicate Email:**
```bash
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test123!",
  "tenantId": "your-tenant-uuid-here"
}
```

Expected: 409 Conflict - "A user with this email already exists"

### 3. Test Login (NextAuth)

**Request:**
```bash
POST http://localhost:3000/api/auth/callback/credentials
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test123!"
}
```

**Or use NextAuth's built-in endpoints:**
```bash
POST http://localhost:3000/api/auth/signin/credentials
Content-Type: application/x-www-form-urlencoded

email=test@example.com&password=Test123!
```

**Expected Response:**
- Session cookie will be set
- Response contains user session data

**Save the session cookie for subsequent requests!**

### 4. Test Protected Endpoints

#### 4.1 Access Without Authentication

**Request:**
```bash
GET http://localhost:3000/api/users
```

**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Authentication required",
  "meta": {
    "timestamp": "2025-10-19T..."
  }
}
```

#### 4.2 Access With Authentication

**Request:**
```bash
GET http://localhost:3000/api/users
Cookie: next-auth.session-token=YOUR_SESSION_TOKEN
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "user-uuid",
        "email": "test@example.com",
        "firstName": "Test",
        "lastName": "User",
        "role": "editor",
        "status": "active",
        "tenantId": "tenant-uuid"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### 5. Test Tenant Isolation

#### 5.1 User Accesses Own Tenant

**Request:**
```bash
GET http://localhost:3000/api/tenants/YOUR_TENANT_ID
Cookie: next-auth.session-token=YOUR_SESSION_TOKEN
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "tenant-uuid",
    "name": "Your Tenant",
    "subdomain": "your-tenant",
    ...
  }
}
```

#### 5.2 User Tries to Access Another Tenant

**Request:**
```bash
GET http://localhost:3000/api/tenants/DIFFERENT_TENANT_ID
Cookie: next-auth.session-token=YOUR_SESSION_TOKEN
```

**Expected Response (403 Forbidden):**
```json
{
  "success": false,
  "error": "Access denied to this tenant",
  "meta": {
    "timestamp": "2025-10-19T..."
  }
}
```

### 6. Test Role-Based Access Control

#### 6.1 Regular User Tries to Create Tenant

**Request:**
```bash
POST http://localhost:3000/api/tenants
Cookie: next-auth.session-token=REGULAR_USER_SESSION_TOKEN
Content-Type: application/json

{
  "name": "New Tenant",
  "businessName": "New Business",
  "subdomain": "new-tenant"
}
```

**Expected Response (403 Forbidden):**
```json
{
  "success": false,
  "error": "Insufficient permissions",
  "meta": {
    "timestamp": "2025-10-19T..."
  }
}
```

#### 6.2 Super Admin Creates Tenant

**Request:**
```bash
POST http://localhost:3000/api/tenants
Cookie: next-auth.session-token=SUPER_ADMIN_SESSION_TOKEN
Content-Type: application/json

{
  "name": "New Tenant",
  "businessName": "New Business",
  "subdomain": "new-tenant"
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "new-tenant-uuid",
    "name": "New Tenant",
    "subdomain": "new-tenant",
    ...
  },
  "message": "Tenant created successfully"
}
```

### 7. Test User Profile Operations

#### 7.1 User Views Own Profile

**Request:**
```bash
GET http://localhost:3000/api/users/YOUR_USER_ID
Cookie: next-auth.session-token=YOUR_SESSION_TOKEN
```

**Expected Response (200 OK):**
User data returned

#### 7.2 User Tries to View Another User's Profile

**Request:**
```bash
GET http://localhost:3000/api/users/DIFFERENT_USER_ID
Cookie: next-auth.session-token=YOUR_SESSION_TOKEN
```

**Expected Response (403 Forbidden):**
```json
{
  "success": false,
  "error": "You can only view your own profile",
  "meta": {
    "timestamp": "2025-10-19T..."
  }
}
```

#### 7.3 User Updates Own Profile

**Request:**
```bash
PUT http://localhost:3000/api/users/YOUR_USER_ID
Cookie: next-auth.session-token=YOUR_SESSION_TOKEN
Content-Type: application/json

{
  "firstName": "Updated",
  "lastName": "Name"
}
```

**Expected Response (200 OK):**
Updated user data

### 8. Test Password Change

**Request:**
```bash
PUT http://localhost:3000/api/users/YOUR_USER_ID/password
Cookie: next-auth.session-token=YOUR_SESSION_TOKEN
Content-Type: application/json

{
  "currentPassword": "Test123!",
  "newPassword": "NewTest123!",
  "confirmPassword": "NewTest123!"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "success": true
  },
  "message": "Password changed successfully"
}
```

**Test Invalid Cases:**

❌ **Wrong Current Password:**
```json
{
  "currentPassword": "WrongPassword",
  "newPassword": "NewTest123!",
  "confirmPassword": "NewTest123!"
}
```
Expected: 401 Unauthorized

❌ **Passwords Don't Match:**
```json
{
  "currentPassword": "Test123!",
  "newPassword": "NewTest123!",
  "confirmPassword": "DifferentPassword"
}
```
Expected: 422 Validation Error

❌ **Same as Current:**
```json
{
  "currentPassword": "Test123!",
  "newPassword": "Test123!",
  "confirmPassword": "Test123!"
}
```
Expected: 422 Validation Error

### 9. Test User Deletion Restrictions

#### 9.1 User Tries to Delete Themselves

**Request:**
```bash
DELETE http://localhost:3000/api/users/YOUR_USER_ID
Cookie: next-auth.session-token=YOUR_SESSION_TOKEN
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "You cannot delete your own account",
  "meta": {
    "timestamp": "2025-10-19T..."
  }
}
```

#### 9.2 Admin Deletes Another User

**Request:**
```bash
DELETE http://localhost:3000/api/users/OTHER_USER_ID
Cookie: next-auth.session-token=ADMIN_SESSION_TOKEN
```

**Expected Response (204 No Content):**
No body, successful deletion

## Quick Test Script (Using curl)

Create a file `test-auth.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== Testing Authentication System ==="

# Test 1: Register User
echo -e "\n1. Testing User Registration..."
curl -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User",
    "tenantId": "PUT_TENANT_ID_HERE"
  }' | jq .

# Test 2: Register with Weak Password (should fail)
echo -e "\n2. Testing Weak Password Validation..."
curl -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser2@example.com",
    "password": "weak",
    "tenantId": "PUT_TENANT_ID_HERE"
  }' | jq .

# Test 3: Access Protected Endpoint Without Auth (should fail)
echo -e "\n3. Testing Protected Endpoint Without Auth..."
curl -X GET "$BASE_URL/api/users" | jq .

# Test 4: Health Check (should work)
echo -e "\n4. Testing Public Health Check..."
curl -X GET "$BASE_URL/api/health" | jq .

echo -e "\n=== Tests Complete ==="
```

Make it executable:
```bash
chmod +x test-auth.sh
./test-auth.sh
```

## Testing Checklist

Use this checklist to verify all functionality:

### Authentication
- [ ] User can register with valid credentials
- [ ] Registration fails with weak password
- [ ] Registration fails with duplicate email
- [ ] User can login with correct credentials
- [ ] Login fails with incorrect credentials
- [ ] Session cookie is set after login

### Authorization
- [ ] Unauthenticated requests to protected endpoints return 401
- [ ] Authenticated requests to protected endpoints succeed
- [ ] Users can only access their own tenant's data
- [ ] Super admins can access all tenants
- [ ] Regular users cannot create tenants
- [ ] Super admins can create tenants

### User Management
- [ ] Users can view their own profile
- [ ] Users cannot view other users' profiles
- [ ] Users can update their own profile
- [ ] Users cannot update other users' profiles
- [ ] Admins can view/update any user in their tenant
- [ ] Users can change their own password
- [ ] Users cannot change other users' passwords
- [ ] Users cannot delete themselves
- [ ] Admins can delete other users

### Data Validation
- [ ] Password strength validation works
- [ ] Email format validation works
- [ ] Required fields are enforced
- [ ] Invalid UUIDs are rejected

## Troubleshooting

### "Authentication required" on all endpoints
- Check that session cookie is being sent
- Verify JWT secret in .env matches
- Check that user exists in database

### "Access denied to this tenant"
- Verify user's tenantId matches the tenant being accessed
- Check if user should be a super_admin

### "Invalid credentials" on login
- Verify password was hashed correctly in database
- Check bcrypt version compatibility
- Verify email exists in database

## Next Steps After Testing

Once all tests pass:
1. ✅ Mark Phase 1 as production-ready
2. 🔄 Restart Claude Code for Archon integration
3. ▶️ Continue with Phase 2: Validation & Error Handling

---

**Happy Testing!** 🧪
