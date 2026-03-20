import type { Hostname } from './hostname.js'
import type { Port } from './port.js'
import type { ProcessId } from './process-id.js'

export class Route {
	readonly isAlias: boolean

	private constructor(
		readonly hostname: Hostname,
		readonly port: Port,
		readonly pid: ProcessId,
	) {
		this.isAlias = pid.value === 0
	}

	static create(hostname: Hostname, port: Port, pid: ProcessId): Route {
		return new Route(hostname, port, pid)
	}
}
