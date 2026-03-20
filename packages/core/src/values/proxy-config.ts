import type { Result } from '../result.js'
import { ok, err } from '../result.js'
import { ConfigValidationError } from '../errors.js'
import { Port } from './port.js'
import { unwrap } from '../result.js'

export class ProxyConfig {
	private constructor(
		readonly port: Port,
		readonly tld: string,
		readonly tls: boolean,
		readonly stateDir: string,
	) {}

	static create(opts: {
		port?: number
		tld?: string
		tls?: boolean
		stateDir?: string
	}): Result<ProxyConfig, ConfigValidationError> {
		const defaults = ProxyConfig.defaults()
		const portResult = Port.create(opts.port ?? defaults.port.value)
		if (portResult._tag === 'Err') return err(portResult.error)

		const tld = opts.tld ?? defaults.tld
		if (!/^[a-z][a-z0-9]*$/.test(tld)) {
			return err(new ConfigValidationError(`Invalid TLD: "${tld}"`))
		}

		return ok(
			new ProxyConfig(
				portResult.value,
				tld,
				opts.tls ?? defaults.tls,
				opts.stateDir ?? defaults.stateDir,
			),
		)
	}

	static defaults(): ProxyConfig {
		return new ProxyConfig(unwrap(Port.create(1355)), 'localhost', false, '/tmp/publify')
	}
}
