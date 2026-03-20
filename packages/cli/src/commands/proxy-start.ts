import { isErr } from '@localias/core'
import type { Container } from '@localias/infra'
import type { ArgParser } from '../parser.js'

export async function proxyStartCommand(parser: ArgParser, container: Container): Promise<void> {
	const port = parser.optionNumber('port', 'p')
	const tls = parser.flag('https')
	const tld = parser.option('tld')
	const foreground = parser.flag('foreground')
	const certPath = parser.option('cert')
	const keyPath = parser.option('key')

	const result = await container.startProxy.execute({
		port,
		tls,
		tld,
		certPath,
		keyPath,
		foreground,
	})

	if (isErr(result)) {
		console.error(`Error: ${result.error.message}`)
		process.exitCode = 1
		return
	}

	if (foreground) {
		await new Promise<void>((resolve) => {
			const shutdown = async () => {
				await container.stopProxy.execute()
				resolve()
			}
			process.on('SIGINT', shutdown)
			process.on('SIGTERM', shutdown)
		})
	}
}
