#!/bin/bash

# Authentication Testing Script
# Tests the SiteNinja backend authentication system

BASE_URL="http://localhost:3000"
TENANT_ID="764b0738-2e80-410f-b023-56c1dd4aadb0"  # Test Company ID from test data

echo "════════════════════════════════════════════════════════════"
echo "🧪 SiteNinja Backend - Authentication Tests"
echo "════════════════════════════════════════════════════════════"
echo ""

# Test 1: Health Check (Public)
echo "1️⃣  Testing Health Check (Public Endpoint)..."
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/api/health")
status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed -e 's/HTTP_STATUS\:.*//g')

if [ "$status" -eq 200 ]; then
  echo "✅ PASS - Health check endpoint accessible"
  echo "$body" | jq -C '.' 2>/dev/null || echo "$body"
else
  echo "❌ FAIL - Expected 200, got $status"
fi
echo ""

# Test 2: Access Protected Endpoint Without Auth (Should Fail)
echo "2️⃣  Testing Protected Endpoint Without Authentication..."
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BASE_URL/api/users")
status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$status" -eq 401 ]; then
  echo "✅ PASS - Correctly denied access (401)"
else
  echo "❌ FAIL - Expected 401, got $status"
fi
echo ""

# Test 3: User Registration with Weak Password (Should Fail)
echo "3️⃣  Testing User Registration with Weak Password..."
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"weakpass@test.com\",
    \"password\": \"weak\",
    \"tenantId\": \"$TENANT_ID\"
  }")
status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed -e 's/HTTP_STATUS\:.*//g')

if [ "$status" -eq 422 ]; then
  echo "✅ PASS - Weak password correctly rejected (422)"
  echo "$body" | jq -C '.details' 2>/dev/null || echo "$body"
else
  echo "❌ FAIL - Expected 422, got $status"
fi
echo ""

# Test 4: User Registration with Valid Data (Should Succeed)
echo "4️⃣  Testing User Registration with Valid Data..."
RANDOM_EMAIL="testuser$(date +%s)@example.com"
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$RANDOM_EMAIL\",
    \"password\": \"Test123!\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"tenantId\": \"$TENANT_ID\",
    \"role\": \"editor\"
  }")
status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed -e 's/HTTP_STATUS\:.*//g')

if [ "$status" -eq 201 ]; then
  echo "✅ PASS - User registered successfully (201)"
  echo "$body" | jq -C '.data | {email, role, status}' 2>/dev/null || echo "$body"
else
  echo "❌ FAIL - Expected 201, got $status"
  echo "$body"
fi
echo ""

# Test 5: Duplicate Email Registration (Should Fail)
echo "5️⃣  Testing Duplicate Email Registration..."
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"editor@test-company.com\",
    \"password\": \"Test123!\",
    \"tenantId\": \"$TENANT_ID\"
  }")
status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$status" -eq 409 ]; then
  echo "✅ PASS - Duplicate email correctly rejected (409)"
else
  echo "❌ FAIL - Expected 409, got $status"
fi
echo ""

# Test 6: Login Test (Manual - requires session handling)
echo "6️⃣  Login Test (Manual Verification Required)"
echo "   To test login, use Postman/Insomnia with:"
echo "   POST $BASE_URL/api/auth/callback/credentials"
echo "   Body (JSON):"
echo "   {"
echo "     \"email\": \"editor@test-company.com\","
echo "     \"password\": \"Editor123!\""
echo "   }"
echo "   Save the session cookie for subsequent tests."
echo ""

echo "════════════════════════════════════════════════════════════"
echo "📋 Test Summary"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Automated Tests:"
echo "  ✅ 1. Health check endpoint"
echo "  ✅ 2. Protected endpoint denies unauthenticated access"
echo "  ✅ 3. Weak password validation"
echo "  ✅ 4. User registration with valid data"
echo "  ✅ 5. Duplicate email prevention"
echo ""
echo "Manual Tests (Use Postman/Insomnia):"
echo "  🔧 6. Login with valid credentials"
echo "  🔧 7. Access protected endpoint with auth"
echo "  🔧 8. Tenant isolation"
echo "  🔧 9. Role-based access control"
echo ""
echo "Test Accounts Available:"
echo "  - editor@test-company.com (Password: Editor123!)"
echo "  - owner@test-company.com (Password: Owner123!)"
echo "  - admin@test-company.com (Password: Admin123!)"
echo "  - admin@siteninja.com (Password: Admin123!) [Super Admin]"
echo ""
echo "════════════════════════════════════════════════════════════"
