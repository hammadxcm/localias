import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '../result.js'
import { ProxyConfig } from './proxy-config.js'

describe('ProxyConfig', () => {
	it('creates with defaults', () => {
		const r = ProxyConfig.create({})
		expect(isOk(r)).toBe(true)
		if (isOk(r)) {
			expect(r.value.port.value).toBe(1355)
			expect(r.value.tld).toBe('localhost')
			expect(r.value.tls).toBe(false)
		}
	})

	it('accepts custom port', () => {
		const r = ProxyConfig.create({ port: 8080 })
		expect(isOk(r) && r.value.port.value).toBe(8080)
	})

	it('rejects invalid port', () => {
		expect(isErr(ProxyConfig.create({ port: 0 }))).toBe(true)
	})

	it('lowercases TLD before validation', () => {
		const r = ProxyConfig.create({ tld: 'Localhost' })
		expect(isOk(r)).toBe(true)
		if (isOk(r)) expect(r.value.tld).toBe('localhost')
	})

	it('rejects invalid TLD characters', () => {
		expect(isErr(ProxyConfig.create({ tld: 'local-host' }))).toBe(true)
	})

	it('rejects empty TLD', () => {
		expect(isErr(ProxyConfig.create({ tld: '' }))).toBe(true)
	})

	it('defaults() returns valid config', () => {
		const d = ProxyConfig.defaults()
		expect(d.port.value).toBe(1355)
		expect(d.tld).toBe('localhost')
		expect(d.tls).toBe(false)
		expect(d.stateDir).toBe('/tmp/localias')
	})
})
