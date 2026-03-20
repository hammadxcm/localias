import type { Container } from '@publify/infra'
import { isErr } from '@publify/core'

export function hostsCommand(subcommand: string | undefined, container: Container): void {
	switch (subcommand) {
		case 'sync': {
			const result = container.syncHosts.execute()
			if (isErr(result)) {
				console.error(`Error: ${result.error.message}`)
				process.exitCode = 1
			}
			break
		}
		case 'clean': {
			const result = container.cleanHosts.execute()
			if (isErr(result)) {
				console.error(`Error: ${result.error.message}`)
				process.exitCode = 1
			}
			break
		}
		default:
			console.error('Usage: publify hosts <sync|clean>')
			process.exitCode = 1
	}
}
