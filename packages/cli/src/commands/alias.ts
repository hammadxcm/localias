import { isErr } from '@localias/core'
import type { Container } from '@localias/infra'
import type { ArgParser } from '../parser.js'

export function aliasCommand(parser: ArgParser, container: Container): void {
	const remove = parser.option('remove')
	if (remove) {
		const result = container.removeAlias.execute(remove)
		if (isErr(result)) {
			console.error(`Error: ${result.error.message}`)
			process.exitCode = 1
		}
		return
	}

	const name = parser.positional()
	const portStr = parser.positional()
	if (!name || !portStr) {
		console.error('Usage: localias alias <name> <port> [--force]')
		process.exitCode = 1
		return
	}

	const port = Number.parseInt(portStr, 10)
	if (Number.isNaN(port) || port < 1 || port > 65535) {
		console.error(`Error: Invalid port "${portStr}". Must be between 1 and 65535.`)
		process.exitCode = 1
		return
	}

	const force = parser.flag('force')
	const tld = parser.option('tld')
	const result = container.addAlias.execute(name, port, tld, force)
	if (isErr(result)) {
		console.error(`Error: ${result.error.message}`)
		process.exitCode = 1
	}
}
