import type { ILogger } from '../ports/logger.js'
import type { IPortAllocator } from '../ports/port-allocator.js'
import type { IProcessManager } from '../ports/process-manager.js'
import type { IRouteRepository } from '../ports/route-repository.js'
import type { IStateManager } from '../ports/state-manager.js'
import type { Result } from '../result.js'
import { err, isErr, ok } from '../result.js'
import { Hostname } from '../values/hostname.js'
import { Port } from '../values/port.js'
import { Route } from '../values/route.js'

export interface RunUpDeps {
	readonly routes: IRouteRepository
	readonly ports: IPortAllocator
	readonly process: IProcessManager
	readonly state: IStateManager
	readonly logger: ILogger
}

export interface RunUpServiceConfig {
	readonly port?: number | undefined
	readonly command: string
}

export interface RunUpParams {
	readonly cwd?: string | undefined
	readonly tld?: string | undefined
	readonly force?: boolean | undefined
	readonly services: Record<string, RunUpServiceConfig>
}

export interface RunUpServiceInfo {
	readonly name: string
	readonly hostname: string
	readonly port: number
	readonly url: string
}

export class RunUpUseCase {
	constructor(private readonly deps: RunUpDeps) {}

	async execute(params: RunUpParams): Promise<Result<RunUpServiceInfo[], Error>> {
		if (!params.cwd) {
			return err(new Error('cwd is required'))
		}
		const tld = params.tld ?? 'localhost'

		const serviceEntries = Object.entries(params.services)
		if (serviceEntries.length === 0) {
			return err(new Error('No services defined in config'))
		}

		// Discover proxy state
		const proxyState = await this.deps.state.discoverState()
		if (!proxyState.running) {
			this.deps.logger.warn('Proxy is not running. Start it with: localias proxy start')
		}
		const proxyPort = proxyState.port?.value ?? 1355
		const tls = proxyState.tls

		const registeredHostnames: string[] = []
		const serviceInfos: RunUpServiceInfo[] = []
		const spawnEntries: Array<{ command: string[]; env: Record<string, string> }> = []
		const pid = this.deps.process.currentPid()

		for (const [name, service] of serviceEntries) {
			// Allocate or use explicit port
			let appPort: Port
			if (service.port) {
				const portResult = Port.create(service.port)
				if (isErr(portResult)) {
					this.cleanupRoutes(registeredHostnames)
					return err(portResult.error)
				}
				appPort = portResult.value
			} else {
				const portResult = await this.deps.ports.findFreePort()
				if (isErr(portResult)) {
					this.cleanupRoutes(registeredHostnames)
					return err(portResult.error)
				}
				appPort = portResult.value
			}

			// Build hostname: <name>.<tld>
			const hostnameResult = Hostname.create(name, tld)
			if (isErr(hostnameResult)) {
				this.cleanupRoutes(registeredHostnames)
				return err(hostnameResult.error)
			}
			const hostname = hostnameResult.value

			// Register route
			const route = Route.create(hostname, appPort, pid)
			const addResult = this.deps.routes.addRoute(route, params.force)
			if (isErr(addResult)) {
				this.cleanupRoutes(registeredHostnames)
				return err(addResult.error)
			}
			registeredHostnames.push(hostname.value)

			// Build URL
			const url = hostname.toUrl(proxyPort, tls)

			serviceInfos.push({ name, hostname: hostname.value, port: appPort.value, url })

			// Build spawn entry
			spawnEntries.push({
				command: [service.command],
				env: {
					PORT: String(appPort.value),
					LOCALIAS_URL: url,
					LOCALIAS_HOSTNAME: hostname.value,
				},
			})
		}

		// Log summary
		this.deps.logger.info('')
		for (const info of serviceInfos) {
			this.deps.logger.info(`  ${info.name} → ${info.url} (:${info.port})`)
		}
		this.deps.logger.info('')

		// Spawn all services with unified cleanup
		this.deps.process.spawnMultiple(spawnEntries, () => {
			this.cleanupRoutes(registeredHostnames)
			this.deps.logger.debug('All routes cleaned up')
		})

		return ok(serviceInfos)
	}

	private cleanupRoutes(hostnames: string[]): void {
		for (const hostname of hostnames) {
			this.deps.routes.removeRoute(hostname)
		}
	}
}
