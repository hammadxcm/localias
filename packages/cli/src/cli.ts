#!/usr/bin/env node

import { createDefaultContainer } from '@localias/infra'
import { registerBuiltInPlugins } from '@localias/plugin-sdk'
import { aliasCommand } from './commands/alias.js'
import { composeCommand } from './commands/compose.js'
import { getCommand } from './commands/get.js'
import { hostsCommand } from './commands/hosts.js'
import { listCommand } from './commands/list.js'
import { namedCommand } from './commands/named.js'
import { proxyStartCommand } from './commands/proxy-start.js'
import { proxyStopCommand } from './commands/proxy-stop.js'
import { runCommand } from './commands/run.js'
import { trustCommand } from './commands/trust.js'
import { upCommand } from './commands/up.js'
import { printHelp, printVersion } from './help.js'
import { ArgParser } from './parser.js'

async function main(): Promise<void> {
	const argv = process.argv.slice(2)

	// Block npx/pnpm dlx invocations
	const execPath = process.env.npm_execpath ?? ''
	if (execPath.includes('npx') || process.env.npm_command === 'exec') {
		console.error('Error: localias should be installed globally, not run via npx.')
		console.error('Install: npm install -g localias')
		process.exitCode = 1
		return
	}

	const parser = new ArgParser(argv)

	// Global flags
	if (parser.flag('help', 'h')) {
		printHelp()
		return
	}
	if (parser.flag('version', 'v')) {
		printVersion()
		return
	}

	// LOCALIAS=0 bypass
	if (process.env.LOCALIAS === '0') {
		const rest = parser.rest()
		if (rest.length > 0) {
			const container = createDefaultContainer()
			container.process.spawn(rest, {})
			return
		}
	}

	// Named run mode via --name
	const nameFlag = parser.option('name')
	if (nameFlag) {
		const container = createDefaultContainer()
		registerBuiltInPlugins(container.plugins)
		const force = parser.flag('force')
		const appPort = parser.optionNumber('app-port')
		const tld = parser.option('tld')
		const rest = parser.rest()
		await namedCommand(nameFlag, rest, container, { force, appPort, tld })
		return
	}

	const subcommand = parser.positional()

	switch (subcommand) {
		case 'run': {
			const container = createDefaultContainer()
			registerBuiltInPlugins(container.plugins)
			await runCommand(parser, container)
			break
		}
		case 'proxy': {
			const proxyAction = parser.positional()
			const container = createDefaultContainer()
			if (proxyAction === 'start') {
				await proxyStartCommand(parser, container)
			} else if (proxyAction === 'stop') {
				await proxyStopCommand(container)
			} else {
				console.error('Usage: localias proxy <start|stop>')
				process.exitCode = 1
			}
			break
		}
		case 'up': {
			const container = createDefaultContainer()
			await upCommand(parser, container)
			break
		}
		case 'compose': {
			const container = createDefaultContainer()
			await composeCommand(parser, container)
			break
		}
		case 'alias': {
			const container = createDefaultContainer()
			aliasCommand(parser, container)
			break
		}
		case 'list':
		case 'ls': {
			const container = createDefaultContainer()
			await listCommand(container)
			break
		}
		case 'get': {
			const container = createDefaultContainer()
			await getCommand(parser, container)
			break
		}
		case 'trust': {
			const container = createDefaultContainer()
			await trustCommand(container)
			break
		}
		case 'hosts': {
			const hostsAction = parser.positional()
			const container = createDefaultContainer()
			hostsCommand(hostsAction, container)
			break
		}
		default: {
			// Default: first arg = app name → named run mode
			if (subcommand && !subcommand.startsWith('-')) {
				const container = createDefaultContainer()
				registerBuiltInPlugins(container.plugins)
				const force = parser.flag('force')
				const appPort = parser.optionNumber('app-port')
				const tld = parser.option('tld')
				const rest = parser.rest()
				await namedCommand(subcommand, rest, container, { force, appPort, tld })
			} else {
				printHelp()
			}
			break
		}
	}
}

main().catch((e) => {
	console.error(e)
	process.exitCode = 1
})
