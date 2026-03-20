import type { Container } from '@publify/infra'
import { isErr } from '@publify/core'
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
		// Keep process alive
		await new Promise(() => {})
	}
}
