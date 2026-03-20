import { describe, it, expect } from 'vitest'
import { sanitizeForHostname, truncateLabel } from './hostname-sanitizer.js'

describe('sanitizeForHostname', () => {
	it('lowercases', () => {
		expect(sanitizeForHostname('MyApp')).toBe('myapp')
	})

	it('strips scope', () => {
		expect(sanitizeForHostname('@scope/package')).toBe('package')
	})

	it('replaces invalid chars with hyphens', () => {
		expect(sanitizeForHostname('my_app.v2')).toBe('my-app-v2')
	})

	it('collapses multiple hyphens', () => {
		expect(sanitizeForHostname('a---b')).toBe('a-b')
	})

	it('trims leading/trailing hyphens', () => {
		expect(sanitizeForHostname('-app-')).toBe('app')
	})
})

describe('truncateLabel', () => {
	it('returns short labels as-is', () => {
		expect(truncateLabel('myapp')).toBe('myapp')
	})

	it('truncates to 63 without hash', () => {
		const long = 'a'.repeat(100)
		expect(truncateLabel(long).length).toBe(63)
	})

	it('truncates with hash', () => {
		const long = 'a'.repeat(100)
		const result = truncateLabel(long, (s) => 'abcdef1234567890')
		expect(result.length).toBe(63)
		expect(result).toMatch(/-abcdef12$/)
	})
})
