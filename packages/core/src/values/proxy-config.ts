import { ConfigValidationError } from '../errors.js'
import type { Result } from '../result.js'
import { err, ok } from '../result.js'
import { unwrap } from '../result.js'
import { Port } from './port.js'

export class ProxyConfig {
	private constructor(
		readonly port: Port,
		readonly tld: string,
		readonly tls: boolean,
		readonly stateDir: string,
	) {}

	static create(opts: {
		port?: number | undefined
		tld?: string | undefined
		tls?: boolean | undefined
		stateDir?: string | undefined
	}): Result<ProxyConfig, ConfigValidationError> {
		const defaults = ProxyConfig.defaults()
		const portResult = Port.create(opts.port ?? defaults.port.value)
		if (portResult._tag === 'Err') return err(portResult.error)

		const tld = (opts.tld ?? defaults.tld).toLowerCase()
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
		return new ProxyConfig(unwrap(Port.create(1355)), 'localhost', false, '/tmp/localias')
	}
}
