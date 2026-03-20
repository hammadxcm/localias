import type { PortExhaustedError } from '../errors.js'
import type { Result } from '../result.js'
import type { Port } from '../values/port.js'

export interface IPortAllocator {
	findFreePort(min?: number, max?: number): Promise<Result<Port, PortExhaustedError>>
}
