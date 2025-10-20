# AI Integration Guide

## Overview

SiteNinja Backend now includes AI-powered content enhancement using OpenAI's GPT models. The integration is designed with a Pydantic-AI-inspired architecture, providing structured outputs and easy model switching.

## Features

### 1. **Content Enhancement** (`POST /api/ai/enhance`)
Enhance any content with AI while maintaining its core message.

**Capabilities:**
- Improve clarity, engagement, and readability
- Adjust tone (professional, casual, friendly, formal, creative)
- Control length (shorter, longer, similar)
- Apply custom focus areas
- Returns structured output with improvements list

### 2. **SEO Metadata Generation** (`POST /api/ai/seo`)
Generate optimized SEO metadata for your content.

**Capabilities:**
- Generate SEO-optimized meta titles (max 60 chars)
- Create compelling meta descriptions (max 160 chars)
- Suggest relevant keywords
- Provide actionable SEO improvement suggestions

### 3. **Content Ideas** (`POST /api/ai/ideas`)
Generate creative content ideas for your business.

**Capabilities:**
- Generate multiple unique content ideas
- Customize by business type and topic
- Get diverse content categories
- Receive actionable, specific suggestions

### 4. **Custom Rewriting** (`POST /api/ai/rewrite`)
Rewrite content with your own custom instructions.

**Capabilities:**
- Flexible content transformation
- Custom instruction support
- Maintain quality and coherence
- Perfect for specific use cases

### 5. **Model Management** (`GET /api/ai/models`)
View and manage available AI models.

**Capabilities:**
- List all available models
- View current default model
- Get model descriptions and capabilities

## Setup

### 1. Environment Variables

Add your OpenAI API key to `.env`:

```bash
# OpenAI Configuration
OPENAI_API_KEY="sk-your-api-key-here"
AI_MODEL="gpt-4o-mini"  # Default model
AI_TEMPERATURE="0.7"    # Creativity level (0.0-1.0)
```

**Get your API key:**
1. Visit https://platform.openai.com/api-keys
2. Create a new API key
3. Copy and paste into `.env`

### 2. Available Models

You can use any of these models (configurable via `AI_MODEL` or per-request):

- **gpt-4o** - Most capable model, best for complex tasks
- **gpt-4o-mini** - Fast and affordable (recommended default)
- **gpt-4-turbo** - High performance, balanced
- **gpt-4** - Previous generation flagship
- **gpt-3.5-turbo** - Fast and cost-effective

### 3. Temperature Settings

Control creativity/determinism with `AI_TEMPERATURE`:

- **0.0-0.3**: Deterministic, factual, consistent
- **0.4-0.7**: Balanced (recommended for most use cases)
- **0.8-1.0**: Creative, varied, exploratory

## API Usage

### Content Enhancement

```bash
POST /api/ai/enhance
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "content": "Our restaurant serves delicious food. We have many options.",
  "tenantId": "your-tenant-id",
  "tone": "professional",
  "length": "longer",
  "focus": "make it more engaging and descriptive",
  "model": "gpt-4o-mini"  // Optional: override default model
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "original": "Our restaurant serves delicious food...",
    "enhanced": "Experience culinary excellence at our restaurant...",
    "metadata": {
      "tone": "professional",
      "improvements": [
        "Enhanced descriptive language",
        "Added sensory details",
        "Improved engagement"
      ],
      "wordCount": 42,
      "model": "gpt-4o-mini"
    }
  },
  "message": "Content enhanced successfully"
}
```

### SEO Generation

```bash
POST /api/ai/seo
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "content": "Welcome to our Italian restaurant...",
  "currentTitle": "Home Page",
  "tenantId": "your-tenant-id",
  "targetKeywords": ["italian restaurant", "authentic cuisine"],
  "businessType": "restaurant"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "current": {
      "title": "Home Page"
    },
    "suggestions": {
      "metaTitle": "Authentic Italian Restaurant | Fresh Homemade Pasta",
      "metaDescription": "Experience authentic Italian cuisine with fresh, homemade pasta and traditional recipes passed down through generations.",
      "keywords": [
        "italian restaurant",
        "authentic cuisine",
        "homemade pasta",
        "traditional recipes"
      ],
      "improvements": [
        "Include location in title for local SEO",
        "Add call-to-action in description",
        "Consider adding specialty dishes to meta"
      ]
    },
    "metadata": {
      "model": "gpt-4o-mini"
    }
  }
}
```

### Content Ideas

```bash
POST /api/ai/ideas
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "tenantId": "your-tenant-id",
  "count": 5,
  "businessType": "restaurant",
  "topic": "seasonal menu"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ideas": [
      {
        "title": "Summer Fresh: Seasonal Menu Launch",
        "description": "Highlight seasonal ingredients and summer-inspired dishes",
        "category": "Landing Page"
      },
      {
        "title": "Behind the Scenes: Meet Our Chefs",
        "description": "Showcase the talent and passion behind your dishes",
        "category": "Blog Post"
      }
      // ... 3 more ideas
    ],
    "metadata": {
      "count": 5,
      "model": "gpt-4o-mini"
    }
  }
}
```

### Custom Rewriting

```bash
POST /api/ai/rewrite
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "content": "We offer pizza, pasta, and salads.",
  "instructions": "Make it sound more gourmet and upscale, emphasize quality ingredients",
  "tenantId": "your-tenant-id"
}
```

### List Models

```bash
GET /api/ai/models
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "currentModel": "gpt-4o-mini",
    "availableModels": [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-4",
      "gpt-3.5-turbo"
    ],
    "info": {
      "gpt-4o": "Most capable model, best for complex tasks",
      "gpt-4o-mini": "Fast and affordable, great for most tasks",
      // ...
    }
  }
}
```

## Frontend Integration

### Example: Enhance Button Click

```typescript
async function handleEnhanceClick(content: string) {
  try {
    const response = await fetch('/api/ai/enhance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        content,
        tenantId: currentTenantId,
        tone: 'professional',
        length: 'similar',
      }),
    });

    const result = await response.json();

    if (result.success) {
      // Replace content with enhanced version
      setContent(result.data.enhanced);

      // Show improvements to user
      showToast(`Enhanced! Improvements: ${result.data.metadata.improvements.join(', ')}`);
    }
  } catch (error) {
    console.error('Enhancement failed:', error);
  }
}
```

### Example: SEO Auto-Generation

```typescript
async function generateSEO(pageContent: string, pageTitle: string) {
  const response = await fetch('/api/ai/seo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      content: pageContent,
      currentTitle: pageTitle,
      tenantId: currentTenantId,
      businessType: tenant.businessType,
    }),
  });

  const result = await response.json();

  if (result.success) {
    // Pre-fill SEO fields
    setMetaTitle(result.data.suggestions.metaTitle);
    setMetaDescription(result.data.suggestions.metaDescription);
    setKeywords(result.data.suggestions.keywords);
  }
}
```

## Architecture

### Service Layer (`src/services/ai.service.ts`)

The AI service is designed with:
- **Structured Outputs**: Using OpenAI's structured output API with Zod schemas
- **Easy Model Switching**: Change models globally or per-request
- **Type Safety**: Full TypeScript support with inferred types
- **Error Handling**: Graceful handling of API errors and rate limits
- **Flexibility**: Easy to extend with new AI features

```typescript
// Service instance
import { aiService } from '@/services/ai.service';

// Change default model programmatically
aiService.setDefaultModel('gpt-4o');

// Or override per-request
const result = await aiService.enhanceContent(content, {
  tone: 'casual',
  config: { model: 'gpt-4o', temperature: 0.8 }
});
```

### API Endpoints

All endpoints follow the same pattern:
1. **Validate request** with Zod schemas
2. **Check tenant access** with middleware
3. **Call AI service** with options
4. **Log usage** for audit trail
5. **Return structured response**

### Audit Logging

All AI operations are automatically logged:
- User ID and tenant ID
- Operation type (enhancement, SEO, etc.)
- Model used
- Content length statistics
- Timestamp

View logs in the audit trail: `GET /api/tenants/{tenantId}/audit-logs`

## Cost Management

### Token Usage

AI operations consume tokens (charged by OpenAI):
- **Input tokens**: Content you send
- **Output tokens**: Generated content

### Model Costs (as of 2024)

Approximate costs per 1K tokens:

| Model | Input | Output |
|-------|--------|--------|
| gpt-4o | $0.0025 | $0.01 |
| gpt-4o-mini | $0.00015 | $0.0006 |
| gpt-4-turbo | $0.01 | $0.03 |
| gpt-3.5-turbo | $0.0005 | $0.0015 |

**Recommendation**: Start with `gpt-4o-mini` for best cost/performance ratio.

### Best Practices

1. **Limit content length**: Max 5000 characters per request
2. **Cache results**: Store enhanced content, don't regenerate
3. **Use appropriate models**:
   - gpt-4o-mini for most tasks
   - gpt-4o for complex/important content
4. **Monitor usage**: Check audit logs regularly
5. **Set budgets**: Use OpenAI dashboard to set spending limits

## Error Handling

The API handles common errors gracefully:

### Missing API Key
```json
{
  "success": false,
  "error": "AI service authentication failed. Please check OPENAI_API_KEY."
}
```

### Rate Limit Exceeded
```json
{
  "success": false,
  "error": "AI service rate limit exceeded. Please try again later."
}
```

### Invalid Content
```json
{
  "success": false,
  "errors": [
    {
      "field": "content",
      "message": "Content must be at least 10 characters"
    }
  ]
}
```

## Testing

### Quick Test

1. **Get a test token**:
```bash
curl -X POST http://localhost:3021/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "email": "marco@bellaitalia.com",
    "password": "Password123!"
  }'
```

2. **Test content enhancement**:
```bash
curl -X POST http://localhost:3021/api/ai/enhance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content": "We make good pizza",
    "tenantId": "your-tenant-id",
    "tone": "professional"
  }'
```

### With Postman

Import the main Postman collection and find the AI endpoints under the "AI Features" folder.

## Switching Models

### Method 1: Environment Variable (Global)

Edit `.env`:
```bash
AI_MODEL="gpt-4o"  # Change from gpt-4o-mini to gpt-4o
```

Restart the server for changes to take effect.

### Method 2: Per-Request (Flexible)

Override model in any request:
```json
{
  "content": "...",
  "tenantId": "...",
  "model": "gpt-4o"  // ← Override for this request only
}
```

### Method 3: Programmatically

In your code:
```typescript
import { aiService } from '@/services/ai.service';

// Change default for all subsequent calls
aiService.setDefaultModel('gpt-4o');

// Check current model
console.log(aiService.getDefaultModel()); // "gpt-4o"
```

## Security

- **Authentication Required**: All AI endpoints require valid JWT token
- **Tenant Isolation**: Users can only enhance content for their own tenant
- **Rate Limiting**: Protected by Upstash rate limiting (1000 req/hr)
- **Audit Trail**: All operations logged with user/tenant info
- **API Key Security**: OpenAI key stored securely in environment variables

## Future Enhancements

Potential additions:
- Image generation (DALL-E integration)
- Content translation
- Sentiment analysis
- Automated A/B testing suggestions
- Voice-to-text transcription
- Custom fine-tuned models

## Support

### Common Issues

**Issue**: "AI service authentication failed"
- **Solution**: Check `OPENAI_API_KEY` in `.env` is valid

**Issue**: "Rate limit exceeded"
- **Solution**: Wait a few minutes, or upgrade OpenAI plan

**Issue**: Slow responses
- **Solution**: Switch to faster model (gpt-4o-mini or gpt-3.5-turbo)

### Resources

- OpenAI API Documentation: https://platform.openai.com/docs
- OpenAI Pricing: https://openai.com/pricing
- Model Comparison: https://platform.openai.com/docs/models

---

**Version**: 2.0.0
**Last Updated**: 2025-10-19
**Maintained By**: SiteNinja Team
