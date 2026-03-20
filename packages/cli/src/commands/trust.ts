import { isErr } from '@localias/core'
import type { Container } from '@localias/infra'

export async function trustCommand(container: Container): Promise<void> {
	const result = await container.trustCa.execute()
	if (isErr(result)) {
		console.error(`Error: ${result.error.message}`)
		process.exitCode = 1
	}
}
