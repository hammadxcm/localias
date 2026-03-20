import net from 'node:net'
import { isErr, isOk } from '@localias/core'
import { describe, expect, it } from 'vitest'
import { TcpPortAllocator } from './tcp-port-allocator.js'

describe('TcpPortAllocator', () => {
	it('finds a free port in range', async () => {
		const alloc = new TcpPortAllocator()
		const result = await alloc.findFreePort(10000, 10100)
		expect(isOk(result)).toBe(true)
		if (isOk(result)) {
			expect(result.value.value).toBeGreaterThanOrEqual(10000)
			expect(result.value.value).toBeLessThanOrEqual(10100)
		}
	})

	it('skips ports in use', async () => {
		// Bind a port
		const server = net.createServer()
		await new Promise<void>((resolve) => server.listen(10200, '127.0.0.1', resolve))
		const addr = server.address() as net.AddressInfo

		try {
			const alloc = new TcpPortAllocator()
			const result = await alloc.findFreePort(10200, 10210)
			expect(isOk(result)).toBe(true)
			if (isOk(result)) {
				expect(result.value.value).not.toBe(addr.port)
			}
		} finally {
			server.close()
		}
	})

	it('returns error when all ports exhausted', async () => {
		// Bind ports 10300-10300 (single port range)
		const server = net.createServer()
		await new Promise<void>((resolve) => server.listen(10300, '127.0.0.1', resolve))

		try {
			const alloc = new TcpPortAllocator()
			const result = await alloc.findFreePort(10300, 10300)
			expect(isErr(result)).toBe(true)
		} finally {
			server.close()
		}
	})
})
