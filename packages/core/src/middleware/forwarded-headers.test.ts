import { describe, expect, it } from 'vitest'
import { ProxyConfig } from '../values/proxy-config.js'
import { forwardedHeaders } from './forwarded-headers.js'
import type { ProxyContext } from './types.js'

function createCtx(
	overrides: {
		headers?: Record<string, string | string[] | undefined>
		hops?: number
		host?: string
		remoteAddress?: string
	} = {},
): ProxyContext {
	return {
		request: {
			method: 'GET',
			url: '/',
			headers: overrides.headers ?? {},
			remoteAddress: overrides.remoteAddress ?? '192.168.1.1',
		},
		response: {
			statusCode: 200,
			setHeader: () => {},
			end: () => {},
			headersSent: false,
		},
		routes: () => [],
		config: ProxyConfig.defaults(),
		metadata: {
			hops: overrides.hops ?? 0,
			host: overrides.host ?? 'myapp.localhost',
		},
	}
}

describe('forwardedHeaders', () => {
	it('sets forwarded headers', async () => {
		const ctx = createCtx()
		await forwardedHeaders(ctx, () => {})
		const fwd = ctx.metadata.forwardedHeaders as Record<string, string>
		expect(fwd['x-forwarded-for']).toBe('192.168.1.1')
		expect(fwd['x-forwarded-proto']).toBe('http')
		expect(fwd['x-forwarded-host']).toBe('myapp.localhost')
		expect(fwd['x-localias-hops']).toBe('1')
		expect(fwd['x-localias']).toBe('1')
	})

	it('appends to existing x-forwarded-for', async () => {
		const ctx = createCtx({
			headers: { 'x-forwarded-for': '10.0.0.1' },
			remoteAddress: '192.168.1.1',
		})
		await forwardedHeaders(ctx, () => {})
		const fwd = ctx.metadata.forwardedHeaders as Record<string, string>
		expect(fwd['x-forwarded-for']).toBe('10.0.0.1, 192.168.1.1')
	})

	it('appends to existing x-forwarded-for array', async () => {
		const ctx = createCtx({
			headers: { 'x-forwarded-for': ['10.0.0.1', '10.0.0.2'] as any },
			remoteAddress: '192.168.1.1',
		})
		await forwardedHeaders(ctx, () => {})
		const fwd = ctx.metadata.forwardedHeaders as Record<string, string>
		expect(fwd['x-forwarded-for']).toBe('10.0.0.1, 10.0.0.2, 192.168.1.1')
	})

	it('increments hops', async () => {
		const ctx = createCtx({ hops: 3 })
		await forwardedHeaders(ctx, () => {})
		const fwd = ctx.metadata.forwardedHeaders as Record<string, string>
		expect(fwd['x-localias-hops']).toBe('4')
	})
})
