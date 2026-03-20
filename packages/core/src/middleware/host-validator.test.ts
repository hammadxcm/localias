import { describe, it, expect } from 'vitest'
import { hostValidator } from './host-validator.js'
import type { ProxyContext } from './types.js'
import { ProxyConfig } from '../values/proxy-config.js'

function createCtx(headers: Record<string, string | string[] | undefined> = {}): ProxyContext {
	let statusCode = 200
	let ended = false
	let body = ''
	return {
		request: { method: 'GET', url: '/', headers },
		response: {
			get statusCode() { return statusCode },
			set statusCode(c) { statusCode = c },
			setHeader: () => {},
			end: (b?: string) => { ended = true; body = b ?? '' },
			headersSent: false,
		},
		routes: () => [],
		config: ProxyConfig.defaults(),
		metadata: {},
	}
}

describe('hostValidator', () => {
	it('passes with Host header', async () => {
		const ctx = createCtx({ host: 'myapp.localhost' })
		let called = false
		await hostValidator(ctx, () => { called = true })
		expect(called).toBe(true)
		expect(ctx.metadata['host']).toBe('myapp.localhost')
	})

	it('rejects missing Host', async () => {
		const ctx = createCtx({})
		let called = false
		await hostValidator(ctx, () => { called = true })
		expect(called).toBe(false)
		expect(ctx.response.statusCode).toBe(400)
	})
})
