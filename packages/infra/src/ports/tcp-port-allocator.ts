import net from 'node:net'
import type { IPortAllocator, Port } from '@localias/core'
import type { Result } from '@localias/core'
import { err, isErr, ok } from '@localias/core'
import { PortExhaustedError, Port as PortVO } from '@localias/core'

const DEFAULT_MIN = 4000
const DEFAULT_MAX = 4999
const RANDOM_ATTEMPTS = 50

function testPort(port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const server = net.createServer()
		server.once('error', () => resolve(false))
		server.once('listening', () => {
			server.close(() => resolve(true))
		})
		server.listen(port, '127.0.0.1')
	})
}

export class TcpPortAllocator implements IPortAllocator {
	async findFreePort(
		min = DEFAULT_MIN,
		max = DEFAULT_MAX,
	): Promise<Result<Port, PortExhaustedError>> {
		// Random attempts first
		for (let i = 0; i < RANDOM_ATTEMPTS; i++) {
			const port = min + Math.floor(Math.random() * (max - min + 1))
			if (await testPort(port)) {
				const result = PortVO.create(port)
				if (isErr(result)) continue
				return ok(result.value)
			}
		}

		// Sequential scan fallback
		for (let port = min; port <= max; port++) {
			if (await testPort(port)) {
				const result = PortVO.create(port)
				if (isErr(result)) continue
				return ok(result.value)
			}
		}

		return err(new PortExhaustedError(min, max))
	}
}
