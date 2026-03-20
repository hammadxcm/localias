import type { Container } from '@publify/infra'
import { isErr } from '@publify/core'

export async function namedCommand(
	name: string,
	rest: string[],
	container: Container,
	options?: { force?: boolean; appPort?: number; tld?: string },
): Promise<void> {
	if (rest.length === 0) {
		console.error(`Error: No command specified. Usage: publify ${name} -- <command>`)
		process.exitCode = 1
		return
	}

	const result = await container.runApp.execute({
		command: rest,
		name,
		force: options?.force,
		appPort: options?.appPort,
		tld: options?.tld,
	})
	if (isErr(result)) {
		console.error(`Error: ${result.error.message}`)
		process.exitCode = 1
	}
}
