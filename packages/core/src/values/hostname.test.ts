import { describe, it, expect } from 'vitest'
import { Hostname } from './hostname.js'
import { isOk, isErr } from '../result.js'

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
})
