import OpenAI from 'openai';
import { z } from 'zod';

/**
 * AI Service
 *
 * Provides AI-powered content enhancement using OpenAI's GPT models
 * Inspired by Pydantic AI architecture with structured outputs and easy model switching
 */

// Zod schemas for structured outputs
const EnhancedContentSchema = z.object({
  enhancedText: z.string().describe('The enhanced version of the content'),
  tone: z.enum(['professional', 'casual', 'friendly', 'formal', 'creative']).describe('The detected or applied tone'),
  improvements: z.array(z.string()).describe('A single, most important improvement made to the content'),
  wordCount: z.number().describe('Word count of the enhanced content'),
});

const SEOSuggestionSchema = z.object({
  metaTitle: z.string().max(60).describe('Optimized meta title (max 60 chars)'),
  metaDescription: z.string().max(160).describe('Optimized meta description (max 160 chars)'),
  keywords: z.array(z.string()).describe('Suggested keywords for SEO'),
  suggestions: z.array(z.string()).describe('Additional SEO improvement suggestions'),
});

const ContentIdeasSchema = z.object({
  ideas: z.array(
    z.object({
      title: z.string().describe('Content title or heading'),
      description: z.string().describe('Brief description of the content idea'),
      category: z.string().describe('Content category or type'),
    })
  ).describe('List of content ideas'),
});

// Type exports
export type EnhancedContent = z.infer<typeof EnhancedContentSchema>;
export type SEOSuggestion = z.infer<typeof SEOSuggestionSchema>;
export type ContentIdeas = z.infer<typeof ContentIdeasSchema>;

/**
 * AI Service Configuration
 */
interface AIConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Content Enhancement Options
 */
export interface EnhanceContentOptions {
  tone?: 'professional' | 'casual' | 'friendly' | 'formal' | 'creative';
  length?: 'shorter' | 'longer' | 'similar';
  focus?: string; // Additional focus areas (e.g., "make it more engaging")
  config?: AIConfig;
}

/**
 * SEO Enhancement Options
 */
export interface EnhanceSEOOptions {
  targetKeywords?: string[];
  businessType?: string;
  config?: AIConfig;
}

/**
 * Content Ideas Options
 */
export interface GenerateIdeasOptions {
  count?: number;
  businessType?: string;
  topic?: string;
  config?: AIConfig;
}

/**
 * AI Service Class
 *
 * Provides structured AI operations with easy model switching
 */
class AIService {
  private openai: OpenAI;
  private defaultModel: string;
  private defaultTemperature: number;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Default to GPT-4-mini as specified, but easily configurable
    this.defaultModel = process.env.AI_MODEL || 'gpt-4o-mini';
    this.defaultTemperature = parseFloat(process.env.AI_TEMPERATURE || '0.7');
  }

  /**
   * Enhance Content
   *
   * Takes existing content and enhances it based on specified criteria
   *
   * @param content - The original content to enhance
   * @param options - Enhancement options (tone, length, focus)
   * @returns Enhanced content with metadata
   */
  async enhanceContent(
    content: string,
    options: EnhanceContentOptions = {}
  ): Promise<EnhancedContent> {
    const {
      tone = 'professional',
      length = 'similar',
      focus = '',
      config = {},
    } = options;

    const systemPrompt = `You are an expert content editor and copywriter. Your task is to enhance the provided content while maintaining its core message.

Enhancement Guidelines:
- Tone: ${tone}
- Length preference: ${length}
${focus ? `- Additional focus: ${focus}` : ''}

Provide structured output with:
1. Enhanced text that improves clarity, engagement, and readability
2. The tone you applied
3. A list containing a single, most important improvement made
4. Word count of enhanced content`;

    const completion = await this.openai.beta.chat.completions.parse({
      model: config.model || this.defaultModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Enhance this content:\n\n${content}` },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'enhanced_content',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              enhancedText: { type: 'string' },
              tone: {
                type: 'string',
                enum: ['professional', 'casual', 'friendly', 'formal', 'creative'],
              },
              improvements: {
                type: 'array',
                items: { type: 'string' },
              },
              wordCount: { type: 'number' },
            },
            required: ['enhancedText', 'tone', 'improvements', 'wordCount'],
            additionalProperties: false,
          },
        },
      },
      temperature: config.temperature || this.defaultTemperature,
      max_tokens: config.maxTokens || 2000,
    });

    const result = completion.choices[0].message.parsed;

    if (!result) {
      throw new Error('Failed to parse AI response');
    }

    // Validate with Zod
    return EnhancedContentSchema.parse(result);
  }

  /**
   * Enhance SEO Metadata
   *
   * Generate or improve SEO metadata for content
   *
   * @param content - The content to generate SEO for
   * @param currentTitle - Current page/content title
   * @param options - SEO enhancement options
   * @returns SEO suggestions with meta title, description, keywords
   */
  async enhanceSEO(
    content: string,
    currentTitle: string,
    options: EnhanceSEOOptions = {}
  ): Promise<SEOSuggestion> {
    const { targetKeywords = [], businessType = '', config = {} } = options;

    const systemPrompt = `You are an expert SEO specialist. Analyze the content and create optimized SEO metadata.

Guidelines:
- Meta title: Max 60 characters, engaging and keyword-rich
- Meta description: Max 160 characters, compelling and informative
- Keywords: Relevant and specific to the content
${businessType ? `- Business type: ${businessType}` : ''}
${targetKeywords.length > 0 ? `- Target keywords: ${targetKeywords.join(', ')}` : ''}

Provide structured SEO recommendations.`;

    const completion = await this.openai.beta.chat.completions.parse({
      model: config.model || this.defaultModel,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Current Title: ${currentTitle}\n\nContent:\n${content.substring(0, 1000)}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'seo_suggestion',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              metaTitle: { type: 'string' },
              metaDescription: { type: 'string' },
              keywords: {
                type: 'array',
                items: { type: 'string' },
              },
              suggestions: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['metaTitle', 'metaDescription', 'keywords', 'suggestions'],
            additionalProperties: false,
          },
        },
      },
      temperature: config.temperature || this.defaultTemperature,
      max_tokens: config.maxTokens || 1000,
    });

    const result = completion.choices[0].message.parsed;

    if (!result) {
      throw new Error('Failed to parse AI response');
    }

    return SEOSuggestionSchema.parse(result);
  }

  /**
   * Generate Content Ideas
   *
   * Generate creative content ideas based on business type and topic
   *
   * @param options - Content generation options
   * @returns List of content ideas with titles and descriptions
   */
  async generateContentIdeas(
    options: GenerateIdeasOptions = {}
  ): Promise<ContentIdeas> {
    const { count = 5, businessType = '', topic = '', config = {} } = options;

    const systemPrompt = `You are a creative content strategist. Generate engaging content ideas.

Guidelines:
- Generate ${count} unique content ideas
${businessType ? `- Business type: ${businessType}` : ''}
${topic ? `- Topic focus: ${topic}` : ''}
- Ideas should be actionable and specific
- Include diverse content categories (blog posts, landing pages, etc.)`;

    const completion = await this.openai.beta.chat.completions.parse({
      model: config.model || this.defaultModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate ${count} content ideas` },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'content_ideas',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              ideas: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    category: { type: 'string' },
                  },
                  required: ['title', 'description', 'category'],
                  additionalProperties: false,
                },
              },
            },
            required: ['ideas'],
            additionalProperties: false,
          },
        },
      },
      temperature: config.temperature || 0.9, // Higher temperature for creativity
      max_tokens: config.maxTokens || 2000,
    });

    const result = completion.choices[0].message.parsed;

    if (!result) {
      throw new Error('Failed to parse AI response');
    }

    return ContentIdeasSchema.parse(result);
  }

  /**
   * Rewrite Content with Custom Instructions
   *
   * Flexible content rewriting with custom instructions
   *
   * @param content - Original content
   * @param instructions - Custom instructions for rewriting
   * @param config - AI configuration
   * @returns Rewritten content as plain text
   */
  async rewriteContent(
    content: string,
    instructions: string,
    config: AIConfig = {}
  ): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: config.model || this.defaultModel,
      messages: [
        {
          role: 'system',
          content: 'You are an expert content writer. Rewrite content according to specific instructions while maintaining quality and coherence.',
        },
        {
          role: 'user',
          content: `Instructions: ${instructions}\n\nOriginal Content:\n${content}`,
        },
      ],
      temperature: config.temperature || this.defaultTemperature,
      max_tokens: config.maxTokens || 2000,
    });

    const result = completion.choices[0].message.content;

    if (!result) {
      throw new Error('Failed to generate rewritten content');
    }

    return result;
  }

  /**
   * Change AI Model
   *
   * Update the default model for future requests
   *
   * @param model - OpenAI model name (e.g., 'gpt-4', 'gpt-4o-mini', 'gpt-3.5-turbo')
   */
  setDefaultModel(model: string): void {
    this.defaultModel = model;
  }

  /**
   * Get Current Model
   *
   * @returns Current default model name
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Get Available Models
   *
   * Returns list of commonly used OpenAI models
   */
  getAvailableModels(): string[] {
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
    ];
  }
}

// Export singleton instance
export const aiService = new AIService();

// Export class for testing or multiple instances
export { AIService };
