import { describe, it, expect } from 'vitest'
import { registerSchema, loginSchema } from '@/lib/validations/auth'

describe('Authentication Validation', () => {
  describe('Registration Schema', () => {
    it('accepts valid registration input', () => {
      const valid = {
        fullName: 'Jane Entrepreneur',
        email: 'jane@venturemind.ai',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        phone: '+1 555-123-4567',
      }
      const result = registerSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('rejects invalid email formats', () => {
      const invalid = {
        fullName: 'Jane Doe',
        email: 'not-an-email',
        password: 'Password123',
        confirmPassword: 'Password123',
      }
      const result = registerSchema.safeParse(invalid)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('email'))).toBe(true)
      }
    })

    it('rejects passwords shorter than 8 characters', () => {
      const invalid = {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Pass1',
        confirmPassword: 'Pass1',
      }
      const result = registerSchema.safeParse(invalid)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('8 characters'))).toBe(true)
      }
    })

    it('rejects passwords without numbers', () => {
      const invalid = {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        password: 'PasswordLettersOnly',
        confirmPassword: 'PasswordLettersOnly',
      }
      const result = registerSchema.safeParse(invalid)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('number'))).toBe(true)
      }
    })

    it('enforces password confirmation equality', () => {
      const mismatched = {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password123',
        confirmPassword: 'DifferentPassword123',
      }
      const result = registerSchema.safeParse(mismatched)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('do not match'))).toBe(true)
      }
    })
  })

  describe('Login Schema', () => {
    it('accepts valid login credentials', () => {
      const valid = {
        email: 'founder@example.com',
        password: 'SecurePassword123',
      }
      const result = loginSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('rejects empty credentials', () => {
      const empty = {
        email: '',
        password: '',
      }
      const result = loginSchema.safeParse(empty)
      expect(result.success).toBe(false)
    })
  })
})
