import type { Result } from '../result.js'
import { ok, err } from '../result.js'
import { ConfigValidationError } from '../errors.js'

export class Port {
	private constructor(readonly value: number) {}

	static create(n: number): Result<Port, ConfigValidationError> {
		if (!Number.isInteger(n) || n < 1 || n > 65535) {
			return err(new ConfigValidationError(`Invalid port number: ${n}. Must be between 1 and 65535.`))
		}
		return ok(new Port(n))
	}

	static isPrivileged(port: Port): boolean {
		return port.value < 1024
	}
}
