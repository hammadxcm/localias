import { isErr } from '@localias/core'
import type { Container } from '@localias/infra'

export async function namedCommand(
	name: string,
	rest: string[],
	container: Container,
	options?: { force?: boolean | undefined; appPort?: number | undefined; tld?: string | undefined },
): Promise<void> {
	if (rest.length === 0) {
		console.error(`Error: No command specified. Usage: localias ${name} -- <command>`)
		process.exitCode = 1
		return
	}

	const result = await container.runApp.execute({
		command: rest,
		name,
		force: options?.force,
		appPort: options?.appPort,
		tld: options?.tld,
		cwd: process.cwd(),
	})
	if (isErr(result)) {
		console.error(`Error: ${result.error.message}`)
		process.exitCode = 1
	}
}
