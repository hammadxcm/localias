import { isErr } from '@localias/core'
import type { Container } from '@localias/infra'
import type { ArgParser } from '../parser.js'

export async function composeCommand(parser: ArgParser, container: Container): Promise<void> {
	const name = parser.option('name')
	const force = parser.flag('force')
	const tld = parser.option('tld')
	const command = parser.rest()

	if (command.length === 0) {
		console.error('Error: No command specified. Usage: localias compose -- docker compose up')
		process.exitCode = 1
		return
	}

	const result = await container.runCompose.execute({
		command,
		name,
		force,
		tld,
		cwd: process.cwd(),
	})
	if (isErr(result)) {
		console.error(`Error: ${result.error.message}`)
		process.exitCode = 1
	}
}
