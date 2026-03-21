import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isErr } from '@localias/core'
import type { Container } from '@localias/infra'
import type { ArgParser } from '../parser.js'
import { ensureProxy } from './ensure-proxy.js'

const CONFIG_FILE = '.localiasrc'

interface ServiceConfig {
	port?: number
	command: string
}

interface LocaliasConfig {
	services: Record<string, ServiceConfig>
}

function readConfig(cwd: string): LocaliasConfig {
	const configPath = join(cwd, CONFIG_FILE)
	let raw: string
	try {
		raw = readFileSync(configPath, 'utf-8')
	} catch {
		throw new Error(
			`No ${CONFIG_FILE} found in ${cwd}\n\nCreate one:\n\n  ${JSON.stringify({ services: { web: { port: 3000, command: 'npm run dev' } } }, null, 2)}`,
		)
	}

	let parsed: unknown
	try {
		parsed = JSON.parse(raw)
	} catch {
		throw new Error(`Invalid JSON in ${CONFIG_FILE}`)
	}

	const config = parsed as LocaliasConfig
	if (!config.services || typeof config.services !== 'object') {
		throw new Error(`${CONFIG_FILE} must have a "services" object`)
	}

	for (const [name, service] of Object.entries(config.services)) {
		if (!service.command || typeof service.command !== 'string') {
			throw new Error(`Service "${name}" must have a "command" string`)
		}
	}

	return config
}

export async function upCommand(parser: ArgParser, container: Container): Promise<void> {
	const force = parser.flag('force')
	const tld = parser.option('tld')
	const cwd = process.cwd()

	let config: LocaliasConfig
	try {
		config = readConfig(cwd)
	} catch (e) {
		console.error(`Error: ${(e as Error).message}`)
		process.exitCode = 1
		return
	}

	await ensureProxy(container)

	const result = await container.runUp.execute({
		cwd,
		services: config.services,
		tld,
		force,
	})
	if (isErr(result)) {
		console.error(`Error: ${result.error.message}`)
		process.exitCode = 1
	}
}
