import { describe, it, expect } from 'vitest'
import { MiddlewarePipeline } from './pipeline.js'
import type { ProxyContext } from './types.js'
import { ProxyConfig } from '../values/proxy-config.js'

function createMockContext(headers: Record<string, string> = {}): ProxyContext {
	const responseHeaders: Record<string, string | string[]> = {}
	return {
		request: {
			method: 'GET',
			url: '/',
			headers,
			remoteAddress: '127.0.0.1',
		},
		response: {
			statusCode: 200,
			setHeader: (name, value) => { responseHeaders[name] = value },
			end: () => {},
			headersSent: false,
		},
		routes: () => [],
		config: ProxyConfig.defaults(),
		metadata: {},
	}
}

describe('MiddlewarePipeline', () => {
	it('executes middleware in order', async () => {
		const order: number[] = []
		const pipeline = new MiddlewarePipeline()

		pipeline.use(async (_ctx, next) => { order.push(1); await next(); order.push(4) })
		pipeline.use(async (_ctx, next) => { order.push(2); await next(); order.push(3) })

		await pipeline.execute(createMockContext())
		expect(order).toEqual([1, 2, 3, 4])
	})

	it('stops at middleware that does not call next', async () => {
		const order: number[] = []
		const pipeline = new MiddlewarePipeline()

		pipeline.use(async (_ctx, _next) => { order.push(1) })
		pipeline.use(async (_ctx, _next) => { order.push(2) })

		await pipeline.execute(createMockContext())
		expect(order).toEqual([1])
	})

	it('throws on double next call', async () => {
		const pipeline = new MiddlewarePipeline()
		pipeline.use(async (_ctx, next) => { await next(); await next() })

		await expect(pipeline.execute(createMockContext())).rejects.toThrow('next() called multiple times')
	})
})
