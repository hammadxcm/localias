export class RouteConflictError extends Error {
	readonly code = 'ROUTE_CONFLICT' as const
	constructor(
		readonly hostname: string,
		readonly existingPid: number,
	) {
		super(`Route conflict: ${hostname} is already registered by PID ${existingPid}`)
		this.name = 'RouteConflictError'
	}
}

export class PortExhaustedError extends Error {
	readonly code = 'PORT_EXHAUSTED' as const
	constructor(
		readonly min: number,
		readonly max: number,
	) {
		super(`No free port found in range ${min}-${max}`)
		this.name = 'PortExhaustedError'
	}
}

export class ProxyNotRunningError extends Error {
	readonly code = 'PROXY_NOT_RUNNING' as const
	constructor() {
		super('Proxy is not running')
		this.name = 'ProxyNotRunningError'
	}
}

export class CertificateError extends Error {
	readonly code = 'CERTIFICATE_ERROR' as const
	constructor(readonly detail: string) {
		super(`Certificate error: ${detail}`)
		this.name = 'CertificateError'
	}
}

export class LockAcquisitionError extends Error {
	readonly code = 'LOCK_FAILED' as const
	constructor(message?: string) {
		super(message ?? 'Failed to acquire lock')
		this.name = 'LockAcquisitionError'
	}
}

export class HostnameValidationError extends Error {
	readonly code = 'INVALID_HOSTNAME' as const
	constructor(
		readonly input: string,
		readonly reason: string,
	) {
		super(`Invalid hostname "${input}": ${reason}`)
		this.name = 'HostnameValidationError'
	}
}

export class ProxyLoopError extends Error {
	readonly code = 'PROXY_LOOP' as const
	constructor(readonly hops: number) {
		super(`Proxy loop detected after ${hops} hops`)
		this.name = 'ProxyLoopError'
	}
}

export class ConfigValidationError extends Error {
	readonly code = 'INVALID_CONFIG' as const
	constructor(message: string) {
		super(message)
		this.name = 'ConfigValidationError'
	}
}

export class ComposeParseError extends Error {
	readonly code = 'COMPOSE_PARSE' as const
	constructor(readonly detail: string) {
		super(`Failed to parse compose file: ${detail}`)
		this.name = 'ComposeParseError'
	}
}
