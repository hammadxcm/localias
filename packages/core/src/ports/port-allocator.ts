import type { Result } from '../result.js'
import type { Port } from '../values/port.js'
import type { PortExhaustedError } from '../errors.js'

export interface IPortAllocator {
	findFreePort(min?: number, max?: number): Promise<Result<Port, PortExhaustedError>>
}
