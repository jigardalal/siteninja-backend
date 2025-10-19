/**
 * Sanitize HTML to prevent XSS attacks
 * Removes potentially dangerous HTML tags and attributes
 *
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Remove script tags and their contents
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onerror, etc.)
  html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  html = html.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  html = html.replace(/javascript:/gi, '');

  // Remove data: protocol (except for images)
  html = html.replace(/(<(?!img)[^>]+)data:/gi, '$1');

  // Remove vbscript: protocol
  html = html.replace(/vbscript:/gi, '');

  // Remove style tags with javascript
  html = html.replace(/<style[^>]*>[^<]*<\/style>/gi, '');

  // Remove iframe tags
  html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // Remove object and embed tags
  html = html.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  html = html.replace(/<embed\b[^<]*>/gi, '');

  return html.trim();
}

/**
 * Sanitize text content (escape HTML)
 * Converts HTML special characters to entities
 *
 * @param text - Text to sanitize
 * @returns Escaped text
 */
export function sanitizeText(text: string): string {
  if (!text) return '';

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize URL to prevent XSS and other attacks
 * Only allows http, https, and mailto protocols
 *
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';

  // Trim and lowercase the URL for checking
  const trimmed = url.trim().toLowerCase();

  // Allow http, https, and mailto
  const allowedProtocols = ['http://', 'https://', 'mailto:'];

  const isAllowed = allowedProtocols.some((protocol) =>
    trimmed.startsWith(protocol)
  );

  // Allow relative URLs
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return url.trim();
  }

  // Return sanitized URL or empty string
  return isAllowed ? url.trim() : '';
}

/**
 * Sanitize file path to prevent path traversal attacks
 * Removes ../ and other dangerous patterns
 *
 * @param path - File path to sanitize
 * @returns Sanitized path
 */
export function sanitizePath(path: string): string {
  if (!path) return '';

  // Remove null bytes
  path = path.replace(/\0/g, '');

  // Remove parent directory references
  path = path.replace(/\.\.\//g, '');
  path = path.replace(/\.\.\\/g, '');

  // Remove leading slashes
  path = path.replace(/^\/+/, '');

  // Remove multiple consecutive slashes
  path = path.replace(/\/+/g, '/');

  // Remove trailing slashes
  path = path.replace(/\/+$/, '');

  return path.trim();
}

/**
 * Sanitize filename to prevent malicious file names
 * Removes dangerous characters and limits length
 *
 * @param filename - Filename to sanitize
 * @param maxLength - Maximum length (default 255)
 * @returns Sanitized filename
 */
export function sanitizeFilename(
  filename: string,
  maxLength: number = 255
): string {
  if (!filename) return '';

  // Remove path components
  filename = filename.split('/').pop() || '';
  filename = filename.split('\\').pop() || '';

  // Remove null bytes
  filename = filename.replace(/\0/g, '');

  // Remove control characters
  filename = filename.replace(/[\x00-\x1F\x7F]/g, '');

  // Remove dangerous characters
  filename = filename.replace(/[<>:"|?*]/g, '');

  // Replace spaces with underscores
  filename = filename.replace(/\s+/g, '_');

  // Limit length
  if (filename.length > maxLength) {
    const ext = filename.split('.').pop();
    const name = filename.substring(0, filename.lastIndexOf('.'));
    const maxNameLength = maxLength - (ext ? ext.length + 1 : 0);
    filename = ext ? `${name.substring(0, maxNameLength)}.${ext}` : name.substring(0, maxLength);
  }

  return filename.trim();
}

/**
 * Sanitize SQL input (additional layer on top of Prisma)
 * Removes SQL injection patterns
 *
 * @param input - Input to sanitize
 * @returns Sanitized input
 */
export function sanitizeSqlInput(input: string): string {
  if (!input) return '';

  // Remove SQL comments
  input = input.replace(/--[^\n]*/g, '');
  input = input.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove semicolons (end of statement)
  input = input.replace(/;/g, '');

  // Remove common SQL keywords (case-insensitive)
  const sqlKeywords = [
    /\bDROP\b/gi,
    /\bDELETE\b/gi,
    /\bTRUNCATE\b/gi,
    /\bEXEC\b/gi,
    /\bEXECUTE\b/gi,
    /\bUNION\b/gi,
    /\bINSERT\b/gi,
    /\bUPDATE\b/gi,
  ];

  sqlKeywords.forEach((keyword) => {
    input = input.replace(keyword, '');
  });

  return input.trim();
}

/**
 * Sanitize email address
 * Validates and normalizes email format
 *
 * @param email - Email to sanitize
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  email = email.trim().toLowerCase();

  return emailRegex.test(email) ? email : '';
}

/**
 * Sanitize phone number
 * Removes non-numeric characters except + and -
 *
 * @param phone - Phone number to sanitize
 * @returns Sanitized phone number
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';

  // Remove all characters except digits, +, -, (, ), and spaces
  phone = phone.replace(/[^\d+\-() ]/g, '');

  return phone.trim();
}

/**
 * Sanitize JSON input
 * Validates and parses JSON, returns null if invalid
 *
 * @param json - JSON string to sanitize
 * @returns Parsed JSON or null
 */
export function sanitizeJson(json: string): any | null {
  if (!json) return null;

  try {
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}

/**
 * Sanitize user input (general purpose)
 * Combines multiple sanitization methods
 *
 * @param input - Input to sanitize
 * @param options - Sanitization options
 * @returns Sanitized input
 */
export function sanitizeInput(
  input: string,
  options: {
    allowHtml?: boolean;
    maxLength?: number;
    trim?: boolean;
  } = {}
): string {
  if (!input) return '';

  const { allowHtml = false, maxLength, trim = true } = options;

  // Trim if requested
  if (trim) {
    input = input.trim();
  }

  // Sanitize HTML if not allowed
  if (!allowHtml) {
    input = sanitizeText(input);
  } else {
    input = sanitizeHtml(input);
  }

  // Limit length
  if (maxLength && input.length > maxLength) {
    input = input.substring(0, maxLength);
  }

  return input;
}

/**
 * Deep sanitize object
 * Recursively sanitizes all string values in an object
 *
 * @param obj - Object to sanitize
 * @param options - Sanitization options
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: {
    allowHtml?: boolean;
    maxLength?: number;
  } = {}
): T {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized: any = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value, options);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, options);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
