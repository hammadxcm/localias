import type { Container } from '@publify/infra'
import { isErr } from '@publify/core'

export async function trustCommand(container: Container): Promise<void> {
	const result = await container.trustCa.execute()
	if (isErr(result)) {
		console.error(`Error: ${result.error.message}`)
		process.exitCode = 1
	}
}
