import { describe, expect, it } from 'vitest'
import { ProxyConfig } from '../values/proxy-config.js'
import { loopDetector } from './loop-detector.js'
import type { ProxyContext } from './types.js'

function createCtx(headers: Record<string, string | string[] | undefined> = {}): ProxyContext {
	let statusCode = 200
	let body = ''
	return {
		request: { method: 'GET', url: '/', headers },
		response: {
			get statusCode() {
				return statusCode
			},
			set statusCode(c) {
				statusCode = c
			},
			setHeader: () => {},
			end: (b?: string) => {
				body = b ?? ''
			},
			headersSent: false,
		},
		routes: () => [],
		config: ProxyConfig.defaults(),
		metadata: {},
	}
}

describe('loopDetector', () => {
	it('allows request with no hop header', async () => {
		const ctx = createCtx({})
		let called = false
		await loopDetector(ctx, () => {
			called = true
		})
		expect(called).toBe(true)
		expect(ctx.metadata.hops).toBe(0)
	})

	it('allows request under hop limit', async () => {
		const ctx = createCtx({ 'x-localias-hops': '3' })
		let called = false
		await loopDetector(ctx, () => {
			called = true
		})
		expect(called).toBe(true)
		expect(ctx.metadata.hops).toBe(3)
	})

	it('rejects request at hop limit', async () => {
		const ctx = createCtx({ 'x-localias-hops': '5' })
		let called = false
		await loopDetector(ctx, () => {
			called = true
		})
		expect(called).toBe(false)
		expect(ctx.response.statusCode).toBe(508)
	})

	it('handles NaN hop header safely (resets to 0)', async () => {
		const ctx = createCtx({ 'x-localias-hops': 'abc' })
		let called = false
		await loopDetector(ctx, () => {
			called = true
		})
		expect(called).toBe(true)
		expect(ctx.metadata.hops).toBe(0)
	})

	it('handles string array hop header (takes first)', async () => {
		const ctx = createCtx({ 'x-localias-hops': ['3', '10'] as any })
		let called = false
		await loopDetector(ctx, () => {
			called = true
		})
		expect(called).toBe(true)
		expect(ctx.metadata.hops).toBe(3)
	})

	it('handles empty string hop header', async () => {
		const ctx = createCtx({ 'x-localias-hops': '' })
		let called = false
		await loopDetector(ctx, () => {
			called = true
		})
		expect(called).toBe(true)
		expect(ctx.metadata.hops).toBe(0)
	})
})
