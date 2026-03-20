import { isErr } from '@localias/core'
import type { Container } from '@localias/infra'

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
			console.error('Usage: localias hosts <sync|clean>')
			process.exitCode = 1
	}
}
