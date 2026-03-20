import { isErr } from '@localias/core'
import type { Container } from '@localias/infra'
import type { ArgParser } from '../parser.js'

export async function getCommand(parser: ArgParser, container: Container): Promise<void> {
	const name = parser.positional()

	const result = await container.getServiceUrl.execute(name, process.cwd())
	if (isErr(result)) {
		console.error(`Error: ${result.error.message}`)
		process.exitCode = 1
		return
	}

	// Output URL to stdout (for use in scripts/env vars)
	process.stdout.write(`${result.value}\n`)
}
