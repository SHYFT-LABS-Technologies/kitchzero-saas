import DOMPurify from 'isomorphic-dompurify'
import validator from 'validator'
import { z } from 'zod'

// Configure DOMPurify for server-side use
const purifyConfig = {
  ALLOWED_TAGS: [], // No HTML tags allowed
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
  USE_PROFILES: { html: false }
}

export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, purifyConfig)
}

export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string')
  }
  
  // Remove null bytes and control characters except newlines/tabs
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  
  // Sanitize HTML
  sanitized = sanitizeHtml(sanitized)
  
  // Normalize unicode
  sanitized = sanitized.normalize('NFKC')
  
  // Trim whitespace
  sanitized = sanitized.trim()
  
  return sanitized
}

export function validateAndSanitizeUrl(url: string): string {
  if (!validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true,
    allow_underscores: false,
    allow_trailing_dot: false,
    allow_protocol_relative_urls: false
  })) {
    throw new Error('Invalid URL format')
  }
  
  return sanitizeString(url)
}

export function validateNumericString(input: string, options: {
  min?: number
  max?: number
  allowDecimal?: boolean
} = {}): number {
  const { min = 0, max = Number.MAX_SAFE_INTEGER, allowDecimal = true } = options
  
  const sanitized = sanitizeString(input)
  
  if (!allowDecimal && !validator.isInt(sanitized)) {
    throw new Error('Must be a valid integer')
  }
  
  if (allowDecimal && !validator.isFloat(sanitized)) {
    throw new Error('Must be a valid number')
  }
  
  const num = parseFloat(sanitized)
  
  if (num < min || num > max) {
    throw new Error(`Number must be between ${min} and ${max}`)
  }
  
  return num
}

// Enhanced Zod schemas with sanitization
export const sanitizedStringSchema = (options: {
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  errorMessage?: string
} = {}) => {
  const { minLength = 1, maxLength = 255, pattern, errorMessage } = options
  
  return z.string()
    .transform(sanitizeString)
    .refine((val) => val.length >= minLength, {
      message: `Must be at least ${minLength} characters`
    })
    .refine((val) => val.length <= maxLength, {
      message: `Must be no more than ${maxLength} characters`
    })
    .refine((val) => !pattern || pattern.test(val), {
      message: errorMessage || 'Invalid format'
    })
    .refine((val) => {
      // Check for potential XSS patterns
      const xssPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe[^>]*>.*?<\/iframe>/gi,
        /<object[^>]*>.*?<\/object>/gi,
        /<embed[^>]*>/gi,
        /<link[^>]*>/gi,
        /<meta[^>]*>/gi
      ]
      
      return !xssPatterns.some(pattern => pattern.test(val))
    }, 'Content contains invalid characters')
}

export const sanitizedUrlSchema = z.string()
  .transform(validateAndSanitizeUrl)
  .refine((url) => {
    try {
      const parsed = new URL(url)
      const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
      return !dangerousProtocols.some(proto => parsed.protocol.startsWith(proto))
    } catch {
      return false
    }
  }, 'Invalid or dangerous URL')

// Business-specific validation schemas
export const itemNameSchema = sanitizedStringSchema({
  minLength: 1,
  maxLength: 100,
  pattern: /^[a-zA-Z0-9\s\-_.,()]+$/,
  errorMessage: 'Item name can only contain letters, numbers, spaces, and common punctuation'
})

export const usernameSchema = sanitizedStringSchema({
  minLength: 3,
  maxLength: 50,
  pattern: /^[a-zA-Z0-9_]+$/,
  errorMessage: 'Username can only contain letters, numbers, and underscores'
})

export const locationSchema = sanitizedStringSchema({
  minLength: 1,
  maxLength: 200,
  pattern: /^[a-zA-Z0-9\s\-_.,()#]+$/,
  errorMessage: 'Location contains invalid characters'
})

// Financial validation with business rules
export const financialValueSchema = z.number()
  .positive('Value must be positive')
  .max(10000000, 'Value exceeds maximum limit')
  .refine((val) => {
    return Number.isInteger(val * 100)
  }, 'Value can have at most 2 decimal places')

// Quantity validation with business rules
export const quantitySchema = z.number()
  .positive('Quantity must be positive')
  .max(100000, 'Quantity exceeds reasonable limit')
  .refine((val) => {
    return Number.isInteger(val * 1000)
  }, 'Quantity can have at most 3 decimal places')