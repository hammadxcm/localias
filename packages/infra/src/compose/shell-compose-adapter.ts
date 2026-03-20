import { execFileSync } from 'node:child_process'
import {
	ComposeParseError,
	type ComposeServiceInfo,
	type IComposeAdapter,
	type Result,
	err,
	ok,
} from '@localias/core'

export class ShellComposeAdapter implements IComposeAdapter {
	async parseServices(
		composeFileArgs: string[],
		cwd: string,
	): Promise<Result<ComposeServiceInfo[], Error>> {
		const args = ['compose']

		for (const file of composeFileArgs) {
			args.push('-f', file)
		}
		args.push('config', '--format', 'json')

		let output: string
		try {
			output = execFileSync('docker', args, {
				cwd,
				encoding: 'utf-8',
				stdio: ['pipe', 'pipe', 'pipe'],
			})
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e)
			if (message.includes('ENOENT')) {
				return err(new ComposeParseError('docker is not installed or not in PATH'))
			}
			return err(new ComposeParseError(message))
		}

		let config: Record<string, unknown>
		try {
			config = JSON.parse(output) as Record<string, unknown>
		} catch {
			return err(new ComposeParseError('invalid JSON output from docker compose config'))
		}

		const services = config.services as Record<string, Record<string, unknown>> | undefined
		if (!services || typeof services !== 'object') {
			return err(new ComposeParseError('no services found in compose config'))
		}

		const result: ComposeServiceInfo[] = []
		for (const [name, service] of Object.entries(services)) {
			const ports = service.ports
			const portCount = Array.isArray(ports) ? Math.max(ports.length, 1) : 1
			result.push({ name, portCount })
		}

		return ok(result)
	}
}
