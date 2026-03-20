import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '../result.js'
import { Hostname } from './hostname.js'

describe('Hostname', () => {
	it('creates with auto TLD suffix', () => {
		const r = Hostname.create('myapp')
		expect(isOk(r)).toBe(true)
		if (isOk(r)) {
			expect(r.value.value).toBe('myapp.localhost')
			expect(r.value.name).toBe('myapp')
			expect(r.value.tld).toBe('localhost')
		}
	})

	it('preserves existing TLD', () => {
		const r = Hostname.create('myapp.localhost')
		expect(isOk(r) && r.value.value).toBe('myapp.localhost')
	})

	it('strips protocol and path', () => {
		const r = Hostname.create('http://myapp.localhost/foo')
		expect(isOk(r) && r.value.value).toBe('myapp.localhost')
	})

	it('strips port', () => {
		const r = Hostname.create('myapp.localhost:3000')
		expect(isOk(r) && r.value.value).toBe('myapp.localhost')
	})

	it('lowercases', () => {
		const r = Hostname.create('MyApp')
		expect(isOk(r) && r.value.value).toBe('myapp.localhost')
	})

	it('rejects empty', () => {
		expect(isErr(Hostname.create(''))).toBe(true)
	})

	it('rejects invalid characters', () => {
		expect(isErr(Hostname.create('my_app'))).toBe(true)
	})

	it('rejects oversized labels', () => {
		const long = 'a'.repeat(64)
		expect(isErr(Hostname.create(long))).toBe(true)
	})

	it('matches exact', () => {
		const r = Hostname.create('myapp')
		if (isOk(r)) {
			expect(r.value.matches('myapp.localhost')).toBe('exact')
		}
	})

	it('matches wildcard', () => {
		const r = Hostname.create('myapp')
		if (isOk(r)) {
			expect(r.value.matches('sub.myapp.localhost')).toBe('wildcard')
		}
	})

	it('returns none for no match', () => {
		const r = Hostname.create('myapp')
		if (isOk(r)) {
			expect(r.value.matches('other.localhost')).toBe('none')
		}
	})

	it('toUrl with default port', () => {
		const r = Hostname.create('myapp')
		if (isOk(r)) {
			expect(r.value.toUrl(80, false)).toBe('http://myapp.localhost')
			expect(r.value.toUrl(443, true)).toBe('https://myapp.localhost')
		}
	})

	it('toUrl with custom port', () => {
		const r = Hostname.create('myapp')
		if (isOk(r)) {
			expect(r.value.toUrl(1355, false)).toBe('http://myapp.localhost:1355')
		}
	})

	it('custom TLD', () => {
		const r = Hostname.create('myapp', 'test')
		expect(isOk(r) && r.value.value).toBe('myapp.test')
	})

	it('trims whitespace before processing', () => {
		const r = Hostname.create('  myapp  ')
		expect(isOk(r) && r.value.value).toBe('myapp.localhost')
	})

	it('handles whitespace + protocol correctly', () => {
		const r = Hostname.create('  http://myapp.localhost  ')
		expect(isOk(r) && r.value.value).toBe('myapp.localhost')
	})

	it('handles input with only protocol', () => {
		const r = Hostname.create('http://')
		expect(isErr(r)).toBe(true)
	})

	it('handles input with port and path', () => {
		const r = Hostname.create('myapp.localhost:3000/api/v1')
		expect(isOk(r) && r.value.value).toBe('myapp.localhost')
	})

	it('matches case-insensitively', () => {
		const r = Hostname.create('myapp')
		if (isOk(r)) {
			expect(r.value.matches('MYAPP.LOCALHOST')).toBe('exact')
			expect(r.value.matches('MYAPP.localhost:3000')).toBe('exact')
		}
	})

	it('matches wildcard with port', () => {
		const r = Hostname.create('myapp')
		if (isOk(r)) {
			expect(r.value.matches('sub.myapp.localhost:1355')).toBe('wildcard')
		}
	})
})
